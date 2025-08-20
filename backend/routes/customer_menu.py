from flask import Blueprint, jsonify
from models import MenuItem

customer_menu_bp = Blueprint('customer_menu', __name__, url_prefix='/api/customer/menu')

@customer_menu_bp.route('/<int:restaurant_id>', methods=['GET'])
def get_customer_menu(restaurant_id):
    try:
        menu_items = MenuItem.query.filter_by(restaurant_id=restaurant_id, available=True).all()
        
        if not menu_items:
            return jsonify({"message": "No menu items available"}), 200

        result = [
            {
                "id": str(item.id),
                "name": item.name,
                "description": item.description or "",
                "price": float(item.price),  # Ensure safe serialization
                "category": item.category,
                "image": item.image_url or "",  # maps correctly for frontend
                "available": item.available,
                "dietaryInfo": {
                    "isVegetarian": item.is_vegetarian,
                    "isVegan": item.is_vegan,
                    "isGlutenFree": item.is_gluten_free,
                    "isNutFree": item.is_nut_free,
                }
            }
            for item in menu_items
        ]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
