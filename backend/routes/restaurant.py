from flask import Blueprint, jsonify
from models import Restaurant, Table, Order

restaurant_bp = Blueprint(
    "restaurant",
    __name__,
    url_prefix="/api/restaurants"
)

# ---------------- Restaurant Info ----------------
@restaurant_bp.route("/<int:restaurant_id>", methods=["GET"])
def get_restaurant_info(restaurant_id):
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({"error": "Restaurant not found"}), 404

    return jsonify({
        "id": restaurant.id,
        "name": restaurant.name,
        "email": getattr(restaurant, "email", ""),
        "phone": getattr(restaurant, "phone", ""),
        "address": getattr(restaurant, "address", ""),
        "description": getattr(restaurant, "description", ""),
        "logo_url": getattr(restaurant, "logo_url", ""),
    })


# ---------------- Restaurant Tables ----------------
@restaurant_bp.route("/<int:restaurant_id>/tables", methods=["GET"])
def get_restaurant_tables(restaurant_id):
    tables = Table.query.filter_by(restaurant_id=restaurant_id).all()
    return jsonify([
        {
            "id": t.id,
            "number": t.number,
            "seats": t.seats,
            "qr_code": t.qr_code,
        }
        for t in tables
    ])


# ---------------- Restaurant Orders ----------------
@restaurant_bp.route("/<int:restaurant_id>/orders", methods=["GET"])
def get_restaurant_orders(restaurant_id):
    orders = Order.query.filter_by(restaurant_id=restaurant_id).all()
    return jsonify([
        {
            "id": o.id,
            "status": o.status,
            "amount": o.amount,
            "created_at": o.created_at.isoformat(),
        }
        for o in orders
    ])
