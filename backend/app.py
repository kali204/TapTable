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

    # Razorpay client setup
    key_id = app.config.get('RAZORPAY_KEY_ID')
    key_secret = app.config.get('RAZORPAY_KEY_SECRET')
    app.razorpay_client = None
    if key_id and key_secret:
        app.razorpay_client = razorpay.Client(auth=(key_id, key_secret))

    # Register blueprints
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

    for bp in [customer_order_bp, customer_menu_bp, payment_bp, auth_bp, menu_bp, table_bp,
               order_bp, review_bp, analytics_bp, restaurant_bp, settings_bp]:
        app.register_blueprint(bp)

    # Serve SPA root
    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, "index.html")

    # Catch-all for SPA routes (admin, customer pages, etc.)
    @app.route('/<path:path>')
    def catch_all(path):
        # API routes should not be caught
        if path.startswith('api/'):
            return jsonify({'error': 'API route not found'}), 404

        # Serve index.html for React Router
        file_path = os.path.join(app.static_folder, path)
        if os.path.exists(file_path):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")

    # Example API route
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
