# routes/customer_order.py
from flask import Blueprint, request, jsonify
from extensions import db
from models import Order, Table
from utils import get_restaurant_settings_dict
import json
import urllib.parse
import razorpay

customer_order_bp = Blueprint('customer_order', __name__, url_prefix='/api/customer-order')

# Initialize Razorpay client globally (replace with environment variables ideally)
razorpay_client = razorpay.Client(auth=("rzp_test_e3clyMYTBwCo5r", "IlcQx8KXIasO6QgGXmKCmopE"))


@customer_order_bp.route('/create-order', methods=['POST'])
def create_order_with_payment():
    """
    Creates a new order and generates payment instructions based on selected method:
    cash, UPI, or Razorpay.
    """
    data = request.get_json() or {}

    # --- Parse payload safely ---
    try:
        amount = float(data.get('amount', 0))
        restaurant_id = int(data.get('restaurant_id', 0))
        table_number = data.get('table_number')
        requested_payment_mode = (data.get('payment_method') or '').strip().lower()
        customer_name = data.get('customerName', '').strip()
        customer_phone = data.get('customerPhone', '').strip()
        items = data.get('items', [])
    except Exception as e:
        print(f"[ERROR] Payload parsing error: {e}")
        return jsonify({"error": "Invalid payload", "details": str(e)}), 400

    # --- Validate essential fields ---
    if not (restaurant_id and table_number and amount > 0):
        return jsonify({"error": "Missing required order details"}), 400

    # --- Find the table ---
    table = Table.query.filter_by(restaurant_id=restaurant_id, number=str(table_number)).first()
    if not table:
        return jsonify({"error": "Invalid table number"}), 400

    # --- Get restaurant settings ---
    rs = get_restaurant_settings_dict(restaurant_id)
    upi_id = rs.get("upi_id")
    razorpay_merchant_id = rs.get("razorpay_merchant_id")

    # --- Initialize payment variables ---
    payment_mode = None
    razorpay_order_id = None
    upi_qr = None

    # --- Handle payment modes ---
    if requested_payment_mode == "cash":
        payment_mode = "cash"

    elif requested_payment_mode == "razorpay" and razorpay_merchant_id:
        if not razorpay_client:
            return jsonify({"error": "Razorpay is not configured on server"}), 400
        try:
            razorpay_order = razorpay_client.order.create({
                "amount": int(amount * 100),  # Convert to paise
                "currency": "INR",
                "receipt": f"receipt_{restaurant_id}_table_{table_number}",
            })
            razorpay_order_id = razorpay_order.get("id")
            payment_mode = "razorpay"
        except Exception as e:
            print(f"[ERROR] Razorpay order creation failed: {e}")
            return jsonify({"error": "Failed to create Razorpay order", "details": str(e)}), 500

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

    else:
        return jsonify({"error": "Invalid or unsupported payment method"}), 400

    # --- Create and save the order ---
    try:
        order = Order(
            restaurant_id=restaurant_id,
            table_id=table.id,
            customer_name=customer_name,
            customer_phone=customer_phone,
            items_json=json.dumps(items),
            total=amount,
            status='pending',
            payment_method=payment_mode
        )
        db.session.add(order)
        db.session.commit()
    except Exception as e:
        print(f"[ERROR] Saving order failed: {e}")
        db.session.rollback()
        return jsonify({"error": "Failed to save order", "details": str(e)}), 500

    # --- Return order details ---
    return jsonify({
        "local_order_id": order.id,
        "payment_mode": payment_mode,
        "upi_id": upi_id if payment_mode == "upi" else None,
        "upi_qr": upi_qr,
        "razorpay_order_id": razorpay_order_id
    }), 201
