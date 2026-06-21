import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import List

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Equity Strategy Backtesting Platform"
    API_V1_STR: str = "/api"
    
    # Database config - DATABASE_URL is required to point to Supabase PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    
    def __init__(self, **values):
        super().__init__(**values)
        if not self.DATABASE_URL:
            raise ValueError(
                "DATABASE_URL environment variable is required and must point to your Supabase PostgreSQL instance."
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
