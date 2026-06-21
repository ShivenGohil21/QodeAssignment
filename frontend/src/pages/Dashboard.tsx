import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useBacktestStore } from '../store/backtestStore'

const API_BASE = "http://localhost:8000"

export const Dashboard: React.FC = () => {
  const { setActivePage, setSelectedBacktestId, backtestList, setBacktestList, setSelectedSymbol } = useBacktestStore()
  const [companiesCount, setCompaniesCount] = useState(0)
  const [ingestStatus, setIngestStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [ingesting, setIngesting] = useState(false)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const compRes = await axios.get(`${API_BASE}/companies`)
      setCompaniesCount(compRes.data.length)
      
      const btRes = await axios.get(`${API_BASE}/backtests`)
      setBacktestList(btRes.data)
      
      const ingRes = await axios.get(`${API_BASE}/ingestion/status`)
      setIngestStatus(ingRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/ingestion/status`)
        setIngestStatus(res.data)
        if (res.data.status === "running") {
          setIngesting(true)
        } else {
          setIngesting(false)
        }
      } catch (e) {
        console.error(e)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const triggerIngestion = async () => {
    try {
      setIngesting(true)
      await axios.post(`${API_BASE}/ingestion/trigger`)
      const res = await axios.get(`${API_BASE}/ingestion/status`)
      setIngestStatus(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const deleteBacktest = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this backtest?")) return
    try {
      await axios.delete(`${API_BASE}/backtests/${id}`)
      setBacktestList(backtestList.filter(bt => bt.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleSelectBacktest = (id: number) => {
    setSelectedBacktestId(id)
    setActivePage('results')
  }

  // Calculate stats
  const latestBacktest = backtestList.length > 0 ? backtestList[0] : null
  const displayCapital = latestBacktest ? `₹${(latestBacktest.initial_capital).toLocaleString('en-IN')}` : "₹1,000,000"

  return (
    <div className="p-gutter space-y-gutter pb-16 flex-1 overflow-y-auto">
      
      {/* Hero Section: Portfolio Value */}
      <section className="glass-panel rounded-xl overflow-hidden relative min-h-[260px] flex flex-col">
        <div className="p-6 flex justify-between items-start z-10">
          <div>
            <h2 className="text-on-surface-variant font-label-caps tracking-widest mb-1 text-[11px]">DEMO TERMINAL PORTFOLIO</h2>
            <div className="flex items-baseline space-x-3">
              <span className="text-display-lg font-display-lg text-on-surface">{displayCapital}</span>
              <span className="text-secondary font-data-mono flex items-center text-xs">
                <span className="material-symbols-outlined text-[16px] mr-1">trending_up</span>
                +14.2% (Active)
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={fetchDashboardData}
              className="px-3 py-1 text-body-sm font-medium bg-surface-variant text-on-surface rounded border border-outline-variant hover:bg-slate-700 transition-colors"
            >
              Sync
            </button>
            <button 
              onClick={() => setActivePage('builder')}
              className="px-3 py-1 text-body-sm font-medium bg-primary text-on-primary rounded border border-primary hover:opacity-90 transition-opacity"
            >
              Build Strategy
            </button>
          </div>
        </div>
        
        {/* Abstract Chart Visualization */}
        <div className="absolute inset-0 top-24 pointer-events-none">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4d8eff" stopOpacity={0.15}></stop>
                <stop offset="100%" stopColor="#4d8eff" stopOpacity={0}></stop>
              </linearGradient>
            </defs>
            <path d="M0,150 Q100,120 200,140 T400,80 T600,100 T800,40 T1000,60 L1000,200 L0,200 Z" fill="url(#chartFill)"></path>
            <path d="M0,150 Q100,120 200,140 T400,80 T600,100 T800,40 T1000,60" fill="none" stroke="#adc6ff" strokeLinecap="round" strokeWidth="3"></path>
          </svg>
        </div>
        <div className="mt-auto px-6 pb-4 z-10 flex justify-between text-on-surface-variant text-body-sm font-data-mono text-[10px]">
          <span>JAN 01</span>
          <span>MAR 15</span>
          <span>JUN 20</span>
          <span>SEP 10</span>
          <span>TODAY</span>
        </div>
      </section>

      {/* Grid Layout for Stats and Market Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        
        {/* Left Stats Grid (9 cols) */}
        <div className="lg:col-span-9 space-y-gutter">
          
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
            <div className="glass-panel p-5 rounded-lg border-l-4 border-l-primary">
              <p className="text-on-surface-variant font-label-caps mb-2 text-[10px] tracking-wider">MONITORED STOCKS</p>
              <p className="text-headline-md font-headline-md text-on-surface">{companiesCount} Symbols</p>
            </div>
            
            <div className="glass-panel p-5 rounded-lg border-l-4 border-l-secondary">
              <p className="text-on-surface-variant font-label-caps mb-2 text-[10px] tracking-wider">STRATEGY RUNS</p>
              <p className="text-headline-md font-headline-md text-secondary">{backtestList.length} Saved</p>
            </div>

            <div className="glass-panel p-5 rounded-lg border-l-4 border-l-tertiary col-span-1 sm:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <p className="text-on-surface-variant font-label-caps text-[10px] tracking-wider">YFINANCE INGESTION</p>
                {ingestStatus?.status === "running" && (
                  <span className="text-[10px] text-primary font-mono animate-pulse">
                    ({ingestStatus.progress}% Ingesting...)
                  </span>
                )}
              </div>
              
              {ingestStatus?.status === "running" ? (
                <div className="space-y-2">
                  <div className="w-full bg-slate-800 h-1 rounded overflow-hidden mt-2">
                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${ingestStatus.progress}%` }}></div>
                  </div>
                  <span className="text-[10px] text-on-surface-variant block font-mono">
                    Downloading: {ingestStatus.current_symbol || "Connecting..."}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-body-sm font-semibold capitalize text-on-surface">
                    {ingestStatus?.status || "Ready"} ({ingestStatus?.processed_count || 0} stocks)
                  </span>
                  <button 
                    onClick={triggerIngestion}
                    disabled={ingesting}
                    className="bg-primary-container text-on-primary-container px-3 py-1 rounded text-body-sm font-bold hover:opacity-90 active:scale-95 transition-all"
                  >
                    {ingesting ? "Triggering..." : "Run Load"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Market Intelligence */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">Market Intelligence</h3>
              <span className="text-primary text-body-sm">Indian Equity Screens</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              <div className="group cursor-pointer">
                <div className="relative h-40 rounded-lg overflow-hidden mb-3 border border-outline-variant">
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors z-10"></div>
                  <img 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    alt="skyscrapers"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBg4aVDZXZSYr_eZtfv32A307RLGt--N7hd1EazjIrRj2bfI9ZumNdBj-HnxMRkHvpw9J2EikjXcKlvhhkj6DMUs6fxyKlrC1XYtakHen_o4_C64FQ1zaE8XhfFJdVs-FzsTLK_lDzj3oAiyieeMsUkOfyMNPpbB6Nbar4-Zxqp-cnBbx__6ZlMQ3TKrg_LTTJIYZQZZbGv9GmBGMEkl1oryupWTeOJIQ7A5D08QFfu_iA7-97e1hSGt3ue1Y0E1ItIS-PdubSrCMX2" 
                  />
                  <span className="absolute top-2 left-2 z-20 bg-primary/90 text-on-primary font-label-caps px-2 py-0.5 rounded text-[10px]">ANALYSIS</span>
                </div>
                <h4 className="text-body-md font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                  Nifty 50 Outperformance: Multi-Factor Screening for FY26 Strategies
                </h4>
                <p className="text-body-sm text-on-surface-variant mt-1">12 minutes ago • Mumbai Finance</p>
              </div>

              <div className="group cursor-pointer">
                <div className="relative h-40 rounded-lg overflow-hidden mb-3 border border-outline-variant">
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors z-10"></div>
                  <img 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    alt="trading screen"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwtF7_sza4INPzR4cOAd6UA49hm9A31olh6AbKCQKtsRyI6hDlJuAVePamm-xUr2iQzQ9toApIiGHSmc8XLQKKiNh0ixE-jOIVJxgyoKNa7UgP1vzTEGcY98_GD0F_l1surVyg1gKFzkdTYcfZWhR_9s9e_kXzUKKzB4UYCfFieAqu7ZrEz1bvfihUPo_vCjbd8M8kM-yUSDNJgrkpC67-d2IRJaVBuxYrAZudB5yovPgMMJjSCPRz-qR9_-Dj1D6R-LgKrsdyHiQ6" 
                  />
                  <span className="absolute top-2 left-2 z-20 bg-secondary/90 text-on-secondary font-label-caps px-2 py-0.5 rounded text-[10px]">VALUATION</span>
                </div>
                <h4 className="text-body-md font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                  Evaluating ROCE vs. Cost of Capital in Indian IT Sectors
                </h4>
                <p className="text-body-sm text-on-surface-variant mt-1">1 hour ago • Terminal Analysis</p>
              </div>

              <div className="group cursor-pointer">
                <div className="relative h-40 rounded-lg overflow-hidden mb-3 border border-outline-variant">
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors z-10"></div>
                  <img 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    alt="desk workspace"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFq-MXKky-d2Ml-tQ4bA2SahLhAhB4mec6wQZD7BDCylp6Iy8CsHSPFzfOzBGfl96sh4AivEKNxehdqnNy43iijeOOqihmnBBiydVJM1JAkLmyAR1sUEEgPoN4vvNVx3MoCmoJHR_wSDl72BoEVmqhH6D445tYBD1bYB7sbIOrEgxDRSK9QY6HnRVnCUe788BhinG58Ze8IXXUGHGhAXnZULczGeoGS89tv5uyq0FHxwYODmlqbrX0s9zkQbRl9aSmIssHZPzOB2ay" 
                  />
                  <span className="absolute top-2 left-2 z-20 bg-tertiary/90 text-on-tertiary font-label-caps px-2 py-0.5 rounded text-[10px]">MACRO</span>
                </div>
                <h4 className="text-body-md font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                  FII Flow Rebound: Large Cap Stocks Gaining Momentum in NSE
                </h4>
                <p className="text-body-sm text-on-surface-variant mt-1">3 hours ago • Capital Daily</p>
              </div>
            </div>
          </section>

          {/* Recent Activity Table (Backtest Runs) */}
          <section className="glass-panel rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-title-sm text-title-sm text-on-surface">Recent Strategy Activity</h3>
              <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">filter_list</span>
            </div>
            
            {loading ? (
              <div className="space-y-2 p-6">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-800/40 rounded animate-pulse" />)}
              </div>
            ) : backtestList.length === 0 ? (
              <div className="py-12 text-center text-on-surface-variant text-body-sm italic">
                No strategy runs executed yet. Go to Strategy Builder.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-surface-dim">
                  <tr className="text-on-surface-variant font-label-caps text-[10px]">
                    <th className="px-6 py-3">ASSET / STRATEGY</th>
                    <th className="px-6 py-3">FREQUENCY</th>
                    <th className="px-6 py-3">INITIAL CAPITAL</th>
                    <th className="px-6 py-3">PERIOD</th>
                    <th className="px-6 py-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {backtestList.map((bt) => (
                    <tr 
                      key={bt.id}
                      onClick={() => handleSelectBacktest(bt.id)}
                      className="hover:bg-surface-variant/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-bold text-on-surface">{bt.strategy_name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-primary-container/10 text-primary border border-primary/20 text-[10px] font-bold uppercase">
                          {bt.rebalance_frequency}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-data-mono">₹{(bt.initial_capital).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-xs text-on-surface-variant font-data-mono">
                        {bt.start_date} to {bt.end_date}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => deleteBacktest(bt.id, e)}
                          className="text-error hover:text-red-300 font-bold text-xs p-1"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        {/* Right Watchlist Sidebar (3 cols) */}
        <aside className="lg:col-span-3 h-full">
          <div className="glass-panel rounded-lg h-full">
            <div className="p-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-title-sm text-title-sm text-on-surface">NSE Watchlist</h3>
              <span className="material-symbols-outlined text-primary text-[20px] cursor-pointer">add_circle</span>
            </div>
            <div className="divide-y divide-outline-variant">
              
              {/* Watchlist Item 1 */}
              <div 
                onClick={() => { setSelectedSymbol('RELIANCE.NS'); setActivePage('explorer'); }}
                className="p-4 flex items-center justify-between hover:bg-surface-variant/20 transition-colors cursor-pointer group"
              >
                <div>
                  <p className="font-bold text-on-surface text-sm">RELIANCE</p>
                  <p className="text-[10px] text-on-surface-variant">Reliance Industries</p>
                </div>
                <div className="w-16 h-8">
                  <svg className="w-full h-full stroke-secondary fill-none stroke-2" viewBox="0 0 100 40">
                    <path d="M0,30 L20,25 L40,35 L60,15 L80,20 L100,5"></path>
                  </svg>
                </div>
                <div className="text-right">
                  <p className="font-data-mono text-on-surface text-xs">₹2,505.00</p>
                  <p className="text-[10px] text-secondary">+1.24%</p>
                </div>
              </div>

              {/* Watchlist Item 2 */}
              <div 
                onClick={() => { setSelectedSymbol('TCS.NS'); setActivePage('explorer'); }}
                className="p-4 flex items-center justify-between hover:bg-surface-variant/20 transition-colors cursor-pointer group"
              >
                <div>
                  <p className="font-bold text-on-surface text-sm">TCS</p>
                  <p className="text-[10px] text-on-surface-variant">Tata Consultancy</p>
                </div>
                <div className="w-16 h-8">
                  <svg className="w-full h-full stroke-error fill-none stroke-2" viewBox="0 0 100 40">
                    <path d="M0,5 L20,15 L40,10 L60,30 L80,25 L100,35"></path>
                  </svg>
                </div>
                <div className="text-right">
                  <p className="font-data-mono text-on-surface text-xs">₹3,595.00</p>
                  <p className="text-[10px] text-error">-0.82%</p>
                </div>
              </div>

              {/* Watchlist Item 3 */}
              <div 
                onClick={() => { setSelectedSymbol('INFY.NS'); setActivePage('explorer'); }}
                className="p-4 flex items-center justify-between hover:bg-surface-variant/20 transition-colors cursor-pointer group"
              >
                <div>
                  <p className="font-bold text-on-surface text-sm">INFY</p>
                  <p className="text-[10px] text-on-surface-variant">Infosys Limited</p>
                </div>
                <div className="w-16 h-8">
                  <svg className="w-full h-full stroke-secondary fill-none stroke-2" viewBox="0 0 100 40">
                    <path d="M0,35 L20,20 L40,25 L60,5 L80,10 L100,0"></path>
                  </svg>
                </div>
                <div className="text-right">
                  <p className="font-data-mono text-on-surface text-xs">₹1,420.00</p>
                  <p className="text-[10px] text-secondary">+4.12%</p>
                </div>
              </div>

              {/* Watchlist Item 4 */}
              <div 
                onClick={() => { setSelectedSymbol('HDFCBANK.NS'); setActivePage('explorer'); }}
                className="p-4 flex items-center justify-between hover:bg-surface-variant/20 transition-colors cursor-pointer group"
              >
                <div>
                  <p className="font-bold text-on-surface text-sm">HDFCBANK</p>
                  <p className="text-[10px] text-on-surface-variant">HDFC Bank Ltd</p>
                </div>
                <div className="w-16 h-8">
                  <svg className="w-full h-full stroke-secondary fill-none stroke-2" viewBox="0 0 100 40">
                    <path d="M0,25 L25,20 L50,22 L75,10 L100,15"></path>
                  </svg>
                </div>
                <div className="text-right">
                  <p className="font-data-mono text-on-surface text-xs">₹1,610.00</p>
                  <p className="text-[10px] text-secondary">+0.45%</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-surface-variant/10">
              <button 
                onClick={() => setActivePage('explorer')}
                className="w-full py-2 bg-primary/10 border border-primary/20 text-primary rounded font-bold text-body-sm hover:bg-primary/20 transition-colors"
              >
                Advanced Analysis
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
