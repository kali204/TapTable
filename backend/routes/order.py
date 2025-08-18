# routes/order.py
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Order, Table
from functools import wraps
import jwt
import json
from datetime import datetime, timedelta

order_bp = Blueprint('order', __name__, url_prefix='/api/orders')


def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        try:
            token = token.split(' ')[1] if ' ' in token else token
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = data.get('restaurant_id')
            if not user_id:
                return jsonify({'error': 'Invalid token'}), 401
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401
        return f(user_id, *args, **kwargs)
    return decorated

@order_bp.route('/', methods=['GET'])
@auth_required
def get_orders(restaurant_id):
    orders = Order.query.filter_by(restaurant_id=restaurant_id).all()
    result = []
    for o in orders:
        result.append({
            'id': o.id,
            'table_id': o.table_id,
            'customer_name': o.customer_name,
            'customer_phone': o.customer_phone,
            'items_json': o.items_json,
            'total': o.total,
            'status': o.status,
            'payment_method': o.payment_method,
            'created_at': o.created_at.isoformat()
        })
    return jsonify(result), 200

@order_bp.route('/', methods=['POST'])
@auth_required
def create_order(restaurant_id):
    data = request.get_json() or {}
    table_number = data.get('table_number')
    customer_name = data.get('customer_name')
    customer_phone = data.get('customer_phone')
    items = data.get('items', [])
    total = data.get('total')
    payment_method = data.get('payment_method', 'cash')

    if not table_number or total is None:
        return jsonify({'error': 'Table number and total are required'}), 400

    # Find table by number and restaurant
    table = Table.query.filter_by(restaurant_id=restaurant_id, number=str(table_number)).first()
    if not table:
        return jsonify({'error': 'Invalid table number'}), 400

    order = Order(
        restaurant_id=restaurant_id,
        table_id=table.id,
        customer_name=customer_name,
        customer_phone=customer_phone,
        items_json=json.dumps(items),
        total=total,
        status='pending',
        payment_method=payment_method,
        created_at=datetime.utcnow()
    )
    db.session.add(order)
    db.session.commit()

    return jsonify({'message': 'Order created', 'order_id': order.id}), 201


@order_bp.route('/<int:order_id>/status', methods=['PUT'])
@auth_required
def update_order_status(restaurant_id, order_id):
    data = request.get_json() or {}
    new_status = data.get('status')
    valid_statuses = ['pending', 'preparing', 'ready', 'completed']
    if new_status not in valid_statuses:
        return jsonify({'error': 'Invalid status'}), 400

    order = Order.query.filter_by(id=order_id, restaurant_id=restaurant_id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    order.status = new_status
    db.session.commit()
    return jsonify({'message': 'Order status updated'}), 200
