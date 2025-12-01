# routes/menu.py
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import MenuItem
from functools import wraps
import jwt
from utils.dietary import detect_dietary_info

menu_bp = Blueprint('menu', __name__, url_prefix='/api/menu')


# -------------------------
# Auth decorator
# -------------------------
def auth_required(f):
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


# -------------------------
# Add menu item
# -------------------------
@menu_bp.route('/', methods=['POST'])
@auth_required
def add_menu_item(restaurant_id):
    data = request.get_json() or {}
    name = data.get('name')
    price = data.get('price')

    if not name or price is None:
        return jsonify({'error': 'Name and price are required'}), 400

    diet = detect_dietary_info(name, data.get("description", ""))

    item = MenuItem(
        restaurant_id=restaurant_id,
        name=name,
        description=data.get('description'),
        price=float(price),
        category=data.get('category'),
        image_url=data.get('image_url'),
        available=data.get('available', True),

        # PASS the detected values to the database model
        is_vegetarian=diet["is_vegetarian"],
        is_vegan=diet["is_vegan"],
        is_gluten_free=diet["is_gluten_free"],
        is_nut_free=diet["is_nut_free"],
    )

    db.session.add(item)
    db.session.commit()
    return jsonify({'message': 'Menu item added', 'id': item.id}), 201


# -------------------------
# Get menu items (public)
# -------------------------
@menu_bp.route('/<int:restaurant_id>', methods=['GET'])
def get_menu(restaurant_id):
    menu_items = MenuItem.query.filter_by(restaurant_id=restaurant_id).all()
    return jsonify([
        {
            "id": item.id,
            "name": item.name,
            "description": item.description or "",
            "price": float(item.price),
            "category": item.category,
            "image_url": item.image_url or "",
            "available": bool(item.available),
            "dietaryInfo": {
                "isVegetarian": bool(item.is_vegetarian),
                "isVegan": bool(item.is_vegan),
                "isGlutenFree": bool(item.is_gluten_free),
                "isNutFree": bool(item.is_nut_free),
            }
        } for item in menu_items
    ]), 200


# -------------------------
# Update menu item
# -------------------------
@menu_bp.route('/<int:item_id>', methods=['PUT'])
@auth_required
def update_menu_item(restaurant_id, item_id):
    item = MenuItem.query.filter_by(id=item_id, restaurant_id=restaurant_id).first()
    if not item:
        return jsonify({'error': 'Menu item not found'}), 404

    data = request.get_json() or {}
    for field in ['name', 'description', 'price', 'category', 'image_url', 'available',
                  'is_vegetarian', 'is_vegan', 'is_gluten_free', 'is_nut_free']:
        if field in data:
            setattr(item, field, data[field])
    db.session.commit()
    return jsonify({'message': 'Menu item updated'}), 200


# -------------------------
# Delete menu item
# -------------------------
@menu_bp.route('/<int:item_id>', methods=['DELETE'])
@auth_required
def delete_menu_item(restaurant_id, item_id):
    item = MenuItem.query.filter_by(id=item_id, restaurant_id=restaurant_id).first()
    if not item:
        return jsonify({'error': 'Menu item not found'}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Menu item deleted'}), 200
