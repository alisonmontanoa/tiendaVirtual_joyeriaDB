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
    total = sum(item["price"] * item["quantity"] for item in cart["items"])

    # Simulacion de aprobacion 80%
    payment_approved = random.random() < 0.8  # True 80% de veces

    order_data = {
        "cart_id": cart_id,
        "items": cart["items"],
        "total": total,
        "payment_method": payment_method,
        "payment_approved": payment_approved,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    # Insertar orden
    order_id = orders.insert_one(order_data).inserted_id

    return jsonify({
        "message": "Order created",
        "order_id": str(order_id),
        "payment_approved": payment_approved,
        "total": total
    }), 201


# Obtener todas las ordenes
@orders_bp.route("/orders", methods=["GET"])
def get_all_orders():
    result = []
    for order in orders.find():
        order["_id"] = str(order["_id"])
        result.append(order)
    return jsonify(result), 200


# Obtener una orden por ID
@orders_bp.route("/orders/<id>", methods=["GET"])
def get_order(id):
    order = orders.find_one({"_id": ObjectId(id)})
    if not order:
        return jsonify({"error": "Order not found"}), 404

    order["_id"] = str(order["_id"])
    return jsonify(order), 200


# Eliminar una orden
@orders_bp.route("/orders/<id>", methods=["DELETE"])
def delete_order(id):
    orders.delete_one({"_id": ObjectId(id)})
    return jsonify({"message": "Order deleted"}), 200
