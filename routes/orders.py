from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
import random
from datetime import datetime

orders_bp = Blueprint("orders", __name__)

client = MongoClient("mongodb://localhost:27017/")
db = client["joyeria_db"]

orders = db["orders"]
carts = db["carts"]
products = db["products"]

# Generar numero de orden secuencial
def generate_order_number():
    last_order = orders.find_one(sort=[("_id", -1)])
    if last_order and "order_number" in last_order:
        try:
            last_number = int(last_order["order_number"].split("-")[1])
            return f"ORD-{last_number + 1:06d}"
        except:
            return "ORD-000001"
    else:
        return "ORD-000001"

# Crear una orden desde un carrito existente
@orders_bp.route("/orders", methods=["POST"])
def create_order():
    data = request.json
    cart_id = data.get("cart_id")
    payment_method = data.get("payment_method", "credit_card")

    # Obtener carrito
    cart = carts.find_one({"_id": ObjectId(cart_id)})
    if not cart:
        return jsonify({"error": "Cart not found"}), 404

    # Calcular total
    total = 0
    detailed_items = []

    for item in cart["items"]:
        product = products.find_one({"_id": ObjectId(item["product_id"])})
        
        if product:
            price = float(product["price"])
            subtotal = price * item["quantity"]
            total += subtotal

            # Agregar datos completos del producto dentro de la orden
            detailed_items.append({
                "product_id": item["product_id"],
                "name": product["name"],
                "price": price,
                "quantity": item["quantity"],
                "subtotal": subtotal
            })

    # Simulacion de aprobacion 80%
    payment_approved = random.random() < 0.8  
    
    # Generar numero de orden
    order_number = generate_order_number()

    order_data = {
        "order_number": order_number,
        "cart_id": cart_id,
        "items": detailed_items,  
        "total": total,
        "payment_method": payment_method,
        "payment_approved": payment_approved,
        "status": "completed" if payment_approved else "payment_failed",
        "date": datetime.now()
    }

    order_id = orders.insert_one(order_data).inserted_id

    # Actualizar contador de compras
    if payment_approved:
        for item in cart["items"]:
            products.update_one(
                {"_id": ObjectId(item["product_id"])},
                {"$inc": {"purchases": item["quantity"]}}
            )

        # Vaciar carrito
        carts.update_one(
            {"_id": ObjectId(cart_id)},
            {"$set": {"items": [], "total": 0.0}}
        )

    return jsonify({
        "message": "Order created",
        "order_id": str(order_id),
        "order_number": order_number,
        "payment_approved": payment_approved,
        "status": "completed" if payment_approved else "payment_failed",
        "total": total
    }), 201

# Obtener todas las ordenes
@orders_bp.route("/orders", methods=["GET"])
def get_all_orders():
    result = []
    for order in orders.find().sort("date", -1):  # ORDENAR POR FECHA
        order["_id"] = str(order["_id"])
        order["date"] = order["date"].strftime("%Y-%m-%d %H:%M:%S")  # FORMATEAR FECHA
        result.append(order)
    return jsonify(result), 200

# Obtener una orden por ID
@orders_bp.route("/orders/<id>", methods=["GET"])
def get_order(id):
    order = orders.find_one({"_id": ObjectId(id)})
    if not order:
        return jsonify({"error": "Order not found"}), 404

    order["_id"] = str(order["_id"])
    order["date"] = order["date"].strftime("%Y-%m-%d %H:%M:%S")
    return jsonify(order), 200

# OBTENER ORDEN POR NUMERO DE ORDEN
@orders_bp.route("/orders/number/<order_number>", methods=["GET"])
def get_order_by_number(order_number):
    order = orders.find_one({"order_number": order_number})
    if not order:
        return jsonify({"error": "Order not found"}), 404

    order["_id"] = str(order["_id"])
    order["date"] = order["date"].strftime("%Y-%m-%d %H:%M:%S")
    return jsonify(order), 200

# Eliminar una orden
@orders_bp.route("/orders/<id>", methods=["DELETE"])
def delete_order(id):
    orders.delete_one({"_id": ObjectId(id)})
    return jsonify({"message": "Order deleted"}), 200