from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models import Restaurant
from extensions import db
from utils import generate_jwt

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data.get('name') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Name, email, and password required'}), 400

    if Restaurant.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400

    hashed_pw = generate_password_hash(data['password'])
    restaurant = Restaurant(name=data['name'], email=data['email'], password_hash=hashed_pw)
    db.session.add(restaurant)
    db.session.commit()

    token = generate_jwt(restaurant.id)
    return jsonify({'token': token, 'restaurant': {'id': restaurant.id, 'name': restaurant.name, 'email': restaurant.email}}), 201

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    restaurant = Restaurant.query.filter_by(email=data['email']).first()
    if restaurant and check_password_hash(restaurant.password_hash, data['password']):
        token = generate_jwt(restaurant.id)
        return jsonify({'token': token, 'restaurant': {'id': restaurant.id, 'name': restaurant.name, 'email': restaurant.email}})
    return jsonify({'error': 'Invalid credentials'}), 401
