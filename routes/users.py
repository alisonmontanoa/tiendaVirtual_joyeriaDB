from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import datetime

users_bp = Blueprint("users", __name__)

client = MongoClient("mongodb://localhost:27017/")
db = client["joyeria_db"]
users_col = db["users"] 

# ============================
#   REGISTRO INICIAL (Solo para ti)
# ============================
@users_bp.route("/auth/register", methods=["POST"])
def register():
    try:
        data = request.json
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"error": "Faltan datos"}), 400

        if users_col.find_one({"username": username}):
            return jsonify({"error": "El usuario ya existe"}), 400

        # Ciframos la contraseña por seguridad
        hashed_password = generate_password_hash(password)
        
        users_col.insert_one({
            "username": username,
            "password": hashed_password,
            "role": "admin",
            "created_at": datetime.datetime.now()
        })
        return jsonify({"message": "Administrador creado con éxito"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================
#   LOGIN
# ============================
@users_bp.route("/auth/login", methods=["POST"])
def login():
    try:
        data = request.json
        user = users_col.find_one({"username": data.get("username")})

        if user and check_password_hash(user["password"], data.get("password")):
            return jsonify({
                "message": "Login exitoso",
                "user": {"username": user["username"], "role": user["role"]}
            }), 200
        
        # AQUÍ ESTABA EL ERROR: Cambié "01" por "401"
        return jsonify({"error": "Credenciales inválidas"}), 401 
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500