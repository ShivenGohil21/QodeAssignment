import datetime
import pandas as pd
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import Company
from app.backtest.filters import get_latest_financial_data

def rank_companies(
    db: Session, 
    companies: List[Company], 
    as_of_date: datetime.date, 
    ranking_rules: List[Dict[str, Any]], 
    top_n: int
) -> List[Company]:
    """
    Ranks filtered companies based on single or multi-metric rules.
    Each rule in ranking_rules is a dict: {'metric': str, 'ascending': bool}
    Returns the top N ranked companies.
    """
    if not companies:
        return []
    
    if not ranking_rules:
        # Default to no rank, return top N of original list
        return companies[:top_n]
        
    # Build a dataframe to easily rank columns
    records = []
    
    for company in companies:
        stmt, ratio = get_latest_financial_data(db, company.id, as_of_date)
        row = {"company_obj": company, "company_id": company.id}
        
        # Load all metrics needed for ranking
        for rule in ranking_rules:
            metric = rule.get("metric")
            val = None
            
            if metric == "market_cap":
                val = company.market_cap
            elif stmt and hasattr(stmt, metric):
                val = getattr(stmt, metric)
            elif ratio and hasattr(ratio, metric):
                val = getattr(ratio, metric)
                
            row[metric] = val
            
        records.append(row)
        
    df = pd.DataFrame(records)
    
    # Calculate rank for each metric column
    rank_cols = []
    for rule in ranking_rules:
        metric = rule.get("metric")
        ascending = rule.get("ascending", True)
        
        # Fill missing values with extreme values depending on rank order
        if df[metric].isnull().any():
            if ascending:
                # If ascending (e.g. PE), missing value should be worst (highest)
                df[metric] = df[metric].fillna(df[metric].max() * 1.5 if not df[metric].isnull().all() else 999999.0)
            else:
                # If descending (e.g. ROE), missing value should be worst (lowest)
                df[metric] = df[metric].fillna(df[metric].min() * 0.5 if not df[metric].isnull().all() else -999999.0)
                
        rank_col = f"{metric}_rank"
        # pandas rank: 1 is lowest value.
        # If ascending=True: lowest value gets rank 1 (best for PE).
        # If ascending=False: highest value gets rank 1 (best for ROE, so we need method='min' and descending rank).
        # To get rank 1 for highest value with ascending=False, we can rank by (-df[metric]) or use method.
        # Let's rank by values. If ascending is False, we can rank (-df[metric]) or specify ascending=False in rank().
        # Actually, df[metric].rank(ascending=ascending) does exactly this!
        df[rank_col] = df[metric].rank(ascending=ascending, method="min")
        rank_cols.append(rank_col)
        
    # Calculate composite score as average of individual ranks
    df["composite_score"] = df[rank_cols].mean(axis=1)
    
    # Sort by composite score (lowest average rank is best)
    df_sorted = df.sort_values(by="composite_score")
    
    # Extract the top N company objects
    top_records = df_sorted.head(top_n)
    return top_records["company_obj"].tolist()
