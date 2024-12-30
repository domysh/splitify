
import os

DEBUG = os.getenv("DEBUG", "").lower() in ["true", "1", "t"]
CORS_ALLOW = os.getenv("CORS_ALLOW", "").lower() in ["true", "1", "t"]

MONGO_URL = os.getenv('MONGO_URL', "mongodb://mongo:27017/" if not DEBUG else "mongodb://localhost:27017/")
DEFAULT_PSW = os.getenv('DEFAULT_PSW')
DB_NAME = os.getenv('DB_NAME', "splitify")

JWT_ALGORITHM = "HS256"

    