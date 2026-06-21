from sqlalchemy.orm import Session
from app.db.models import Company

def get_universe(db: Session):
    """
    Returns all companies in the database, excluding the benchmark.
    """
    return db.query(Company).filter(Company.symbol != "^NSEI").all()
