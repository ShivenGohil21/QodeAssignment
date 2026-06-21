import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.routers import companies, backtests, ingestion

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

# Automatically create database tables on startup.
# In a full production setup Alembic is preferred, but automatic creation 
# ensures the system is plug-and-play immediately.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Equity Strategy Backtesting Platform API focused on Indian Stock Markets",
    version="1.0.0"
)

# Set up CORS middleware to allow React frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(companies.router, tags=["Companies"])
app.include_router(backtests.router, prefix="/backtests", tags=["Backtests"])
app.include_router(ingestion.router, prefix="/ingestion", tags=["Data Ingestion"])

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "docs_url": "/docs"
    }
