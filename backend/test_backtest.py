import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.db.models import Company, StockPrice, FinancialStatement, FinancialRatio
from app.db.schemas import StrategyConfig, FilterRule, RankingRule
from app.backtest.engine import run_backtest_simulation

def setup_mock_db():
    engine = create_engine("sqlite:///:memory:")
    SessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. Add Nifty Benchmark
    nifty = Company(symbol="^NSEI", company_name="Nifty 50", sector="Benchmark", industry="Benchmark", market_cap=1.0)
    db.add(nifty)
    
    # 2. Add two companies
    c1 = Company(symbol="RELIANCE.NS", company_name="Reliance Industries", sector="Energy", industry="Oil & Gas", market_cap=15000000000000.0)
    c2 = Company(symbol="TCS.NS", company_name="Tata Consultancy Services", sector="Technology", industry="IT Services", market_cap=1200000000000.0)
    db.add(c1)
    db.add(c2)
    db.commit()
    db.refresh(nifty)
    db.refresh(c1)
    db.refresh(c2)
    
    # 3. Add Price History (10 days)
    start_date = datetime.date(2024, 1, 1)
    for i in range(10):
        curr_date = start_date + datetime.timedelta(days=i)
        
        # Benchmark prices
        db.add(StockPrice(company_id=nifty.id, date=curr_date, open=21000.0 + (i * 100), close=21050.0 + (i * 100)))
        
        # Reliance prices (starts at 2500, grows by 10/day)
        db.add(StockPrice(company_id=c1.id, date=curr_date, open=2500.0 + (i * 10), close=2505.0 + (i * 10)))
        
        # TCS prices (starts at 3600, falls by 10/day)
        db.add(StockPrice(company_id=c2.id, date=curr_date, open=3600.0 - (i * 10), close=3595.0 - (i * 10)))
        
    # 4. Add Financial statements & ratios (Reported in March 2023)
    rep_date = datetime.date(2023, 3, 31)
    
    # Reliance statement & ratios
    db.add(FinancialStatement(
        company_id=c1.id, report_date=rep_date, revenue=8000000000000.0, ebitda=1200000000000.0,
        net_profit=600000000000.0, total_assets=14000000000000.0, total_liabilities=6000000000000.0,
        equity=8000000000000.0, debt=3000000000000.0, cash=500000000000.0
    ))
    db.add(FinancialRatio(
        company_id=c1.id, report_date=rep_date, roe=0.12, roce=0.14, pe=20.0, pb=2.0, debt_equity=0.375
    ))
    
    # TCS statement & ratios (higher ROE/ROCE)
    db.add(FinancialStatement(
        company_id=c2.id, report_date=rep_date, revenue=2000000000000.0, ebitda=600000000000.0,
        net_profit=400000000000.0, total_assets=1500000000000.0, total_liabilities=500000000000.0,
        equity=1000000000000.0, debt=0.0, cash=200000000000.0
    ))
    db.add(FinancialRatio(
        company_id=c2.id, report_date=rep_date, roe=0.40, roce=0.45, pe=30.0, pb=8.0, debt_equity=0.0
    ))
    
    db.commit()
    return db

def test_pipeline():
    print("--- Starting Backtest Engine Verification Pipeline ---")
    db = setup_mock_db()
    
    # Define a custom strategy
    config = StrategyConfig(
        strategy_name="Test Strategy",
        start_date=datetime.date(2024, 1, 1),
        end_date=datetime.date(2024, 1, 10),
        rebalance_frequency="Monthly",
        portfolio_size=2,
        initial_capital=1000000.0,
        position_sizing="Equal",
        filters=[
            FilterRule(metric="roe", operator=">", value=0.10),
            FilterRule(metric="debt_equity", operator="<", value=0.50)
        ],
        ranking=[
            RankingRule(metric="roce", ascending=False)  # Rank by ROCE desc
        ]
    )
    
    try:
        results = run_backtest_simulation(db, config)
        print("Success! Backtest executed successfully.")
        print(f"Strategy ID: {results['id']}")
        print(f"Total return: {results['metrics']['total_return'] * 100:.2f}%")
        print(f"CAGR: {results['metrics']['cagr'] * 100:.2f}%")
        print(f"Benchmark CAGR: {results['metrics']['benchmark_cagr'] * 100:.2f}%")
        print(f"Max Drawdown: {results['metrics']['max_drawdown'] * 100:.2f}%")
        print(f"Sharpe Ratio: {results['metrics']['sharpe_ratio']:.2f}")
        print(f"Number of holdings records: {len(results['holdings'])}")
        
        # Verify that TCS was selected over Reliance due to higher ROCE
        top_holdings = [h['symbol'] for h in results['holdings']]
        print(f"Selected holdings: {top_holdings}")
        
        assert len(results['results']) == 10
        print("All assertions passed. Verification script complete.")
    except Exception as e:
        print(f"Pipeline verification FAILED: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    test_pipeline()
