from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.ingestion import run_ingestion, INGESTION_STATUS
from typing import List, Optional

router = APIRouter()

def start_ingestion_task(db_session: Session, symbols: Optional[List[str]] = None):
    # Runs the ingestion in the background
    try:
        run_ingestion(db_session, symbols)
    except Exception as e:
        # Status tracker is updated inside run_ingestion on failure
        pass

@router.post("/trigger")
def trigger_ingestion(
    background_tasks: BackgroundTasks, 
    symbols: Optional[List[str]] = None,
    db: Session = Depends(get_db)
):
    if INGESTION_STATUS["status"] == "running":
        return {"message": "Ingestion is already running.", "status": INGESTION_STATUS}
        
    # Schedule background worker
    background_tasks.add_task(start_ingestion_task, db, symbols)
    return {"message": "Data ingestion triggered in background.", "status": INGESTION_STATUS}

@router.get("/status")
def get_ingestion_status():
    return INGESTION_STATUS
