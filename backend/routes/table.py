from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Table
from functools import wraps
import jwt
import urllib.parse

# Plural blueprint for /api/tables endpoints
table_bp = Blueprint('tables', __name__, url_prefix='/api/tables')

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

def generate_qr_code(restaurant_id, table_number):
    base_url = "https://taptable.onrender.com/menu"
    # Encoding is optional as QR server API can handle most characters, but safer with urllib.parse.quote
    url_to_encode = f"{base_url}/{restaurant_id}/table_{table_number}"
    encoded_data = urllib.parse.quote(url_to_encode)
    return f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={encoded_data}"

@table_bp.route('/', methods=['POST'])
@auth_required
def add_table(restaurant_id):
    data = request.get_json() or {}
    number = str(data.get('number'))  # Always a string for DB compatibility
    seats = data.get('seats', 0)
    if not number:
        return jsonify({'error': 'Table number is required'}), 400
    if Table.query.filter_by(restaurant_id=restaurant_id, number=number).first():
        return jsonify({'error': 'Table number already exists'}), 400

    qr_code_url = generate_qr_code(restaurant_id, number)
    table = Table(restaurant_id=restaurant_id, number=number, seats=seats, qr_code=qr_code_url)
    db.session.add(table)
    db.session.commit()

    return jsonify({
        'message': 'Table added',
        'table': {
            'id': table.id,
            'number': table.number,
            'seats': table.seats,
            'qr_code': table.qr_code
        }
    }), 201

@table_bp.route('/', methods=['GET'])
@auth_required
def get_tables(restaurant_id):
    tables = Table.query.filter_by(restaurant_id=restaurant_id).all()
    return jsonify([{
        'id': t.id,
        'number': t.number,
        'seats': t.seats,
        'qr_code': t.qr_code
    } for t in tables]), 200

@table_bp.route('/<int:table_id>', methods=['DELETE'])
@auth_required
def delete_table(restaurant_id, table_id):
    table = Table.query.filter_by(id=table_id, restaurant_id=restaurant_id).first()
    if not table:
        return jsonify({'error': 'Table not found'}), 404
    db.session.delete(table)
    db.session.commit()
    return jsonify({'message': 'Table deleted'}), 200
