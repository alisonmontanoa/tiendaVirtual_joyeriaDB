from flask import Flask, render_template, send_from_directory
from routes.products import products_bp
from routes.categories import categories_bp
from routes.carts import carts_bp
from routes.orders import orders_bp
from flask_cors import CORS
import os

app = Flask(__name__, 
            template_folder="templates", 
            static_folder="static",
            static_url_path="/static")

CORS(app)

app.register_blueprint(products_bp)
app.register_blueprint(categories_bp)
app.register_blueprint(orders_bp)
app.register_blueprint(carts_bp)

# Rutas para las nuevas paginas
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

# Servir archivos estaticos
@app.route('/static/images/<path:filename>')
def serve_images(filename):
    return send_from_directory('static/images', filename)

# Pagina del administrador
@app.route('/admin')
def admin_panel():
    return render_template("admin.html")

# Pagina del usuario
@app.route('/')
def user_panel():
    return render_template("user.html")

if __name__ == '__main__':
    # Crear carpeta de imagenes si no existe
    if not os.path.exists('static/images'):
        os.makedirs('static/images')
    
    app.run(debug=True, port=5000)