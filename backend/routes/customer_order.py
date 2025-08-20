from flask import Blueprint, request, jsonify
from extensions import db
from models import Order, Table
from utils import get_restaurant_settings_dict
import json
import urllib.parse
import razorpay

customer_order_bp = Blueprint('customer_order', __name__, url_prefix='/api/customer-order')

# Initialize Razorpay client globally with your API keys
razorpay_client = razorpay.Client(auth=("rzp_test_e3clyMYTBwCo5r", "IlcQx8KXIasO6QgGXmKCmopE"))

@customer_order_bp.route('/create-order', methods=['POST'])
def create_order_with_payment():
    data = request.get_json() or {}
    try:
        amount = float(data['amount'])
        restaurant_id = int(data['restaurant_id'])
        table_number = data.get('table_number')
        requested_payment_mode = data.get('payment_method', '').strip().lower()  # Normalize input
        customer_name = data.get('customerName')
        customer_phone = data.get('customerPhone')
        items = data.get('items', [])
    except Exception as e:
        print(f"Payload parsing error: {e}")
        return jsonify({"error": "Invalid payload"}), 400

    print("Received create-order payload:", data)
    print("Requested payment method:", requested_payment_mode)

    # Find the table
    table = Table.query.filter_by(restaurant_id=restaurant_id, number=str(table_number)).first()
    if not table:
        return jsonify({"error": "Invalid table number"}), 400

    # Get restaurant settings
    rs = get_restaurant_settings_dict(restaurant_id)
    upi_id = rs.get("upi_id")
    razorpay_merchant_id = rs.get("razorpay_merchant_id")

    print("Razorpay merchant ID from settings:", razorpay_merchant_id)
    print("UPI ID from settings:", upi_id)
    print("Razorpay client initialized:", bool(razorpay_client))

    payment_mode = None
    razorpay_order_id = None
    upi_qr = None

    if requested_payment_mode == "cash":
        payment_mode = "cash"

    elif requested_payment_mode == "razorpay" and razorpay_merchant_id:
        if not razorpay_client:
            return jsonify({"error": "Razorpay is not configured on server"}), 400
        try:
            razorpay_order = razorpay_client.order.create({
                "amount": int(amount * 100),  # amount in paise
                "currency": "INR",
                "receipt": f"receipt_{restaurant_id}_table_{table_number}",
            })
            razorpay_order_id = razorpay_order.get("id")
            payment_mode = "razorpay"
            print(f"Created Razorpay order ID: {razorpay_order_id}")
        except Exception as e:
            print("Razorpay error:", e)
            return jsonify({"error": f"Failed to create Razorpay order: {str(e)}"}), 500

    elif requested_payment_mode == "upi" and upi_id:
        payment_mode = "upi"
        upi_params = {
            "pa": upi_id,
            "pn": "Restaurant",
            "am": str(amount),
            "cu": "INR"
        }
        upi_str = "upi://pay?" + urllib.parse.urlencode(upi_params)
        upi_qr = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={urllib.parse.quote(upi_str)}"
        print(f"Generated UPI QR: {upi_qr}")

    else:
        return jsonify({"error": "Invalid or unsupported payment method"}), 400

    # Create and save order record
    order = Order(
    restaurant_id=restaurant_id,
    table_id=table.id,
    customer_name=customer_name,
    customer_phone=customer_phone,
    items_json=json.dumps(items),  # <-- This should be items_json
    total=amount,
    status='pending',
    payment_method=payment_mode
)

    db.session.add(order)
    db.session.commit()
    print(f"Order created with ID: {order.id}")

    return jsonify({
        "local_order_id": order.id,
        "payment_mode": payment_mode,
        "upi_id": upi_id,
        "upi_qr": upi_qr,
        "order_id": razorpay_order_id
    })
