from flask import Blueprint, request, jsonify
from models import MenuItem
from extensions import db
from utils import auth_required

menu_bp = Blueprint('menu', __name__)

@menu_bp.route('/api/menu/<int:restaurant_id>', methods=['GET'])
def get_menu(restaurant_id):
    items = MenuItem.query.filter_by(restaurant_id=restaurant_id).all()
    return jsonify([{
        'id': item.id,
        'name': item.name,
        'description': item.description,
        'price': item.price,
        'category': item.category,
        'image': item.image_url,
        'available': item.available
    } for item in items])

@menu_bp.route('/api/menu', methods=['POST'])
@auth_required
def add_menu_item(current_user):
    data = request.get_json()
    item = MenuItem(
        restaurant_id=current_user.id,
        name=data['name'],
        description=data.get('description', ''),
        price=data['price'],
        category=data['category'],
        image_url=data.get('image', ''),
        available=data.get('available', True)
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({'message': 'Item added'}), 201
