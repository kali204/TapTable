#  QR Restaurant Ordering System

A modern, full-stack restaurant ordering system that allows customers to order via QR codes and restaurant owners to manage their operations through an admin dashboard.

## Features

### Customer Features
- Scan QR code to access table-specific menu
- Browse menu items by category with images
- Add items to cart with quantity selection
- Enter customer details (name, phone)
- Place orders with simulated payment processing

### Admin Features
- Restaurant owner login/authentication
- Menu management (add, edit, delete items)
- Table management with QR code generation
- Real-time order management
- Order status tracking (pending → preparing → ready → completed)

## Tech Stack

### Frontend
- React 18 with TypeScript
- React Router for navigation
- Tailwind CSS for styling
- Lucide React for icons
- Vite for build tooling

### Backend
- Flask (Python)
- SQLAlchemy ORM
- SQLite database
- JWT authentication
- Flask-CORS for cross-origin requests

## Getting Started

### Prerequisites
- Node.js 16+
- Python 3.8+
- pip (Python package manager)

### Backend Setup
1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the Flask server:
```bash
python app.py
```

Backend will run on http://localhost:5000

### Frontend Setup
1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

Frontend will run on http://localhost:5173

## Demo Credentials
- Email: demo@restaurant.com
- Password: demo123

## API Endpoints

### Authentication
- POST `/api/auth/login` - Restaurant login

### Menu Management
- GET `/api/menu/:restaurantId` - Get menu items
- POST `/api/menu` - Add menu item (auth required)
- PUT `/api/menu/:itemId` - Update menu item (auth required)
- DELETE `/api/menu/:itemId` - Delete menu item (auth required)

### Table Management
- GET `/api/tables` - Get tables (auth required)
- POST `/api/tables` - Add table (auth required)
- DELETE `/api/tables/:tableId` - Delete table (auth required)

### Order Management
- GET `/api/orders` - Get orders (auth required)
- POST `/api/orders` - Create order
- PUT `/api/orders/:orderId/status` - Update order status (auth required)

## Database Schema

### Restaurant
- id (Primary Key)
- name
- email (Unique)
- password_hash
- created_at

### MenuItem
- id (Primary Key)
- restaurant_id (Foreign Key)
- name
- description
- price
- category
- image_url
- available

### Table
- id (Primary Key)
- restaurant_id (Foreign Key)
- number
- seats
- qr_code

### Order
- id (Primary Key)
- restaurant_id (Foreign Key)
- table_id (Foreign Key)
- customer_name
- customer_phone
- items (JSON string)
- total
- status
- created_at

## User Roles

### Restaurant Owner
- Can log in to admin dashboard
- Full access to menu, table, and order management
- Can view all orders and update their status
- Can manage restaurant tables and generate QR codes

### Customer
- Can access menu via QR code scan
- Can browse menu and place orders
- No authentication required
- Limited to viewing menu and placing orders

## Future Enhancements
- Payment gateway integration (Stripe/Razorpay)
- Real-time notifications via WebSocket
- Customer loyalty program
- Discount and promotion system
- Analytics dashboard
- Multi-restaurant support
- Staff role management
 