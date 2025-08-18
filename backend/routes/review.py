# routes/review.py
from flask import Blueprint

review_bp = Blueprint('review', __name__, url_prefix='/api/review')
# routes/review.py
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Review
from functools import wraps
import jwt
import datetime

review_bp = Blueprint('review', __name__, url_prefix='/api/review')

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

@review_bp.route('/', methods=['POST'])
@auth_required
def add_review(restaurant_id):
    data = request.get_json() or {}
    rating = data.get('rating')
    comment = data.get('comment', '')

    if rating is None or not (1 <= rating <= 5):
        return jsonify({'error': 'Rating (1-5) is required'}), 400

    review = Review(
        restaurant_id=restaurant_id,
        rating=rating,
        comment=comment,
        created_at=datetime.datetime.utcnow()
    )
    db.session.add(review)
    db.session.commit()
    return jsonify({'message': 'Review added'}), 201

@review_bp.route('/', methods=['GET'])
@auth_required
def get_reviews(restaurant_id):
    reviews = Review.query.filter_by(restaurant_id=restaurant_id).order_by(Review.created_at.desc()).all()
    return jsonify([
        {
            'id': r.id,
            'rating': r.rating,
            'comment': r.comment,
            'created_at': r.created_at.isoformat()
        } for r in reviews
    ]), 200
