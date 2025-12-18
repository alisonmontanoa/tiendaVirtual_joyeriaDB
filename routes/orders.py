from flask import Blueprint, request, jsonify
from bson import ObjectId
import random
from datetime import datetime
from database import db  

orders_bp = Blueprint("orders", __name__)

# Obtener colecciones
orders = db.get_collection("orders")
carts = db.get_collection("carts")
products = db.get_collection("products")

# ============================
#   UTILIDADES
# ============================

def generate_order_number():
    """Genera número de orden secuencial con manejo de errores."""
    last_order = orders.find_one(sort=[("date", -1)]) # Ordenar por fecha es más fiable que por ID
    if last_order and "order_number" in last_order:
        try:
            last_number = int(last_order["order_number"].split("-")[1])
            return f"ORD-{last_number + 1:06d}"
        except (IndexError, ValueError):
            return "ORD-000001"
    return "ORD-000001"

# ============================
#   CREAR ORDEN (VENTA)
# ============================
@orders_bp.route("/orders", methods=["POST"])
def create_order():
    try:
        data = request.json
        cart_id = data.get("cart_id")
        customer_info = data.get("customer", {}) # MEJORA: Recibir datos del cliente
        payment_method = data.get("payment_method", "credit_card")

        if not cart_id:
            return jsonify({"error": "Cart ID is required"}), 400

        # Obtener carrito
        cart = carts.find_one({"_id": ObjectId(cart_id)})
        if not cart or not cart.get("items"):
            return jsonify({"error": "Cart is empty or not found"}), 404

        total = 0
        detailed_items = []

        # Procesar items y validar datos actuales del producto
        for item in cart["items"]:
            product = products.find_one({"_id": ObjectId(item["product_id"])})
            
            if product:
                price = float(product.get("price", 0))
                quantity = int(item.get("quantity", 1))
                subtotal = price * quantity
                total += subtotal

                detailed_items.append({
                    "product_id": str(product["_id"]),
                    "name": product["name"],
                    "price": price,
                    "quantity": quantity,
                    "subtotal": subtotal,
                    "image": product.get("photos", [None])[0] # Guardar foto de referencia
                })

        # Simulación de aprobación (Lógica de negocio)
        payment_approved = random.random() < 0.85 # Subimos a 85%
        order_number = generate_order_number()

        order_data = {
            "order_number": order_number,
            "customer": {
                "name": customer_info.get("name", "Cliente General"),
                "email": customer_info.get("email", "N/A"),
                "phone": customer_info.get("phone", "N/A")
            },
            "items": detailed_items,
            "total": round(total, 2), # MEJORA: Redondeo a 2 decimales para dinero
            "payment_method": payment_method,
            "payment_approved": payment_approved,
            "status": "completed" if payment_approved else "payment_failed",
            "date": datetime.now()
        }

        order_id = orders.insert_one(order_data).inserted_id

        # Acciones post-venta
        if payment_approved:
            for item in detailed_items:
                # AUMENTO: Incrementar contador de compras e incrementar vistas (opcional)
                products.update_one(
                    {"_id": ObjectId(item["product_id"])},
                    {"$inc": {"purchases": item["quantity"]}}
                )

            # Vaciar carrito de forma segura
            carts.update_one(
                {"_id": ObjectId(cart_id)},
                {"$set": {"items": [], "total": 0.0, "updated_at": datetime.now()}}
            )

        return jsonify({
            "message": "Order processed",
            "order_number": order_number,
            "status": order_data["status"],
            "total": order_data["total"]
        }), 201

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

# ============================
#   LECTURA (LISTAR Y FILTRAR)
# ============================

@orders_bp.route("/orders", methods=["GET"])
def get_all_orders():
    """Obtiene todas las órdenes con formato amigable para el frontend."""
    result = []
    # MEJORA: Filtros opcionales (por estado)
    status_filter = request.args.get("status")
    query = {"status": status_filter} if status_filter else {}

    for order in orders.find(query).sort("date", -1):
        order["_id"] = str(order["_id"])
        # MEJORA: Formateo de fecha ISO para compatibilidad JS
        order["date_formatted"] = order["date"].strftime("%d/%m/%Y %H:%M")
        order["date"] = order["date"].isoformat()
        result.append(order)
    return jsonify(result), 200

@orders_bp.route("/orders/<id>", methods=["GET"])
def get_order(id):
    try:
        order = orders.find_one({"_id": ObjectId(id)})
        if not order:
            return jsonify({"error": "Order not found"}), 404
        order["_id"] = str(order["_id"])
        order["date"] = order["date"].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify(order), 200
    except:
        return jsonify({"error": "Invalid order ID"}), 400

# ============================
#   ESTADÍSTICAS PARA DASHBOARD
# ============================
@orders_bp.route("/orders/stats", methods=["GET"])
def get_order_stats():
    """Genera datos para los cuadros de estadísticas del Admin."""
    total_revenue = orders.aggregate([
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ])
    
    revenue_list = list(total_revenue)
    return jsonify({
        "total_sales_count": orders.count_documents({"status": "completed"}),
        "total_revenue": revenue_list[0]["total"] if revenue_list else 0,
        "failed_payments": orders.count_documents({"status": "payment_failed"})
    }), 200

# ============================
#   ELIMINAR ORDEN
# ============================
@orders_bp.route("/orders/<id>", methods=["DELETE"])
def delete_order(id):
    try:
        result = orders.delete_one({"_id": ObjectId(id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Order not found"}), 404
        return jsonify({"message": "Order record deleted"}), 200
    except:
        return jsonify({"error": "Invalid ID"}), 400