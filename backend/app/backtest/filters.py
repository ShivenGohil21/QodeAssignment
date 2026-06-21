import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.db.models import Company, FinancialStatement, FinancialRatio

def get_latest_financial_data(db: Session, company_id: int, as_of_date: datetime.date) -> Tuple[Any, Any]:
    """
    Retrieves the latest financial statement and ratios available for a company as of a historical date.
    This guarantees no future data leakage.
    """
    stmt = db.query(FinancialStatement).filter(
        FinancialStatement.company_id == company_id,
        FinancialStatement.report_date <= as_of_date
    ).order_by(FinancialStatement.report_date.desc()).first()
    
    ratio = db.query(FinancialRatio).filter(
        FinancialRatio.company_id == company_id,
        FinancialRatio.report_date <= as_of_date
    ).order_by(FinancialRatio.report_date.desc()).first()
    
    return stmt, ratio

def apply_filters(db: Session, companies: List[Company], as_of_date: datetime.date, filters: List[Dict[str, Any]]) -> List[Company]:
    """
    Filters a list of companies based on historical financial metrics as of a specific date.
    Each filter dict contains: 'metric', 'operator', 'value'.
    Example: {'metric': 'roe', 'operator': '>', 'value': 0.15}
    """
    filtered_companies = []
    
    for company in companies:
        stmt, ratio = get_latest_financial_data(db, company.id, as_of_date)
        keep = True
        
        for rule in filters:
            metric = rule.get("metric")
            operator = rule.get("operator")
            target_value = rule.get("value")
            
            # Fetch the actual value of the metric
            val = None
            
            if metric == "market_cap":
                val = company.market_cap
            elif metric == "sector":
                val = company.sector
            elif metric == "industry":
                val = company.industry
            elif hasattr(FinancialStatement, metric):
                if stmt:
                    val = getattr(stmt, metric)
            elif hasattr(FinancialRatio, metric):
                if ratio:
                    val = getattr(ratio, metric)
            
            # If the metric is missing and the filter is NOT a sector check, fail this filter
            if val is None:
                if metric == "sector" or metric == "industry":
                    val = "Unknown"
                else:
                    keep = False
                    break
                    
            # Apply operator logic
            try:
                if operator == ">":
                    if not (val > float(target_value)): keep = False
                elif operator == "<":
                    if not (val < float(target_value)): keep = False
                elif operator == ">=":
                    if not (val >= float(target_value)): keep = False
                elif operator == "<=":
                    if not (val <= float(target_value)): keep = False
                elif operator == "==" or operator == "equals":
                    if isinstance(val, str):
                        if val.lower() != str(target_value).lower(): keep = False
                    else:
                        if not (abs(val - float(target_value)) < 1e-9): keep = False
                elif operator == "between":
                    # target_value should be list [min, max]
                    if isinstance(target_value, list) and len(target_value) == 2:
                        min_v, max_v = float(target_value[0]), float(target_value[1])
                        if not (min_v <= val <= max_v): keep = False
                    else:
                        keep = False
                elif operator == "contains":
                    if str(target_value).lower() not in str(val).lower(): keep = False
            except (ValueError, TypeError):
                keep = False
                break
                
            if not keep:
                break
                
        if keep:
            filtered_companies.append(company)
            
    return filtered_companies
