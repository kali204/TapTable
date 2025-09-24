# routes/customer_menu.py
from flask import Blueprint, jsonify
from extensions import db
from models import MenuItem

customer_menu_bp = Blueprint('customer_menu', __name__, url_prefix='/api/customer/menu')


@customer_menu_bp.route('/<int:restaurant_id>', methods=['GET'])
def get_customer_menu(restaurant_id):
    """
    Returns all available menu items for a given restaurant.
    Each item includes basic info and dietary information.
    """
    try:
        # Fetch only available items
        menu_items = MenuItem.query.filter_by(restaurant_id=restaurant_id, available=True).all()

        if not menu_items:
            return jsonify({"message": "No menu items available"}), 200

        # Serialize menu items safely
        result = []
        for item in menu_items:
            result.append({
                "id": str(item.id),
                "name": item.name,
                "description": item.description or "",
                "price": float(item.price) if item.price is not None else 0.0,
                "category": item.category or "",
                "image": item.image_url or "",
                "available": item.available,
                "dietaryInfo": {
                    "isVegetarian": bool(item.is_vegetarian),
                    "isVegan": bool(item.is_vegan),
                    "isGlutenFree": bool(item.is_gluten_free),
                    "isNutFree": bool(item.is_nut_free),
                }
            })

        return jsonify(result), 200

    except Exception as e:
        # Log error for debugging
        print(f"Error fetching customer menu for restaurant {restaurant_id}: {e}")
        return jsonify({"error": "Server error", "details": str(e)}), 500
