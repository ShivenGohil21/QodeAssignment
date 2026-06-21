import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import Company
from app.backtest.filters import get_latest_financial_data

def calculate_weights(
    db: Session, 
    companies: List[Company], 
    as_of_date: datetime.date, 
    method: str = "Equal", 
    metric_name: str = None
) -> Dict[int, float]:
    """
    Computes portfolio weights for a list of companies.
    Returns a dict mapping company.id to weight (float between 0 and 1).
    """
    if not companies:
        return {}
        
    num_companies = len(companies)
    weights = {}
    
    if method == "Equal" or not method:
        equal_weight = 1.0 / num_companies
        for company in companies:
            weights[company.id] = equal_weight
            
    elif method == "MarketCap":
        total_mcap = 0.0
        mcap_values = {}
        
        for company in companies:
            mcap = company.market_cap or 1000000000.0  # Fallback if null
            mcap_values[company.id] = mcap
            total_mcap += mcap
            
        for company in companies:
            weights[company.id] = mcap_values[company.id] / total_mcap if total_mcap > 0 else (1.0 / num_companies)
            
    elif method == "Metric" and metric_name:
        total_metric = 0.0
        metric_values = {}
        
        for company in companies:
            stmt, ratio = get_latest_financial_data(db, company.id, as_of_date)
            val = None
            
            if metric_name == "market_cap":
                val = company.market_cap
            elif stmt and hasattr(stmt, metric_name):
                val = getattr(stmt, metric_name)
            elif ratio and hasattr(ratio, metric_name):
                val = getattr(ratio, metric_name)
                
            # Convert to float and clip at 0 to avoid negative weights
            float_val = 0.0
            if val is not None:
                try:
                    float_val = max(0.0, float(val))
                except (ValueError, TypeError):
                    float_val = 0.0
            
            # Epsilon to ensure positive weight even if metric is 0
            metric_values[company.id] = float_val + 1e-6
            total_metric += metric_values[company.id]
            
        for company in companies:
            weights[company.id] = metric_values[company.id] / total_metric if total_metric > 0 else (1.0 / num_companies)
            
    else:
        # Fallback to equal weighting
        equal_weight = 1.0 / num_companies
        for company in companies:
            weights[company.id] = equal_weight
            
    return weights
