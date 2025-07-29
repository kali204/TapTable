from flask import Blueprint, jsonify
from models import Restaurant

restaurant_bp = Blueprint('restaurant', __name__)

@restaurant_bp.route('/api/restaurants/<int:restaurant_id>', methods=['GET'])
def get_restaurant_info(restaurant_id):
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({'error': 'Restaurant not found'}), 404

    return jsonify({
        'id': restaurant.id,
        'name': restaurant.name,
        'email': restaurant.email,
        'created_at': restaurant.created_at.isoformat()
    })
