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
    cur = mysql.connection.cursor()
    # Updated to match actual table structure using shipment_id not id
    cur.execute("""
        SELECT s.shipment_id, s.tracking_number, s.status, 
               CONCAT(l1.city, ', ', l1.state) as origin,
               CONCAT(l2.city, ', ', l2.state) as destination,
               s.created_at
        FROM shipments s
        JOIN locations l1 ON s.origin_id = l1.location_id
        JOIN locations l2 ON s.destination_id = l2.location_id
        ORDER BY s.created_at DESC
    """)
    shipments = cur.fetchall()
    cur.close()
    return jsonify(shipments)

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
    cur = mysql.connection.cursor()
    try:
        cur.execute("""
            SELECT s.*, 
                   CONCAT(o.city, ', ', o.state) as origin_location,
                   CONCAT(d.city, ', ', d.state) as destination_location,
                   c.company_name, u.full_name as customer_name,
                   v.license_plate, v.make, v.model,
                   du.full_name as driver_name
            FROM shipments s
            JOIN locations o ON s.origin_id = o.location_id
            JOIN locations d ON s.destination_id = d.location_id
            JOIN customers c ON s.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
            LEFT JOIN drivers dr ON s.driver_id = dr.driver_id
            LEFT JOIN users du ON dr.user_id = du.user_id
            WHERE s.shipment_id = %s
        """, (id,))
        
        shipment = cur.fetchone()
        
        if not shipment:
            return jsonify({'success': False, 'error': 'Shipment not found'}), 404
        
        # Get shipment items
        cur.execute("""
            SELECT * FROM shipment_items WHERE shipment_id = %s
        """, (id,))
        
        items = cur.fetchall()
        shipment['items'] = items
        
        # Get tracking events
        cur.execute("""
            SELECT e.*, 
                  CONCAT(l.city, ', ', l.state) as location_name,
                  u.full_name as recorded_by_name
            FROM tracking_events e
            LEFT JOIN locations l ON e.location_id = l.location_id
            LEFT JOIN users u ON e.recorded_by = u.user_id
            WHERE e.shipment_id = %s
            ORDER BY e.event_timestamp DESC
        """, (id,))
        
        events = cur.fetchall()
        shipment['tracking_events'] = events
        
        return jsonify(shipment)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

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
    cur = mysql.connection.cursor()
    try:
        cur.execute("""
            SELECT e.*, 
                  CONCAT(l.city, ', ', l.state) as location_name,
                  u.full_name as recorded_by_name
            FROM tracking_events e
            LEFT JOIN locations l ON e.location_id = l.location_id
            LEFT JOIN users u ON e.recorded_by = u.user_id
            WHERE e.shipment_id = %s
            ORDER BY e.event_timestamp DESC
        """, (id,))
        
        events = cur.fetchall()
        return jsonify(events)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/vehicles', methods=['GET'])
def get_vehicles():
    cur = mysql.connection.cursor()
    # Fixed query with backticks around field names to prevent reserved word conflicts
    cur.execute("""
        SELECT 
            v.vehicle_id, 
            v.license_plate, 
            v.make, 
            v.model, 
            v.year, 
            v.vehicle_type, 
            v.status, 
            v.capacity_kg,
            CONCAT(l.city, ', ', l.state) as current_location
        FROM vehicles v
        LEFT JOIN locations l ON v.current_location_id = l.location_id
        ORDER BY v.vehicle_id
    """)
    vehicles = cur.fetchall()
    cur.close()
    return jsonify(vehicles)

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
            SELECT location_id, address, city, state, country, postal_code, 
                   latitude, longitude, location_type
            FROM locations
            ORDER BY city, state
        """)
        
        locations = cur.fetchall()
        return jsonify(locations)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/warehouses', methods=['GET'])
def get_warehouses():
    cur = mysql.connection.cursor()
    # Fixed query to match schema with warehouse_name instead of name
    cur.execute("""
        SELECT w.warehouse_id, w.warehouse_name, w.capacity,
               CONCAT(l.address, ', ', l.city, ', ', l.state) as location,
               w.current_occupancy as status
        FROM warehouses w
        JOIN locations l ON w.location_id = l.location_id
        ORDER BY w.warehouse_id
    """)
    warehouses = cur.fetchall()
    cur.close()
    return jsonify(warehouses)

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

@app.route('/api/shipment-items/<int:id>', methods=['DELETE'])
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
def update_shipment_status(cur, shipment_id, event_type):
    # Map event types to shipment statuses
    status_mapping = {
        'pickup': 'picked_up',
        'departure': 'in_transit',
        'arrival': 'in_transit',
        'delivery': 'delivered',
        'issue': 'in_transit',  # Or could be 'returned' depending on your business logic
        'delay': 'in_transit'
    }
    
    if event_type in status_mapping:
        new_status = status_mapping[event_type]
        cur.execute("UPDATE shipments SET status = %s WHERE shipment_id = %s", (new_status, shipment_id))

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

@app.route('/api/vehicles', methods=['POST'])
def create_vehicle():
    cur = mysql.connection.cursor()
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['license_plate', 'make', 'model', 'year', 'capacity_kg', 'vehicle_type']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Check if license plate already exists
        cur.execute("SELECT * FROM vehicles WHERE license_plate = %s", (data['license_plate'],))
        if cur.fetchone():
            return jsonify({'success': False, 'error': 'License plate already exists'}), 400
        
        # Insert vehicle
        query = """
            INSERT INTO vehicles 
            (license_plate, make, model, year, capacity_kg, vehicle_type, status, current_location_id, last_inspection_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cur.execute(query, (
            data['license_plate'],
            data['make'],
            data['model'],
            data['year'],
            data['capacity_kg'],
            data['vehicle_type'],
            data.get('status', 'available'),
            data.get('current_location_id'),
            data.get('last_inspection_date')
        ))
        
        mysql.connection.commit()
        vehicle_id = cur.lastrowid
        return jsonify({'success': True, 'vehicle_id': vehicle_id})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/vehicles/<int:id>', methods=['PUT'])
def update_vehicle(id):
    cur = mysql.connection.cursor()
    try:
        data = request.json
        
        # Validate vehicle exists
        cur.execute("SELECT * FROM vehicles WHERE vehicle_id = %s", (id,))
        if not cur.fetchone():
            return jsonify({'success': False, 'error': 'Vehicle not found'}), 404
        
        # Check if license plate already exists for another vehicle
        if 'license_plate' in data:
            cur.execute("SELECT * FROM vehicles WHERE license_plate = %s AND vehicle_id != %s", 
                       (data['license_plate'], id))
            if cur.fetchone():
                return jsonify({'success': False, 'error': 'License plate already exists'}), 400
        
        # Build update query dynamically based on provided fields
        update_fields = []
        params = []
        
        fields = {
            'license_plate': 'license_plate = %s',
            'make': 'make = %s',
            'model': 'model = %s',
            'year': 'year = %s',
            'capacity_kg': 'capacity_kg = %s',
            'vehicle_type': 'vehicle_type = %s',
            'status': 'status = %s',
            'current_location_id': 'current_location_id = %s',
            'last_inspection_date': 'last_inspection_date = %s'
        }
        
        for field, sql in fields.items():
            if field in data:
                update_fields.append(sql)
                params.append(data[field])
        
        # Add vehicle_id as the last parameter
        params.append(id)
        
        if not update_fields:
            return jsonify({'success': False, 'error': 'No fields to update'}), 400
        
        query = "UPDATE vehicles SET " + ", ".join(update_fields) + " WHERE vehicle_id = %s"
        cur.execute(query, params)
        
        mysql.connection.commit()
        return jsonify({'success': True})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/locations', methods=['POST'])
def create_location():
    cur = mysql.connection.cursor()
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['address', 'city', 'state', 'postal_code', 'location_type']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Insert location
        query = """
            INSERT INTO locations 
            (address, city, state, country, postal_code, latitude, longitude, location_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        cur.execute(query, (
            data['address'],
            data['city'],
            data['state'],
            data.get('country', 'India'),
            data['postal_code'],
            data.get('latitude'),
            data.get('longitude'),
            data['location_type']
        ))
        
        mysql.connection.commit()
        location_id = cur.lastrowid
        return jsonify({'success': True, 'location_id': location_id})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/locations/<int:id>', methods=['PUT'])
def update_location(id):
    cur = mysql.connection.cursor()
    try:
        data = request.json
        
        # Validate location exists
        cur.execute("SELECT * FROM locations WHERE location_id = %s", (id,))
        if not cur.fetchone():
            return jsonify({'success': False, 'error': 'Location not found'}), 404
        
        # Build update query dynamically based on provided fields
        update_fields = []
        params = []
        
        fields = {
            'address': 'address = %s',
            'city': 'city = %s',
            'state': 'state = %s',
            'country': 'country = %s',
            'postal_code': 'postal_code = %s',
            'latitude': 'latitude = %s',
            'longitude': 'longitude = %s',
            'location_type': 'location_type = %s'
        }
        
        for field, sql in fields.items():
            if field in data:
                update_fields.append(sql)
                params.append(data[field])
        
        # Add location_id as the last parameter
        params.append(id)
        
        if not update_fields:
            return jsonify({'success': False, 'error': 'No fields to update'}), 400
        
        query = "UPDATE locations SET " + ", ".join(update_fields) + " WHERE location_id = %s"
        cur.execute(query, params)
        
        mysql.connection.commit()
        return jsonify({'success': True})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

@app.route('/api/locations/<int:id>', methods=['DELETE'])
def delete_location(id):
    cur = mysql.connection.cursor()
    try:
        # Check if location is used in other tables
        tables_to_check = [
            ("shipments", "origin_id"),
            ("shipments", "destination_id"),
            ("vehicles", "current_location_id"),
            ("routes", "origin_id"),
            ("routes", "destination_id"),
            ("warehouses", "location_id"),
            ("tracking_events", "location_id"),
            ("waypoints", "location_id")
        ]
        
        for table, column in tables_to_check:
            cur.execute(f"SELECT COUNT(*) as count FROM {table} WHERE {column} = %s", (id,))
            result = cur.fetchone()
            if result['count'] > 0:
                return jsonify({
                    'success': False, 
                    'error': f"Cannot delete location: it is referenced in {table} table ({result['count']} references)"
                }), 400
        
        # Delete location
        cur.execute("DELETE FROM locations WHERE location_id = %s", (id,))
        mysql.connection.commit()
        return jsonify({'success': True})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
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
        
        # Check if location exists and is not already a warehouse
        cur.execute("SELECT * FROM locations WHERE location_id = %s", (data['location_id'],))
        location = cur.fetchone()
        if not location:
            return jsonify({'success': False, 'error': 'Location not found'}), 404
        
        cur.execute("SELECT * FROM warehouses WHERE location_id = %s", (data['location_id'],))
        if cur.fetchone():
            return jsonify({'success': False, 'error': 'Location is already a warehouse'}), 400
        
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
        
        # Update location type to 'warehouse' if not already
        if location['location_type'] != 'warehouse':
            cur.execute("UPDATE locations SET location_type = 'warehouse' WHERE location_id = %s", (data['location_id'],))
        
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
        cur.execute("SELECT location_id FROM warehouses WHERE warehouse_id = %s", (id,))
        result = cur.fetchone()
        if not result:
            return jsonify({'success': False, 'error': 'Warehouse not found'}), 404
        
        location_id = result['location_id']
        
        # Delete warehouse
        cur.execute("DELETE FROM warehouses WHERE warehouse_id = %s", (id,))
        
        mysql.connection.commit()
        return jsonify({'success': True})
    
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

# Customer-specific endpoints
@app.route('/api/customer/<int:customer_id>/shipments', methods=['GET'])
def get_customer_shipments(customer_id):
    cur = mysql.connection.cursor()
    try:
        # Get shipments for a specific customer
        cur.execute("""
            SELECT s.shipment_id, s.tracking_number, s.status, 
                   CONCAT(l1.city, ', ', l1.state) as origin,
                   CONCAT(l2.city, ', ', l2.state) as destination,
                   s.created_at, s.pickup_date, s.estimated_delivery, s.actual_delivery
            FROM shipments s
            JOIN locations l1 ON s.origin_id = l1.location_id
            JOIN locations l2 ON s.destination_id = l2.location_id
            WHERE s.customer_id = %s
            ORDER BY s.created_at DESC
        """, (customer_id,))
        
        shipments = cur.fetchall()
        return jsonify(shipments)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

# Driver-specific endpoints
@app.route('/api/driver/<int:driver_id>/shipments', methods=['GET'])
def get_driver_shipments(driver_id):
    cur = mysql.connection.cursor()
    try:
        # Get shipments assigned to a specific driver
        cur.execute("""
            SELECT s.shipment_id, s.tracking_number, s.status, 
                   CONCAT(l1.city, ', ', l1.state) as origin,
                   CONCAT(l2.city, ', ', l2.state) as destination,
                   s.created_at, s.pickup_date, s.estimated_delivery
            FROM shipments s
            JOIN locations l1 ON s.origin_id = l1.location_id
            JOIN locations l2 ON s.destination_id = l2.location_id
            WHERE s.driver_id = %s
            ORDER BY s.created_at DESC
        """, (driver_id,))
        
        shipments = cur.fetchall()
        return jsonify(shipments)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

# Get tracking events for a specific shipment
@app.route('/api/shipment/<int:shipment_id>/tracking', methods=['GET'])
def get_shipment_tracking(shipment_id):
    cur = mysql.connection.cursor()
    try:
        # Get all tracking events for a shipment
        cur.execute("""
            SELECT e.event_id, e.event_type, CONCAT(l.city, ', ', l.state) as location,
                   e.event_timestamp, u.full_name as recorded_by, e.notes
            FROM tracking_events e
            LEFT JOIN locations l ON e.location_id = l.location_id
            LEFT JOIN users u ON e.recorded_by = u.user_id
            WHERE e.shipment_id = %s
            ORDER BY e.event_timestamp DESC
        """, (shipment_id,))
        
        events = cur.fetchall()
        return jsonify(events)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

# Add a new endpoint to search shipments by tracking number
@app.route('/api/shipments/tracking/<tracking_number>', methods=['GET'])
def get_shipment_by_tracking(tracking_number):
    cur = mysql.connection.cursor()
    try:
        # Get shipment by tracking number
        cur.execute("""
            SELECT s.shipment_id, s.tracking_number, s.status, 
                   CONCAT(l1.city, ', ', l1.state) as origin,
                   CONCAT(l2.city, ', ', l2.state) as destination,
                   s.created_at, s.pickup_date, s.estimated_delivery, s.actual_delivery,
                   c.customer_id, u.full_name as customer_name,
                   s.driver_id, du.full_name as driver_name,
                   s.vehicle_id, v.license_plate as vehicle_plate,
                   s.total_weight, s.total_volume, s.special_instructions
            FROM shipments s
            JOIN locations l1 ON s.origin_id = l1.location_id
            JOIN locations l2 ON s.destination_id = l2.location_id
            JOIN customers c ON s.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN drivers d ON s.driver_id = d.driver_id
            LEFT JOIN users du ON d.user_id = du.user_id
            LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
            WHERE s.tracking_number = %s
        """, (tracking_number,))
        
        shipment = cur.fetchone()
        if not shipment:
            return jsonify({'success': False, 'error': 'Shipment not found'}), 404
        
        return jsonify(shipment)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close()

if __name__ == '__main__':
    app.run(debug=True)