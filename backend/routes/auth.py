# routes/auth.py
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from models import Restaurant
import jwt
import datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


# Utility function to create JWT token
def create_token(restaurant_id):
    try:
        payload = {
            'restaurant_id': restaurant_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)  # Token valid for 7 days
        }
        token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        return token
    except Exception as e:
        print(f"JWT generation error: {e}")
        return None


# Registration endpoint
@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json() or {}
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        if not name or not email or not password:
            return jsonify({'error': 'Name, email, and password are required'}), 400

        email = email.lower()  # Normalize email

        if Restaurant.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400

        hashed_password = generate_password_hash(password)
        restaurant = Restaurant(name=name, email=email, password_hash=hashed_password)

        db.session.add(restaurant)
        db.session.commit()

        token = create_token(restaurant.id)
        if not token:
            return jsonify({'error': 'Token generation failed'}), 500

        return jsonify({
            'token': token,
            'restaurant': {
                'id': restaurant.id,
                'name': restaurant.name,
                'email': restaurant.email
            }
        }), 201

    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({'error': 'Server error', 'details': str(e)}), 500


# Login endpoint
@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        email = email.lower()  # Normalize email
        restaurant = Restaurant.query.filter_by(email=email).first()

        if restaurant and check_password_hash(restaurant.password_hash, password):
            token = create_token(restaurant.id)
            if not token:
                return jsonify({'error': 'Token generation failed'}), 500

            return jsonify({
                'token': token,
                'restaurant': {
                    'id': restaurant.id,
                    'name': restaurant.name,
                    'email': restaurant.email
                }
            }), 200

        return jsonify({'error': 'Invalid credentials'}), 401

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Server error', 'details': str(e)}), 500
