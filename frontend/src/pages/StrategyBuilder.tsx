import React, { useState } from 'react'
import axios from 'axios'
import { useBacktestStore } from '../store/backtestStore'

const API_BASE = "http://localhost:8000"

export const StrategyBuilder: React.FC = () => {
  const { setActivePage, setSelectedBacktestId, setActiveBacktest } = useBacktestStore()
  
  const [running, setRunning] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Strategy form states
  const [strategyName, setStrategyName] = useState("Magic Formula India")
  const [startDate, setStartDate] = useState("2018-01-01")
  const [endDate, setEndDate] = useState("2025-12-31")
  const [rebalanceFrequency, setRebalanceFrequency] = useState("Quarterly")
  const [portfolioSize, setPortfolioSize] = useState(5)
  const [initialCapital, setInitialCapital] = useState(1000000)
  const [positionSizing, setPositionSizing] = useState("Equal")
  const [sizingMetric, setSizingMetric] = useState("roce")

  const [filters, setFilters] = useState<any[]>([
    { metric: "roce", operator: ">", value: "0.15" },
    { metric: "pe", operator: "<", value: "25.0" }
  ])
  
  const [rankingRules, setRankingRules] = useState<any[]>([
    { metric: "roce", ascending: false },
    { metric: "pe", ascending: true }
  ])

  // Drag & drop / click to add logic block
  const handleAddBlockFilter = (metric: string) => {
    let operator = ">"
    let value = "0.15"
    if (metric === "pe" || metric === "pb" || metric === "debt_equity") {
      operator = "<"
      value = metric === "debt_equity" ? "0.5" : "20.0"
    } else if (metric === "sector") {
      operator = "=="
      value = "Technology"
    }
    setFilters([...filters, { metric, operator, value }])
  }

  const handleAddBlockRanking = (metric: string) => {
    const ascending = (metric === "pe" || metric === "pb" || metric === "debt_equity")
    setRankingRules([...rankingRules, { metric, ascending }])
  }

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  const updateFilter = (index: number, key: string, value: any) => {
    const updated = [...filters]
    updated[index][key] = value
    setFilters(updated)
  }

  const removeRanking = (index: number) => {
    setRankingRules(rankingRules.filter((_, i) => i !== index))
  }

  const updateRanking = (index: number, key: string, value: any) => {
    const updated = [...rankingRules]
    updated[index][key] = value
    setRankingRules(updated)
  }

  const handleRunStrategySubmit = async () => {
    if (filters.length === 0 && rankingRules.length === 0) {
      setErrorMsg("Your strategy is empty. Please add at least one Screening Block or Ranking Factor from the library on the left.")
      return
    }
    setRunning(true)
    setErrorMsg("")
    
    // Parse numeric fields for payload
    const parsedFilters = filters.map(f => {
      let val = f.value
      if (!isNaN(Number(f.value))) {
        val = Number(f.value)
      } else if (f.value.startsWith('[') && f.value.endsWith(']')) {
        try {
          val = JSON.parse(f.value)
        } catch (e) {
          val = f.value
        }
      }
      return {
        metric: f.metric,
        operator: f.operator,
        value: val
      }
    })

    const payload = {
      strategy_name: strategyName,
      start_date: startDate,
      end_date: endDate,
      rebalance_frequency: rebalanceFrequency,
      portfolio_size: Number(portfolioSize),
      initial_capital: Number(initialCapital),
      position_sizing: positionSizing,
      sizing_metric: positionSizing === "Metric" ? sizingMetric : null,
      filters: parsedFilters,
      ranking: rankingRules
    }

    try {
      const res = await axios.post(`${API_BASE}/backtests/run`, payload)
      setActiveBacktest(res.data)
      setSelectedBacktestId(res.data.id)
      setActivePage('results')
    } catch (err: any) {
      let msg = "Simulation run failed. Check yfinance pricing data first."
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail
        if (typeof detail === 'string') {
          msg = detail
        } else if (Array.isArray(detail)) {
          msg = detail.map((d: any) => `${d.loc ? d.loc.join('.') : 'Field'}: ${d.msg}`).join(', ')
        } else {
          msg = JSON.stringify(detail)
        }
      } else if (err.message) {
        msg = err.message
      }
      setErrorMsg(msg)
      console.error(err)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-1 h-[calc(100vh-2.5rem)] overflow-hidden">
      
      {/* Run Action Header floating override (or we place a run button on sidebar/canvas) */}
      
      {/* Left Sidebar: Indicators Library */}
      <aside className="w-72 border-r border-outline-variant bg-surface flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-outline-variant">
          <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase text-[10px]">Logic Block Library</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Filters Screen Triggers */}
          <div>
            <h3 className="text-[10px] font-bold text-outline uppercase mb-3 px-1 tracking-wider">Screening Blocks</h3>
            <div className="space-y-2">
              <button 
                onClick={() => handleAddBlockFilter('roce')}
                className="w-full text-left glass-panel p-3 rounded-lg border-l-4 border-l-primary flex items-center gap-3 group hover:bg-surface-variant transition-all"
              >
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">show_chart</span>
                <span className="font-data-mono text-xs">ROCE Filter</span>
              </button>
              <button 
                onClick={() => handleAddBlockFilter('roe')}
                className="w-full text-left glass-panel p-3 rounded-lg border-l-4 border-l-primary flex items-center gap-3 group hover:bg-surface-variant transition-all"
              >
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">query_stats</span>
                <span className="font-data-mono text-xs">ROE Filter</span>
              </button>
              <button 
                onClick={() => handleAddBlockFilter('pe')}
                className="w-full text-left glass-panel p-3 rounded-lg border-l-4 border-l-primary flex items-center gap-3 group hover:bg-surface-variant transition-all"
              >
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">waves</span>
                <span className="font-data-mono text-xs">P/E Valuation</span>
              </button>
              <button 
                onClick={() => handleAddBlockFilter('market_cap')}
                className="w-full text-left glass-panel p-3 rounded-lg border-l-4 border-l-primary flex items-center gap-3 group hover:bg-surface-variant transition-all"
              >
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">equalizer</span>
                <span className="font-data-mono text-xs">Market Cap Cap</span>
              </button>
            </div>
          </div>

          {/* Ranking Block Triggers */}
          <div>
            <h3 className="text-[10px] font-bold text-outline uppercase mb-3 px-1 tracking-wider">Ranking Factors</h3>
            <div className="space-y-2">
              <button 
                onClick={() => handleAddBlockRanking('roce')}
                className="w-full text-left glass-panel p-3 rounded-lg border-l-4 border-l-tertiary-container flex items-center gap-3 group hover:bg-surface-variant transition-all"
              >
                <span className="material-symbols-outlined text-tertiary-container group-hover:scale-110 transition-transform">alt_route</span>
                <span className="font-data-mono text-xs">Sort by ROCE</span>
              </button>
              <button 
                onClick={() => handleAddBlockRanking('pe')}
                className="w-full text-left glass-panel p-3 rounded-lg border-l-4 border-l-tertiary-container flex items-center gap-3 group hover:bg-surface-variant transition-all"
              >
                <span className="material-symbols-outlined text-tertiary-container group-hover:scale-110 transition-transform">hub</span>
                <span className="font-data-mono text-xs">Sort by P/E</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Center: Strategy Canvas */}
      <section className="flex-1 relative overflow-y-auto canvas-grid bg-surface-dim p-6 space-y-6">
        
        {/* Canvas floating run notification */}
        <div className="flex justify-between items-center glass-panel px-6 py-3 rounded-xl mb-4 border-slate-700/60 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-secondary rounded-full animate-pulse"></div>
            <span className="text-xs text-on-surface-variant">Design canvas is connected to database constraints</span>
          </div>
          <button 
            type="button"
            onClick={handleRunStrategySubmit}
            disabled={running}
            className="bg-primary-container text-on-primary-container px-6 py-1.5 rounded font-bold text-xs hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
            {running ? "Running..." : "Run Test"}
          </button>
        </div>

        {errorMsg && (
          <div className="glass-panel p-4 rounded-xl border-error/30 text-error text-xs font-mono">
            {errorMsg}
          </div>
        )}

        {/* Visual Logic Node Blocks: Screeners */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-outline uppercase tracking-wider pl-1">Screening Node Blocks ({filters.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filters.map((filter, index) => (
              <div key={index} className="glass-panel rounded-xl logic-block-active border-2 border-primary overflow-hidden bg-slate-900/30">
                <div className="bg-primary/10 px-4 py-2 border-b border-outline-variant flex justify-between items-center">
                  <span className="font-bold text-xs text-primary flex items-center gap-2 capitalize">
                    <span className="material-symbols-outlined text-[16px]">show_chart</span>
                    {filter.metric.replace('_', ' ')} SCREEN
                  </span>
                  <button type="button" onClick={() => removeFilter(index)} className="material-symbols-outlined text-outline text-[16px] hover:text-error transition-colors">
                    close
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] text-outline font-bold block uppercase mb-1">Operator</span>
                      <select 
                        value={filter.operator}
                        onChange={(e) => updateFilter(index, "operator", e.target.value)}
                        className="w-full bg-surface-dim border border-outline-variant rounded p-1.5 text-xs text-on-surface focus:outline-none"
                      >
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value="==">==</option>
                        <option value="between">Between</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[9px] text-outline font-bold block uppercase mb-1">Value Threshold</span>
                      <input 
                        type="text"
                        value={filter.value}
                        onChange={(e) => updateFilter(index, "value", e.target.value)}
                        className="w-full bg-surface-dim border border-outline-variant rounded p-1.5 text-xs text-on-surface font-data-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual Logic Node Blocks: Rankings */}
        <div className="space-y-4 pt-4">
          <h4 className="text-[10px] font-bold text-outline uppercase tracking-wider pl-1">Ranking Factor Nodes ({rankingRules.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rankingRules.map((rule, index) => (
              <div key={index} className="glass-panel rounded-xl border border-outline-variant overflow-hidden bg-slate-900/30">
                <div className="bg-surface-variant px-4 py-2 border-b border-outline-variant flex justify-between items-center">
                  <span className="font-bold text-xs text-on-surface flex items-center gap-2 uppercase">
                    <span className="material-symbols-outlined text-[16px]">alt_route</span>
                    RANK: {rule.metric}
                  </span>
                  <button type="button" onClick={() => removeRanking(index)} className="material-symbols-outlined text-outline text-[16px] hover:text-error transition-colors">
                    close
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-xs">
                    <span className="text-[9px] text-outline font-bold block uppercase mb-1">Order Direction</span>
                    <select
                      value={rule.ascending ? "Asc" : "Desc"}
                      onChange={(e) => updateRanking(index, "ascending", e.target.value === "Asc")}
                      className="w-full bg-surface-dim border border-outline-variant rounded p-1.5 text-xs text-on-surface focus:outline-none"
                    >
                      <option value="Desc">Descending (Best values first)</option>
                      <option value="Asc">Ascending (Smallest values first)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* Right Sidebar: Configuration Panel */}
      <aside className="w-80 border-l border-outline-variant bg-surface flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center">
          <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase text-[10px]">Strategy Settings</h2>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Strategy Details Input */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-outline uppercase px-1">Strategy Name</label>
              <input 
                className="w-full bg-surface-dim border border-outline-variant rounded p-2 text-sm text-on-surface focus:border-primary-container outline-none transition-colors"
                type="text" 
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-outline uppercase px-1">Starting Capital</label>
              <input 
                className="w-full bg-surface-dim border border-outline-variant rounded p-2 text-sm text-on-surface focus:border-primary-container outline-none font-data-mono"
                type="number" 
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase px-1">Start Date</label>
                <input 
                  className="w-full bg-surface-dim border border-outline-variant rounded p-1.5 text-xs text-on-surface focus:border-primary-container outline-none"
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase px-1">End Date</label>
                <input 
                  className="w-full bg-surface-dim border border-outline-variant rounded p-1.5 text-xs text-on-surface focus:border-primary-container outline-none"
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-outline uppercase px-1">Rebalance Frequency</label>
              <select 
                value={rebalanceFrequency}
                onChange={(e) => setRebalanceFrequency(e.target.value)}
                className="w-full bg-surface-dim border border-outline-variant rounded p-2 text-sm text-on-surface"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Half-Yearly">Half-Yearly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-outline uppercase px-1">Max Stocks held</label>
              <input 
                className="w-full bg-surface-dim border border-outline-variant rounded p-2 text-sm text-on-surface font-data-mono"
                type="number" 
                value={portfolioSize}
                onChange={(e) => setPortfolioSize(Number(e.target.value))}
                min="1"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-outline uppercase px-1">Position Sizing</label>
              <select
                value={positionSizing}
                onChange={(e) => setPositionSizing(e.target.value)}
                className="w-full bg-surface-dim border border-outline-variant rounded p-2 text-sm text-on-surface"
              >
                <option value="Equal">Equal Weighting</option>
                <option value="MarketCap">Market Capitalization Weighted</option>
                <option value="Metric">Metric Weighted</option>
              </select>
            </div>

            {positionSizing === "Metric" && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase px-1">Sizing Weight Metric</label>
                <select 
                  value={sizingMetric}
                  onChange={(e) => setSizingMetric(e.target.value)}
                  className="w-full bg-surface-dim border border-outline-variant rounded p-2 text-sm text-on-surface"
                >
                  <option value="roce">ROCE</option>
                  <option value="roe">ROE</option>
                  <option value="market_cap">Market Cap</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Validation Log */}
        <div className="p-4 bg-surface-container-high border-t border-outline-variant mt-auto">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase text-outline">Validation: Active</span>
          </div>
          <div className="text-[11px] font-data-mono text-secondary">✓ Strategy config parsed. Ready to run.</div>
        </div>
      </aside>
    </div>
  )
}
