import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import List

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Equity Strategy Backtesting Platform"
    API_V1_STR: str = "/api"
    
    # Database config - will default to SQLite if POSTGRES_URL not provided
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///backtest.db"
    )
    
    # Default Indian Stocks list (Nifty constituents/other large liquid stocks)
    DEFAULT_SYMBOLS: List[str] = [
        "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS",
        "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTARTL.NS", "LTIM.NS",
        "MARUTI.NS", "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS", "WIPRO.NS"
    ]
    
    class Config:
        case_sensitive = True

settings = Settings()
