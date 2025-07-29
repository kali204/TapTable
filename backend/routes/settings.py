from flask import Blueprint, request, jsonify
from models import RestaurantSettings
from extensions import db
from utils import auth_required

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/api/settings', methods=['GET'])
@auth_required
def get_settings(current_user):
    settings = RestaurantSettings.query.filter_by(restaurant_id=current_user.id).first()
    if not settings:
        return jsonify({})
    return jsonify({
        'upi_id': settings.upi_id,
        'bank_account_name': settings.bank_account_name,
        'bank_account_number': settings.bank_account_number,
        'ifsc_code': settings.ifsc_code,
        'description': settings.description,
        'phone': settings.phone,
        'email': settings.email,
        'razorpay_account_id': settings.razorpay_account_id
    })

@settings_bp.route('/api/settings', methods=['POST'])
@auth_required
def update_settings(current_user):
    data = request.get_json()
    settings = RestaurantSettings.query.filter_by(restaurant_id=current_user.id).first()
    if not settings:
        settings = RestaurantSettings(restaurant_id=current_user.id)
        db.session.add(settings)

    settings.upi_id = data.get('upi_id', settings.upi_id)
    settings.bank_account_name = data.get('bank_account_name', settings.bank_account_name)
    settings.bank_account_number = data.get('bank_account_number', settings.bank_account_number)
    settings.ifsc_code = data.get('ifsc_code', settings.ifsc_code)
    settings.description = data.get('description', settings.description)
    settings.phone = data.get('phone', settings.phone)
    settings.email = data.get('email', settings.email)
    settings.razorpay_account_id = data.get('razorpay_account_id', settings.razorpay_account_id)

    db.session.commit()
    return jsonify({'message': 'Settings updated successfully'})
