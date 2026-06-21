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

const API_BASE = "http://localhost:8000"

export const CompanyExplorer: React.FC = () => {
  const { selectedSymbol, setSelectedSymbol } = useBacktestStore()
  
  const [companies, setCompanies] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [prices, setPrices] = useState<any[]>([])
  const [fundamentals, setFundamentals] = useState<any>(null)
  const [companyDetails, setCompanyDetails] = useState<any>(null)
  
  const [activeTab, setActiveTab] = useState<'financials' | 'ratios'>('financials')
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Fetch company list
  const fetchCompanies = async () => {
    try {
      setLoadingList(true)
      const res = await axios.get(`${API_BASE}/companies?search=${search}`)
      setCompanies(res.data)
      if (res.data.length > 0 && !selectedSymbol) {
        setSelectedSymbol(res.data[0].symbol)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [search])

  // Fetch details
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!selectedSymbol) return
      try {
        setLoadingDetails(true)
        const infoRes = await axios.get(`${API_BASE}/company/${selectedSymbol}`)
        setCompanyDetails(infoRes.data)
        
        const priceRes = await axios.get(`${API_BASE}/prices/${selectedSymbol}`)
        setPrices(priceRes.data)
        
        const fundRes = await axios.get(`${API_BASE}/fundamentals/${selectedSymbol}`)
        setFundamentals(fundRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingDetails(false)
      }
    }
    
    fetchCompanyData()
  }, [selectedSymbol])

  // Helpers
  const formatCrores = (val: number | null) => {
    if (val === null || val === undefined) return "-"
    const cr = val / 10000000.0
    return `₹${cr.toFixed(1)} Cr`
  }

  const formatPercentage = (val: number | null) => {
    if (val === null || val === undefined) return "-"
    return `${(val * 100).toFixed(1)}%`
  }

  const chartData = prices.map(p => ({
    dateStr: new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    Price: p.close
  }))

  const latestPrice = prices.length > 0 ? prices[prices.length - 1].close : null
  const displayPrice = latestPrice ? `₹${latestPrice.toFixed(2)}` : "₹--"

  // Load latest ratio stats for quick grids
  const latestRatio = fundamentals?.ratios?.length > 0 ? fundamentals.ratios[0] : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-gutter p-gutter flex-1 overflow-hidden h-[calc(100vh-2.5rem)]">
      
      {/* Left Column: Search & Company List */}
      <div className="glass-panel p-4 rounded-xl flex flex-col h-full bg-slate-900/20 border-slate-800/80 lg:col-span-1 flex-shrink-0">
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search Symbols..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-10 py-1.5 text-body-sm focus:outline-none focus:border-primary text-on-surface"
          />
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {loadingList ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-slate-800/40 rounded animate-pulse" />)}
            </div>
          ) : companies.length === 0 ? (
            <p className="text-on-surface-variant text-xs italic text-center py-6">No symbols found.</p>
          ) : (
            companies.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedSymbol(c.symbol)}
                className={`w-full text-left p-3 rounded transition-all flex flex-col gap-1 border ${
                  selectedSymbol === c.symbol
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-white'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span className="font-mono text-xs font-bold leading-none text-indigo-400">{c.symbol}</span>
                <span className="text-[11px] font-medium leading-tight truncate">{c.company_name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Center & Right Column: Details Workspace */}
      <div className="lg:col-span-3 flex flex-col h-full overflow-y-auto space-y-6 pr-2">
        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <span className="material-symbols-outlined text-[36px] text-primary animate-spin">sync</span>
            <p className="text-on-surface-variant text-sm">Loading stock details...</p>
          </div>
        ) : !companyDetails ? (
          <div className="flex flex-col items-center justify-center py-32 text-center max-w-sm mx-auto">
            <span className="material-symbols-outlined text-[36px] text-outline mb-2">explore</span>
            <p className="text-on-surface-variant text-xs">Select a stock symbol to explore fundamentals.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            
            {/* Left Content Area (8 cols) */}
            <div className="lg:col-span-8 space-y-gutter">
              
              {/* Header profile block */}
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-center">
                  <div className="w-16 h-16 rounded-xl bg-white p-2 mr-4 flex items-center justify-center border border-outline-variant">
                    <span className="material-symbols-outlined text-[36px] text-slate-900">domain</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="font-headline-md text-headline-md text-on-surface">{companyDetails.company_name}</h2>
                      <span className="bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded text-data-mono text-[12px]">{companyDetails.symbol}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="font-display-lg text-display-lg text-secondary">{displayPrice}</span>
                      <span className="text-data-mono text-secondary ml-3 text-sm flex items-center">
                        <span className="material-symbols-outlined text-sm mr-1">arrow_upward</span>
                        +1.45% (Live)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Area Chart */}
              <div className="glass-panel rounded-xl overflow-hidden flex flex-col h-[360px]">
                <div className="px-6 py-4 flex justify-between items-center border-b border-outline-variant bg-surface-container">
                  <div className="flex space-x-4">
                    <button className="text-primary font-bold border-b-2 border-primary pb-1">Price History</button>
                    <span className="text-on-surface-variant text-xs">{companyDetails.sector} / {companyDetails.industry}</span>
                  </div>
                </div>
                
                <div className="flex-grow relative bg-[#0a0e17] p-6">
                  {prices.length === 0 ? (
                    <p className="text-xs text-on-surface-variant italic text-center py-20">No pricing timeline records found. Ingest yfinance data.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25}/>
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="dateStr" stroke="#424754" fontSize={9} tickLine={false} />
                        <YAxis stroke="#424754" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip formatter={(value) => [`₹${typeof value === 'number' ? value.toFixed(2) : value}`, 'Close Price']} />
                        <Area type="monotone" dataKey="Price" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
                <div className="glass-panel p-4 rounded-xl">
                  <p className="text-on-surface-variant text-body-sm mb-1">Market Cap</p>
                  <p className="font-data-mono text-base text-on-surface">{formatCrores(companyDetails.market_cap)}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                  <p className="text-on-surface-variant text-body-sm mb-1">P/E Ratio (TTM)</p>
                  <p className="font-data-mono text-base text-on-surface">{latestRatio?.pe ? latestRatio.pe.toFixed(2) : "-"}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                  <p className="text-on-surface-variant text-body-sm mb-1">ROE</p>
                  <p className="font-data-mono text-base text-on-surface">{formatPercentage(latestRatio?.roe)}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                  <p className="text-on-surface-variant text-body-sm mb-1">ROCE</p>
                  <p className="font-data-mono text-base text-on-surface">{formatPercentage(latestRatio?.roce)}</p>
                </div>
              </div>

              {/* Financials Tab grid details */}
              <div className="glass-panel rounded-xl overflow-hidden">
                <div className="flex border-b border-outline-variant bg-surface-container">
                  <button
                    onClick={() => setActiveTab('financials')}
                    className={`px-6 py-3.5 text-xs font-bold border-b-2 uppercase tracking-wider ${
                      activeTab === 'financials'
                        ? 'border-indigo-500 text-white'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Financial Statements
                  </button>
                  <button
                    onClick={() => setActiveTab('ratios')}
                    className={`px-6 py-3.5 text-xs font-bold border-b-2 uppercase tracking-wider ${
                      activeTab === 'ratios'
                        ? 'border-indigo-500 text-white'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Key Ratios
                  </button>
                </div>

                <div className="p-6 overflow-x-auto">
                  {!fundamentals || fundamentals.statements.length === 0 ? (
                    <p className="text-xs text-on-surface-variant italic py-4">No records loaded.</p>
                  ) : activeTab === 'financials' ? (
                    <table className="w-full text-left border-collapse min-w-[500px] text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="pb-3">Line Item</th>
                          {fundamentals.statements.map((s: any) => (
                            <th key={s.id} className="pb-3 text-right">
                              {new Date(s.report_date).getFullYear()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        <tr>
                          <td className="py-2.5 font-semibold text-slate-300">Revenue</td>
                          {fundamentals.statements.map((s: any) => <td key={s.id} className="py-2.5 text-right font-mono">{formatCrores(s.revenue)}</td>)}
                        </tr>
                        <tr>
                          <td className="py-2.5 font-semibold text-slate-300">Net Profit (PAT)</td>
                          {fundamentals.statements.map((s: any) => <td key={s.id} className="py-2.5 text-right font-mono">{formatCrores(s.net_profit)}</td>)}
                        </tr>
                        <tr>
                          <td className="py-2.5 font-semibold text-slate-300">Equity</td>
                          {fundamentals.statements.map((s: any) => <td key={s.id} className="py-2.5 text-right font-mono">{formatCrores(s.equity)}</td>)}
                        </tr>
                        <tr>
                          <td className="py-2.5 font-semibold text-slate-300">Free Cashflow</td>
                          {fundamentals.statements.map((s: any) => <td key={s.id} className="py-2.5 text-right font-mono">{formatCrores(s.free_cashflow)}</td>)}
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[500px] text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="pb-3">Ratio</th>
                          {fundamentals.ratios.map((r: any) => (
                            <th key={r.id} className="pb-3 text-right">
                              {new Date(r.report_date).getFullYear()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        <tr>
                          <td className="py-2.5 font-semibold text-slate-300">ROE</td>
                          {fundamentals.ratios.map((r: any) => <td key={r.id} className="py-2.5 text-right font-mono">{formatPercentage(r.roe)}</td>)}
                        </tr>
                        <tr>
                          <td className="py-2.5 font-semibold text-slate-300">ROCE</td>
                          {fundamentals.ratios.map((r: any) => <td key={r.id} className="py-2.5 text-right font-mono">{formatPercentage(r.roce)}</td>)}
                        </tr>
                        <tr>
                          <td className="py-2.5 font-semibold text-slate-300">Debt to Equity</td>
                          {fundamentals.ratios.map((r: any) => <td key={r.id} className="py-2.5 text-right font-mono">{r.debt_equity?.toFixed(2) || "-"}</td>)}
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

            {/* Right Sidebar (Analyst/About) (4 cols) */}
            <div className="lg:col-span-4 space-y-gutter">
              
              {/* Analyst gauge card */}
              <div className="glass-panel p-6 rounded-xl">
                <h3 className="font-title-sm text-title-sm mb-6 flex items-center justify-between text-on-surface text-sm">
                  Analyst Ratings
                  <span className="text-secondary font-body-sm text-xs">Strong Buy</span>
                </h3>
                
                <div className="relative h-32 flex flex-col items-center justify-center">
                  <svg className="w-40 h-24" viewBox="0 0 100 50">
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#2D3748" strokeWidth="8"></path>
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#gradient-gauge)" strokeDasharray="125.6" strokeDashoffset="25" strokeWidth="8"></path>
                    <defs>
                      <linearGradient id="gradient-gauge" x1="0%" x2="100%" y1="0%" y2="0%">
                        <stop offset="0%" style={{ stopColor: '#ffb4ab', stopOpacity: 1 }}></stop>
                        <stop offset="50%" style={{ stopColor: '#dfe2ef', stopOpacity: 1 }}></stop>
                        <stop offset="100%" style={{ stopColor: '#4ae176', stopOpacity: 1 }}></stop>
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute bottom-2 text-center">
                    <p className="font-bold text-secondary text-sm">Strong Buy</p>
                    <p className="text-on-surface-variant text-[10px] mt-0.5">85% Consensus</p>
                  </div>
                </div>
              </div>

              {/* Bio & About card */}
              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h3 className="font-title-sm text-title-sm text-on-surface text-sm border-b border-outline-variant pb-2">About Symbol</h3>
                <p className="text-on-surface-variant text-xs leading-relaxed">
                  Indian stock market index and equity constituents tracked dynamically from corporate filings, balance sheet releases, and daily NSE ticker prices.
                </p>
              </div>

            </div>

          </div>
        )}
      </div>
    </div>
  )
}
