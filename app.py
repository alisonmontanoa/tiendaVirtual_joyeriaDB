from flask import Flask, render_template
from routes.products import products_bp
from routes.categories import categories_bp
from routes.carts import carts_bp
from routes.orders import orders_bp

app = Flask(__name__, template_folder="templates", static_folder="static")

app.register_blueprint(products_bp)
app.register_blueprint(categories_bp)
app.register_blueprint(carts_bp)
app.register_blueprint(orders_bp)

# Pagina del administrador
@app.route('/admin')
def admin_panel():
    return render_template("admin.html")

# Pagina del usuario
@app.route('/')
def user_panel():
    return render_template("user.html")

if __name__ == '__main__':
    app.run(debug=True)
