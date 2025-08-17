from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta,timezone
from collections import Counter
from functools import wraps
from sqlalchemy import func
import razorpay
import jwt
import json
import urllib.parse
from dietary_classifier import dietary_classifier
import os
from dotenv import load_dotenv
load_dotenv()
app=  Flask(__name__, static_folder="dist", static_url_path="")

# Database config from environment variables
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY")

app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
CORS(app)

razorpay_client = razorpay.Client(auth=("rzp_test_e3clyMYTBwCo5r", "IlcQx8KXIasO6QgGXmKCmopE"))

# --- MODELS ---
class Restaurant(db.Model):
    __tablename__ = "restaurants"  # 👈 important so table name matches
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    menu_items = db.relationship('MenuItem', backref='restaurant', lazy=True)
    tables = db.relationship('Table', backref='restaurant', lazy=True)
    orders = db.relationship('Order', backref='restaurant', lazy=True)
    reviews = db.relationship('Review', backref='restaurant', lazy=True)


class MenuItem(db.Model):
    __tablename__ = "menu_items"
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurants.id"), nullable=False)  # 👈 added FK
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)


class Table(db.Model):
    __tablename__ = "tables"
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurants.id"), nullable=False)  # 👈 added FK
    number = db.Column(db.String(50), nullable=False)


class Order(db.Model):
    __tablename__ = "orders"
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurants.id"), nullable=False)  # 👈 added FK
    table_id = db.Column(db.Integer, db.ForeignKey("tables.id"), nullable=False)  # 👈 also add FK
    customer_name = db.Column(db.String(100))
    customer_phone = db.Column(db.String(15))
    items = db.Column(db.Text)
    total = db.Column(db.Float)
    status = db.Column(db.String(20), default='pending')
    payment_method = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Review(db.Model):
    __tablename__ = "reviews"
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurants.id"), nullable=False)  # 👈 added FK
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class RestaurantSettings(db.Model):
    __tablename__ = "restaurant_settings"

    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurants.id"), nullable=False, unique=True)

    upi_id = db.Column(db.String(100))
    bank_account_name = db.Column(db.String(100))
    bank_account_number = db.Column(db.String(100))
    ifsc_code = db.Column(db.String(50))
    description = db.Column(db.Text)
    phone = db.Column(db.String(50))
    email = db.Column(db.String(100))
    razorpay_merchant_id = db.Column(db.String(100))  # Changed from razorpay_account_id
    settings = db.relationship("RestaurantSettings", backref="restaurant", uselist=False)




# --- HELPERS ---
def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        try:
            token = token.split(' ')[1]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = Restaurant.query.get(data['restaurant_id'])
        except Exception as e:
            print('JWT decode error:', e)
            return jsonify({'error': 'Token invalid'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def generate_jwt(restaurant_id):
    payload = {
        'restaurant_id': restaurant_id,
        'exp': datetime.utcnow().timestamp() + 7 * 24 * 3600
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def get_restaurant_settings(restaurant_id):
    settings = RestaurantSettings.query.filter_by(restaurant_id=restaurant_id).first()
    if not settings:
        return {}
    return {
        'upi_id': settings.upi_id,
        'bank_account_name': settings.bank_account_name,
        'bank_account_number': settings.bank_account_number,
        'ifsc_code': settings.ifsc_code,
        'description': settings.description,
        'phone': settings.phone,
        'email': settings.email,
        'razorpay_merchant_id': settings.razorpay_merchant_id  # Changed from razorpay_account_id
    }
@app.route("/")
def serve_home():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/menu/<int:menu_id>/<string:table_name>")
def customer_menu(menu_id, table_name):
    return send_from_directory(app.static_folder, "index.html")
# Serve any path (for React Router)
@app.route("/<path:path>")
def serve_file(path):
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")

# --- AUTH ROUTES ---
@app.route('/api/auth/register', methods=['POST'])
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

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON body received"}), 400

        restaurant = Restaurant.query.filter_by(email=data.get('email')).first()
        if restaurant and check_password_hash(restaurant.password_hash, data.get('password')):
            token = generate_jwt(restaurant.id)
            return jsonify({
                'token': token,
                'restaurant': {
                    'id': restaurant.id,
                    'name': restaurant.name,
                    'email': restaurant.email
                }
            })
        return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        import traceback
        print("Login error:", traceback.format_exc())
        return jsonify({'error': 'Server error', 'details': str(e)}), 500


# --- MENU ROUTES ---
@app.route('/api/menu/<int:restaurant_id>', methods=['GET'])
def get_menu(restaurant_id):
    items = MenuItem.query.filter_by(restaurant_id=restaurant_id).all()
    return jsonify([{
        'id': item.id,
        'name': item.name,
        'description': item.description,
        'price': item.price,
        'category': item.category,
        'image': item.image_url,
        'available': item.available,
        'dietaryInfo': {
            'isVegetarian': item.is_vegetarian,
            'isVegan': item.is_vegan,
            'isGlutenFree': item.is_gluten_free,
            'isNutFree': item.is_nut_free
        }
    } for item in items])


@app.route('/api/menu', methods=['POST'])
@auth_required
def add_menu_item(current_user):
    data = request.get_json()
    
    # Auto-classify dietary information
    dietary_info = dietary_classifier.classify_item(
        data['name'], 
        data.get('description', '')
    )
    
    item = MenuItem(
        restaurant_id=current_user.id,
        name=data['name'],
        description=data['description'],
        price=data['price'],
        category=data['category'],
        image_url=data.get('image', ''),
        available=data.get('available', True),
        is_vegetarian=dietary_info['is_vegetarian'],
        is_vegan=dietary_info['is_vegan'],
        is_gluten_free=dietary_info['is_gluten_free'],
        is_nut_free=dietary_info['is_nut_free']
    )
    
    db.session.add(item)
    db.session.commit()
    
    return jsonify({
        'message': 'Item added',
        'dietary_classification': dietary_info  # Return the classification for confirmation
    }), 201

@app.route('/api/menu/<int:item_id>', methods=['PUT'])
@auth_required
def update_menu_item(current_user, item_id):
    item = MenuItem.query.get(item_id)
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    # Ensure user can only update their own restaurant items
    if item.restaurant_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    # Update basic fields
    item.name = data.get('name', item.name)
    item.description = data.get('description', item.description)
    item.price = data.get('price', item.price)
    item.category = data.get('category', item.category)
    item.image_url = data.get('image', item.image_url)
    item.available = data.get('available', item.available)
    
    # Re-classify dietary info if name or description changed
    if 'name' in data or 'description' in data:
        dietary_info = dietary_classifier.classify_item(
            item.name, 
            item.description or ''
        )
        item.is_vegetarian = dietary_info['is_vegetarian']
        item.is_vegan = dietary_info['is_vegan']
        item.is_gluten_free = dietary_info['is_gluten_free']
        item.is_nut_free = dietary_info['is_nut_free']
    
    db.session.commit()
    return jsonify({'message': 'Item updated successfully'}), 200
@app.route('/api/menu/<int:item_id>', methods=['DELETE'])
@auth_required
def delete_menu_item(current_user, item_id):
    item = MenuItem.query.get(item_id)
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    # Ensure user can only delete their own restaurant items
    if item.restaurant_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(item)
    db.session.commit()
    
    return jsonify({'message': 'Item deleted successfully'}), 200

# Optional: Add an endpoint to re-classify existing items
@app.route('/api/menu/reclassify/<int:restaurant_id>', methods=['POST'])
@auth_required
def reclassify_menu(current_user, restaurant_id):
    """Re-classify all menu items for a restaurant"""
    if current_user.id != restaurant_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    items = MenuItem.query.filter_by(restaurant_id=restaurant_id).all()
    updated_count = 0
    
    for item in items:
        dietary_info = dietary_classifier.classify_item(item.name, item.description or '')
        
        item.is_vegetarian = dietary_info['is_vegetarian']
        item.is_vegan = dietary_info['is_vegan']
        item.is_gluten_free = dietary_info['is_gluten_free']
        item.is_nut_free = dietary_info['is_nut_free']
        updated_count += 1
    
    db.session.commit()
    
    return jsonify({
        'message': f'Re-classified {updated_count} items successfully'
    }), 200

# migration script or one-time update
def update_existing_menu_items():
    """One-time script to classify existing menu items"""
    
    items = MenuItem.query.all()
    
    for item in items:
        dietary_info = dietary_classifier.classify_item(
            item.name, 
            item.description or ''
        )
        
        item.is_vegetarian = dietary_info['is_vegetarian']
        item.is_vegan = dietary_info['is_vegan']
        item.is_gluten_free = dietary_info['is_gluten_free']
        item.is_nut_free = dietary_info['is_nut_free']
    
    db.session.commit()
    print(f"Updated {len(items)} menu items with dietary classifications")

@app.route('/api/menu/<int:item_id>/dietary', methods=['PUT'])
@auth_required
def update_dietary_info(current_user, item_id):
    """Allow restaurant owners to manually override dietary classifications"""
    item = MenuItem.query.get(item_id)
    
    if not item or item.restaurant_id != current_user.id:
        return jsonify({'error': 'Item not found or unauthorized'}), 404
    
    data = request.get_json()
    
    item.is_vegetarian = data.get('isVegetarian', item.is_vegetarian)
    item.is_vegan = data.get('isVegan', item.is_vegan)
    item.is_gluten_free = data.get('isGlutenFree', item.is_gluten_free)
    item.is_nut_free = data.get('isNutFree', item.is_nut_free)
    
    db.session.commit()
    
    return jsonify({'message': 'Dietary information updated successfully'}), 200

# --- TABLE MANAGEMENT ---
def generate_qr_code(restaurant_id, table_number):
    base_url = "https://taptable.onrender.com/menu"
    return f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={base_url}/{restaurant_id}/table_{table_number}"

@app.route('/api/tables', methods=['GET'])
@auth_required
def get_tables(current_user):
    tables = Table.query.filter_by(restaurant_id=current_user.id).all()
    return jsonify([
        {
            'id': table.id,
            'number': table.number,
            'seats': table.seats,
            'qrCode': table.qr_code or generate_qr_code(current_user.id, table.number)
        }
        for table in tables
    ])


@app.route('/api/tables', methods=['POST'])
@auth_required
def add_table(current_user):
    data = request.json
    number = data.get('number')
    seats = data.get('seats')

    if not number or not seats:
        return jsonify({'error': 'Table number and seats are required'}), 400

    existing = Table.query.filter_by(restaurant_id=current_user.id, number=number).first()
    if existing:
        return jsonify({'error': 'Table number already exists'}), 400

    qr_data = f"https://taptable.onrender.com/menu/{current_user.id}/table_{number}"
    qr_code_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={qr_data}"

    table = Table(
        restaurant_id=current_user.id,
        number=number,
        seats=seats,
        qr_code=qr_code_url
    )
    db.session.add(table)
    db.session.commit()

    return jsonify({
        'message': 'Table added successfully',
        'table': {
            'id': table.id,
            'number': table.number,
            'seats': table.seats,
            'qrCode': table.qr_code
        }
    }), 201


@app.route('/api/tables/<int:id>', methods=['DELETE'])
@auth_required
def delete_table(current_user, id):
    table = Table.query.filter_by(id=id, restaurant_id=current_user.id).first()
    if not table:
        return jsonify({'error': 'Table not found'}), 404

    db.session.delete(table)
    db.session.commit()
    return jsonify({'message': 'Table deleted successfully'})

@app.route("/menu/<int:menu_id>/<string:table_name>", methods=["GET"])
def get_public_menu(menu_id, table_name):
    # Extract table number from table_name (e.g., "table_5" → 5)
    if not table_name.startswith("table_"):
        return jsonify({"error": "Invalid table format"}), 400

    try:
        table_number = int(table_name.split("_")[1])
    except (IndexError, ValueError):
        return jsonify({"error": "Invalid table name"}), 400

    table = Table.query.filter_by(restaurant_id=menu_id, number=table_number).first()
    if not table:
        return jsonify({"error": "Table not found"}), 404

    menu_items = MenuItem.query.filter_by(restaurant_id=menu_id).all()

    return jsonify({
        "restaurant_id": menu_id,
        "table_number": table.number,
        "seats": table.seats,
        "items": [
            {
                "id": item.id,
                "name": item.name,
                "price": item.price,
                "description": item.description,
                "category": item.category
            }
            for item in menu_items
        ]
    })

# --- SETTINGS ---
@app.route('/api/settings', methods=['GET'])
@auth_required
def get_settings(current_user):
    settings = RestaurantSettings.query.filter_by(restaurant_id=current_user.id).first()
    if not settings:
        return jsonify({
            'name': current_user.name,
            'email': current_user.email,
            'description': '',
            'phone': '',
            'upi_id': '',
            'razorpay_merchant_id': ''  # Changed from razorpay_account_id
        })
    return jsonify({
        'name': current_user.name,
        'upi_id': settings.upi_id,
        'bank_account_name': settings.bank_account_name,
        'bank_account_number': settings.bank_account_number,
        'ifsc_code': settings.ifsc_code,
        'description': settings.description,
        'phone': settings.phone,
        'email': settings.email,
        'razorpay_merchant_id': settings.razorpay_merchant_id  # Changed from razorpay_account_id
    })


@app.route('/api/settings', methods=['POST'])
@auth_required
def update_settings(current_user):
    data = request.get_json()
    settings = RestaurantSettings.query.filter_by(restaurant_id=current_user.id).first()
    if not settings:
        settings = RestaurantSettings(restaurant_id=current_user.id)
        db.session.add(settings)
    
    # Update restaurant name if provided
    if 'name' in data and data['name']:
        current_user.name = data['name']
    
    # Update settings fields
    settings.upi_id = data.get('upi_id', settings.upi_id)
    settings.bank_account_name = data.get('bank_account_name', settings.bank_account_name)
    settings.bank_account_number = data.get('bank_account_number', settings.bank_account_number)
    settings.ifsc_code = data.get('ifsc_code', settings.ifsc_code)
    settings.description = data.get('description', settings.description)
    settings.phone = data.get('phone', settings.phone)
    settings.email = data.get('email', settings.email)
    settings.razorpay_merchant_id = data.get('razorpay_merchant_id', settings.razorpay_merchant_id)  # Changed from razorpay_account_id
    
    db.session.commit()
    return jsonify({'message': 'Settings updated successfully'})

# --- ORDERS ---
@app.route('/api/orders', methods=['GET'])
@auth_required
def get_orders(current_user):
    try:
        ist_offset = timedelta(hours=5, minutes=30)

        orders = (
            db.session.query(Order, Table)
            .join(Table, Order.table_id == Table.id)
            .filter(Order.restaurant_id == current_user.id)
            .order_by(Order.created_at.asc())  # FIFO ORDER
            .all()
        )
        orders_data = []
        for order, table in orders:
            try:
                order_items = json.loads(order.items) if order.items else []
            except Exception as e:
                print(f"Error parsing items for order {order.id}: {e}")
                order_items = []

            # Convert UTC to IST
            created_at_ist = order.created_at + ist_offset

            orders_data.append({
                'id': order.id,
                'tableNumber': table.number if table else order.table_id,
                'customerName': order.customer_name,
                'customerPhone': order.customer_phone,
                'items': order_items,
                'total': order.total,
                'status': order.status,
                'paymentMethod': order.payment_method,   # ✅ Added payment method
                'timestamp': created_at_ist.isoformat()
            })
        return jsonify(orders_data)
    except Exception as e:
        print(f"ERROR in /api/orders: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/orders/<int:order_id>/status', methods=['PUT'])
@auth_required
def update_order_status(current_user, order_id):
    data = request.get_json()
    status = data.get('status')
    if not status or status not in ['pending', 'preparing', 'ready', 'completed']:
        return jsonify({'error': 'Invalid status'}), 400

    order = Order.query.filter_by(id=order_id, restaurant_id=current_user.id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404

    order.status = status
    db.session.commit()
    return jsonify({'success': True})


# --- CREATE ORDER AND PAYMENT ---
@app.route('/api/create-order', methods=['POST'])
def create_order_with_payment():
    data = request.json
    amount = data['amount']
    restaurant_id = data['restaurant_id']
    table_number = data.get('table_number')
    requested_payment_mode = data.get('payment_method')  # (upi/razorpay/cash)

    # Find the table
    table = Table.query.filter_by(restaurant_id=restaurant_id, number=table_number).first()
    if not table:
        return jsonify({"error": "Invalid table number"}), 400

    restaurant_settings = get_restaurant_settings(restaurant_id)
    upi_id = restaurant_settings.get("upi_id")
    razorpay_merchant_id = restaurant_settings.get("razorpay_merchant_id")

    payment_mode = None
    razorpay_order_id = None
    upi_qr = None

    # --- CASH ---
    if requested_payment_mode == "cash":
        payment_mode = "cash"

    # --- RAZORPAY ---
    elif requested_payment_mode == "razorpay" and razorpay_merchant_id:
        payment_mode = "razorpay"
        try:
            razorpay_order = razorpay_client.order.create({
                "amount": int(amount * 100),
                "currency": "INR",
                "receipt": f"receipt_{restaurant_id}_table_{table_number}",
            })
            razorpay_order_id = razorpay_order["id"]
        except Exception as e:
            print("⚠️ Razorpay error:", e)
            return jsonify({"error": f"Failed to create Razorpay order: {str(e)}"}), 500

    # --- UPI ---
    elif requested_payment_mode == "upi" and upi_id:
        payment_mode = "upi"
        upi_params = {
            "pa": upi_id,
            "pn": "Restaurant",
            "am": str(amount),
            "cu": "INR"
        }
        upi_str = "upi://pay?" + urllib.parse.urlencode(upi_params)
        upi_qr = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={urllib.parse.quote(upi_str)}"

    else:
        return jsonify({"error": "Invalid or unsupported payment method"}), 400

    # --- CREATE ORDER ---
    order = Order(
        restaurant_id=restaurant_id,
        table_id=table.id,
        customer_name=data['customerName'],
        customer_phone=data['customerPhone'],
        items=json.dumps(data['items']),
        total=amount,
        status='pending',
        payment_method=payment_mode   # ✅ Save payment method
    )
    db.session.add(order)
    db.session.commit()

    rv = {
        "local_order_id": order.id,
        "payment_mode": payment_mode,
        "upi_id": upi_id,
        "upi_qr": upi_qr,
        "order_id": razorpay_order_id
    }
    return jsonify(rv)




@app.route('/api/restaurants/<int:id>', methods=['GET'])
def get_restaurant(id):
    restaurant = Restaurant.query.get(id)
    if not restaurant:
        return jsonify({"error": "Restaurant not found"}), 404
    return jsonify({
        'id': restaurant.id,
        'name': restaurant.name,
        'email': restaurant.email,
        'created_at': restaurant.created_at.isoformat()
    })

@app.route('/api/analytics/<int:restaurant_id>', methods=['GET', 'OPTIONS'])
def get_analytics(restaurant_id):
    # ---- Handle time range ---
    time_range = request.args.get('timeRange', '7days')
    start_date = None
    end_date = None

    # Time range logic
    if time_range == 'custom':
        start_str = request.args.get('startDate')
        end_str = request.args.get('endDate')
        try:
            start_date = datetime.strptime(start_str, "%Y-%m-%d")
            end_date = datetime.strptime(end_str, "%Y-%m-%d")
        except Exception:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=6)
    elif time_range == '30days':
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=29)
    else: # default 7days
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=6)

    # --- Orders in time range ---
    orders_query = Order.query.filter(
        Order.restaurant_id == restaurant_id,
        Order.status == 'completed',
        Order.created_at >= start_date,
        Order.created_at <= end_date
    )
    completed_orders = orders_query.all()
    total_orders = len(completed_orders)
    total_revenue = sum(order.total for order in completed_orders) if completed_orders else 0

    # --- Revenue trend per day ---
    daily_group = (
        Order.query
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.status == 'completed',
            Order.created_at >= start_date,
            Order.created_at <= end_date
        )
        .with_entities(
            func.date(Order.created_at).label('date'),
            func.sum(Order.total).label('revenue')
        )
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )
    # Fill in gaps
    days = (end_date.date() - start_date.date()).days + 1
    date_list = [(start_date + timedelta(days=i)).date() for i in range(days)]
    revenue_by_date = {d[0]: float(d[1]) for d in daily_group}
    revenue_trend = [
        {"date": d.strftime('%Y-%m-%d'), "revenue": revenue_by_date.get(d, 0.0)} for d in date_list
    ]

    # --- Previous period for comparison ---
    prev_days = days
    prev_end = start_date - timedelta(days=1)
    prev_start = prev_end - timedelta(days=prev_days-1)
    prev_orders = Order.query.filter(
        Order.restaurant_id == restaurant_id,
        Order.status == 'completed',
        Order.created_at >= prev_start,
        Order.created_at <= prev_end
    ).all()
    previous_orders = len(prev_orders)
    previous_revenue = sum(order.total for order in prev_orders) if prev_orders else 0

    # --- Ratings in time range ---
    reviews = Review.query.filter(
        Review.restaurant_id == restaurant_id,
        Review.created_at >= start_date,
        Review.created_at <= end_date
    ).all()
    avg_rating = round(sum([r.rating for r in reviews]) / len(reviews), 1) if reviews else 0
    # Previous ratings
    prev_reviews = Review.query.filter(
        Review.restaurant_id == restaurant_id,
        Review.created_at >= prev_start,
        Review.created_at <= prev_end
    ).all()
    previous_rating = round(sum([r.rating for r in prev_reviews]) / len(prev_reviews), 1) if prev_reviews else 0

    # --- Top items ---
    # If you use a JSON field for order.items
    item_names = []
    for order in completed_orders:
        try:
            order_items = json.loads(order.items)  # expects [{"name": ..., "qty": ...}, ...]
            for oi in order_items:
                item_names.append(oi.get('name'))
        except Exception:
            continue
    top_items = [n for n, _ in Counter(item_names).most_common(5)]

    # --- Recent reviews (top 5 comments) ---
    review_list = sorted(reviews, key=lambda r: r.created_at, reverse=True)
    recent_reviews = []
    for r in review_list:
        if r.comment and len(recent_reviews) < 5:
            recent_reviews.append(r.comment)

    return jsonify({
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "average_rating": avg_rating,
        "revenue_trend": revenue_trend,
        "previous_orders": previous_orders,
        "previous_revenue": previous_revenue,
        "previous_rating": previous_rating,
        "top_items": top_items,
        "recent_reviews": recent_reviews
    })

# --- APP RUN ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if not Restaurant.query.filter_by(email='demo@restaurant.com').first():
            demo = Restaurant(name='Demo Restaurant', email='demo@restaurant.com', password_hash=generate_password_hash('demo123'))
            db.session.add(demo)
            db.session.commit()
    app.run(debug=True, port=int(os.environ.get("PORT", 10000)))
