from flask import Blueprint, request, jsonify
from bson import ObjectId
from database import db  

carts_bp = Blueprint("carts", __name__)

# Obtener colección de carritos
carts = db.get_collection("carts")

# Crear un carrito vacío
@carts_bp.route("/carts", methods=["POST"])
def create_cart():
    cart_id = carts.insert_one({
        "items": []   # lista vacia al inicio
    }).inserted_id

    return jsonify({"message": "Cart created", "id": str(cart_id)}), 201


# Agregar un producto al carrito
@carts_bp.route("/carts/<id>/add", methods=["POST"])
def add_to_cart(id):
    data = request.json
    product = {
        "product_id": data["product_id"],
        "name": data["name"],
        "price": data["price"],
        "quantity": data["quantity"]
    }

    # Verificar si el producto ya está en el carrito (si se quiere actualizar la cantidad)
    cart = carts.find_one({"_id": ObjectId(id)})
    if cart:
        existing_product = next((item for item in cart["items"] if item["product_id"] == data["product_id"]), None)
        if existing_product:
            # Actualizar la cantidad si el producto ya está en el carrito
            carts.update_one(
                {"_id": ObjectId(id), "items.product_id": data["product_id"]},
                {"$inc": {"items.$.quantity": data["quantity"]}}
            )
        else:
            # Si el producto no está en el carrito, agregarlo
            carts.update_one(
                {"_id": ObjectId(id)},
                {"$push": {"items": product}}
            )
    else:
        # Si el carrito no existe, crearlo
        carts.insert_one({
            "_id": ObjectId(id),
            "items": [product]
        })

    return jsonify({"message": "Product added to cart"}), 200


# Obtener carrito
@carts_bp.route("/carts/<id>", methods=["GET"])
def get_cart(id):
    cart = carts.find_one({"_id": ObjectId(id)})
    if not cart:
        return jsonify({"error": "Cart not found"}), 404

    cart["_id"] = str(cart["_id"])  # Convertir ObjectId a string
    return jsonify(cart), 200


# Vaciar carrito
@carts_bp.route("/carts/<id>/clear", methods=["PUT"])
def clear_cart(id):
    carts.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"items": []}}
    )
    return jsonify({"message": "Cart cleared"}), 200
