# routes/analytics.py
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Order, Review
from functools import wraps
import jwt
import datetime
from sqlalchemy import func

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

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

@analytics_bp.route('/', methods=['GET'])
@auth_required
def get_analytics(restaurant_id):
    time_range = request.args.get('timeRange', '7days')
    now = datetime.datetime.utcnow()

    if time_range == '30days':
        start_date = now - datetime.timedelta(days=30)
    else:
        start_date = now - datetime.timedelta(days=7)  # default 7 days

    completed_orders = Order.query.filter(
        Order.restaurant_id == restaurant_id,
        Order.status == 'completed',
        Order.created_at >= start_date
    ).all()

    total_orders = len(completed_orders)
    total_revenue = sum(order.total for order in completed_orders) if completed_orders else 0.0

    avg_rating = db.session.query(func.avg(Review.rating)).filter(
        Review.restaurant_id == restaurant_id,
        Review.created_at >= start_date
    ).scalar() or 0.0

    recent_reviews = Review.query.filter(
        Review.restaurant_id == restaurant_id,
        Review.created_at >= start_date,
        Review.comment.isnot(None)
    ).order_by(Review.created_at.desc()).limit(5).all()

    recent_comments = [r.comment for r in recent_reviews]

    return jsonify({
        'total_orders': total_orders,
        'total_revenue': total_revenue,
        'average_rating': round(avg_rating, 2),
        'recent_reviews': recent_comments
    })
from models import Order, MenuItem  # or whatever data you want to aggregate

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/<int:restaurant_id>', methods=['GET'])
def restaurant_analytics(restaurant_id):
    # Example: total sales and order count
    orders = Order.query.filter_by(restaurant_id=restaurant_id).all()
    total_sales = sum(o.total for o in orders)
    order_count = len(orders)
    return jsonify({
        "restaurant_id": restaurant_id,
        "order_count": order_count,
        "total_sales": total_sales
    }), 200