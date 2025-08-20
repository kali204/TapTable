from models import RestaurantSettings

def get_restaurant_settings_dict(restaurant_id):
    """
    Returns payment and configuration details for a restaurant from RestaurantSettings.
    """
    settings = RestaurantSettings.query.filter_by(restaurant_id=restaurant_id).first()
    if not settings:
        return {}
    return {
        "upi_id": settings.upi_id,
        "razorpay_merchant_id": settings.razorpay_merchant_id,
        # Add more fields as needed
    }
