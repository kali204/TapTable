from flask import Blueprint, request, jsonify
from models import Order
from extensions import db
from utils import get_restaurant_settings
import razorpay

orders_bp = Blueprint('orders', __name__)

# Initialize Razorpay client (✅ use your keys)
razorpay_client = razorpay.Client(auth=("rzp_test_EGll8CPXbwIl7U", "Dv4WsalYChvY5ynbKeAShFXK"))

@orders_bp.route('/api/create-order', methods=['POST'])
def create_order_with_payment():
    data = request.json
    amount = data['amount']
    restaurant_id = data['restaurant_id']
    table_id = data['table_id']

    try:
        restaurant_settings = get_restaurant_settings(restaurant_id)
        if not restaurant_settings or not restaurant_settings.get("razorpay_account_id"):
            return jsonify({"error": "Razorpay account ID not configured"}), 400

        account_id = restaurant_settings["razorpay_account_id"]

        # Create Razorpay order
        razorpay_order = razorpay_client.order.create({
            "amount": int(amount * 100),
            "currency": "INR",
            "receipt": f"receipt_{restaurant_id}_{table_id}",
            "transfers": [
                {
                    "account": account_id,
                    "amount": int(amount * 100),
                    "currency": "INR",
                    "notes": {
                        "restaurant_id": str(restaurant_id),
                        "table_id": str(table_id),
                    }
                }
            ]
        })
    except Exception as e:
        print("⚠️ Razorpay error:", e)
        return jsonify({"error": f"Failed to create Razorpay order: {str(e)}"}), 500

    # Save order locally
    order = Order(
        restaurant_id=restaurant_id,
        table_id=table_id,
        customer_name=data['customerName'],
        customer_phone=data['customerPhone'],
        items=str(data['items']),
        total=amount,
        status='pending'
    )
    db.session.add(order)
    db.session.commit()

    return jsonify({"order_id": razorpay_order["id"], "local_order_id": order.id})
