from flask import Flask
from routes.categories import categories_bp
from routes.products import products_bp
from routes.carts import carts_bp
from routes.orders import orders_bp

app = Flask(__name__)

# Registrar Blueprints
app.register_blueprint(categories_bp)
app.register_blueprint(products_bp)
app.register_blueprint(carts_bp)
app.register_blueprint(orders_bp)

if __name__ == "__main__":
    app.run(debug=True)
