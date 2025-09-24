# routes/restaurant.py
from flask import Blueprint, jsonify
from extensions import db
from models import Restaurant

restaurant_bp = Blueprint('restaurant', __name__, url_prefix='/api/restaurants')


@restaurant_bp.route('/<int:restaurant_id>', methods=['GET'])
def get_restaurant_info(restaurant_id):
    """
    Fetch detailed info about a specific restaurant by its ID.
    """
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({"error": "Restaurant not found"}), 404

    return jsonify({
        "id": restaurant.id,
        "name": restaurant.name,
        "email": getattr(restaurant, 'email', ""),
        "phone": getattr(restaurant, 'phone', ""),
        "address": getattr(restaurant, 'address', ""),
        "description": getattr(restaurant, 'description', ""),
        "logo_url": getattr(restaurant, 'logo_url', ""),
        "created_at": getattr(restaurant, 'created_at', None).isoformat() if getattr(restaurant, 'created_at', None) else None,
        "updated_at": getattr(restaurant, 'updated_at', None).isoformat() if getattr(restaurant, 'updated_at', None) else None
    }), 200
