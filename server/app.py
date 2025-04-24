from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mysqldb import MySQL
import os
from datetime import datetime
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# MySQL Configuration
app.config['MYSQL_HOST'] = 'localhost'  # or your host
app.config['MYSQL_USER'] = 'logistics_admin'  # your username
app.config['MYSQL_PASSWORD'] = 'Admin@Secure123'  # your password
app.config['MYSQL_DB'] = 'transport_logistics'  # your database name
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'  # Important for getting dictionaries

mysql = MySQL(app)

# Initialize stored procedures and complex queries
def initialize_stored_procedures():
    try:
        cur = mysql.connection.cursor()
        
        # Create stored procedure for shipment analytics
        cur.execute("""
        CREATE PROCEDURE IF NOT EXISTS `get_shipment_analytics`(IN customer_id_param INT)
        BEGIN
            -- Complex query with multiple joins and aggregations
            WITH ShipmentCounts AS (
                SELECT 
                    s.status,
                    COUNT(*) as count
                FROM 
                    shipments s
                WHERE 
                    (customer_id_param IS NULL OR s.customer_id = customer_id_param)
                GROUP BY 
                    s.status
            ),
            ValueByMonth AS (
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    SUM(shipment_value) as total_value,
                    COUNT(*) as shipment_count
                FROM 
                    shipments
                WHERE 
                    (customer_id_param IS NULL OR customer_id = customer_id_param)
                    AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
                GROUP BY 
                    DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY 
                    month
            ),
            TopRoutes AS (
                SELECT 
                    CONCAT(orig.city, ' to ', dest.city) as route,
                    COUNT(*) as shipment_count
                FROM 
                    shipments s
                JOIN 
                    locations orig ON s.origin_id = orig.location_id
                JOIN 
                    locations dest ON s.destination_id = dest.location_id
                WHERE 
                    (customer_id_param IS NULL OR s.customer_id = customer_id_param)
                GROUP BY 
                    route
                ORDER BY 
                    shipment_count DESC
                LIMIT 5
            )
            
            -- Return multiple result sets
            SELECT 
                (SELECT COUNT(*) FROM shipments WHERE (customer_id_param IS NULL OR customer_id = customer_id_param)) as total_shipments,
                COALESCE((SELECT count FROM ShipmentCounts WHERE status = 'pending'), 0) as pending_shipments,
                COALESCE((SELECT count FROM ShipmentCounts WHERE status = 'in_transit'), 0) as transit_shipments,
                COALESCE((SELECT count FROM ShipmentCounts WHERE status = 'delivered'), 0) as delivered_shipments,
                COALESCE((SELECT count FROM ShipmentCounts WHERE status = 'returned'), 0) as returned_shipments;
                
            -- Monthly data
            SELECT * FROM ValueByMonth;
            
            -- Top routes
            SELECT * FROM TopRoutes;
        END
        """)
        
        # Create stored procedure for driver performance analytics
        cur.execute("""
        CREATE PROCEDURE IF NOT EXISTS `get_driver_performance`(IN driver_id_param INT)
        BEGIN
            -- Get driver shipment statistics with weighted scoring
            WITH ShipmentPerformance AS (
                SELECT 
                    s.driver_id,
                    COUNT(*) as total_deliveries,
                    SUM(CASE WHEN s.status = 'delivered' THEN 1 ELSE 0 END) as completed_deliveries,
                    SUM(CASE WHEN s.status = 'returned' THEN 1 ELSE 0 END) as returned_deliveries,
                    AVG(
                        CASE 
                            WHEN s.status = 'delivered' AND s.actual_delivery IS NOT NULL AND s.estimated_delivery IS NOT NULL
                            THEN 
                                -- Score based on delivery time (lower is better, normalize to 0-100 scale)
                                CASE 
                                    WHEN TIMESTAMPDIFF(HOUR, s.estimated_delivery, s.actual_delivery) <= 0 
                                    THEN 100 -- On time or early: perfect score
                                    WHEN TIMESTAMPDIFF(HOUR, s.estimated_delivery, s.actual_delivery) <= 24
                                    THEN 80 -- Within 24 hours: good score
                                    WHEN TIMESTAMPDIFF(HOUR, s.estimated_delivery, s.actual_delivery) <= 48
                                    THEN 60 -- Within 48 hours: average score
                                    ELSE 40 -- More than 48 hours: poor score
                                END
                            ELSE NULL
                        END
                    ) as delivery_time_score,
                    COUNT(DISTINCT s.shipment_id) as unique_routes_count
                FROM 
                    shipments s
                WHERE
                    (driver_id_param IS NULL OR s.driver_id = driver_id_param)
                    AND s.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH)
                GROUP BY 
                    s.driver_id
            ),
            DriverEvents AS (
                SELECT 
                    s.driver_id,
                    COUNT(te.event_id) as total_events,
                    SUM(CASE WHEN te.event_type = 'issue' THEN 1 ELSE 0 END) as issue_count,
                    SUM(CASE WHEN te.event_type = 'delay' THEN 1 ELSE 0 END) as delay_count
                FROM 
                    tracking_events te
                JOIN 
                    shipments s ON te.shipment_id = s.shipment_id
                WHERE 
                    (driver_id_param IS NULL OR s.driver_id = driver_id_param)
                    AND te.event_timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH)
                GROUP BY 
                    s.driver_id
            )
            
            -- Calculate weighted performance score
            SELECT 
                d.driver_id,
                u.full_name as driver_name,
                sp.total_deliveries,
                sp.completed_deliveries,
                COALESCE(sp.delivery_time_score, 0) as time_efficiency,
                de.issue_count,
                de.delay_count,
                COALESCE(sp.total_deliveries, 0) - COALESCE(sp.completed_deliveries, 0) as incomplete_deliveries,
                CASE 
                    WHEN sp.total_deliveries > 0 
                    THEN (sp.completed_deliveries / sp.total_deliveries * 100) 
                    ELSE 0 
                END as completion_rate,
                -- Overall performance score (weighted average)
                (
                    COALESCE(sp.delivery_time_score, 50) * 0.4 + 
                    CASE 
                        WHEN sp.total_deliveries > 0 
                        THEN (sp.completed_deliveries / sp.total_deliveries * 100) 
                        ELSE 0 
                    END * 0.4 +
                    CASE
                        WHEN de.total_events > 0
                        THEN (100 - (de.issue_count + de.delay_count) / de.total_events * 100)
                        ELSE 80
                    END * 0.2
                ) as overall_performance
            FROM 
                drivers d
            LEFT JOIN
                users u ON d.user_id = u.user_id
            LEFT JOIN
                ShipmentPerformance sp ON d.driver_id = sp.driver_id
            LEFT JOIN
                DriverEvents de ON d.driver_id = de.driver_id
            WHERE
                (driver_id_param IS NULL OR d.driver_id = driver_id_param);
        END
        """)
        
        # Create stored procedure for calculating estimated delivery times
        cur.execute("""
        CREATE PROCEDURE IF NOT EXISTS `calculate_estimated_delivery`(IN shipment_id_param INT)
        BEGIN
            DECLARE origin_id_var INT;
            DECLARE destination_id_var INT;
            DECLARE route_id_var INT;
            DECLARE distance_km_var DECIMAL(6,2);
            DECLARE estimated_duration_min_var INT;
            DECLARE pickup_date_var DATETIME;
            DECLARE estimated_delivery_var DATETIME;
            
            -- Get shipment details
            SELECT origin_id, destination_id, route_id, pickup_date
            INTO origin_id_var, destination_id_var, route_id_var, pickup_date_var
            FROM shipments
            WHERE shipment_id = shipment_id_param;
            
            -- If we have a route, use its distance and estimated duration
            IF route_id_var IS NOT NULL THEN
                SELECT distance_km, estimated_duration_min
                INTO distance_km_var, estimated_duration_min_var
                FROM routes
                WHERE route_id = route_id_var;
            ELSE
                -- Otherwise, estimate based on a simple formula
                -- In real life, this would be more complex with Google Maps API etc.
                SELECT 
                    SQRT(
                        POWER(ABS(o.latitude - d.latitude) * 111, 2) + 
                        POWER(ABS(o.longitude - d.longitude) * 111 * COS(RADIANS((o.latitude + d.latitude) / 2)), 2)
                    ) AS distance_km,
                    -- Estimate 45 min per 50km, plus 120 min fixed time for loading/unloading
                    SQRT(
                        POWER(ABS(o.latitude - d.latitude) * 111, 2) + 
                        POWER(ABS(o.longitude - d.longitude) * 111 * COS(RADIANS((o.latitude + d.latitude) / 2)), 2)
                    ) / 50 * 45 + 120 AS estimated_duration_min
                INTO distance_km_var, estimated_duration_min_var
                FROM locations o
                JOIN locations d ON 1=1
                WHERE o.location_id = origin_id_var
                AND d.location_id = destination_id_var;
            END IF;
            
            -- Calculate estimated delivery time
            IF pickup_date_var IS NOT NULL AND estimated_duration_min_var IS NOT NULL THEN
                SET estimated_delivery_var = DATE_ADD(pickup_date_var, INTERVAL estimated_duration_min_var MINUTE);
                
                -- Update the shipment with the estimated delivery time
                UPDATE shipments
                SET estimated_delivery = estimated_delivery_var
                WHERE shipment_id = shipment_id_param;
                
                -- Return the calculated values
                SELECT 
                    shipment_id_param AS shipment_id,
                    distance_km_var AS distance_km,
                    estimated_duration_min_var AS estimated_duration_min,
                    pickup_date_var AS pickup_date,
                    estimated_delivery_var AS estimated_delivery;
            ELSE
                SELECT 
                    shipment_id_param AS shipment_id,
                    NULL AS error_message;
            END IF;
        END
        """)
        
        # Create a view for dashboard stats
        cur.execute("""
        CREATE OR REPLACE VIEW dashboard_stats AS
        SELECT
            (SELECT COUNT(*) FROM shipments) AS total_shipments,
            (SELECT COUNT(*) FROM shipments WHERE status = 'pending') AS pending_shipments,
            (SELECT COUNT(*) FROM shipments WHERE status = 'in_transit') AS intransit_shipments,
            (SELECT COUNT(*) FROM shipments WHERE status = 'delivered') AS delivered_shipments,
            (SELECT COUNT(*) FROM customers) AS total_customers,
            (SELECT COUNT(*) FROM drivers) AS total_drivers,
            (SELECT COUNT(*) FROM vehicles) AS total_vehicles,
            (SELECT COUNT(*) FROM vehicles WHERE status = 'available') AS available_vehicles,
            (SELECT COUNT(*) FROM drivers WHERE status = 'available') AS available_drivers
        """)
        
        # Create stored procedure for customers to see their own analytics
        cur.execute("""
        CREATE PROCEDURE IF NOT EXISTS `get_customer_dashboard`(IN customer_id_param INT)
        BEGIN
            -- Basic stats
            SELECT 
                COUNT(*) AS total_shipments,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_shipments,
                SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) AS active_shipments,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_shipments,
                SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned_shipments,
                SUM(shipment_value) AS total_value_shipped,
                AVG(CASE WHEN status = 'delivered' AND pickup_date IS NOT NULL AND actual_delivery IS NOT NULL
                    THEN TIMESTAMPDIFF(HOUR, pickup_date, actual_delivery)
                    ELSE NULL END) AS avg_delivery_time_hours
            FROM
                shipments
            WHERE
                customer_id = customer_id_param;
            
            -- Recent shipments 
            SELECT 
                s.shipment_id, 
                s.tracking_number, 
                s.status,
                s.pickup_date,
                s.estimated_delivery,
                s.actual_delivery,
                CONCAT(lo.city, ', ', lo.state) AS origin,
                CONCAT(ld.city, ', ', ld.state) AS destination,
                u.full_name AS driver_name,
                v.license_plate AS vehicle
            FROM 
                shipments s
            JOIN 
                locations lo ON s.origin_id = lo.location_id
            JOIN 
                locations ld ON s.destination_id = ld.location_id
            LEFT JOIN 
                drivers d ON s.driver_id = d.driver_id
            LEFT JOIN 
                users u ON d.user_id = u.user_id
            LEFT JOIN 
                vehicles v ON s.vehicle_id = v.vehicle_id
            WHERE 
                s.customer_id = customer_id_param
            ORDER BY 
                s.created_at DESC
            LIMIT 5;
            
            -- Shipment value over time (monthly)
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') AS month,
                COUNT(*) AS shipment_count,
                SUM(shipment_value) AS total_value,
                AVG(shipment_value) AS avg_value
            FROM 
                shipments
            WHERE 
                customer_id = customer_id_param AND
                created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
            GROUP BY 
                DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY 
                month;
        END
        """)
        
        # Create stored procedure for drivers to see their performance and assigned shipments
        cur.execute("""
        CREATE PROCEDURE IF NOT EXISTS `get_driver_dashboard`(IN driver_id_param INT)
        BEGIN
            -- Basic stats
            SELECT 
                COUNT(*) AS total_shipments,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_shipments,
                SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) AS active_shipments,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_shipments,
                (SELECT status FROM drivers WHERE driver_id = driver_id_param) AS driver_status
            FROM
                shipments
            WHERE
                driver_id = driver_id_param;
            
            -- Current active shipment (in transit)
            SELECT 
                s.shipment_id, 
                s.tracking_number,
                CONCAT(c.company_name, ' (', u.full_name, ')') AS customer,
                CONCAT(lo.city, ', ', lo.state) AS origin,
                CONCAT(ld.city, ', ', ld.state) AS destination,
                s.pickup_date,
                s.estimated_delivery,
                v.license_plate AS vehicle,
                s.total_weight,
                s.special_instructions
            FROM 
                shipments s
            JOIN 
                locations lo ON s.origin_id = lo.location_id
            JOIN 
                locations ld ON s.destination_id = ld.location_id
            JOIN 
                customers c ON s.customer_id = c.customer_id
            JOIN 
                users u ON c.user_id = u.user_id
            LEFT JOIN 
                vehicles v ON s.vehicle_id = v.vehicle_id
            WHERE 
                s.driver_id = driver_id_param AND
                s.status = 'in_transit'
            ORDER BY 
                s.estimated_delivery
            LIMIT 1;
            
            -- Upcoming shipments (pending)
            SELECT 
                s.shipment_id, 
                s.tracking_number,
                CONCAT(lo.city, ', ', lo.state) AS origin,
                CONCAT(ld.city, ', ', ld.state) AS destination,
                s.pickup_date,
                s.estimated_delivery
            FROM 
                shipments s
            JOIN 
                locations lo ON s.origin_id = lo.location_id
            JOIN 
                locations ld ON s.destination_id = ld.location_id
            WHERE 
                s.driver_id = driver_id_param AND
                s.status = 'pending'
            ORDER BY 
                s.pickup_date
            LIMIT 3;
            
            -- Recent deliveries
            SELECT 
                s.shipment_id, 
                s.tracking_number,
                CONCAT(lo.city, ', ', lo.state) AS origin,
                CONCAT(ld.city, ', ', ld.state) AS destination,
                s.pickup_date,
                s.actual_delivery,
                TIMESTAMPDIFF(MINUTE, s.pickup_date, s.actual_delivery) AS delivery_time_minutes
            FROM 
                shipments s
            JOIN 
                locations lo ON s.origin_id = lo.location_id
            JOIN 
                locations ld ON s.destination_id = ld.location_id
            WHERE 
                s.driver_id = driver_id_param AND
                s.status = 'delivered'
            ORDER BY 
                s.actual_delivery DESC
            LIMIT 5;
        END
        """)
        
        mysql.connection.commit()
        print("✅ Stored procedures initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Error initializing stored procedures: {str(e)}")
        return False

# Replace deprecated before_first_request with a proper setup pattern
@app.route('/api/initialize-db', methods=['POST'])
def initialize_db_route():
    success = initialize_stored_procedures()
    return jsonify({'success': success})

# Call initialization when the app starts
with app.app_context():
    initialize_stored_procedures()

@app.route('/')
def home():
    return "Flask server is running!"

@app.route('/api/login', methods=['POST'])
def login():
    print("Received login request")  # Debug print
    data = request.get_json()
    print(f"Request data: {data}")  # Debug print
    
    username = data.get('username')
    password = data.get('password')
    
    print(f"Login attempt for username: {username}")  # Debug print
    
    try:
        cur = mysql.connection.cursor()
        # First get the user with their password
        cur.execute("""
            SELECT user_id, username, full_name, user_type, password 
            FROM users 
            WHERE username = %s AND password = %s
        """, (username, password))
        user = cur.fetchone()
        cur.close()
        
        if user:
            print(f"Login successful for user: {username}")  # Debug print
            return jsonify({
                'success': True,
                'user': {
                    'id': user['user_id'],
                    'username': user['username'],
                    'full_name': user['full_name'],
                    'user_type': user['user_type']
                }
            })
        else:
            print(f"Login failed for user: {username}")  # Debug print
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
    except Exception as e:
        print(f"Error during login: {str(e)}")  # Debug print
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    cur = mysql.connection.cursor()
    
    # Get shipment count (fixing status filter to match enum values)
    cur.execute("SELECT COUNT(*) as count FROM shipments WHERE status != 'delivered'")
    shipments = cur.fetchone()['count']
    
    # Get available vehicles (fixing status filter to match enum values)
    cur.execute("SELECT COUNT(*) as count FROM vehicles WHERE status = 'available'")
    vehicles = cur.fetchone()['count']
    
    # Get customer count
    cur.execute("SELECT COUNT(*) as count FROM customers")
    customers = cur.fetchone()['count']
    
    # Get active drivers (fixing status filter to match enum values)
    cur.execute("SELECT COUNT(*) as count FROM drivers WHERE status = 'assigned'")
    active_drivers = cur.fetchone()['count']
    
    cur.close()
    
    return jsonify({
        'shipments': shipments,
        'vehicles': vehicles,
        'customers': customers,
        'activeDrivers': active_drivers
    })

@app.route('/api/shipments', methods=['GET'])
def get_shipments():
    try:
        cur = mysql.connection.cursor()
        
        # Get URL parameters
        user_id = request.args.get('user_id')
        user_type = request.args.get('user_type')
        
        # Base query with proper joins
        query = """
            SELECT s.*, 
                   c.company_name,
                   CONCAT(o.city, ', ', o.state) as origin,
                   CONCAT(d.city, ', ', d.state) as destination,
                   u.full_name as driver_name,
                   v.license_plate,
                   dr.driver_id,
                   c.customer_id
            FROM shipments s
            LEFT JOIN customers c ON s.customer_id = c.customer_id
            LEFT JOIN locations o ON s.origin_id = o.location_id
            LEFT JOIN locations d ON s.destination_id = d.location_id
            LEFT JOIN drivers dr ON s.driver_id = dr.driver_id
            LEFT JOIN users u ON dr.user_id = u.user_id
            LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
        """
        
        params = []
        where_clauses = []
        
        # Filter by user_id and user_type if provided
        if user_id and user_type:
            if user_type == 'customer':
                # For customers, find their customer_id first
                cur.execute("SELECT customer_id FROM customers WHERE user_id = %s", [user_id])
                customer = cur.fetchone()
                if customer:
                    where_clauses.append("s.customer_id = %s")
                    params.append(customer['customer_id'])
            elif user_type == 'driver':
                # For drivers, find their driver_id first
                cur.execute("SELECT driver_id FROM drivers WHERE user_id = %s", [user_id])
                driver = cur.fetchone()
                if driver:
                    where_clauses.append("s.driver_id = %s")
                    params.append(driver['driver_id'])
        
        # Add WHERE clause if needed
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
        
        # Add order by
        query += " ORDER BY s.created_at DESC"
        
        # Execute query with parameters
        cur.execute(query, params)
        shipments = cur.fetchall()
        
        # Process results
        for shipment in shipments:
            # Convert datetime objects to string format
            if 'created_at' in shipment:
                shipment['created_at'] = shipment['created_at'].isoformat() if shipment['created_at'] else None
            if 'pickup_date' in shipment:
                shipment['pickup_date'] = shipment['pickup_date'].isoformat() if shipment['pickup_date'] else None
            if 'estimated_delivery' in shipment:
                shipment['estimated_delivery'] = shipment['estimated_delivery'].isoformat() if shipment['estimated_delivery'] else None
            if 'actual_delivery' in shipment:
                shipment['actual_delivery'] = shipment['actual_delivery'].isoformat() if shipment['actual_delivery'] else None
        
        cur.close()
        return jsonify(shipments)
    except Exception as e:
        print(f"Error in get_shipments: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/shipments/<int:id>', methods=['DELETE'])
def delete_shipment(id):
    cur = mysql.connection.cursor()
    try:
        cur.execute("DELETE FROM shipments WHERE shipment_id = %s", (id,))
        mysql.connection.commit()
        return jsonify({'success': True})
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/shipments', methods=['POST'])
def create_shipment():
    cur = mysql.connection.cursor()
    try:
        data = request.get_json()
        
        # Insert the shipment
        cur.execute("""
            INSERT INTO shipments (
                tracking_number, customer_id, origin_id, destination_id, route_id, vehicle_id, 
                driver_id, status, total_weight, total_volume, shipment_value, 
                insurance_required, special_instructions, pickup_date, estimated_delivery
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data['tracking_number'],
            data['customer_id'],
            data['origin_id'],
            data['destination_id'],
            data.get('route_id'),
            data.get('vehicle_id'),
            data.get('driver_id'),
            data['status'],
            data['total_weight'],
            data['total_volume'],
            data['shipment_value'],
            data['insurance_required'],
            data.get('special_instructions'),
            data.get('pickup_date'),
            data.get('estimated_delivery')
        ))
        
        mysql.connection.commit()
        shipment_id = cur.lastrowid
        
        # If a vehicle is assigned, update its status
        if data.get('vehicle_id'):
            cur.execute("UPDATE vehicles SET status = 'in_use' WHERE vehicle_id = %s", (data.get('vehicle_id'),))
            
        # If a driver is assigned, update their status
        if data.get('driver_id'):
            cur.execute("UPDATE drivers SET status = 'assigned' WHERE driver_id = %s", (data.get('driver_id'),))
            
        mysql.connection.commit()
        
        return jsonify({'success': True, 'shipment_id': shipment_id})
        
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/shipments/create', methods=['POST'])
def create_shipment_endpoint():
    cur = mysql.connection.cursor()
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['tracking_number', 'customer_id', 'origin_id', 'destination_id', 
                          'total_weight', 'total_volume', 'shipment_value']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Check if tracking number already exists
        cur.execute("SELECT * FROM shipments WHERE tracking_number = %s", (data['tracking_number'],))
        if cur.fetchone():
            return jsonify({'success': False, 'error': 'Tracking number already exists'}), 400
        
        # Insert shipment
        query = """
            INSERT INTO shipments (
                tracking_number, customer_id, origin_id, destination_id, route_id, vehicle_id, driver_id,
                status, total_weight, total_volume, shipment_value, insurance_required, special_instructions,
                pickup_date, estimated_delivery
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cur.execute(query, (
            data['tracking_number'],
            data['customer_id'],
            data['origin_id'],
            data['destination_id'],
            data.get('route_id'),
            data.get('vehicle_id'),
            data.get('driver_id'),
            data.get('status', 'pending'),
            data['total_weight'],
            data['total_volume'],
            data['shipment_value'],
            data.get('insurance_required', 0),
            data.get('special_instructions', ''),
            data.get('pickup_date'),
            data.get('estimated_delivery')
        ))
        
        mysql.connection.commit()
        shipment_id = cur.lastrowid
        
        # Create initial tracking event if shipment is not pending
        status = data.get('status', 'pending')
        if status != 'pending':
            event_type = 'pickup' if status == 'picked_up' else 'departure'
            cur.execute("""
                INSERT INTO tracking_events (shipment_id, event_type, location_id, notes, recorded_by)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                shipment_id,
                event_type,
                data['origin_id'],
                f'Initial {event_type} event for shipment {data["tracking_number"]}',
                1  # Admin user
            ))
            mysql.connection.commit()
        
        return jsonify({'success': True, 'shipment_id': shipment_id})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/shipments/<int:id>', methods=['PUT'])
def update_shipment(id):
    cur = mysql.connection.cursor()
    try:
        data = request.get_json()
        
        # Get current shipment data to check for vehicle/driver changes
        cur.execute("SELECT vehicle_id, driver_id FROM shipments WHERE shipment_id = %s", (id,))
        current_data = cur.fetchone()
        
        if not current_data:
            return jsonify({'success': False, 'error': 'Shipment not found'}), 404
            
        old_vehicle_id = current_data['vehicle_id']
        old_driver_id = current_data['driver_id']
        
        # Update the shipment
        cur.execute("""
            UPDATE shipments
            SET 
                customer_id = %s,
                origin_id = %s,
                destination_id = %s,
                route_id = %s,
                vehicle_id = %s,
                driver_id = %s,
                status = %s,
                total_weight = %s,
                total_volume = %s,
                shipment_value = %s,
                insurance_required = %s,
                special_instructions = %s,
                pickup_date = %s,
                estimated_delivery = %s
            WHERE shipment_id = %s
        """, (
            data['customer_id'],
            data['origin_id'],
            data['destination_id'],
            data.get('route_id'),
            data.get('vehicle_id'),
            data.get('driver_id'),
            data['status'],
            data['total_weight'],
            data['total_volume'],
            data['shipment_value'],
            data['insurance_required'],
            data.get('special_instructions'),
            data.get('pickup_date'),
            data.get('estimated_delivery'),
            id
        ))
        
        # Handle vehicle status changes
        if old_vehicle_id != data.get('vehicle_id'):
            # Reset old vehicle if it was changed
            if old_vehicle_id:
                cur.execute("UPDATE vehicles SET status = 'available' WHERE vehicle_id = %s", (old_vehicle_id,))
            
            # Update new vehicle if one was assigned
            if data.get('vehicle_id'):
                cur.execute("UPDATE vehicles SET status = 'in_use' WHERE vehicle_id = %s", (data.get('vehicle_id'),))
        
        # Handle driver status changes
        if old_driver_id != data.get('driver_id'):
            # Reset old driver if it was changed
            if old_driver_id:
                cur.execute("UPDATE drivers SET status = 'available' WHERE driver_id = %s", (old_driver_id,))
            
            # Update new driver if one was assigned
            if data.get('driver_id'):
                cur.execute("UPDATE drivers SET status = 'assigned' WHERE driver_id = %s", (data.get('driver_id'),))
        
        mysql.connection.commit()
        
        # Get the updated shipment details
        cur.execute("""
            SELECT s.*, 
                   CONCAT(o.city, ', ', o.state) as origin,
                   CONCAT(d.city, ', ', d.state) as destination
            FROM shipments s
            JOIN locations o ON s.origin_id = o.location_id
            JOIN locations d ON s.destination_id = d.location_id
            WHERE s.shipment_id = %s
        """, (id,))
        
        updated_shipment = cur.fetchone()
        return jsonify(updated_shipment)
        
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/shipments/<int:id>', methods=['GET'])
def get_shipment(id):
    try:
        cur = mysql.connection.cursor()
        
        # Get URL parameters for user filtering
        user_id = request.args.get('user_id')
        user_type = request.args.get('user_type')
        
        # Check if user has permission to view this shipment
        if user_id and user_type and user_type != 'admin':
            shipment_accessible = False
            
            if user_type == 'customer':
                # Check if shipment belongs to this customer
                cur.execute("""
                    SELECT 1 FROM shipments s
                    JOIN customers c ON s.customer_id = c.customer_id
                    WHERE s.shipment_id = %s AND c.user_id = %s
                """, [id, user_id])
                if cur.fetchone():
                    shipment_accessible = True
            elif user_type == 'driver':
                # Check if shipment is assigned to this driver
                cur.execute("""
                    SELECT 1 FROM shipments s
                    JOIN drivers d ON s.driver_id = d.driver_id
                    WHERE s.shipment_id = %s AND d.user_id = %s
                """, [id, user_id])
                if cur.fetchone():
                    shipment_accessible = True
            
            if not shipment_accessible:
                return jsonify({"error": "You don't have permission to view this shipment"}), 403
        
        # Get the shipment details
        cur.execute("""
            SELECT s.*, 
                   c.company_name,
                   CONCAT(o.address, ', ', o.city, ', ', o.state, ' ', o.postal_code) as origin_address,
                   CONCAT(d.address, ', ', d.city, ', ', d.state, ' ', d.postal_code) as destination_address,
                   u.full_name as driver_name,
                   v.license_plate,
                   v.make, v.model, v.year
            FROM shipments s
            LEFT JOIN customers c ON s.customer_id = c.customer_id
            LEFT JOIN locations o ON s.origin_id = o.location_id
            LEFT JOIN locations d ON s.destination_id = d.location_id
            LEFT JOIN drivers dr ON s.driver_id = dr.driver_id
            LEFT JOIN users u ON dr.user_id = u.user_id
            LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
            WHERE s.shipment_id = %s
        """, [id])
        
        shipment = cur.fetchone()
        if not shipment:
            return jsonify({"error": "Shipment not found"}), 404
            
        cur.close()
        return jsonify(shipment)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/shipments/<int:id>/items', methods=['GET'])
def get_shipment_items(id):
    cur = mysql.connection.cursor()
    try:
        cur.execute("SELECT * FROM shipment_items WHERE shipment_id = %s", (id,))
        items = cur.fetchall()
        return jsonify(items)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/shipments/<int:id>/events', methods=['GET'])
def get_shipment_events(id):
    try:
        cur = mysql.connection.cursor()
        
        # Get URL parameters for user filtering
        user_id = request.args.get('user_id')
        user_type = request.args.get('user_type')
        
        # Check if user has permission to view this shipment
        if user_id and user_type:
            shipment_accessible = False
            
            # For admin, all shipments are accessible
            if user_type == 'admin':
                shipment_accessible = True
            elif user_type == 'customer':
                # Check if shipment belongs to this customer
                cur.execute("""
                    SELECT 1 FROM shipments s
                    JOIN customers c ON s.customer_id = c.customer_id
                    WHERE s.shipment_id = %s AND c.user_id = %s
                """, [id, user_id])
                if cur.fetchone():
                    shipment_accessible = True
            elif user_type == 'driver':
                # Check if shipment is assigned to this driver
                cur.execute("""
                    SELECT 1 FROM shipments s
                    JOIN drivers d ON s.driver_id = d.driver_id
                    WHERE s.shipment_id = %s AND d.user_id = %s
                """, [id, user_id])
                if cur.fetchone():
                    shipment_accessible = True
            
            if not shipment_accessible:
                return jsonify({"error": "You don't have permission to view this shipment"}), 403
        
        # Query the events
        cur.execute("""
            SELECT e.*, 
                   l.city, l.state, l.address,
                   u.full_name as recorded_by_name
            FROM tracking_events e
            LEFT JOIN locations l ON e.location_id = l.location_id
            LEFT JOIN users u ON e.recorded_by = u.user_id
            WHERE e.shipment_id = %s
            ORDER BY e.event_timestamp DESC
        """, [id])
        
        events = cur.fetchall()
        cur.close()
        return jsonify(events)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/vehicles', methods=['GET'])
def get_vehicles():
    cur = mysql.connection.cursor()
    try:
        # Get basic vehicle information with location details
        query = """
            SELECT 
                v.vehicle_id, v.license_plate, 
                v.make, v.model, v.year,
                v.capacity_kg, v.vehicle_type, v.status,
                v.last_inspection_date,
                COALESCE(CONCAT(l.city, ', ', l.state), 'Unknown') as current_location
            FROM 
                vehicles v
            LEFT JOIN 
                locations l ON v.current_location_id = l.location_id
            ORDER BY 
                v.vehicle_id ASC
        """
        
        cur.execute(query)
        vehicles = cur.fetchall()
        cur.close()
        return jsonify(vehicles)
    except Exception as e:
        cur.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/vehicles/<int:id>', methods=['DELETE'])
def delete_vehicle(id):
    cur = mysql.connection.cursor()
    try:
        cur.execute("DELETE FROM vehicles WHERE vehicle_id = %s", (id,))
        mysql.connection.commit()
        return jsonify({'success': True})
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/vehicles/<int:id>', methods=['PUT'])
def update_vehicle(id):
    cur = mysql.connection.cursor()
    try:
        data = request.get_json()
        
        # Update the vehicle
        cur.execute("""
            UPDATE vehicles 
            SET license_plate = %s,
                make = %s,
                model = %s,
                year = %s,
                capacity_kg = %s,
                vehicle_type = %s,
                status = %s,
                current_location_id = %s,
                last_inspection_date = %s
            WHERE vehicle_id = %s
        """, (
            data['license_plate'],
            data['make'],
            data['model'],
            data['year'],
            data['capacity_kg'],
            data['vehicle_type'],
            data['status'],
            data.get('current_location_id'),
            data.get('last_inspection_date'),
            id
        ))
        
        mysql.connection.commit()
        
        # Fetch the updated vehicle
        cur.execute("""
            SELECT v.*, 
                   COALESCE(CONCAT(l.city, ', ', l.state), 'Unknown') as current_location
            FROM vehicles v
            LEFT JOIN locations l ON v.current_location_id = l.location_id
            WHERE v.vehicle_id = %s
        """, (id,))
        
        updated_vehicle = cur.fetchone()
        return jsonify(updated_vehicle)
        
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/customers', methods=['GET'])
def get_customers():
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT c.customer_id, u.full_name, c.company_name,
               c.tax_id, c.credit_limit, c.payment_terms,
               u.email, u.phone
        FROM customers c
        JOIN users u ON c.user_id = u.user_id
        ORDER BY c.customer_id
    """)
    customers = cur.fetchall()
    cur.close()
    return jsonify(customers)

@app.route('/api/customers', methods=['POST'])
def create_customer():
    cur = mysql.connection.cursor()
    try:
        data = request.get_json()
        
        # First create the user
        cur.execute("""
            INSERT INTO users (username, full_name, email, phone, user_type, password)
            VALUES (%s, %s, %s, %s, 'customer', %s)
        """, (
            data['email'],  # Using email as username
            data['full_name'],
            data['email'],
            data['phone'],
            data.get('password', 'default_password')  # In production, use proper password hashing
        ))
        user_id = cur.lastrowid
        
        # Then create the customer
        cur.execute("""
            INSERT INTO customers (user_id, company_name, tax_id, credit_limit)
            VALUES (%s, %s, %s, %s)
        """, (
            user_id,
            data['company_name'],
            data['tax_id'],
            data['credit_limit']
        ))
        
        mysql.connection.commit()
        
        # Fetch the created customer
        cur.execute("""
            SELECT c.customer_id, u.full_name, c.company_name,
                   c.tax_id, c.credit_limit, c.payment_terms,
                   u.email, u.phone
            FROM customers c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.customer_id = %s
        """, (cur.lastrowid,))
        
        customer = cur.fetchone()
        return jsonify(customer)
        
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/customers/<int:id>', methods=['DELETE'])
def delete_customer(id):
    cur = mysql.connection.cursor()
    try:
        # First get user_id to delete from users table
        cur.execute("SELECT user_id FROM customers WHERE customer_id = %s", (id,))
        customer = cur.fetchone()
        if not customer:
            return jsonify({'success': False, 'error': 'Customer not found'}), 404
            
        user_id = customer['user_id']
        
        # Delete from customers table
        cur.execute("DELETE FROM customers WHERE customer_id = %s", (id,))
        
        # Delete from users table
        cur.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        
        mysql.connection.commit()
        return jsonify({'success': True})
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/customers/<int:id>', methods=['PUT'])
def update_customer(id):
    cur = mysql.connection.cursor()
    try:
        data = request.get_json()
        
        # First get the user_id
        cur.execute("SELECT user_id FROM customers WHERE customer_id = %s", (id,))
        customer = cur.fetchone()
        if not customer:
            return jsonify({'success': False, 'error': 'Customer not found'}), 404
            
        user_id = customer['user_id']
        
        # Update the user
        cur.execute("""
            UPDATE users 
            SET full_name = %s, email = %s, phone = %s
            WHERE user_id = %s
        """, (
            data['full_name'],
            data['email'],
            data['phone'],
            user_id
        ))
        
        # Update the customer
        cur.execute("""
            UPDATE customers 
            SET company_name = %s, tax_id = %s, credit_limit = %s
            WHERE customer_id = %s
        """, (
            data['company_name'],
            data['tax_id'],
            data['credit_limit'],
            id
        ))
        
        mysql.connection.commit()
        
        # Fetch the updated customer
        cur.execute("""
            SELECT c.customer_id, u.full_name, c.company_name,
                   c.tax_id, c.credit_limit, c.payment_terms,
                   u.email, u.phone
            FROM customers c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.customer_id = %s
        """, (id,))
        
        updated_customer = cur.fetchone()
        return jsonify(updated_customer)
        
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/drivers', methods=['GET'])
def get_drivers():
    try:
        cur = mysql.connection.cursor()
        
        try:
            # Use the exact working query
            query = """
                SELECT 
                    d.driver_id,
                    u.full_name,
                    u.email,
                    u.phone,
                    d.license_number,
                    DATE_FORMAT(d.license_expiry, '%Y-%m-%d') as license_expiry,
                    DATE_FORMAT(d.medical_check_date, '%Y-%m-%d') as medical_check_date,
                    d.training_certification,
                    d.status
                FROM drivers d
                JOIN users u ON d.user_id = u.user_id
                ORDER BY d.driver_id
            """
            
            cur.execute(query)
            drivers = cur.fetchall()
            
            return jsonify({
                'drivers': drivers,
                'total': len(drivers)
            })

        except Exception as mysql_error:
            print("MySQL Error Details:")
            print(f"Error Type: {type(mysql_error).__name__}")
            print(f"Error Message: {str(mysql_error)}")
            return jsonify({'error': f'Database error: {str(mysql_error)}'}), 500
            
        finally:
            cur.close()

    except Exception as e:
        print("General Error Details:")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/drivers', methods=['POST'])
def create_driver():
    cur = mysql.connection.cursor()
    try:
        data = request.get_json()
        
        # First create the user
        cur.execute("""
            INSERT INTO users (username, full_name, email, phone, user_type, password)
            VALUES (%s, %s, %s, %s, 'driver', %s)
        """, (
            data['email'],  # Using email as username
            data['full_name'],
            data['email'],
            data['phone'],
            data.get('password', 'default_password')  # In production, use proper password hashing
        ))
        user_id = cur.lastrowid
        
        # Then create the driver
        cur.execute("""
            INSERT INTO drivers (user_id, license_number, license_expiry, medical_check_date, training_certification, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            data['license_number'],
            data['license_expiry'],
            data['medical_check_date'] if data['medical_check_date'] else None,
            data['training_certification'],
            data['status']
        ))
        
        mysql.connection.commit()
        driver_id = cur.lastrowid
        
        # Fetch and return the newly created driver
        cur.execute("""
            SELECT 
                d.driver_id,
                u.full_name,
                u.email,
                u.phone, 
                d.license_number,
                DATE_FORMAT(d.license_expiry, '%Y-%m-%d') as license_expiry,
                DATE_FORMAT(d.medical_check_date, '%Y-%m-%d') as medical_check_date,
                d.training_certification,
                d.status
            FROM drivers d
            JOIN users u ON d.user_id = u.user_id
            WHERE d.driver_id = %s
        """, (driver_id,))
        
        new_driver = cur.fetchone()
        return jsonify(new_driver)
        
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/drivers/<int:id>', methods=['PUT'])
def update_driver(id):
    cur = mysql.connection.cursor()
    try:
        data = request.get_json()
        
        # First get the user_id
        cur.execute("SELECT user_id FROM drivers WHERE driver_id = %s", (id,))
        driver = cur.fetchone()
        if not driver:
            return jsonify({'success': False, 'error': 'Driver not found'}), 404
            
        user_id = driver['user_id']
        
        # Update the user info
        cur.execute("""
            UPDATE users 
            SET full_name = %s, email = %s, phone = %s
            WHERE user_id = %s
        """, (
            data['full_name'],
            data['email'],
            data['phone'],
            user_id
        ))
        
        # Update the driver info
        cur.execute("""
            UPDATE drivers 
            SET license_number = %s, 
                license_expiry = %s, 
                medical_check_date = %s, 
                training_certification = %s, 
                status = %s
            WHERE driver_id = %s
        """, (
            data['license_number'],
            data['license_expiry'],
            data['medical_check_date'] if data['medical_check_date'] else None,
            data['training_certification'],
            data['status'],
            id
        ))
        
        mysql.connection.commit()
        
        # Fix: Escape the % character by doubling it (%%) to prevent Python from treating it as a format specifier
        cur.execute("""
            SELECT 
                d.driver_id,
                u.full_name,
                u.email,
                u.phone, 
                d.license_number,
                DATE_FORMAT(d.license_expiry, '%%Y-%%m-%%d') as license_expiry,
                DATE_FORMAT(d.medical_check_date, '%%Y-%%m-%%d') as medical_check_date,
                d.training_certification,
                d.status
            FROM drivers d
            JOIN users u ON d.user_id = u.user_id
            WHERE d.driver_id = %s
        """, (id,))
        
        updated_driver = cur.fetchone()
        return jsonify(updated_driver)
        
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/drivers/<int:id>', methods=['DELETE'])
def delete_driver(id):
    cur = mysql.connection.cursor()
    try:
        # First check if driver exists and get user_id
        cur.execute("SELECT user_id FROM drivers WHERE driver_id = %s", (id,))
        driver = cur.fetchone()
        if not driver:
            return jsonify({'success': False, 'error': 'Driver not found'}), 404
            
        user_id = driver['user_id']
        
        # Check if driver is assigned to any shipments
        cur.execute("SELECT COUNT(*) as count FROM shipments WHERE driver_id = %s", (id,))
        result = cur.fetchone()
        if result['count'] > 0:
            return jsonify({
                'success': False, 
                'error': f"Cannot delete driver: assigned to {result['count']} shipment(s)"
            }), 400
        
        # Delete from drivers table
        cur.execute("DELETE FROM drivers WHERE driver_id = %s", (id,))
        
        # Delete from users table
        cur.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        
        mysql.connection.commit()
        return jsonify({'success': True})
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/locations', methods=['GET'])
def get_locations():
    cur = mysql.connection.cursor()
    try:
        cur.execute("""
            SELECT * FROM locations
            ORDER BY city, state
        """)
        locations = cur.fetchall()
        return jsonify(locations)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/locations/<int:id>', methods=['PUT'])
def update_location(id):
    cur = mysql.connection.cursor()
    try:
        data = request.get_json()
        
        # Update the location
        cur.execute("""
            UPDATE locations 
            SET address = %s,
                city = %s,
                state = %s,
                postal_code = %s,
                country = %s,
                latitude = %s,
                longitude = %s,
                location_type = %s
            WHERE location_id = %s
        """, (
            data['address'],
            data['city'],
            data['state'],
            data['postal_code'],
            data['country'],
            data.get('latitude'),
            data.get('longitude'),
            data['location_type'],
            id
        ))
        
        mysql.connection.commit()
        
        # Fetch the updated location
        cur.execute("SELECT * FROM locations WHERE location_id = %s", (id,))
        updated_location = cur.fetchone()
        return jsonify(updated_location)
        
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/warehouses', methods=['GET'])
def get_warehouses():
    cur = mysql.connection.cursor()
    try:
        cur.execute("""
            SELECT w.*, 
                   CONCAT(l.city, ', ', l.state) as location,
                   u.full_name as manager_name
            FROM warehouses w
            LEFT JOIN locations l ON w.location_id = l.location_id
            LEFT JOIN users u ON w.manager_id = u.user_id
            ORDER BY w.warehouse_id ASC
        """)
        warehouses = cur.fetchall()
        return jsonify(warehouses)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/warehouses/<int:id>', methods=['GET'])
def get_warehouse(id):
    cur = mysql.connection.cursor()
    try:
        cur.execute("""
            SELECT w.*, 
                   CONCAT(l.city, ', ', l.state) as location,
                   u.full_name as manager_name
            FROM warehouses w
            LEFT JOIN locations l ON w.location_id = l.location_id
            LEFT JOIN users u ON w.manager_id = u.user_id
            WHERE w.warehouse_id = %s
        """, (id,))
        warehouse = cur.fetchone()
        if not warehouse:
            return jsonify({'error': 'Warehouse not found'}), 404
        return jsonify(warehouse)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/warehouses', methods=['POST'])
def create_warehouse():
    cur = mysql.connection.cursor()
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['location_id', 'warehouse_name', 'capacity']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Check if location is already used by another warehouse
        cur.execute("SELECT 1 FROM warehouses WHERE location_id = %s", (data['location_id'],))
        if cur.fetchone():
            return jsonify({'success': False, 'error': 'Location already has a warehouse'}), 400
        
        # Insert warehouse
        query = """
            INSERT INTO warehouses 
            (location_id, warehouse_name, capacity, current_occupancy, manager_id, operating_hours)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cur.execute(query, (
            data['location_id'],
            data['warehouse_name'],
            data['capacity'],
            data.get('current_occupancy', 0),
            data.get('manager_id'),
            data.get('operating_hours')
        ))
        
        mysql.connection.commit()
        warehouse_id = cur.lastrowid
        return jsonify({'success': True, 'warehouse_id': warehouse_id})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/warehouses/<int:id>', methods=['PUT'])
def update_warehouse(id):
    cur = mysql.connection.cursor()
    try:
        data = request.json
        
        # Validate warehouse exists
        cur.execute("SELECT * FROM warehouses WHERE warehouse_id = %s", (id,))
        if not cur.fetchone():
            return jsonify({'success': False, 'error': 'Warehouse not found'}), 404
        
        # Build update query dynamically based on provided fields
        update_fields = []
        params = []
        
        fields = {
            'warehouse_name': 'warehouse_name = %s',
            'capacity': 'capacity = %s',
            'current_occupancy': 'current_occupancy = %s',
            'manager_id': 'manager_id = %s',
            'operating_hours': 'operating_hours = %s'
        }
        
        for field, sql in fields.items():
            if field in data:
                update_fields.append(sql)
                params.append(data[field])
        
        # Add warehouse_id as the last parameter
        params.append(id)
        
        if not update_fields:
            return jsonify({'success': False, 'error': 'No fields to update'}), 400
        
        query = "UPDATE warehouses SET " + ", ".join(update_fields) + " WHERE warehouse_id = %s"
        cur.execute(query, params)
        
        mysql.connection.commit()
        return jsonify({'success': True})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/warehouses/<int:id>', methods=['DELETE'])
def delete_warehouse(id):
    cur = mysql.connection.cursor()
    try:
        # Check if warehouse exists
        cur.execute("SELECT * FROM warehouses WHERE warehouse_id = %s", (id,))
        if not cur.fetchone():
            return jsonify({'success': False, 'error': 'Warehouse not found'}), 404
        
        # Check if warehouse has any shipments
        cur.execute("SELECT COUNT(*) as count FROM shipments WHERE origin_id IN (SELECT location_id FROM warehouses WHERE warehouse_id = %s) OR destination_id IN (SELECT location_id FROM warehouses WHERE warehouse_id = %s)", (id, id))
        result = cur.fetchone()
        if result['count'] > 0:
            return jsonify({'success': False, 'error': 'Cannot delete warehouse: has associated shipments'}), 400
        
        # Delete warehouse
        cur.execute("DELETE FROM warehouses WHERE warehouse_id = %s", (id,))
        mysql.connection.commit()
        return jsonify({'success': True})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/routes', methods=['GET'])
def get_routes():
    cur = mysql.connection.cursor()
    try:
        cur.execute("""
            SELECT r.*, 
                   CONCAT(o.city, ', ', o.state) as start_location,
                   CONCAT(d.city, ', ', d.state) as end_location 
            FROM routes r
            JOIN locations o ON r.origin_id = o.location_id
            JOIN locations d ON r.destination_id = d.location_id
            ORDER BY r.route_name
        """)
        
        routes = cur.fetchall()
        return jsonify(routes)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/routes', methods=['POST'])
def create_route():
    cur = mysql.connection.cursor()
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['route_name', 'origin_id', 'destination_id', 'distance_km', 'estimated_duration_min']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Insert route
        query = """
            INSERT INTO routes 
            (route_name, origin_id, destination_id, distance_km, estimated_duration_min, status, hazard_level)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cur.execute(query, (
            data['route_name'],
            data['origin_id'],
            data['destination_id'],
            data['distance_km'],
            data['estimated_duration_min'],
            data.get('status', 'active'),
            data.get('hazard_level', 'low')
        ))
        
        mysql.connection.commit()
        route_id = cur.lastrowid
        return jsonify({'success': True, 'route_id': route_id})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/routes/<int:id>', methods=['PUT'])
def update_route(id):
    cur = mysql.connection.cursor()
    try:
        data = request.json
        
        # Validate route exists
        cur.execute("SELECT * FROM routes WHERE route_id = %s", (id,))
        if not cur.fetchone():
            return jsonify({'success': False, 'error': 'Route not found'}), 404
        
        # Build update query dynamically based on provided fields
        update_fields = []
        params = []
        
        fields = {
            'route_name': 'route_name = %s',
            'origin_id': 'origin_id = %s',
            'destination_id': 'destination_id = %s',
            'distance_km': 'distance_km = %s',
            'estimated_duration_min': 'estimated_duration_min = %s',
            'status': 'status = %s',
            'hazard_level': 'hazard_level = %s'
        }
        
        for field, sql in fields.items():
            if field in data:
                update_fields.append(sql)
                params.append(data[field])
        
        # Add route_id as the last parameter
        params.append(id)
        
        if not update_fields:
            return jsonify({'success': False, 'error': 'No fields to update'}), 400
        
        query = "UPDATE routes SET " + ", ".join(update_fields) + " WHERE route_id = %s"
        cur.execute(query, params)
        
        mysql.connection.commit()
        return jsonify({'success': True})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/routes/<int:id>', methods=['DELETE'])
def delete_route(id):
    cur = mysql.connection.cursor()
    try:
        # Check if route is used in shipments
        cur.execute("SELECT COUNT(*) as count FROM shipments WHERE route_id = %s", (id,))
        result = cur.fetchone()
        if result['count'] > 0:
            return jsonify({
                'success': False, 
                'error': f"Cannot delete route: it is used by {result['count']} shipment(s)"
            }), 400
        
        # Check if route has waypoints
        cur.execute("SELECT COUNT(*) as count FROM waypoints WHERE route_id = %s", (id,))
        result = cur.fetchone()
        if result['count'] > 0:
            # Delete associated waypoints first
            cur.execute("DELETE FROM waypoints WHERE route_id = %s", (id,))
            
        # Delete route
        cur.execute("DELETE FROM routes WHERE route_id = %s", (id,))
        mysql.connection.commit()
        return jsonify({'success': True})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/tracking-events', methods=['GET'])
def get_tracking_events():
    cur = mysql.connection.cursor()
    # Updated query with proper endpoint name and fields
    cur.execute("""
        SELECT 
            e.event_id, 
            e.shipment_id, 
            e.event_type,
            CONCAT(l.city, ', ', l.state) as location,
            e.location_id,
            e.event_timestamp,
            e.recorded_by,
            COALESCE(e.notes, '') as notes
        FROM tracking_events e
        JOIN locations l ON e.location_id = l.location_id
        ORDER BY e.event_timestamp DESC
    """)
    events = cur.fetchall()
    cur.close()
    return jsonify(events)

@app.route('/api/tracking-events', methods=['POST'])
def create_tracking_event():
    cur = mysql.connection.cursor()
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['shipment_id', 'event_type', 'location_id']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Insert tracking event
        query = """
            INSERT INTO tracking_events 
            (shipment_id, event_type, location_id, notes, recorded_by)
            VALUES (%s, %s, %s, %s, %s)
        """
        
        cur.execute(query, (
            data['shipment_id'],
            data['event_type'],
            data['location_id'],
            data.get('notes', ''),
            data.get('recorded_by', 1)  # Default to admin user if not specified
        ))
        
        mysql.connection.commit()
        event_id = cur.lastrowid
        
        # Update shipment status based on event type
        update_shipment_status(cur, data['shipment_id'], data['event_type'])
        mysql.connection.commit()
        
        return jsonify({'success': True, 'event_id': event_id})
                
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/shipment/<int:shipment_id>/tracking', methods=['GET'])
def get_shipment_tracking_events(shipment_id):
    try:
        cur = mysql.connection.cursor()
        
        # First check if the shipment exists
        cur.execute("SELECT * FROM shipments WHERE shipment_id = %s", (shipment_id,))
        shipment = cur.fetchone()
        
        if not shipment:
            return jsonify({'error': 'Shipment not found'}), 404
        
        # Get tracking events for the shipment with additional info
        cur.execute("""
            SELECT te.*, 
                   s.tracking_number,
                   CONCAT(l.city, ', ', l.state) as location,
                   u.full_name as recorded_by_name
            FROM tracking_events te
            JOIN shipments s ON te.shipment_id = s.shipment_id
            LEFT JOIN locations l ON te.location_id = l.location_id
            LEFT JOIN users u ON te.recorded_by = u.user_id
            WHERE te.shipment_id = %s
            ORDER BY te.event_timestamp DESC
        """, (shipment_id,))
        
        events = cur.fetchall()
        
        # Convert datetime objects to string format
        for event in events:
            if event['event_timestamp']:
                event['event_timestamp'] = event['event_timestamp'].isoformat()
        
        cur.close()
        return jsonify(events)
    except Exception as e:
        print(f"Error in get_shipment_tracking_events: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/shipments/<int:id>/items', methods=['DELETE'])
def delete_shipment_item(id):
    cur = mysql.connection.cursor()
    try:
        # Get shipment_id before deleting
        cur.execute("SELECT shipment_id FROM shipment_items WHERE item_id = %s", (id,))
        result = cur.fetchone()
        if not result:
            return jsonify({'success': False, 'error': 'Item not found'}), 404
        
        shipment_id = result['shipment_id']
        
        # Delete item
        cur.execute("DELETE FROM shipment_items WHERE item_id = %s", (id,))
        
        # Update shipment totals
        update_shipment_totals(cur, shipment_id)
        
        mysql.connection.commit()
        return jsonify({'success': True})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/shipment-items', methods=['GET'])
def get_all_shipment_items():
    cur = mysql.connection.cursor()
    try:
        cur.execute("""
            SELECT si.*, s.tracking_number
            FROM shipment_items si
            JOIN shipments s ON si.shipment_id = s.shipment_id
            ORDER BY si.item_id DESC
        """)
        items = cur.fetchall()
        return jsonify(items)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/shipment-items', methods=['POST'])
def create_shipment_item():
    cur = mysql.connection.cursor()
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['shipment_id', 'description', 'quantity', 'weight', 'volume', 'item_value']
        for field in required_fields:
            if field not in data or data[field] == '':
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Insert item
        query = """
            INSERT INTO shipment_items
            (shipment_id, description, quantity, weight, volume, item_value, is_hazardous, is_fragile)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        cur.execute(query, (
            data['shipment_id'],
            data['description'],
            data['quantity'],
            data['weight'],
            data['volume'],
            data['item_value'],
            data.get('is_hazardous', 0),
            data.get('is_fragile', 0)
        ))
        
        mysql.connection.commit()
        item_id = cur.lastrowid
        
        # Update shipment totals after adding item
        update_shipment_totals(cur, data['shipment_id'])
        mysql.connection.commit()
        
        return jsonify({'success': True, 'item_id': item_id})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/shipment-items/<int:id>', methods=['PUT'])
def update_shipment_item(id):
    cur = mysql.connection.cursor()
    try:
        data = request.json
        
        # Get current shipment_id before updating
        cur.execute("SELECT shipment_id FROM shipment_items WHERE item_id = %s", (id,))
        result = cur.fetchone()
        if not result:
            return jsonify({'success': False, 'error': 'Item not found'}), 404
        
        old_shipment_id = result['shipment_id']
        new_shipment_id = data.get('shipment_id')
        
        # Update item
        query = """
            UPDATE shipment_items
            SET shipment_id = %s,
                description = %s,
                quantity = %s,
                weight = %s,
                volume = %s,
                item_value = %s,
                is_hazardous = %s,
                is_fragile = %s
            WHERE item_id = %s
        """
        cur.execute(query, (
            data['shipment_id'],
            data['description'],
            data['quantity'],
            data['weight'],
            data['volume'],
            data['item_value'],
            data.get('is_hazardous', 0),
            data.get('is_fragile', 0),
            id
        ))
        
        mysql.connection.commit()
        
        # Update totals for affected shipments
        update_shipment_totals(cur, old_shipment_id)
        if new_shipment_id != old_shipment_id:
            update_shipment_totals(cur, new_shipment_id)
        
        mysql.connection.commit()
        return jsonify({'success': True})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

# Helper function to update shipment totals (weight, volume, value)
def update_shipment_totals(cur, shipment_id):
    try:
        # Calculate totals
        cur.execute("""
            SELECT 
                SUM(quantity * weight) as total_weight,
                SUM(quantity * volume) as total_volume,
                SUM(quantity * item_value) as total_value
            FROM shipment_items
            WHERE shipment_id = %s
        """, (shipment_id,))
        
        totals = cur.fetchone()
        
        # Set default values if no items
        total_weight = totals['total_weight'] or 0
        total_volume = totals['total_volume'] or 0
        total_value = totals['total_value'] or 0
        
        # Update shipment
        cur.execute("""
            UPDATE shipments
            SET total_weight = %s, total_volume = %s, shipment_value = %s
            WHERE shipment_id = %s
        """, (total_weight, total_volume, total_value, shipment_id))
        
    except Exception as e:
        print(f"Error updating shipment totals: {str(e)}")
        raise

# Helper function to update shipment status based on event type
def update_shipment_status(cursor, shipment_id, event_type):
    """
    Updates shipment status based on the event type
    """
    new_status = None
    
    # Map event types to shipment statuses
    if event_type == 'pickup':
        new_status = 'picked_up'
    elif event_type == 'departure':
        new_status = 'in_transit'
    elif event_type == 'arrival':
        # Keep as in_transit - arrival might be at intermediate locations
        new_status = 'in_transit'
    elif event_type == 'delivery':
        new_status = 'delivered'
    
    # Only update if we have a valid status mapping
    if new_status:
        cursor.execute("""
            UPDATE shipments 
            SET status = %s 
            WHERE shipment_id = %s
        """, (new_status, shipment_id))

# Helper function to recalculate shipment status based on most recent event
def recalculate_shipment_status(cur, shipment_id):
    # Get the most recent event for the shipment
    cur.execute("""
        SELECT event_type 
        FROM tracking_events 
        WHERE shipment_id = %s 
        ORDER BY event_timestamp DESC 
        LIMIT 1
    """, (shipment_id,))
    
    result = cur.fetchone()
    
    if result:
        # Update status based on most recent event
        update_shipment_status(cur, shipment_id, result['event_type'])
    else:
        # If no events left, set status back to pending
        cur.execute("UPDATE shipments SET status = 'pending' WHERE shipment_id = %s", (shipment_id,))

@app.route('/api/driver/<int:id>/performance', methods=['GET'])
def get_driver_performance(id):
    cur = mysql.connection.cursor()
    try:
        # Call the stored procedure for driver performance
        cur.execute("CALL get_driver_performance(%s)", (id,))
        performance_data = cur.fetchall()
        
        # If there are multiple result sets, we need to close this cursor and get a new one
        if cur.nextset():
            more_results = cur.fetchall()
            performance_data = {
                'main_stats': performance_data,
                'details': more_results
            }
        
        return jsonify({
            'success': True,
            'driver_id': id,
            'performance': performance_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    cur = mysql.connection.cursor()
    try:
        # Get overall statistics
        cur.execute("""
            SELECT 
                (SELECT COUNT(*) FROM shipments) as totalShipments,
                (SELECT COUNT(*) FROM shipments WHERE status = 'pending') as pending,
                (SELECT COUNT(*) FROM shipments WHERE status = 'in_transit') as inTransit,
                (SELECT COUNT(*) FROM shipments WHERE status = 'delivered') as delivered,
                (SELECT COUNT(*) FROM customers) as customers,
                (SELECT COUNT(*) FROM drivers) as drivers,
                (SELECT COUNT(*) FROM vehicles) as vehicles,
                (SELECT COUNT(*) FROM vehicles WHERE status = 'available') as availableVehicles
        """)
        
        stats = cur.fetchone()
        
        # Get monthly shipment data for charts
        cur.execute("""
            SELECT 
                DATE_FORMAT(created_at, '%b %Y') as month,
                COUNT(*) as shipment_count,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(shipment_value) as total_value
            FROM shipments
            WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%b %Y')
            ORDER BY MIN(created_at) ASC
        """)
        
        monthly_data = cur.fetchall()
        
        # Get status distribution for chart
        cur.execute("""
            SELECT 
                status,
                COUNT(*) as count
            FROM shipments
            GROUP BY status
        """)
        
        status_distribution = cur.fetchall()
        
        # Format the response correctly for the frontend
        return jsonify({
            'totalShipments': stats['totalShipments'],
            'pending': stats['pending'],
            'inTransit': stats['inTransit'],
            'delivered': stats['delivered'],
            'customers': stats['customers'],
            'drivers': stats['drivers'],
            'vehicles': stats['vehicles'],
            'monthlyData': monthly_data,
            'statusDistribution': status_distribution
        })
        
    except Exception as e:
        print(f"Error in admin stats: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/customer/stats/<int:customer_id>', methods=['GET'])
def get_customer_stats(customer_id):
    try:
        cur = mysql.connection.cursor()
        
        # Get customer info
        cur.execute("SELECT * FROM customers WHERE customer_id = %s", [customer_id])
        customer = cur.fetchone()
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        # Get basic stats for the customer
        cur.execute("""
            SELECT 
                COUNT(*) as total_shipments,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned,
                SUM(shipment_value) as total_value
            FROM shipments
            WHERE customer_id = %s
        """, [customer_id])
        stats = cur.fetchone()
        
        # Get monthly data (last 6 months)
        cur.execute("""
            SELECT 
                DATE_FORMAT(created_at, '%b %Y') as month,
                COUNT(*) as shipment_count,
                SUM(shipment_value) as total_value
            FROM shipments
            WHERE customer_id = %s
                AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%b %Y')
            ORDER BY MIN(created_at) ASC
        """, [customer_id])
        monthly_data = cur.fetchall()
        
        # Get recent shipments
        cur.execute("""
            SELECT s.*, 
                   o.city as origin_city, o.state as origin_state,
                   d.city as destination_city, d.state as destination_state
            FROM shipments s
            JOIN locations o ON s.origin_id = o.location_id
            JOIN locations d ON s.destination_id = d.location_id
            WHERE s.customer_id = %s
            ORDER BY s.created_at DESC
            LIMIT 5
        """, [customer_id])
        recent_shipments = cur.fetchall()
        
        return jsonify({
            'stats': stats,
            'monthlyData': monthly_data,
            'recentShipments': recent_shipments
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/driver/stats/<int:driver_id>', methods=['GET'])
def get_driver_stats(driver_id):
    try:
        cur = mysql.connection.cursor()
        
        # Get driver info
        cur.execute("SELECT * FROM drivers WHERE driver_id = %s", [driver_id])
        driver = cur.fetchone()
        
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404
        
        # Get basic stats for the driver
        cur.execute("""
            SELECT 
                COUNT(*) as total_assigned,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned
            FROM shipments
            WHERE driver_id = %s
        """, [driver_id])
        basic_stats = cur.fetchone() or {}
        
        # Get completion rate
        cur.execute("""
            SELECT 
                COUNT(*) as total_deliveries,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_deliveries,
                CASE 
                    WHEN COUNT(*) > 0 
                    THEN ROUND((SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1)
                    ELSE 0 
                END as completion_rate
            FROM shipments
            WHERE driver_id = %s AND status IN ('delivered', 'returned')
        """, [driver_id])
        completion_data = cur.fetchone() or {}
        
        # Get average delivery time difference from estimated (in hours)
        cur.execute("""
            SELECT 
                AVG(TIMESTAMPDIFF(HOUR, estimated_delivery, actual_delivery)) as avg_delivery_time_diff
            FROM shipments
            WHERE 
                driver_id = %s AND 
                status = 'delivered' AND 
                estimated_delivery IS NOT NULL AND 
                actual_delivery IS NOT NULL
        """, [driver_id])
        time_data = cur.fetchone() or {}
        
        # Get active days (days with events in the last 30 days)
        cur.execute("""
            SELECT 
                COUNT(DISTINCT DATE(event_timestamp)) as active_days
            FROM tracking_events te
            JOIN shipments s ON te.shipment_id = s.shipment_id
            WHERE 
                s.driver_id = %s AND
                te.event_timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        """, [driver_id])
        activity_data = cur.fetchone() or {}
        
        # Get recent deliveries
        cur.execute("""
            SELECT s.*, 
                   o.city as origin_city, o.state as origin_state,
                   d.city as destination_city, d.state as destination_state
            FROM shipments s
            JOIN locations o ON s.origin_id = o.location_id
            JOIN locations d ON s.destination_id = d.location_id
            WHERE s.driver_id = %s
            ORDER BY 
                CASE 
                    WHEN s.status = 'in_transit' THEN 1
                    WHEN s.status = 'pending' THEN 2
                    ELSE 3
                END,
                s.created_at DESC
            LIMIT 5
        """, [driver_id])
        recent_deliveries = cur.fetchall() or []
        
        # Combine all stats
        stats = {
            **basic_stats,
            'completion_rate': completion_data.get('completion_rate', 0),
            'avg_delivery_time_diff': time_data.get('avg_delivery_time_diff', 0),
            'active_days': activity_data.get('active_days', 0)
        }
        
        return jsonify({
            'stats': stats,
            'recent_deliveries': recent_deliveries
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/driver/<int:driver_id>/schedule', methods=['GET'])
def get_driver_schedule(driver_id):
    try:
        cur = mysql.connection.cursor()
        
        # Get upcoming schedule for the driver
        cur.execute("""
            SELECT 
                s.*,
                o.city as origin_city, o.state as origin_state,
                d.city as destination_city, d.state as destination_state,
                c.company_name as customer_name
            FROM 
                shipments s
            JOIN 
                locations o ON s.origin_id = o.location_id
            JOIN 
                locations d ON s.destination_id = d.location_id
            JOIN
                customers c ON s.customer_id = c.customer_id
            WHERE 
                s.driver_id = %s AND 
                s.status IN ('pending', 'picked_up', 'in_transit')
            ORDER BY 
                s.pickup_date ASC, s.estimated_delivery ASC
        """, [driver_id])
        schedule = cur.fetchall() or []
        
        # Get route waypoints for current shipments
        waypoints = []
        for shipment in schedule:
            if shipment.get('route_id'):
                cur.execute("""
                    SELECT 
                        w.*,
                        l.city, l.state
                    FROM 
                        waypoints w
                    JOIN
                        locations l ON w.location_id = l.location_id
                    WHERE 
                        w.route_id = %s
                    ORDER BY 
                        w.sequence_number
                """, [shipment['route_id']])
                shipment_waypoints = cur.fetchall() or []
                
                if shipment_waypoints:
                    waypoints.append({
                        'shipment_id': shipment['shipment_id'],
                        'waypoints': shipment_waypoints
                    })
        
        return jsonify({
            'schedule': schedule,
            'waypoints': waypoints
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

# Fixed route handler for duplicate /api/ prefixes
@app.route('/api/api/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
def handle_duplicate_api(subpath):
    # Create a new request to the proper endpoint
    from flask import redirect
    
    # Reconstruct the URL without the duplicate /api/
    target_url = f'/api/{subpath}'
    
    # Keep the query string if there is one
    if request.query_string:
        target_url = f"{target_url}?{request.query_string.decode('utf-8')}"
    
    # Redirect to the correct endpoint
    return redirect(target_url)

@app.route('/api/register', methods=['POST'])
def register():
    try:
        # Extract data from request
        data = request.json
        username = data.get('username')
        password = data.get('password')
        full_name = data.get('full_name')
        email = data.get('email')
        phone = data.get('phone')
        user_type = data.get('user_type')  # 'customer' or 'driver'
        
        # Additional info based on user type
        company_name = data.get('company_name')  # for customer
        tax_id = data.get('tax_id')  # for customer
        
        license_number = data.get('license_number')  # for driver
        license_expiry = data.get('license_expiry')  # for driver
        
        # Validate required fields
        if not all([username, password, full_name, email, phone, user_type]):
            return jsonify({'error': 'Missing required fields'}), 400
            
        # Validate user type
        if user_type not in ['customer', 'driver']:
            return jsonify({'error': 'Invalid user type. Must be customer or driver'}), 400
            
        # Validate type-specific fields
        if user_type == 'customer' and not company_name:
            return jsonify({'error': 'Company name is required for customer registration'}), 400
            
        if user_type == 'driver' and not all([license_number, license_expiry]):
            return jsonify({'error': 'License information is required for driver registration'}), 400
        
        cur = mysql.connection.cursor()
        
        # Check if username or email already exists
        cur.execute("SELECT * FROM users WHERE username = %s OR email = %s", [username, email])
        existing_user = cur.fetchone()
        
        if existing_user:
            cur.close()
            return jsonify({'error': 'Username or email already exists'}), 409
        
        # Insert the new user
        cur.execute("""
            INSERT INTO users (username, password, full_name, email, phone, user_type) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """, [username, password, full_name, email, phone, user_type])
        
        # Get the new user_id
        user_id = cur.lastrowid
        
        # Create customer or driver record
        if user_type == 'customer':
            cur.execute("""
                INSERT INTO customers (user_id, company_name, tax_id)
                VALUES (%s, %s, %s)
            """, [user_id, company_name, tax_id])
        elif user_type == 'driver':
            cur.execute("""
                INSERT INTO drivers (user_id, license_number, license_expiry)
                VALUES (%s, %s, %s)
            """, [user_id, license_number, license_expiry])
        
        mysql.connection.commit()
        cur.close()
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user_id': user_id
        }), 201
        
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/customer-dashboard/<int:user_id>', methods=['GET'])
def get_customer_dashboard(user_id):
    try:
        cur = mysql.connection.cursor()
        
        # Get customer info
        cur.execute("""
            SELECT c.*, u.full_name, u.email, u.phone 
            FROM customers c 
            JOIN users u ON c.user_id = u.user_id 
            WHERE c.user_id = %s
        """, [user_id])
        customer_info = cur.fetchone()
        
        if not customer_info:
            return jsonify({'error': 'Customer not found'}), 404
        
        # Get customer's shipments with additional info
        cur.execute("""
            SELECT s.*, 
                   CONCAT(o.city, ', ', o.state) as origin,
                   CONCAT(d.city, ', ', d.state) as destination
            FROM shipments s
            LEFT JOIN locations o ON s.origin_id = o.location_id
            LEFT JOIN locations d ON s.destination_id = d.location_id
            WHERE s.customer_id = %s
            ORDER BY s.created_at DESC
        """, [customer_info['customer_id']])
        shipments = cur.fetchall()
        
        # Format datetime fields for JSON serialization
        for shipment in shipments:
            if 'created_at' in shipment:
                shipment['created_at'] = shipment['created_at'].isoformat() if shipment['created_at'] else None
            if 'pickup_date' in shipment:
                shipment['pickup_date'] = shipment['pickup_date'].isoformat() if shipment['pickup_date'] else None
            if 'estimated_delivery' in shipment:
                shipment['estimated_delivery'] = shipment['estimated_delivery'].isoformat() if shipment['estimated_delivery'] else None
            if 'actual_delivery' in shipment:
                shipment['actual_delivery'] = shipment['actual_delivery'].isoformat() if shipment['actual_delivery'] else None
        
        # Get shipment items for recent shipments (limit to last 5 shipments)
        shipment_ids = [s['shipment_id'] for s in shipments[:5]] if shipments else []
        
        shipment_items = []
        if shipment_ids:
            placeholders = ', '.join(['%s'] * len(shipment_ids))
            cur.execute(f"""
                SELECT si.*, s.tracking_number 
                FROM shipment_items si
                JOIN shipments s ON si.shipment_id = s.shipment_id
                WHERE si.shipment_id IN ({placeholders})
                ORDER BY s.created_at DESC
            """, shipment_ids)
            shipment_items = cur.fetchall()
        
        cur.close()
        
        # Return the dashboard data
        return jsonify({
            'customer_info': customer_info,
            'shipments': shipments,
            'shipment_items': shipment_items
        })
        
    except Exception as e:
        print(f"Error in get_customer_dashboard: {e}")
        return jsonify({'error': str(e)}), 500



@app.route('/api/driver-dashboard/<int:user_id>', methods=['GET'])
def get_driver_dashboard(user_id):
    try:
        cur = mysql.connection.cursor()
        
        # Get driver info
        cur.execute("""
            SELECT d.*, u.full_name, u.email, u.phone 
            FROM drivers d 
            JOIN users u ON d.user_id = u.user_id 
            WHERE d.user_id = %s
        """, [user_id])
        driver_info = cur.fetchone()
        
        if not driver_info:
            return jsonify({'error': 'Driver not found'}), 404
        
        # Get assigned vehicles
        cur.execute("""
            SELECT v.* 
            FROM vehicles v
            JOIN shipments s ON s.vehicle_id = v.vehicle_id
            WHERE s.driver_id = %s AND s.status IN ('pending', 'picked_up', 'in_transit')
            GROUP BY v.vehicle_id
        """, [driver_info['driver_id']])
        vehicles = cur.fetchall()
        
        # Format dates in vehicles
        for vehicle in vehicles:
            if 'last_inspection_date' in vehicle:
                vehicle['last_inspection_date'] = vehicle['last_inspection_date'].isoformat() if vehicle['last_inspection_date'] else None
        
        # Get driver's shipments with additional info
        cur.execute("""
            SELECT s.*, 
                   c.company_name,
                   CONCAT(o.city, ', ', o.state) as origin,
                   CONCAT(d.city, ', ', d.state) as destination,
                   v.license_plate
            FROM shipments s
            LEFT JOIN customers c ON s.customer_id = c.customer_id
            LEFT JOIN locations o ON s.origin_id = o.location_id
            LEFT JOIN locations d ON s.destination_id = d.location_id
            LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
            WHERE s.driver_id = %s
            ORDER BY 
                CASE 
                    WHEN s.status = 'pending' THEN 1
                    WHEN s.status = 'picked_up' THEN 2
                    WHEN s.status = 'in_transit' THEN 3
                    WHEN s.status = 'delivered' THEN 4
                    WHEN s.status = 'returned' THEN 5
                END,
                s.created_at DESC
        """, [driver_info['driver_id']])
        shipments = cur.fetchall()
        
        # Format datetime fields for JSON serialization
        for shipment in shipments:
            if 'created_at' in shipment:
                shipment['created_at'] = shipment['created_at'].isoformat() if shipment['created_at'] else None
            if 'pickup_date' in shipment:
                shipment['pickup_date'] = shipment['pickup_date'].isoformat() if shipment['pickup_date'] else None
            if 'estimated_delivery' in shipment:
                shipment['estimated_delivery'] = shipment['estimated_delivery'].isoformat() if shipment['estimated_delivery'] else None
            if 'actual_delivery' in shipment:
                shipment['actual_delivery'] = shipment['actual_delivery'].isoformat() if shipment['actual_delivery'] else None
        
        # Get recent tracking events for this driver
        cur.execute("""
            SELECT te.*, s.tracking_number
            FROM tracking_events te
            JOIN shipments s ON te.shipment_id = s.shipment_id
            WHERE te.recorded_by = %s OR s.driver_id = %s
            ORDER BY te.event_timestamp DESC
            LIMIT 10
        """, [user_id, driver_info['driver_id']])
        recent_tracking_events = cur.fetchall()
        
        # Format datetime fields for tracking events
        for event in recent_tracking_events:
            if 'event_timestamp' in event:
                event['event_timestamp'] = event['event_timestamp'].isoformat() if event['event_timestamp'] else None
        
        cur.close()
        
        # Format dates in driver_info
        if 'license_expiry' in driver_info:
            driver_info['license_expiry'] = driver_info['license_expiry'].isoformat() if driver_info['license_expiry'] else None
        if 'medical_check_date' in driver_info:
            driver_info['medical_check_date'] = driver_info['medical_check_date'].isoformat() if driver_info['medical_check_date'] else None
        
        # Return the dashboard data
        return jsonify({
            'driver_info': driver_info,
            'vehicles': vehicles,
            'shipments': shipments,
            'recent_tracking_events': recent_tracking_events
        })
        
    except Exception as e:
        print(f"Error in get_driver_dashboard: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)