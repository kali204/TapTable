import os
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from sqlalchemy import text
from extensions import db, migrate
from config import Config
import razorpay
from models import Table

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)

    # -----------------------------
    # CORS (HTTPS safe)
    # -----------------------------
    raw_origins = os.environ.get(
        "FRONTEND_ORIGINS",
        "https://taptable.onrender.com,https://*.ngrok-free.app"
    )
    allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True,
    )

    # -----------------------------
    # DB
    # -----------------------------
    db.init_app(app)
    migrate.init_app(app, db)

    # -----------------------------
    # Razorpay
    # -----------------------------
    key_id = app.config.get("RAZORPAY_KEY_ID")
    key_secret = app.config.get("RAZORPAY_KEY_SECRET")
    app.razorpay_client = None
    if key_id and key_secret:
        app.razorpay_client = razorpay.Client(auth=(key_id, key_secret))

    # -----------------------------
    # BLUEPRINTS (ALL API)
    # -----------------------------
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

    api_blueprints = [
        auth_bp,
        menu_bp,
        table_bp,
        order_bp,
        review_bp,
        analytics_bp,
        payment_bp,
        settings_bp,
        restaurant_bp,
        customer_menu_bp,
        customer_order_bp,
    ]

    for bp in api_blueprints:
        app.register_blueprint(bp)

    # -----------------------------
    # API FALLBACK (VERY IMPORTANT)
    # -----------------------------
    @app.route("/api/<path:path>")
    def api_not_found(path):
        return jsonify({"error": "API route not found"}), 404

    # -----------------------------
    # HEALTH CHECK
    # -----------------------------
    @app.route("/api/_health")
    def health():
        return jsonify({"status": "ok"}), 200

    @app.route("/api/_dbtest")
    def db_test():
        try:
            with db.engine.connect() as conn:
                res = conn.execute(text("SELECT 1")).scalar()
            return jsonify({"db": True, "result": int(res)}), 200
        except Exception as e:
            return jsonify({"db": False, "error": str(e)}), 500

    # -----------------------------
    # STATIC / SPA
    # -----------------------------
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
    def spa(path):
        file_path = os.path.join(DIST_DIR, path)
        if os.path.exists(file_path):
            return send_from_directory(DIST_DIR, path)
        return send_from_directory(DIST_DIR, "index.html")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
