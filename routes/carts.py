from flask import Blueprint, request, jsonify
from bson import ObjectId
from database import db

carts_bp = Blueprint("carts", __name__)
carts = db.get_collection("carts")
products = db.get_collection("products")

@carts_bp.route("/carts/<id>/add", methods=["POST"])
def add_to_cart(id):
    data = request.json
    product_id = data.get("product_id")
    quantity = int(data.get("quantity", 1))

    product_db = products.find_one({"_id": ObjectId(product_id)})
    if not product_db:
        return jsonify({"error": "Producto no encontrado"}), 404

    product = {
        "product_id": product_id,
        "name": product_db["name"],
        "price": float(product_db["price"]),
        "quantity": quantity,
        "image": product_db["photos"][0] if product_db.get("photos") else "/static/images/placeholder.jpg"
    }

    cart = carts.find_one({"_id": ObjectId(id)})

    if not cart:
        carts.insert_one({
            "_id": ObjectId(id),
            "items": [product]
        })
        return jsonify({"message": "Cart created"}), 201

    existing = next((i for i in cart["items"] if i["product_id"] == product_id), None)

    if existing:
        carts.update_one(
            {"_id": ObjectId(id), "items.product_id": product_id},
            {"$inc": {"items.$.quantity": quantity}}
        )
    else:
        carts.update_one(
            {"_id": ObjectId(id)},
            {"$push": {"items": product}}
        )

    return jsonify({"message": "Product added"}), 200
