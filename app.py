from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
import os

# Blueprints
from routes.products import products_bp
from routes.categories import categories_bp
from routes.carts import carts_bp
from routes.orders import orders_bp
from routes.users import users_bp

# ============================
#  CONFIGURACIÓN DE LA APP
# ============================

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/static"
)

CORS(app)

# ============================
#  REGISTRO DE BLUEPRINTS (API)
# ============================

app.register_blueprint(products_bp)
app.register_blueprint(categories_bp)
app.register_blueprint(carts_bp)
app.register_blueprint(orders_bp)
app.register_blueprint(users_bp)

# ============================
#  RUTAS DE PÁGINAS (FRONTEND)
# ============================

@app.route("/")
def home():
    return render_template("user.html")

@app.route("/productos")
def productos_page():
    return render_template("productos.html")

@app.route("/producto_detalle")
def producto_detalle_page():
    return render_template("producto_detalle.html")

@app.route("/carrito")
def carrito_page():
    return render_template("carrito.html")

@app.route("/contacto")
def contacto_page():
    return render_template("contacto.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/admin")
def admin_page():
    return render_template("admin.html")

@app.route("/ordenes")
def ordenes_page():
    return render_template("ordenes.html")

@app.route("/categorias")
def categorias_page():
    return render_template("categorias.html")

# ============================
#  ARCHIVOS ESTÁTICOS (IMÁGENES)
# ============================

@app.route("/static/images/<path:filename>")
def serve_images(filename):
    return send_from_directory("static/images", filename)

# ============================
#  EJECUCIÓN
# ============================

if __name__ == "__main__":
    # Crear carpetas necesarias si no existen
    folders = [
        "static/images",
        "static/images/products"
    ]

    for folder in folders:
        if not os.path.exists(folder):
            os.makedirs(folder)

    print("Servidor corriendo en http://127.0.0.1:5000")
    app.run(debug=True, use_reloader=False)
