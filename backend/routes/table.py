# routes/table.py
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Table
from functools import wraps
import jwt
import urllib.parse

table_bp = Blueprint('tables', __name__, url_prefix='/api/tables')


def auth_required(f):
    """
    Decorator to enforce JWT authentication for restaurant endpoints.
    """
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


def _build_public_base():
    """
    Build the public base URL from incoming request headers.
    Works with ngrok, Cloudflare Tunnel, reverse proxies, etc.

    Priority:
    1) X-Forwarded-Proto + X-Forwarded-Host (if proxy supplies them)
    2) X-Forwarded-Proto + Host
    3) request.scheme + Host
    4) request.host_url as fallback
    """
    forwarded_proto = request.headers.get("X-Forwarded-Proto")
    forwarded_host = request.headers.get("X-Forwarded-Host") or request.headers.get("Host")

    if forwarded_proto and forwarded_host:
        scheme = forwarded_proto
        host = forwarded_host
    elif forwarded_host:
        scheme = forwarded_proto or request.scheme
        host = forwarded_host
    else:
        # As a final fallback, use Flask's host_url (contains scheme+host)
        # host_url contains trailing slash, remove it.
        return request.host_url.rstrip('/')

    base = f"{scheme}://{host}"
    return base.rstrip('/')


def generate_qr_code_for_target(target_url: str) -> str:
    """
    Uses a QR generation service to create a QR image URL for the given target URL.
    Encodes the target properly.
    """
    encoded_data = urllib.parse.quote(target_url, safe='')
    return f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={encoded_data}"


@table_bp.route('/', methods=['POST'])
@auth_required
def add_table(restaurant_id):
    """
    Add a new table for a restaurant.
    Payload: {"number": str/int, "seats": int}
    """
    data = request.get_json() or {}
    number = str(data.get('number')).strip()  # Store as string for consistency
    seats = int(data.get('seats', 0) or 0)

    if not number:
        return jsonify({'error': 'Table number is required'}), 400
    if Table.query.filter_by(restaurant_id=restaurant_id, number=number).first():
        return jsonify({'error': 'Table number already exists'}), 400

    # Build public base dynamically from request (works with ngrok)
    base_url = _build_public_base()

    # Construct the customer-facing path (adjust if your frontend uses a different route)
    target = f"{base_url}/menu/{restaurant_id}/table_{number}"

    # Generate QR image (using qrserver API). You can switch to other services or generate images server-side.
    qr_code_url = generate_qr_code_for_target(target)

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
    """
    Get all tables for the authenticated restaurant.
    """
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
    """
    Delete a table by its ID for the authenticated restaurant.
    """
    table = Table.query.filter_by(id=table_id, restaurant_id=restaurant_id).first()
    if not table:
        return jsonify({'error': 'Table not found'}), 404

    db.session.delete(table)
    db.session.commit()
    return jsonify({'message': 'Table deleted'}), 200


@table_bp.route('/public/<int:restaurant_id>', methods=['GET'])
def get_tables_public(restaurant_id):
    """
    Public endpoint: Get all tables of a restaurant (no auth required).
    """
    tables = Table.query.filter_by(restaurant_id=restaurant_id).all()
    return jsonify([{
        'id': t.id,
        'number': t.number,
        'seats': t.seats,
        'qr_code': t.qr_code
    } for t in tables]), 200


# --- New endpoint: regenerate QR for an existing table (useful when ngrok URL changed) ---
@table_bp.route('/<int:table_id>/regenerate', methods=['POST'])
@auth_required
def regenerate_table_qr(restaurant_id, table_id):
    """
    Regenerate QR code for an existing table using current public host info.
    """
    table = Table.query.filter_by(id=table_id, restaurant_id=restaurant_id).first()
    if not table:
        return jsonify({'error': 'Table not found'}), 404

    base_url = _build_public_base()
    target = f"{base_url}/menu/{restaurant_id}/table_{table.number}"
    table.qr_code = generate_qr_code_for_target(target)
    db.session.commit()

    return jsonify({
        'message': 'QR regenerated',
        'table': {
            'id': table.id,
            'number': table.number,
            'seats': table.seats,
            'qr_code': table.qr_code
        }
    }), 200
