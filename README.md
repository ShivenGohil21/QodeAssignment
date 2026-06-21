# QuantCraft - Equity Strategy Backtesting Platform (Indian Stock Market)

QuantCraft is a production-ready, full-stack quantitative investing platform focused on the Indian stock market (NSE). The platform allows you to screen stock universes, design composite ranking rules, simulate historical portfolio rebalancing, evaluate returns against the Nifty 50 index, and export multi-sheet spreadsheet reports.

---

## 🚀 Features

* **Data Ingestion Engine**: Dynamically fetches historical daily prices and annual financial statements for Indian equities via Yahoo Finance, calculating core valuation and efficiency ratios (ROE, ROCE, PE, PB, Debt-to-Equity).
* **Strategy Screen Builder**: Add dynamic numeric filters (e.g., ROCE > 15%, Debt/Equity < 0.5) and composite ranking scores.
* **Flexible Sizing Weights**: Allocate portfolio cash using Equal weighting, Market-Cap weighting, or Metric-proportional sizing.
* **Lookahead-Free Backtesting**: Simulates portfolio rebalancing at Monthly, Quarterly, Half-Yearly, or Yearly intervals using only information published prior to each transaction date.
* **Professional Analytics**: Visualizes equity curves vs. benchmark (Nifty 50) and drawdowns using Recharts area diagrams. Calculates Sharpe, Sortino, Calmar, Volatility, Win Rate, Alpha, Beta, and Tracking Error.
* **Report Exports**: Download backtest history as raw CSV or customized multi-sheet Excel files.
* **Zero-Config local setup**: Auto-switches to SQLite database locally if PostgreSQL/Docker is not present.

---

## 📁 Repository Directory Structure

```
C:/CompanyProject/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routers (companies, backtests, ingestion)
│   │   ├── backtest/        # Backtesting simulation modules (universe, ranking, weighting, portfolio, performance)
│   │   ├── core/            # Database and project configuration settings
│   │   ├── db/              # SQLAlchemy tables models and Pydantic schemas
│   │   ├── services/        # yfinance ingestion handler & mock generator
│   │   └── main.py          # FastAPI application entry point
│   ├── run.py               # Local server execution script
│   ├── requirements.txt     # Backend python package dependencies
│   └── test_backtest.py     # Automated engine verification test script
├── frontend/
│   ├── src/
│   │   ├── components/      # UI Layout shell & elements
│   │   ├── pages/           # Dashboard, StrategyBuilder, BacktestResults, CompanyExplorer
│   │   ├── store/           # Zustand global state coordinator
│   │   ├── index.css        # Tailwind styling & visual glow themes
│   │   └── main.tsx         # React app bootstrap
│   ├── package.json         # Frontend node packages
│   └── vite.config.ts       # Vite bundler options
└── README.md                # Project documentation reference
```

---

## ⚡ Setup & Local Running

### Run Locally

Open two terminal sessions:

#### **1. Start the FastAPI Backend**
```bash
cd backend
# Create a virtual environment
python -m venv venv
# Activate the virtual environment (Windows command/PowerShell)
venv\Scripts\activate
# Install python requirements
pip install -r requirements.txt
# Run local uvicorn server
python run.py
```
*API logs will run at `http://localhost:8000`. Swagger API documentation is available at `http://localhost:8000/docs`.*

#### **2. Start the Vite React Frontend**
```bash
cd frontend
# Install npm dependencies
npm install
# Run the React dev server
npm run dev
```
*The React client will launch at `http://localhost:5173`.*

---

## 📊 Backtest Engine Pipelines

* **universe.py**: Screens available company symbols.
* **filters.py**: Evaluates date-bounded filtering rules on balance sheets/income statements.
* **ranking.py**: Calculates composite relative scores based on multiple criteria (e.g. PE Ascending + ROE Descending).
* **weighting.py**: Assigns target stock weights.
* **portfolio.py**: Compares prices and converts portfolio holdings to cash, purchasing shares on rebalance dates.
* **performance.py**: Annualizes metrics, calculates downside deviation, drawdowns, index beta, tracking error, and information ratio.
