from flask import Blueprint, request, jsonify
from bson import ObjectId
from database import db  

carts_bp = Blueprint("carts", __name__)
carts = db.get_collection("carts")

# Crear carrito
@carts_bp.route("/carts", methods=["POST"])
def create_cart():
    cart_id = carts.insert_one({
        "items": []
    }).inserted_id
    return jsonify({"id": str(cart_id)}), 201


# Agregar producto
@carts_bp.route("/carts/<id>/add", methods=["POST"])
def add_to_cart(id):
    data = request.json

    product = {
        "product_id": data["product_id"],
        "name": data["name"],
        "price": float(data["price"]),
        "quantity": int(data.get("quantity", 1))
    }

    cart = carts.find_one({"_id": ObjectId(id)})

    if not cart:
        carts.insert_one({
            "_id": ObjectId(id),
            "items": [product]
        })
        return jsonify({"message": "Cart created and product added"}), 201

    existing = next((i for i in cart["items"] if i["product_id"] == product["product_id"]), None)

    if existing:
        carts.update_one(
            {"_id": ObjectId(id), "items.product_id": product["product_id"]},
            {"$inc": {"items.$.quantity": product["quantity"]}}
        )
    else:
        carts.update_one(
            {"_id": ObjectId(id)},
            {"$push": {"items": product}}
        )

    return jsonify({"message": "Product added"}), 200


# Obtener carrito con total
@carts_bp.route("/carts/<id>", methods=["GET"])
def get_cart(id):
    cart = carts.find_one({"_id": ObjectId(id)})
    if not cart:
        return jsonify({"error": "Cart not found"}), 404

    total = sum(item["price"] * item["quantity"] for item in cart["items"])

    return jsonify({
        "id": str(cart["_id"]),
        "items": cart["items"],
        "total": round(total, 2)
    }), 200


# Eliminar producto específico
@carts_bp.route("/carts/<id>/item/<product_id>", methods=["DELETE"])
def remove_item(id, product_id):
    carts.update_one(
        {"_id": ObjectId(id)},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return jsonify({"message": "Item removed"}), 200


# Vaciar carrito
@carts_bp.route("/carts/<id>/clear", methods=["PUT"])
def clear_cart(id):
    carts.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"items": []}}
    )
    return jsonify({"message": "Cart cleared"}), 200
