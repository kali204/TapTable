from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import MenuItem
from functools import wraps
import jwt


menu_bp = Blueprint('menu', __name__, url_prefix='/api/menu')



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


@menu_bp.route('/', methods=['POST'])
@auth_required
def add_menu_item(restaurant_id):
    data = request.get_json() or {}
    name = data.get('name')
    price = data.get('price')
    if not name or price is None:
        return jsonify({'error': 'Name and price are required'}), 400
    item = MenuItem(
        restaurant_id=restaurant_id,
        name=name,
        description=data.get('description'),
        price=price,
        category=data.get('category'),
        image_url=data.get('image_url'),
        available=data.get('available', True)
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({'message': 'Menu item added', 'id': item.id}), 201


# Public route to get menu for any restaurant by ID (no auth)
@menu_bp.route('/<int:restaurant_id>', methods=['GET'])
def get_menu(restaurant_id):
    items = MenuItem.query.filter_by(restaurant_id=restaurant_id).all()
    return jsonify([{
        'id': i.id,
        'name': i.name,
        'description': i.description,
        'price': i.price,
        'category': i.category,
        'image_url': i.image_url,
        'available': i.available
    } for i in items]), 200


@menu_bp.route('/<int:item_id>', methods=['PUT'])
@auth_required
def update_menu_item(restaurant_id, item_id):
    item = MenuItem.query.filter_by(id=item_id, restaurant_id=restaurant_id).first()
    if not item:
        return jsonify({'error': 'Menu item not found'}), 404
    data = request.get_json() or {}
    for field in ['name', 'description', 'price', 'category', 'image_url', 'available']:
        if field in data:
            setattr(item, field, data[field])
    db.session.commit()
    return jsonify({'message': 'Menu item updated'}), 200


@menu_bp.route('/<int:item_id>', methods=['DELETE'])
@auth_required
def delete_menu_item(restaurant_id, item_id):
    item = MenuItem.query.filter_by(id=item_id, restaurant_id=restaurant_id).first()
    if not item:
        return jsonify({'error': 'Menu item not found'}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Menu item deleted'}), 200
