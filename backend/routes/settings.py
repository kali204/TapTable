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
    # Load restaurant object
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({'error': 'Restaurant not found'}), 404

    s = RestaurantSettings.query.filter_by(restaurant_id=restaurant_id).first()
    if not s:
        return jsonify({
            'name': restaurant.name,
            'email': restaurant.email,
            'description': '',
            'phone': '',
            'upi_id': '',
            'razorpay_merchant_id': ''
        })

    return jsonify({
        'name': restaurant.name,
        'upi_id': s.upi_id,
        'bank_account_name': s.bank_account_name,
        'bank_account_number': s.bank_account_number,
        'ifsc_code': s.ifsc_code,
        'description': s.description,
        'phone': s.phone,
        'email': s.email,
        'razorpay_merchant_id': s.razorpay_merchant_id
    })

@settings_bp.route('/settings', methods=['POST'])
@auth_required
def update_settings(restaurant_id):
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({'error': 'Restaurant not found'}), 404

    data = request.get_json() or {}
    s = RestaurantSettings.query.filter_by(restaurant_id=restaurant_id).first()
    if not s:
        s = RestaurantSettings(restaurant_id=restaurant_id)
        db.session.add(s)

    if 'name' in data and data['name']:
        restaurant.name = data['name']

    s.upi_id = data.get('upi_id', s.upi_id)
    s.bank_account_name = data.get('bank_account_name', s.bank_account_name)
    s.bank_account_number = data.get('bank_account_number', s.bank_account_number)
    s.ifsc_code = data.get('ifsc_code', s.ifsc_code)
    s.description = data.get('description', s.description)
    s.phone = data.get('phone', s.phone)
    s.email = data.get('email', s.email)
    s.razorpay_merchant_id = data.get('razorpay_merchant_id', s.razorpay_merchant_id)

    db.session.commit()
    return jsonify({'message': 'Settings updated successfully'})
