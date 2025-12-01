import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    # Clean DATABASE_URL (trim spaces/newlines)
    RAW_DB_URL = os.getenv("DATABASE_URL", "").strip()

    SQLALCHEMY_DATABASE_URI = (
        RAW_DB_URL if RAW_DB_URL else 'mysql+pymysql://root:1947@localhost/restaurant'
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
