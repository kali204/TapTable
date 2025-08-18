# routes/auth.py
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from models import Restaurant
import jwt
import datetime
from flask import current_app

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def create_token(restaurant_id):
    payload = {
        'restaurant_id': restaurant_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json() or {}
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        if not name or not email or not password:
            return jsonify({'error': 'Name, email, and password required'}), 400
        if Restaurant.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400

        hashed = generate_password_hash(password)
        user = Restaurant(name=name, email=email, password_hash=hashed)
        db.session.add(user)
        db.session.commit()
        token = create_token(user.id)
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        return jsonify({
            'token': token,
            'restaurant': {
                'id': user.id,
                'name': user.name,
                'email': user.email
            }
        }), 201
    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({'error': 'Server error', 'details': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    user = Restaurant.query.filter_by(email=email).first()

    if user and check_password_hash(user.password_hash, password):
        token = create_token(user.id)
        return jsonify({
        'token': token,
        'restaurant': {
            'id': user.id,
            'name': user.name,
            'email': user.email
        }
    }), 200



    return jsonify({'error': 'Invalid credentials'}), 401
