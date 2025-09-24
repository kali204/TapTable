# routes/settings.py
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Restaurant, RestaurantSettings
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
    """
    Get the settings for the authenticated restaurant.
    """
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({'error': 'Restaurant not found'}), 404

    s = RestaurantSettings.query.filter_by(restaurant_id=restaurant_id).first()

    return jsonify({
        'name': restaurant.name,
        'email': getattr(s, 'email', getattr(restaurant, 'email', '')),
        'phone': getattr(s, 'phone', ''),
        'description': getattr(s, 'description', ''),
        'upi_id': getattr(s, 'upi_id', ''),
        'razorpay_merchant_id': getattr(s, 'razorpay_merchant_id', ''),
        'bank_account_name': getattr(s, 'bank_account_name', ''),
        'bank_account_number': getattr(s, 'bank_account_number', ''),
        'ifsc_code': getattr(s, 'ifsc_code', '')
    })


@settings_bp.route('/settings', methods=['POST'])
@auth_required
def update_settings(restaurant_id):
    """
    Update the settings for the authenticated restaurant.
    This will update both Restaurant and RestaurantSettings tables if needed.
    """
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({'error': 'Restaurant not found'}), 404

    data = request.get_json() or {}

    # Update Restaurant fields
    if 'name' in data and data['name']:
        restaurant.name = data['name']
    if 'email' in data and data['email']:
        restaurant.email = data['email']

    # Update RestaurantSettings fields
    s = RestaurantSettings.query.filter_by(restaurant_id=restaurant_id).first()
    if not s:
        s = RestaurantSettings(restaurant_id=restaurant_id)
        db.session.add(s)

    for field in ['upi_id', 'bank_account_name', 'bank_account_number', 'ifsc_code',
                  'description', 'phone', 'razorpay_merchant_id']:
        if field in data:
            setattr(s, field, data[field])

    db.session.commit()
    return jsonify({'message': 'Settings updated successfully'})
