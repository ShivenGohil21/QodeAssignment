import io
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.db.models import Backtest, BacktestResult, PortfolioHolding, Company
from app.db.schemas import StrategyConfig, BacktestSummaryResponse, BacktestDetailResponse
from app.backtest.engine import run_backtest_simulation
from app.backtest.performance import calculate_performance_metrics

router = APIRouter()

@router.post("/run", response_model=BacktestDetailResponse)
def run_backtest(config: StrategyConfig, db: Session = Depends(get_db)):
    try:
        results = run_backtest_simulation(db, config)
        return results
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Backtest error: {str(e)}")

@router.get("", response_model=List[BacktestSummaryResponse])
def list_backtests(db: Session = Depends(get_db)):
    return db.query(Backtest).order_by(Backtest.created_at.desc()).all()

@router.get("/{backtest_id}", response_model=BacktestDetailResponse)
def get_backtest(backtest_id: int, db: Session = Depends(get_db)):
    backtest = db.query(Backtest).filter(Backtest.id == backtest_id).first()
    if not backtest:
        raise HTTPException(status_code=404, detail="Backtest not found")
        
    # Retrieve daily results
    results_models = db.query(BacktestResult).filter(
        BacktestResult.backtest_id == backtest_id
    ).order_by(BacktestResult.date.asc()).all()
    
    results = []
    for r in results_models:
        results.append({
            "date": r.date,
            "portfolio_value": r.portfolio_value,
            "benchmark_value": r.benchmark_value,
            "drawdown": r.drawdown
        })
        
    # Retrieve rebalance holdings
    holdings_models = db.query(PortfolioHolding).filter(
        PortfolioHolding.backtest_id == backtest_id
    ).order_by(PortfolioHolding.rebalance_date.asc(), PortfolioHolding.weight.desc()).all()
    
    # Map company names & symbols
    company_ids = [h.company_id for h in holdings_models]
    companies = db.query(Company).filter(Company.id.in_(company_ids)).all() if company_ids else []
    company_map = {c.id: c for c in companies}
    
    holdings = []
    for h in holdings_models:
        c = company_map.get(h.company_id)
        holdings.append({
            "rebalance_date": h.rebalance_date,
            "symbol": c.symbol if c else "Unknown",
            "company_name": c.company_name if c else "Unknown",
            "weight": h.weight,
            "shares": h.shares,
            "entry_price": h.entry_price
        })
        
    # Compute metrics on-the-fly
    metrics = calculate_performance_metrics(results)
    
    return {
        "id": backtest.id,
        "strategy_name": backtest.strategy_name,
        "start_date": backtest.start_date,
        "end_date": backtest.end_date,
        "rebalance_frequency": backtest.rebalance_frequency,
        "initial_capital": backtest.initial_capital,
        "strategy_parameters": backtest.strategy_parameters,
        "created_at": backtest.created_at,
        "results": results,
        "holdings": holdings,
        "metrics": metrics
    }

@router.delete("/{backtest_id}")
def delete_backtest(backtest_id: int, db: Session = Depends(get_db)):
    backtest = db.query(Backtest).filter(Backtest.id == backtest_id).first()
    if not backtest:
        raise HTTPException(status_code=404, detail="Backtest not found")
        
    db.delete(backtest)
    db.commit()
    return {"message": "Backtest deleted successfully"}

# --- EXPORT ENDPOINTS ---

@router.get("/{backtest_id}/export/csv")
def export_backtest_csv(backtest_id: int, db: Session = Depends(get_db)):
    backtest_data = get_backtest(backtest_id, db)
    
    # Create DataFrame of daily curve
    df = pd.DataFrame(backtest_data["results"])
    
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    
    response = Response(content=stream.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=backtest_{backtest_id}_results.csv"
    return response

@router.get("/{backtest_id}/export/excel")
def export_backtest_excel(backtest_id: int, db: Session = Depends(get_db)):
    backtest_data = get_backtest(backtest_id, db)
    
    # 1. Sheet 1: Summary Metrics
    metrics_list = []
    for k, v in backtest_data["metrics"].items():
        # Clean naming
        metric_name = k.replace("_", " ").title()
        if "Return" in metric_name or "Cagr" in metric_name or "Volatility" in metric_name or "Drawdown" in metric_name or "Rate" in metric_name or "Margin" in metric_name:
            # Format percentage values
            formatted_val = f"{v * 100:.2f}%"
        else:
            formatted_val = f"{v:.4f}" if isinstance(v, float) else str(v)
            
        metrics_list.append({"Metric": metric_name, "Value": formatted_val})
        
    df_metrics = pd.DataFrame(metrics_list)
    
    # 2. Sheet 2: Daily Results (Equity Curve)
    df_results = pd.DataFrame(backtest_data["results"])
    
    # 3. Sheet 3: Portfolio Holdings History
    df_holdings = pd.DataFrame(backtest_data["holdings"])
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_metrics.to_excel(writer, sheet_name='Summary Metrics', index=False)
        df_results.to_excel(writer, sheet_name='Daily Performance', index=False)
        df_holdings.to_excel(writer, sheet_name='Holdings History', index=False)
        
    output.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="backtest_{backtest_id}_report.xlsx"'
    }
    return StreamingResponse(
        io.BytesIO(output.read()), 
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        headers=headers
    )
