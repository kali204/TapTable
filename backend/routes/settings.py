from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Restaurant
from functools import wraps
import jwt

settings_bp = Blueprint('settings', __name__, url_prefix='/api')

def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        try:
            token = token.split(' ')[1] if ' ' in token else token
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            restaurant_id = data.get('restaurant_id')
            if not restaurant_id:
                return jsonify({'error': 'Invalid token'}), 401
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401
        return f(restaurant_id, *args, **kwargs)
    return decorated

@settings_bp.route('/settings', methods=['GET'])
@auth_required
def get_settings(restaurant_id):
    restaurant = Restaurant.query.filter_by(id=restaurant_id).first()
    if not restaurant:
        return jsonify({'error': 'Restaurant not found'}), 404
    # Adjust fields as per your Restaurant model
    return jsonify({
        "id": restaurant.id,
        "name": restaurant.name,
        "email": restaurant.email,
        "phone": restaurant.phone if hasattr(restaurant, 'phone') else "",
        "address": restaurant.address if hasattr(restaurant, 'address') else "",
        # Add other relevant settings fields!
    }), 200

@settings_bp.route('/settings', methods=['POST'])
@auth_required
def update_settings(restaurant_id):
    restaurant = Restaurant.query.filter_by(id=restaurant_id).first()
    if not restaurant:
        return jsonify({'error': 'Restaurant not found'}), 404
    data = request.get_json() or {}
    for key in ['name', 'email', 'phone', 'address']:
        if key in data:
            setattr(restaurant, key, data[key])
    db.session.commit()
    return jsonify({'message': 'Settings updated'}), 200
