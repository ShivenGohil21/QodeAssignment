from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import date, datetime

# --- COMPANY SCHEMAS ---
class CompanyBase(BaseModel):
    symbol: str
    company_name: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap: Optional[float] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- PRICE SCHEMAS ---
class StockPriceBase(BaseModel):
    date: date
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    adjusted_close: Optional[float] = None
    volume: Optional[float] = None

class StockPriceResponse(StockPriceBase):
    id: int
    company_id: int

    class Config:
        from_attributes = True

# --- FINANCIAL STATEMENT SCHEMAS ---
class FinancialStatementBase(BaseModel):
    report_date: date
    revenue: Optional[float] = None
    ebitda: Optional[float] = None
    net_profit: Optional[float] = None
    total_assets: Optional[float] = None
    total_liabilities: Optional[float] = None
    equity: Optional[float] = None
    debt: Optional[float] = None
    cash: Optional[float] = None
    operating_cashflow: Optional[float] = None
    free_cashflow: Optional[float] = None

class FinancialStatementResponse(FinancialStatementBase):
    id: int
    company_id: int

    class Config:
        from_attributes = True

# --- FINANCIAL RATIO SCHEMAS ---
class FinancialRatioBase(BaseModel):
    report_date: date
    roe: Optional[float] = None
    roce: Optional[float] = None
    pe: Optional[float] = None
    pb: Optional[float] = None
    debt_equity: Optional[float] = None
    operating_margin: Optional[float] = None
    net_margin: Optional[float] = None

class FinancialRatioResponse(FinancialRatioBase):
    id: int
    company_id: int

    class Config:
        from_attributes = True

# --- BACKTEST SCHEMAS ---
class FilterRule(BaseModel):
    metric: str  # e.g., "market_cap", "roe", "roce", "debt_equity", "sector"
    operator: str  # e.g., ">", "<", "between", "equals"
    value: Any  # numeric or string or list of values

class RankingRule(BaseModel):
    metric: str  # e.g., "roe", "roce", "pe", "pb"
    ascending: bool = False

class StrategyConfig(BaseModel):
    strategy_name: str = "My Custom Strategy"
    start_date: date
    end_date: date
    rebalance_frequency: str = "Quarterly"  # Monthly, Quarterly, Half-Yearly, Yearly
    portfolio_size: int = 10
    initial_capital: float = 1000000.0
    position_sizing: str = "Equal"  # Equal, MarketCap, Metric
    sizing_metric: Optional[str] = None  # e.g., "roce" (required if position_sizing == "Metric")
    filters: List[FilterRule] = []
    ranking: List[RankingRule] = []

class BacktestResultItem(BaseModel):
    date: date
    portfolio_value: float
    benchmark_value: float
    drawdown: float

    class Config:
        from_attributes = True

class PortfolioHoldingItem(BaseModel):
    rebalance_date: date
    symbol: str
    company_name: str
    weight: float
    shares: float
    entry_price: float

    class Config:
        from_attributes = True

class BacktestSummaryResponse(BaseModel):
    id: int
    strategy_name: str
    start_date: date
    end_date: date
    rebalance_frequency: str
    initial_capital: float
    created_at: datetime

    class Config:
        from_attributes = True

class BacktestDetailResponse(BacktestSummaryResponse):
    strategy_parameters: Dict[str, Any]
    results: List[BacktestResultItem] = []
    holdings: List[PortfolioHoldingItem] = []
    metrics: Dict[str, Any] = {}

    class Config:
        from_attributes = True
