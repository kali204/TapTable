# routes/payment.py
from flask import Blueprint, request, jsonify, current_app
from extensions import db
import razorpay

payment_bp = Blueprint('payment', __name__, url_prefix='/api/payment')

@payment_bp.route('/create', methods=['POST'])
def create_razorpay_order():
    data = request.get_json() or {}
    amount = data.get('amount')
    receipt = data.get('receipt', 'order_receipt')
    currency = data.get('currency', 'INR')
    
    # Ensure keys and client exist
    key_id = current_app.config.get('RAZORPAY_KEY_ID')
    key_secret = current_app.config.get('RAZORPAY_KEY_SECRET')
    if not key_id or not key_secret:
        return jsonify({'error': 'Razorpay not configured'}), 400
    razorpay_client = razorpay.Client(auth=(key_id, key_secret))
    
    # Create order with Razorpay (amount in paise)
    try:
        order = razorpay_client.order.create({
            "amount": int(amount * 100),
            "currency": currency,
            "receipt": receipt,
            "payment_capture": 1
        })
        return jsonify({
            "order_id": order.get("id"),
            "amount": order.get("amount"),
            "currency": order.get("currency"),
            "receipt": order.get("receipt")
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
