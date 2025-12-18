from database import db
from flask import Flask, render_template, send_from_directory
from routes.products import products_bp
from routes.categories import categories_bp
from routes.carts import carts_bp
from routes.orders import orders_bp
from routes.users import users_bp  
from flask_cors import CORS
import os

app = Flask(__name__, 
            template_folder="templates", 
            static_folder="static",
            static_url_path="/static")

CORS(app)

# Registro de Blueprints de la API
app.register_blueprint(products_bp)
app.register_blueprint(categories_bp)
app.register_blueprint(orders_bp)
app.register_blueprint(carts_bp)
app.register_blueprint(users_bp)

# ============================
#  RUTAS PARA LAS PÁGINAS
# ============================

@app.route('/')
def user_panel():
    """Página principal de la tienda."""
    return render_template("user.html")

@app.route('/login')
def login_page():
    """NUEVO: Página de inicio de sesión para el administrador."""
    return render_template("login.html")

@app.route('/admin')
def admin_panel():
    """Página del panel de administración."""
    return render_template("admin.html")

@app.route('/carrito')
def carrito_page():
    return render_template("carrito.html")

@app.route('/producto_detalle')
def producto_detalle_page():
    return render_template("producto_detalle.html")

@app.route('/productos')
def productos_page():
    return render_template("productos.html")

@app.route('/ordenes')
def ordenes_page():
    return render_template("ordenes.html")

@app.route('/categorias')
def categorias_page():
    return render_template("categorias.html")  

@app.route('/ofertas')
def ofertas_page():
    return render_template("productos.html")  

@app.route('/contacto')
def contacto_page():
    return render_template("contacto.html")

# Servir archivos estáticos (imágenes de productos)
@app.route('/static/images/<path:filename>')
def serve_images(filename):
    return send_from_directory('static/images', filename)

# ============================
#  EJECUCIÓN DEL SERVIDOR
# ============================

if __name__ == '__main__':
    # Crear estructura de carpetas si no existe
    folders = ['static/images', 'static/images/products']
    for folder in folders:
        if not os.path.exists(folder):
            os.makedirs(folder)
    
    # Ejecutar en modo debug para desarrollo
    app.run(debug=True, port=5000)