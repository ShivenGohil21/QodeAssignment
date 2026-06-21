import datetime
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.db.models import Company, StockPrice, Backtest, BacktestResult, PortfolioHolding
from app.db.schemas import StrategyConfig
from app.backtest.universe import get_universe
from app.backtest.filters import apply_filters
from app.backtest.ranking import rank_companies
from app.backtest.weighting import calculate_weights
from app.backtest.portfolio import PortfolioTracker
from app.backtest.performance import calculate_performance_metrics

logger = logging.getLogger(__name__)

def determine_rebalance_dates(
    trading_dates: List[datetime.date], 
    frequency: str
) -> List[datetime.date]:
    """
    Determines rebalance dates from available trading dates based on frequency.
    Frequencies: Monthly, Quarterly, Half-Yearly, Yearly
    """
    if not trading_dates:
        return []
        
    rebalance_dates = [trading_dates[0]]  # Rebalance on day 1
    
    last_date = trading_dates[0]
    
    for curr_date in trading_dates[1:]:
        trigger = False
        
        if frequency == "Monthly":
            if curr_date.month != last_date.month or curr_date.year != last_date.year:
                trigger = True
        elif frequency == "Quarterly":
            # Quarter changes (e.g. Month 1->4, 2->5, etc.) or 3 months pass
            month_diff = (curr_date.year - last_date.year) * 12 + (curr_date.month - last_date.month)
            if month_diff >= 3:
                trigger = True
        elif frequency == "Half-Yearly":
            month_diff = (curr_date.year - last_date.year) * 12 + (curr_date.month - last_date.month)
            if month_diff >= 6:
                trigger = True
        elif frequency == "Yearly":
            if curr_date.year != last_date.year:
                trigger = True
                
        if trigger:
            rebalance_dates.append(curr_date)
            last_date = curr_date
            
    return rebalance_dates

def run_backtest_simulation(db: Session, config: StrategyConfig) -> Dict[str, Any]:
    """
    Runs the historical backtest simulation and writes the output back to the database.
    """
    # 1. Fetch available trading dates inside date range from prices table
    # We query prices of the benchmark or default universe to find valid trading dates
    trading_dates_query = db.query(StockPrice.date).filter(
        StockPrice.date >= config.start_date,
        StockPrice.date <= config.end_date
    ).distinct().order_by(StockPrice.date.asc()).all()
    
    trading_dates = [r[0] for r in trading_dates_query]
    if not trading_dates:
        raise ValueError("No price data found in the database for the selected date range. Please run ingestion first.")
        
    logger.info(f"Backtest: Found {len(trading_dates)} trading dates from {trading_dates[0]} to {trading_dates[-1]}")
    
    # 2. Get the benchmark pricing to normalize performance comparison
    benchmark_company = db.query(Company).filter(Company.symbol == "^NSEI").first()
    if not benchmark_company:
        raise ValueError("Benchmark symbol ^NSEI not found. Please run data ingestion first.")
        
    benchmark_prices_query = db.query(StockPrice.date, StockPrice.close).filter(
        StockPrice.company_id == benchmark_company.id,
        StockPrice.date >= config.start_date,
        StockPrice.date <= config.end_date
    ).all()
    
    benchmark_price_map = {r[0]: r[1] for r in benchmark_prices_query if r[1] is not None}
    
    # Normalize benchmark start price
    # We find the first date for which we have a benchmark price
    first_b_date = None
    for d in trading_dates:
        if d in benchmark_price_map:
            first_b_date = d
            break
            
    if not first_b_date:
        raise ValueError("No historical benchmark prices found. Please run data ingestion.")
        
    benchmark_start_price = benchmark_price_map[first_b_date]
    last_benchmark_value = config.initial_capital
    
    # 3. Determine rebalance dates
    rebalance_dates = set(determine_rebalance_dates(trading_dates, config.rebalance_frequency))
    logger.info(f"Backtest: Identified {len(rebalance_dates)} rebalance dates.")
    
    # 4. Initialize portfolio tracker
    tracker = PortfolioTracker(config.initial_capital)
    
    # To save results in DB
    daily_results = []
    rebalance_holdings_to_save = []
    
    # Peak tracker for drawdown
    peak_value = config.initial_capital
    
    # Universe of stocks
    universe = get_universe(db)
    
    # Pre-cache prices per date to avoid thousands of DB queries in the loop
    # price_map[date][company_id] = close_price
    prices_raw = db.query(StockPrice.company_id, StockPrice.date, StockPrice.close).filter(
        StockPrice.date >= config.start_date,
        StockPrice.date <= config.end_date
    ).all()
    
    price_by_date = {}
    for cid, dt, close in prices_raw:
        if dt not in price_by_date:
            price_by_date[dt] = {}
        price_by_date[dt][cid] = close
        
    # Run historical daily simulation
    for curr_date in trading_dates:
        # Get active stock prices for this day
        curr_prices = price_by_date.get(curr_date, {})
        
        # 4a. Handle Rebalancing
        if curr_date in rebalance_dates:
            logger.info(f"Backtest Rebalancing on {curr_date}...")
            
            # Apply screening filters
            filters_list = [f.model_dump() for f in config.filters]
            filtered_universe = apply_filters(db, universe, curr_date, filters_list)
            
            # Rank universe
            ranking_list = [r.model_dump() for r in config.ranking]
            selected_stocks = rank_companies(db, filtered_universe, curr_date, ranking_list, config.portfolio_size)
            
            # Calculate position sizing weights
            target_weights = calculate_weights(
                db, selected_stocks, curr_date, config.position_sizing, config.sizing_metric
            )
            
            # Execute trades
            holdings_records = tracker.rebalance(curr_date, target_weights, curr_prices)
            
            # Store rebalance logs
            for h in holdings_records:
                rebalance_holdings_to_save.append({
                    "rebalance_date": curr_date,
                    "company_id": h["company_id"],
                    "weight": h["weight"],
                    "shares": h["shares"],
                    "entry_price": h["entry_price"]
                })
        
        # 4b. Calculate current daily portfolio value
        portfolio_value = tracker.get_portfolio_value(curr_prices)
        if portfolio_value > peak_value:
            peak_value = portfolio_value
            
        drawdown = (peak_value - portfolio_value) / peak_value if peak_value > 0 else 0.0
        
        # 4c. Calculate daily benchmark value
        b_price = benchmark_price_map.get(curr_date)
        if b_price is not None:
            benchmark_value = config.initial_capital * (b_price / benchmark_start_price)
            last_benchmark_value = benchmark_value
        else:
            benchmark_value = last_benchmark_value
            
        daily_results.append({
            "date": curr_date,
            "portfolio_value": portfolio_value,
            "benchmark_value": benchmark_value,
            "drawdown": drawdown
        })
        
    # 5. Compute performance statistics
    metrics = calculate_performance_metrics(daily_results)
    
    import json
    
    # 6. Save backtest parameters & results to PostgreSQL
    # Create Backtest record
    backtest_model = Backtest(
        strategy_name=config.strategy_name,
        start_date=config.start_date,
        end_date=config.end_date,
        rebalance_frequency=config.rebalance_frequency,
        initial_capital=config.initial_capital,
        strategy_parameters=json.loads(config.model_dump_json())
    )
    db.add(backtest_model)
    db.commit()
    db.refresh(backtest_model)
    
    # Bulk insert daily results
    results_to_insert = []
    for r in daily_results:
        results_to_insert.append({
            "backtest_id": backtest_model.id,
            "date": r["date"],
            "portfolio_value": r["portfolio_value"],
            "benchmark_value": r["benchmark_value"],
            "drawdown": r["drawdown"]
        })
    db.bulk_insert_mappings(BacktestResult, results_to_insert)
    
    # Bulk insert holdings
    holdings_to_insert = []
    for h in rebalance_holdings_to_save:
        holdings_to_insert.append({
            "backtest_id": backtest_model.id,
            "rebalance_date": h["rebalance_date"],
            "company_id": h["company_id"],
            "weight": h["weight"],
            "shares": h["shares"],
            "entry_price": h["entry_price"]
        })
    db.bulk_insert_mappings(PortfolioHolding, holdings_to_insert)
    db.commit()
    
    # Get portfolio holdings details for response (including company symbols)
    # Mapping company_id -> company detail
    company_map = {c.id: c for c in universe}
    response_holdings = []
    for h in rebalance_holdings_to_save:
        c_obj = company_map.get(h["company_id"])
        response_holdings.append({
            "rebalance_date": h["rebalance_date"],
            "symbol": c_obj.symbol if c_obj else "Unknown",
            "company_name": c_obj.company_name if c_obj else "Unknown",
            "weight": h["weight"],
            "shares": h["shares"],
            "entry_price": h["entry_price"]
        })
        
    return {
        "id": backtest_model.id,
        "strategy_name": backtest_model.strategy_name,
        "start_date": backtest_model.start_date,
        "end_date": backtest_model.end_date,
        "rebalance_frequency": backtest_model.rebalance_frequency,
        "initial_capital": backtest_model.initial_capital,
        "strategy_parameters": config.model_dump(),
        "created_at": backtest_model.created_at,
        "results": daily_results,
        "holdings": response_holdings,
        "metrics": metrics
    }
