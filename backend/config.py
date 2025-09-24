# config.py
import os
from dotenv import load_dotenv

load_dotenv()  # Load variables from .env file

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    # Use DATABASE_URL if set, otherwise fallback for local dev
    SQLALCHEMY_DATABASE_URI = os.getenv(
    "DATABASE_URL",
    'postgresql://neondb_owner:npg_c9dOPEAiW1kU@ep-curly-smoke-adtkujt6-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

