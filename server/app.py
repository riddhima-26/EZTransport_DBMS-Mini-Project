from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mysqldb import MySQL
import os
from datetime import datetime
import jwt
from datetime import datetime, timedelta
import bcrypt

app = Flask(__name__)
CORS(app)

# MySQL Configuration
app.config['MYSQL_HOST'] = 'localhost'  # or your host
app.config['MYSQL_USER'] = 'logistics_admin'  # your username
app.config['MYSQL_PASSWORD'] = 'Admin@Secure123'  # your password
app.config['MYSQL_DB'] = 'transport_logistics'  # your database name
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'  # Important for getting dictionaries

# JWT Configuration
app.config['JWT_SECRET_KEY'] = 'your-secret-key'  # Change this to a secure secret key
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

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
    
    # Get shipment count
    cur.execute("SELECT COUNT(*) as count FROM shipments WHERE status != 'delivered'")
    shipments = cur.fetchone()['count']
    
    # Get available vehicles
    cur.execute("SELECT COUNT(*) as count FROM vehicles WHERE status = 'available'")
    vehicles = cur.fetchone()['count']
    
    # Get customer count
    cur.execute("SELECT COUNT(*) as count FROM customers")
    customers = cur.fetchone()['count']
    
    # Get active drivers
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
    cur.execute("""
        SELECT s.shipment_id as id, s.tracking_number, s.status, 
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

@app.route('/api/vehicles', methods=['GET'])
def get_vehicles():
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT v.vehicle_id as id, v.license_plate, v.make, v.model,
               v.vehicle_type, v.status, v.capacity_kg,
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
        SELECT c.customer_id as id, u.full_name, c.company_name,
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
            SELECT c.customer_id as id, u.full_name, c.company_name,
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
            SELECT c.customer_id as id, u.full_name, c.company_name,
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
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT d.driver_id as id, u.full_name, d.license_number,
               u.phone, d.status, CONCAT(l.city, ', ', l.state) as current_location
        FROM drivers d
        JOIN users u ON d.user_id = u.user_id
        LEFT JOIN locations l ON d.current_location_id = l.location_id
        ORDER BY d.driver_id
    """)
    drivers = cur.fetchall()
    cur.close()
    return jsonify(drivers)

@app.route('/api/locations', methods=['GET'])
def get_locations():
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT location_id as id, address, city, state,
               postal_code, country, location_type
        FROM locations
        ORDER BY location_id
    """)
    locations = cur.fetchall()
    cur.close()
    return jsonify(locations)

@app.route('/api/warehouses', methods=['GET'])
def get_warehouses():
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT w.warehouse_id as id, w.name, w.capacity,
               CONCAT(l.address, ', ', l.city, ', ', l.state) as location,
               w.status
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
    cur.execute("""
        SELECT r.route_id as id,
               CONCAT(l1.city, ', ', l1.state) as start_location,
               CONCAT(l2.city, ', ', l2.state) as end_location,
               r.distance, r.duration
        FROM routes r
        JOIN locations l1 ON r.start_location_id = l1.location_id
        JOIN locations l2 ON r.end_location_id = l2.location_id
        ORDER BY r.route_id
    """)
    routes = cur.fetchall()
    cur.close()
    return jsonify(routes)

@app.route('/api/tracking', methods=['GET'])
def get_tracking_events():
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT e.event_id as id, e.shipment_id,
               CONCAT(l.city, ', ', l.state) as location,
               e.status, e.timestamp
        FROM tracking_events e
        JOIN locations l ON e.location_id = l.location_id
        ORDER BY e.timestamp DESC
    """)
    events = cur.fetchall()
    cur.close()
    return jsonify(events)

@app.route('/api/shipment-items', methods=['GET'])
def get_shipment_items():
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT si.item_id as id, si.shipment_id,
               si.description, si.weight, si.volume, si.value
        FROM shipment_items si
        ORDER BY si.item_id
    """)
    items = cur.fetchall()
    cur.close()
    return jsonify(items)

if __name__ == '__main__':
    app.run(debug=True)