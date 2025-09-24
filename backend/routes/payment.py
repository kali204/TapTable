# routes/payment.py
from flask import Blueprint, request, jsonify, current_app
import razorpay

payment_bp = Blueprint('payment', __name__, url_prefix='/api/payment')


@payment_bp.route('/create', methods=['POST'])
def create_razorpay_order():
    """
    Creates a Razorpay order for a given amount.
    Request JSON:
    {
        "amount": 500.0,
        "receipt": "order_123",
        "currency": "INR"
    }
    """
    data = request.get_json() or {}
    amount = data.get('amount')
    receipt = data.get('receipt', 'order_receipt')
    currency = data.get('currency', 'INR')

    # Validate amount
    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError("Amount must be greater than zero")
    except Exception:
        return jsonify({'error': 'Invalid amount'}), 400

    # Ensure Razorpay keys are configured
    key_id = current_app.config.get('RAZORPAY_KEY_ID')
    key_secret = current_app.config.get('RAZORPAY_KEY_SECRET')
    if not key_id or not key_secret:
        return jsonify({'error': 'Razorpay not configured'}), 400

    razorpay_client = razorpay.Client(auth=(key_id, key_secret))

    # Create Razorpay order
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": int(amount * 100),  # amount in paise
            "currency": currency,
            "receipt": receipt,
            "payment_capture": 1
        })
        return jsonify({
            "order_id": razorpay_order.get("id"),
            "amount": razorpay_order.get("amount"),
            "currency": razorpay_order.get("currency"),
            "receipt": razorpay_order.get("receipt")
        }), 201
    except Exception as e:
        return jsonify({'error': f"Failed to create Razorpay order: {str(e)}"}), 500
