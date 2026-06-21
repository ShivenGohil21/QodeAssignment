import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, ForeignKey, Index, Text, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(50), unique=True, nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    sector = Column(String(100), nullable=True, index=True)
    industry = Column(String(100), nullable=True)
    market_cap = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    prices = relationship("StockPrice", back_populates="company", cascade="all, delete-orphan")
    statements = relationship("FinancialStatement", back_populates="company", cascade="all, delete-orphan")
    ratios = relationship("FinancialRatio", back_populates="company", cascade="all, delete-orphan")
    holdings = relationship("PortfolioHolding", back_populates="company", cascade="all, delete-orphan")

class StockPrice(Base):
    __tablename__ = "stock_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    open = Column(Float, nullable=True)
    high = Column(Float, nullable=True)
    low = Column(Float, nullable=True)
    close = Column(Float, nullable=True)
    adjusted_close = Column(Float, nullable=True)
    volume = Column(Float, nullable=True)
    
    company = relationship("Company", back_populates="prices")

# Indexes for stock prices
Index("idx_prices_company_id", StockPrice.company_id)
Index("idx_prices_date", StockPrice.date)
Index("idx_prices_company_date", StockPrice.company_id, StockPrice.date)

class FinancialStatement(Base):
    __tablename__ = "financial_statements"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    report_date = Column(Date, nullable=False)
    revenue = Column(Float, nullable=True)
    ebitda = Column(Float, nullable=True)
    net_profit = Column(Float, nullable=True)
    total_assets = Column(Float, nullable=True)
    total_liabilities = Column(Float, nullable=True)
    equity = Column(Float, nullable=True)
    debt = Column(Float, nullable=True)
    cash = Column(Float, nullable=True)
    operating_cashflow = Column(Float, nullable=True)
    free_cashflow = Column(Float, nullable=True)
    
    company = relationship("Company", back_populates="statements")

# Indexes for financial statements
Index("idx_statements_company_id", FinancialStatement.company_id)
Index("idx_statements_report_date", FinancialStatement.report_date)

class FinancialRatio(Base):
    __tablename__ = "financial_ratios"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    report_date = Column(Date, nullable=False)
    roe = Column(Float, nullable=True)
    roce = Column(Float, nullable=True)
    pe = Column(Float, nullable=True)
    pb = Column(Float, nullable=True)
    debt_equity = Column(Float, nullable=True)
    operating_margin = Column(Float, nullable=True)
    net_margin = Column(Float, nullable=True)
    
    company = relationship("Company", back_populates="ratios")

# Indexes for ratios
Index("idx_ratios_company_id", FinancialRatio.company_id)
Index("idx_ratios_report_date", FinancialRatio.report_date)

class Backtest(Base):
    __tablename__ = "backtests"
    
    id = Column(Integer, primary_key=True, index=True)
    strategy_name = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    rebalance_frequency = Column(String(50), nullable=False)
    initial_capital = Column(Float, nullable=False)
    strategy_parameters = Column(JSON, nullable=True)  # Contains filters, ranking rules, weighting methods, portfolio size
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    results = relationship("BacktestResult", back_populates="backtest", cascade="all, delete-orphan")
    holdings = relationship("PortfolioHolding", back_populates="backtest", cascade="all, delete-orphan")

class BacktestResult(Base):
    __tablename__ = "backtest_results"
    
    id = Column(Integer, primary_key=True, index=True)
    backtest_id = Column(Integer, ForeignKey("backtests.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    portfolio_value = Column(Float, nullable=False)
    benchmark_value = Column(Float, nullable=False)
    drawdown = Column(Float, nullable=False)
    
    backtest = relationship("Backtest", back_populates="results")

# Index for backtest results
Index("idx_results_backtest_id", BacktestResult.backtest_id)
Index("idx_results_date", BacktestResult.date)

class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"
    
    id = Column(Integer, primary_key=True, index=True)
    backtest_id = Column(Integer, ForeignKey("backtests.id", ondelete="CASCADE"), nullable=False)
    rebalance_date = Column(Date, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    weight = Column(Float, nullable=False)
    shares = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    
    backtest = relationship("Backtest", back_populates="holdings")
    company = relationship("Company", back_populates="holdings")

# Index for portfolio holdings
Index("idx_holdings_backtest_id", PortfolioHolding.backtest_id)
Index("idx_holdings_rebalance_date", PortfolioHolding.rebalance_date)
