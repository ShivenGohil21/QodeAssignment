import os
import sys
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration")

# Add the backend folder to path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import Base
from app.db.models import (
    Company, StockPrice, FinancialStatement, FinancialRatio,
    Backtest, BacktestResult, PortfolioHolding
)

def run_migration():
    # Load .env file
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    load_dotenv(env_path)
    
    # 1. Verify connection strings
    sqlite_url = "sqlite:///C:/CompanyProject/backend/backtest.db"
    pg_url = os.getenv("DATABASE_URL")
    
    if not pg_url:
        logger.error("DATABASE_URL is not set in the environment or .env file.")
        return False
        
    if "[YOUR_SUPABASE_PASSWORD]" in pg_url:
        logger.error(
            "DATABASE_URL still contains the placeholder '[YOUR_SUPABASE_PASSWORD]'.\n"
            "Please update the database URL in backend/.env with your actual Supabase database password."
        )
        return False
        
    # Normalize database URL for SQLAlchemy
    if pg_url.startswith("postgres://"):
        pg_url = pg_url.replace("postgres://", "postgresql://", 1)
        
    logger.info("Connecting to SQLite database...")
    engine_sqlite = create_engine(sqlite_url)
    SessionSqlite = sessionmaker(bind=engine_sqlite)
    session_sqlite = SessionSqlite()
    
    logger.info("Connecting to Supabase PostgreSQL database...")
    try:
        engine_pg = create_engine(pg_url)
        SessionPg = sessionmaker(bind=engine_pg)
        session_pg = SessionPg()
        # Test connection
        session_pg.execute(text("SELECT 1"))
        logger.info("Connected to Supabase PostgreSQL successfully.")
    except Exception as e:
        logger.error(f"Failed to connect to Supabase PostgreSQL: {e}")
        return False
        
    # 2. Recreate schema in Supabase PostgreSQL
    logger.info("Creating database tables on Supabase if they do not exist...")
    try:
        Base.metadata.create_all(bind=engine_pg)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to create schema on Supabase: {e}")
        return False

    # 3. Define migration order
    models_to_migrate = [
        (Company, "companies"),
        (Backtest, "backtests"),
        (StockPrice, "stock_prices"),
        (FinancialStatement, "financial_statements"),
        (FinancialRatio, "financial_ratios"),
        (BacktestResult, "backtest_results"),
        (PortfolioHolding, "portfolio_holdings")
    ]
    
    # 4. Perform migration
    try:
        for model, table_name in models_to_migrate:
            logger.info(f"Migrating table: '{table_name}'...")
            
            # Count source rows
            sqlite_count = session_sqlite.query(model).count()
            logger.info(f"Found {sqlite_count} rows in SQLite table '{table_name}'")
            
            if sqlite_count == 0:
                logger.info(f"Skipping empty table '{table_name}'")
                continue
                
            # Clear target table in PostgreSQL to ensure clean slate
            # Note: We execute a raw delete because we are copying all rows
            # We execute it inside a transaction
            logger.info(f"Clearing existing data in Supabase table '{table_name}' (if any)...")
            session_pg.execute(text(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE"))
            session_pg.commit()
            
            # Fetch all rows from SQLite
            sqlite_rows = session_sqlite.query(model).all()
            
            # Prepare mappings
            mappings = []
            for row in sqlite_rows:
                # Convert model instance to dict of column values
                data = {col.name: getattr(row, col.name) for col in model.__table__.columns}
                mappings.append(data)
                
            # Bulk insert to PostgreSQL in chunks
            chunk_size = 5000
            total_inserted = 0
            for i in range(0, len(mappings), chunk_size):
                chunk = mappings[i:i + chunk_size]
                session_pg.bulk_insert_mappings(model, chunk)
                session_pg.commit()
                total_inserted += len(chunk)
                logger.info(f"Inserted {total_inserted}/{len(mappings)} rows into '{table_name}' on Supabase")
                
            # Verify row counts match
            pg_count = session_pg.query(model).count()
            if sqlite_count == pg_count:
                logger.info(f"Verification successful: '{table_name}' has exactly {pg_count} rows in Supabase.")
            else:
                logger.warning(f"Verification mismatch: SQLite has {sqlite_count} rows, but Supabase has {pg_count} rows.")
                
            # Reset ID sequence in PostgreSQL to avoid primary key collisions on subsequent inserts
            logger.info(f"Resetting auto-increment sequence for '{table_name}'...")
            seq_sql = f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), COALESCE(MAX(id), 1)) FROM {table_name}"
            session_pg.execute(text(seq_sql))
            session_pg.commit()
            
        logger.info("All tables migrated and validated successfully!")
        return True
        
    except Exception as e:
        logger.error(f"An error occurred during migration: {e}")
        session_pg.rollback()
        return False
    finally:
        session_sqlite.close()
        session_pg.close()

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
