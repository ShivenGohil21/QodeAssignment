import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts'
import { useBacktestStore } from '../store/backtestStore'

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000"

export const BacktestResults: React.FC = () => {
  const { selectedBacktestId, activeBacktest, setActiveBacktest, setActivePage } = useBacktestStore()
  const [loading, setLoading] = useState(false)
  const [selectedHoldingDate, setSelectedHoldingDate] = useState<string>("")

  useEffect(() => {
    const fetchDetails = async () => {
      if (!selectedBacktestId) return
      try {
        setLoading(true)
        const res = await axios.get(`${API_BASE}/backtests/${selectedBacktestId}`)
        setActiveBacktest(res.data)
        
        if (res.data.holdings && res.data.holdings.length > 0) {
          setSelectedHoldingDate(res.data.holdings[0].rebalance_date)
        }
      } catch (err) {
        console.error("Error loading backtest report details:", err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDetails()
  }, [selectedBacktestId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 flex-1">
        <span className="material-symbols-outlined text-[36px] text-primary animate-spin">sync</span>
        <p className="text-on-surface-variant text-sm font-medium">Assembling backtest analytics...</p>
      </div>
    )
  }

  if (!activeBacktest) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center max-w-md mx-auto flex-1">
        <span className="material-symbols-outlined text-[48px] text-outline mb-4">folder_lock</span>
        <h3 className="text-xl font-bold text-white">No Strategy Results Loaded</h3>
        <p className="text-on-surface-variant text-xs mt-2 leading-relaxed">
          Please run a backtest simulation in the Strategy page or load a past run from the Dashboard.
        </p>
      </div>
    )
  }

  const { metrics, results, holdings, strategy_name, start_date, end_date, rebalance_frequency, initial_capital } = activeBacktest

  // Format Recharts data
  const chartData = results.map((r: any) => ({
    dateStr: new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    Strategy: Math.round(r.portfolio_value),
    Nifty50: Math.round(r.benchmark_value),
    Drawdown: parseFloat((r.drawdown * -100).toFixed(2))
  }))

  // Group holdings
  const groupedHoldings: { [date: string]: any[] } = {}
  holdings.forEach((h: any) => {
    if (!groupedHoldings[h.rebalance_date]) {
      groupedHoldings[h.rebalance_date] = []
    }
    groupedHoldings[h.rebalance_date].push(h)
  })

  const rebalanceDates = Object.keys(groupedHoldings).sort()
  const activeDateHoldings = selectedHoldingDate ? groupedHoldings[selectedHoldingDate] || [] : []

  // Net Profit String
  const returnPct = (metrics.total_return * 100).toFixed(1)
  const displayPnL = metrics.total_return >= 0 ? `+${returnPct}%` : `${returnPct}%`

  // Sharpe Rating classification
  let sharpeRating = "Fair"
  if (metrics.sharpe_ratio >= 1.5) sharpeRating = "Excellent"
  else if (metrics.sharpe_ratio >= 1.0) sharpeRating = "Good"

  return (
    <div className="p-gutter space-y-gutter pb-16 flex-1 overflow-y-auto">
      
      {/* Header & Breadcrumbs */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <nav className="flex text-[11px] text-on-surface-variant font-label-caps mb-1">
            <span className="hover:text-primary cursor-pointer" onClick={() => setActivePage('dashboard')}>BACKTESTING</span>
            <span className="mx-2 opacity-30">/</span>
            <span className="text-primary">RUN_ID_{activeBacktest.id}</span>
          </nav>
          <h2 className="font-headline-md text-headline-md text-on-surface">{strategy_name}</h2>
          <span className="text-xs text-on-surface-variant font-mono block mt-1">
            Period: {start_date} to {end_date} | Freq: {rebalance_frequency}
          </span>
        </div>
        <div className="flex gap-2">
          <a 
            href={`${API_BASE}/backtests/${activeBacktest.id}/export/excel`}
            className="px-4 py-2 bg-surface-container-high border border-outline-variant hover:bg-surface-variant transition-colors flex items-center gap-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-white"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export Report</span>
          </a>
          <button 
            onClick={() => setActivePage('builder')}
            className="px-4 py-2 bg-primary-container text-on-primary-container hover:opacity-90 transition-colors flex items-center gap-2 rounded-lg text-xs font-bold"
          >
            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
            <span>Rerun Backtest</span>
          </button>
        </div>
      </div>

      {/* Performance Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-panel-gap bg-outline-variant rounded-xl overflow-hidden border border-outline-variant shadow-lg flex-shrink-0">
        <div className="bg-surface-container p-6 flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant uppercase opacity-60 text-[10px]">Sharpe Ratio</span>
          <div className="flex items-baseline gap-2">
            <span className="text-display-lg font-data-mono text-primary leading-none">{metrics.sharpe_ratio.toFixed(2)}</span>
            <span className="text-secondary text-body-sm font-bold">{sharpeRating}</span>
          </div>
        </div>
        <div className="bg-surface-container p-6 flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant uppercase opacity-60 text-[10px]">Annualized Return (CAGR)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-display-lg font-data-mono text-on-surface leading-none">{(metrics.cagr * 100).toFixed(1)}%</span>
            <span className="text-on-surface-variant text-body-sm">Bench: {(metrics.benchmark_cagr * 100).toFixed(1)}%</span>
          </div>
        </div>
        <div className="bg-surface-container p-6 flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant uppercase opacity-60 text-[10px]">Max Drawdown</span>
          <div className="flex items-baseline gap-2">
            <span className="text-display-lg font-data-mono text-error leading-none">{(metrics.max_drawdown * -100).toFixed(1)}%</span>
            <span className="text-on-surface-variant text-body-sm">Calmar: {metrics.calmar_ratio.toFixed(1)}</span>
          </div>
        </div>
        <div className="bg-surface-container p-6 flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant uppercase opacity-60 text-[10px]">Net Profit</span>
          <div className="flex items-baseline gap-2">
            <span className="text-display-lg font-data-mono text-secondary leading-none">₹{(results[results.length - 1].portfolio_value - initial_capital).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span className="text-secondary text-body-sm">{displayPnL}</span>
          </div>
        </div>
      </div>

      {/* Equity Curve Area Chart */}
      <div className="glass-panel rounded-xl p-6 relative overflow-hidden h-[380px]">
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <h3 className="font-title-sm text-title-sm text-on-surface">Equity Curve Comparison</h3>
            <p className="text-body-sm text-on-surface-variant">Growth vs NIFTY 50 Index</p>
          </div>
          <div className="flex gap-4 items-center text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(173,198,255,0.6)]"></div>
              <span className="text-body-sm font-medium">Strategy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-outline-variant"></div>
              <span className="text-body-sm font-medium opacity-50">NIFTY 50 Bench.</span>
            </div>
          </div>
        </div>

        {/* Recharts Wrapper */}
        <div className="absolute inset-x-0 bottom-0 top-24 px-6 pb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#adc6ff" stopOpacity={0.15}></stop>
                  <stop offset="100%" stopColor="#adc6ff" stopOpacity={0}></stop>
                </linearGradient>
              </defs>
              <XAxis dataKey="dateStr" stroke="#31353e" fontSize={9} tickLine={false} />
              <YAxis stroke="#31353e" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
              <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Value']} />
              <Area type="monotone" dataKey="Strategy" stroke="#adc6ff" strokeWidth={2.5} fillOpacity={1} fill="url(#equityFill)" />
              <Area type="monotone" dataKey="Nifty50" stroke="#424754" strokeWidth={1.5} fill="none" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        
        {/* Drawdown Section (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-xl p-6 h-[280px] relative overflow-hidden">
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h3 className="font-title-sm text-title-sm text-on-surface">Drawdown Analysis</h3>
            <div className="px-2 py-1 bg-error-container text-on-error-container rounded text-[10px] font-bold uppercase tracking-widest">Risk Monitoring</div>
          </div>
          
          <div className="absolute inset-x-0 bottom-0 top-20 px-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="drawdownFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff5451" stopOpacity={0.2}></stop>
                    <stop offset="100%" stopColor="#ff5451" stopOpacity={0}></stop>
                  </linearGradient>
                </defs>
                <XAxis dataKey="dateStr" stroke="none" hide />
                <YAxis stroke="#424754" fontSize={9} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [`${v}%`, 'Drawdown']} />
                <Area type="monotone" dataKey="Drawdown" stroke="#ff5451" strokeWidth={1.5} fillOpacity={1} fill="url(#drawdownFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Holdings / Trade Log Section (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-xl overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container">
            <div>
              <h3 className="font-title-sm text-title-sm text-on-surface">Rebalance Holdings Log</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Asset allocations on rebalancing interval</p>
            </div>
            
            <div className="flex gap-2 items-center">
              <span className="text-xs text-on-surface-variant font-mono">Date:</span>
              <select
                value={selectedHoldingDate}
                onChange={(e) => setSelectedHoldingDate(e.target.value)}
                className="bg-surface-dim border border-outline-variant rounded px-2.5 py-1 text-xs text-on-surface focus:outline-none"
              >
                {rebalanceDates.map((date) => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high border-b border-outline-variant">
                  <th className="p-4 text-label-caps text-on-surface-variant font-bold text-[10px] tracking-wider">Symbol</th>
                  <th className="p-4 text-label-caps text-on-surface-variant font-bold text-[10px] tracking-wider">Company</th>
                  <th className="p-4 text-label-caps text-on-surface-variant font-bold text-[10px] tracking-wider">Type</th>
                  <th className="p-4 text-label-caps text-on-surface-variant font-bold text-[10px] tracking-wider">Weight</th>
                  <th className="p-4 text-label-caps text-on-surface-variant font-bold text-[10px] tracking-wider">Shares</th>
                  <th className="p-4 text-label-caps text-on-surface-variant font-bold text-[10px] tracking-wider text-right">Entry Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-xs">
                {activeDateHoldings.map((h: any, idx: number) => (
                  <tr key={idx} className="hover:bg-surface-variant/30 transition-colors cursor-pointer group">
                    <td className="p-4 font-mono font-bold text-primary">{h.symbol}</td>
                    <td className="p-4 text-on-surface-variant truncate max-w-[150px]">{h.company_name}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-primary-container/10 text-primary border border-primary/20 text-[9px] font-bold uppercase">Long</span>
                    </td>
                    <td className="p-4 font-data-mono text-secondary">{(h.weight * 100).toFixed(1)}%</td>
                    <td className="p-4 font-data-mono text-on-surface">{Math.round(h.shares).toLocaleString()}</td>
                    <td className="p-4 font-data-mono text-right text-on-surface">₹{h.entry_price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
