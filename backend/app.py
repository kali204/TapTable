import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from extensions import db, migrate
from config import Config


import razorpay
from models import Table

def create_app():
    app = Flask(__name__, static_folder="dist", static_url_path="")
    app.config.from_object(Config)
    CORS(app, supports_credentials=True, origins="*")
    db.init_app(app)
    migrate.init_app(app, db)

    # Setup Razorpay client and attach to app for global access
    key_id = app.config['RAZORPAY_KEY_ID']
    key_secret = app.config['RAZORPAY_KEY_SECRET']
    app.razorpay_client = None
    if key_id and key_secret:
        app.razorpay_client = razorpay.Client(auth=(key_id, key_secret))

    # Import and register blueprints
    from routes.auth import auth_bp
    from routes.menu import menu_bp
    from routes.table import table_bp
    from routes.order import order_bp
    from routes.review import review_bp
    from routes.analytics import analytics_bp
    from routes.payment import payment_bp
    from routes.settings import settings_bp
    from routes.restaurant import restaurant_bp
    from routes.customer_menu import customer_menu_bp
    from routes.customer_order import customer_order_bp
    app.register_blueprint(customer_order_bp)

    app.register_blueprint(customer_menu_bp)


    app.register_blueprint(payment_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(menu_bp)
    app.register_blueprint(table_bp)
    app.register_blueprint(order_bp)
    app.register_blueprint(review_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(restaurant_bp)
    app.register_blueprint(settings_bp)

    # Serve SPA static files and index.html
    @app.route("/")
    def index():
        return send_from_directory(app.static_folder, "index.html")

    @app.route("/<path:path>")
    def static_file(path):
        file_path = os.path.join(app.static_folder, path)
        if os.path.exists(file_path):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")

    # Route to support deep linking for customer menu SPA
    @app.route('/menu/<int:restaurant_id>/table_<table_number>')
    def customer_menu(restaurant_id, table_number):
        # Serves the SPA index.html so React router can handle this route
        return app.send_static_file('index.html')
    @app.route('/api/restaurants/<int:restaurant_id>/tables')
    def get_tables_restaurant(restaurant_id):
        tables = Table.query.filter_by(restaurant_id=restaurant_id).all()
        return jsonify([{
            'id': t.id,
            'number': t.number,
            'seats': t.seats,
            'qr_code': t.qr_code
        } for t in tables]), 200
    
    

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
