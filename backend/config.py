import os
from dotenv import load_dotenv

load_dotenv()  # Load variables from .env file

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    # Use DATABASE_URL if set, otherwise fallback for local dev
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        'mysql+pymysql://root:1947@localhost/restaurant'
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
