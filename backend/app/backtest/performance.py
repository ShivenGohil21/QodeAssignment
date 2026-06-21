import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List

def calculate_performance_metrics(
    daily_results: List[Dict[str, Any]], 
    risk_free_rate: float = 0.06
) -> Dict[str, Any]:
    """
    Computes professional quantitative performance statistics.
    Input daily_results is a list of dicts with: date, portfolio_value, benchmark_value, drawdown
    """
    if not daily_results or len(daily_results) < 2:
        return {}
        
    df = pd.DataFrame(daily_results)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)
    
    # Calculate daily returns
    df['portfolio_ret'] = df['portfolio_value'].pct_change()
    df['benchmark_ret'] = df['benchmark_value'].pct_change()
    
    # Total returns
    initial_p = df['portfolio_value'].iloc[0]
    final_p = df['portfolio_value'].iloc[-1]
    total_return = (final_p - initial_p) / initial_p
    
    initial_b = df['benchmark_value'].iloc[0]
    final_b = df['benchmark_value'].iloc[-1]
    benchmark_return = (final_b - initial_b) / initial_b
    
    # CAGR
    start_date = df['date'].iloc[0]
    end_date = df['date'].iloc[-1]
    days_held = (end_date - start_date).days
    
    if days_held > 0:
        cagr = (final_p / initial_p) ** (365.0 / days_held) - 1.0
        benchmark_cagr = (final_b / initial_b) ** (365.0 / days_held) - 1.0
    else:
        cagr = 0.0
        benchmark_cagr = 0.0
        
    # Volatility (Annualized standard deviation of daily returns)
    p_returns = df['portfolio_ret'].dropna()
    b_returns = df['benchmark_ret'].dropna()
    
    p_vol = p_returns.std() * math.sqrt(252) if len(p_returns) > 1 else 0.0
    b_vol = b_returns.std() * math.sqrt(252) if len(b_returns) > 1 else 0.0
    
    # Sharpe Ratio
    sharpe = (cagr - risk_free_rate) / p_vol if p_vol > 0 else 0.0
    
    # Downside Volatility for Sortino Ratio
    downside_returns = p_returns[p_returns < 0]
    downside_vol = downside_returns.std() * math.sqrt(252) if len(downside_returns) > 1 else 0.0
    sortino = (cagr - risk_free_rate) / downside_vol if downside_vol > 0 else 0.0
    
    # Drawdowns
    df['peak'] = df['portfolio_value'].cummax()
    df['dd'] = (df['portfolio_value'] - df['peak']) / df['peak']
    max_drawdown = abs(df['dd'].min())
    
    # Calmar Ratio
    calmar = cagr / max_drawdown if max_drawdown > 0 else 0.0
    
    # Win Rate (percentage of positive return days)
    win_days = (p_returns > 0).sum()
    total_days = len(p_returns)
    win_rate = win_days / total_days if total_days > 0 else 0.0
    
    # Profit Factor
    gains = p_returns[p_returns > 0].sum()
    losses = abs(p_returns[p_returns < 0].sum())
    profit_factor = gains / losses if losses > 0 else 1.0
    
    # Average Return
    avg_return = p_returns.mean() * 252 if len(p_returns) > 0 else 0.0
    
    # Monthly returns for best/worst month
    df['year_month'] = df['date'].dt.to_period('M')
    monthly_p = df.groupby('year_month')['portfolio_value'].last()
    monthly_p_start = df.groupby('year_month')['portfolio_value'].first()
    monthly_returns = (monthly_p - monthly_p_start) / monthly_p_start
    
    best_month = monthly_returns.max() if not monthly_returns.empty else 0.0
    worst_month = monthly_returns.min() if not monthly_returns.empty else 0.0
    
    # Alpha and Beta
    covariance = np.cov(p_returns, b_returns)[0][1] if len(p_returns) > 1 and len(b_returns) > 1 else 0.0
    b_variance = b_returns.var() if len(b_returns) > 1 else 0.0
    beta = covariance / b_variance if b_variance > 0 else 1.0
    
    # CAPM Alpha (annualized excess return adjusting for beta)
    alpha = cagr - (risk_free_rate + beta * (benchmark_cagr - risk_free_rate))
    
    # Tracking Error & Information Ratio
    excess_returns = p_returns - b_returns
    tracking_error = excess_returns.std() * math.sqrt(252) if len(excess_returns) > 1 else 0.0
    info_ratio = (cagr - benchmark_cagr) / tracking_error if tracking_error > 0 else 0.0
    
    # Excess Return
    excess_return = cagr - benchmark_cagr
    
    return {
        "total_return": float(total_return),
        "benchmark_return": float(benchmark_return),
        "cagr": float(cagr),
        "benchmark_cagr": float(benchmark_cagr),
        "volatility": float(p_vol),
        "benchmark_volatility": float(b_vol),
        "sharpe_ratio": float(sharpe),
        "sortino_ratio": float(sortino),
        "calmar_ratio": float(calmar),
        "max_drawdown": float(max_drawdown),
        "win_rate": float(win_rate),
        "profit_factor": float(profit_factor),
        "avg_return": float(avg_return),
        "best_month": float(best_month),
        "worst_month": float(worst_month),
        "alpha": float(alpha),
        "beta": float(beta),
        "tracking_error": float(tracking_error),
        "information_ratio": float(info_ratio),
        "excess_return": float(excess_return)
    }
