# server/schema.py (updated)
import graphene
from flask import current_app
from flask_mysqldb import MySQL

class Shipment(graphene.ObjectType):
    id = graphene.Int()
    tracking_number = graphene.String()
    status = graphene.String()
    origin = graphene.String()
    destination = graphene.String()
    created_at = graphene.String()

class Query(graphene.ObjectType):
    shipments = graphene.List(Shipment)
    
    def resolve_shipments(self, info):
        mysql = current_app.extensions['mysql']
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT s.shipment_id as id, s.tracking_number, s.status, 
                   CONCAT(l1.city, ', ', l1.state) as origin,
                   CONCAT(l2.city, ', ', l2.state) as destination,
                   s.created_at
            FROM shipments s
            JOIN locations l1 ON s.origin_id = l1.location_id
            JOIN locations l2 ON s.destination_id = l2.location_id
        """)
        shipments = cur.fetchall()
        cur.close()
        return shipments

schema = graphene.Schema(query=Query)