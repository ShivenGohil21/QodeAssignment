import datetime
from typing import Dict, Any, List

class PortfolioTracker:
    def __init__(self, initial_cash: float):
        self.cash = initial_cash
        self.holdings = {}  # company_id -> {"shares": float, "entry_price": float, "weight": float}
        self.portfolio_value = initial_cash
        
    def rebalance(
        self, 
        rebalance_date: datetime.date,
        target_weights: Dict[int, float], 
        prices: Dict[int, float]
    ) -> List[Dict[str, Any]]:
        """
        Rebalances the portfolio. Sells current holdings and allocates cash
        to the target holdings based on target weights and current prices.
        Returns a list of holding records to be saved in DB.
        """
        # 1. Liquidate current holdings to cash based on current prices
        total_value = self.cash
        for cid, hold_info in self.holdings.items():
            curr_price = prices.get(cid, hold_info["entry_price"]) # fallback to entry if price missing
            total_value += hold_info["shares"] * curr_price
            
        self.portfolio_value = total_value
        self.cash = total_value
        self.holdings = {}
        
        # 2. Buy new holdings based on target weights
        new_holdings_records = []
        
        for cid, weight in target_weights.items():
            if weight <= 0:
                continue
                
            price = prices.get(cid)
            if not price or price <= 0:
                # If price is missing or zero, we cannot buy this stock. Put cash back.
                continue
                
            target_allocation = total_value * weight
            shares = target_allocation / price
            
            # Update active holdings
            self.holdings[cid] = {
                "shares": shares,
                "entry_price": price,
                "weight": weight
            }
            
            # Deduct from cash
            self.cash -= shares * price
            
            # Create DB holding record
            new_holdings_records.append({
                "company_id": cid,
                "weight": weight,
                "shares": shares,
                "entry_price": price
            })
            
        return new_holdings_records
        
    def get_portfolio_value(self, current_prices: Dict[int, float]) -> float:
        """
        Calculates the portfolio value on a specific date.
        Uses current prices and carries forward the last entry price if missing.
        """
        total = self.cash
        for cid, hold_info in self.holdings.items():
            price = current_prices.get(cid, hold_info["entry_price"])
            total += hold_info["shares"] * price
        self.portfolio_value = total
        return total
