from flask import request, jsonify
from sqlalchemy import func
from datetime import datetime, timedelta

@app.route('/api/analytics/<int:restaurant_id>', methods=['GET', 'OPTIONS'])
def get_analytics(restaurant_id):
    # --- Get time range params ---
    time_range = request.args.get('timeRange', '7days')
    start_date = None
    end_date = None
    
    if time_range == 'custom':
        start_str = request.args.get('startDate')
        end_str = request.args.get('endDate')
        if start_str and end_str:
            start_date = datetime.strptime(start_str, "%Y-%m-%d")
            end_date = datetime.strptime(end_str, "%Y-%m-%d")
        else:
            # Fallback default
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=6)
    elif time_range == '30days':
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=29)
    else: # default, 7days
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=6)

    # Query completed orders for CURRENT period
    orders_query = Order.query.filter(
        Order.restaurant_id==restaurant_id,
        Order.status=='completed',
        Order.completed_at>=start_date,
        Order.completed_at<=end_date
    )

    completed_orders = orders_query.all()
    total_orders = len(completed_orders)
    total_revenue = sum(order.total for order in completed_orders) if completed_orders else 0

    # Revenue trend (group by day)
    daily_revenues = (
        Order.query
        .filter(
            Order.restaurant_id==restaurant_id,
            Order.status=='completed',
            Order.completed_at>=start_date,
            Order.completed_at<=end_date
        )
        .with_entities(
            func.date(Order.completed_at).label('date'),
            func.sum(Order.total).label('revenue')
        )
        .group_by(func.date(Order.completed_at))
        .order_by(func.date(Order.completed_at))
        .all()
    )
    # Fill in dates with zero if missing
    date_list = [(start_date + timedelta(days=i)).date() for i in range((end_date-start_date).days + 1)]
    revenue_trend = []
    revenue_by_date = {d[0]: float(d[1]) for d in daily_revenues}
    for d in date_list:
        revenue_trend.append({
            'date': d.strftime("%Y-%m-%d"),
            'revenue': revenue_by_date.get(d, 0.0)
        })

    # --- Previous period for comparison ---
    period_days = (end_date - start_date).days + 1
    prev_end = start_date - timedelta(days=1)
    prev_start = prev_end - timedelta(days=period_days-1)
    prev_orders_query = Order.query.filter(
        Order.restaurant_id==restaurant_id,
        Order.status=='completed',
        Order.completed_at>=prev_start,
        Order.completed_at<=prev_end
    )
    prev_completed_orders = prev_orders_query.all()
    prev_total_orders = len(prev_completed_orders)
    prev_total_revenue = sum(order.total for order in prev_completed_orders) if prev_completed_orders else 0

    # Reviews & ratings
    reviews = Review.query.filter(
        Review.restaurant_id==restaurant_id,
        Review.created_at>=start_date,
        Review.created_at<=end_date
    ).all()
    avg_rating = round(sum([r.rating for r in reviews]) / len(reviews), 1) if reviews else 0
    # Previous rating
    prev_reviews = Review.query.filter(
        Review.restaurant_id==restaurant_id,
        Review.created_at>=prev_start,
        Review.created_at<=prev_end
    ).all()
    prev_avg_rating = round(sum([r.rating for r in prev_reviews]) / len(prev_reviews), 1) if prev_reviews else 0

    # --- Top Items: You can fill this logic as needed ---
    # Example: Get top 5 most ordered items in current period
    from sqlalchemy import desc
    from collections import Counter
    item_names = []
    for order in completed_orders:
        for item in order.items: # assuming order.items is a list of OrderItem with .name attribute
            item_names.append(item.name)
    top_items = [name for name, count in Counter(item_names).most_common(5)]

    # --- Reviews: latest 5 reviews in the date range ---
    recent_reviews = [r.comment for r in sorted(reviews, key=lambda r: r.created_at, reverse=True)[:5]]
    
    return jsonify({
        'total_orders': total_orders,
        'total_revenue': total_revenue,
        'average_rating': avg_rating,
        'previous_orders': prev_total_orders,
        'previous_revenue': prev_total_revenue,
        'previous_rating': prev_avg_rating,
        'revenue_trend': revenue_trend,
        'top_items': top_items,
        'recent_reviews': recent_reviews
    })
