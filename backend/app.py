import os
from flask import Flask, send_from_directory, jsonify, current_app, request
from flask_cors import CORS
from sqlalchemy import text
from extensions import db, migrate
from config import Config
import razorpay
from models import Table

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")


def create_app():
    # IMPORTANT: disable Flask's built-in static route
    app = Flask(__name__, static_folder=None)

    app.config.from_object(Config)

    # Allowed origins: comma-separated env var FRONTEND_ORIGINS
    raw_origins = os.environ.get("FRONTEND_ORIGINS", "https://taptable.onrender.com")
    allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True,
    )

    db.init_app(app)
    migrate.init_app(app, db)

    # Razorpay setup
    key_id = app.config.get("RAZORPAY_KEY_ID")
    key_secret = app.config.get("RAZORPAY_KEY_SECRET")
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

    for bp in [
        customer_order_bp,
        customer_menu_bp,
        payment_bp,
        auth_bp,
        menu_bp,
        table_bp,
        order_bp,
        review_bp,
        analytics_bp,
        restaurant_bp,
        settings_bp,
    ]:
        app.register_blueprint(bp)

    # ---------- DEBUG: show what dist contains ----------
    @app.route("/__debug_dist")
    def debug_dist():
        exists = os.path.exists(DIST_DIR)
        index_exists = os.path.exists(os.path.join(DIST_DIR, "index.html"))
        files = []
        if exists:
            for root, dirs, filenames in os.walk(DIST_DIR):
                for f in filenames:
                    rel = os.path.relpath(os.path.join(root, f), DIST_DIR)
                    files.append(rel)
        return jsonify(
            {
                "DIST_DIR": DIST_DIR,
                "exists": exists,
                "index_exists": index_exists,
                "files_preview": files[:50],  # limit
            }
        )

    # ---------- SPA + static ----------

    @app.route("/")
    def index():
        return send_from_directory(DIST_DIR, "index.html")

    @app.route("/favicon.ico")
    def favicon():
        path = os.path.join(DIST_DIR, "favicon.ico")
        if os.path.exists(path):
            return send_from_directory(DIST_DIR, "favicon.ico")
        return "", 204

    @app.route("/<path:path>")
    def catch_all(path):
        # API routes should not be caught by SPA
        if path.startswith("api/"):
            return jsonify({"error": "API route not found"}), 404

        file_path = os.path.join(DIST_DIR, path)
        if os.path.exists(file_path):
            return send_from_directory(DIST_DIR, path)

        # let React Router handle unknown routes
        return send_from_directory(DIST_DIR, "index.html")

    # Example API route
    @app.route("/api/restaurants/<int:restaurant_id>/tables")
    def get_tables_restaurant(restaurant_id):
        tables = Table.query.filter_by(restaurant_id=restaurant_id).all()
        return (
            jsonify(
                [
                    {
                        "id": t.id,
                        "number": t.number,
                        "seats": t.seats,
                        "qr_code": t.qr_code,
                    }
                    for t in tables
                ]
            ),
            200,
        )

    # Simple DB connectivity test
    @app.route("/api/_dbtest")
    def db_test():
        try:
            with db.engine.connect() as conn:
                res = conn.execute(text("SELECT 1")).scalar()
            return jsonify({"db": bool(res), "result": int(res)}), 200
        except Exception as e:
            current_app.logger.exception("DB test failed")
            return jsonify({"db": False, "error": str(e)}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
