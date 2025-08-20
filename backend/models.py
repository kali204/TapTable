# models.py
from extensions import db
from datetime import datetime

class Restaurant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    menu_items = db.relationship('MenuItem', backref='restaurant', lazy=True, cascade="all, delete-orphan")
    tables = db.relationship('Table', backref='restaurant', lazy=True, cascade="all, delete-orphan")
    orders = db.relationship('Order', backref='restaurant', lazy=True, cascade="all, delete-orphan")
    reviews = db.relationship('Review', backref='restaurant', lazy=True, cascade="all, delete-orphan")

class MenuItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurant.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50))
    image_url = db.Column(db.String(255))
    available = db.Column(db.Boolean, default=True)
    is_vegetarian = db.Column(db.Boolean, default=False, nullable=False)
    is_vegan = db.Column(db.Boolean, default=False, nullable=False)
    is_gluten_free = db.Column(db.Boolean, default=False, nullable=False)
    is_nut_free = db.Column(db.Boolean, default=False, nullable=False)

    # Future: dietary flags can be added here

class Table(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurant.id"), nullable=False)
    number = db.Column(db.String(50), nullable=False)
    seats = db.Column(db.Integer)
    qr_code = db.Column(db.String(255))

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurant.id"), nullable=False)
    table_id = db.Column(db.Integer, db.ForeignKey("table.id"), nullable=False)
    customer_name = db.Column(db.String(100))
    customer_phone = db.Column(db.String(15))
    items_json = db.Column(db.Text, nullable=False)
    total = db.Column(db.Float)
    status = db.Column(db.String(20), default='pending')
    payment_method = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurant.id"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
class Analytics(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurant.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    total_orders = db.Column(db.Integer, default=0)
    total_revenue = db.Column(db.Float, default=0.0)
    average_order_value = db.Column(db.Float, default=0.0)

    __table_args__ = (db.UniqueConstraint('restaurant_id', 'date', name='unique_restaurant_date'),)  # Ensure unique daily records per restaurant   

class RestaurantSettings(db.Model):
    __tablename__ = "restaurant_settings"
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurant.id"), nullable=False, unique=True)


    upi_id = db.Column(db.String(100))
    bank_account_name = db.Column(db.String(100))
    bank_account_number = db.Column(db.String(100))
    ifsc_code = db.Column(db.String(50))
    description = db.Column(db.Text)
    phone = db.Column(db.String(50))
    email = db.Column(db.String(100))
    razorpay_merchant_id = db.Column(db.String(100))