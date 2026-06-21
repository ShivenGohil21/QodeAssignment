import React from 'react'
import { useBacktestStore, ActivePage } from '../store/backtestStore'

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { activePage, setActivePage } = useBacktestStore()

  const navItems = [
    { id: 'dashboard' as ActivePage, label: 'Dashboard', icon: 'dashboard' },
    { id: 'builder' as ActivePage, label: 'Strategy', icon: 'architecture' },
    { id: 'results' as ActivePage, label: 'Backtesting', icon: 'analytics' },
    { id: 'explorer' as ActivePage, label: 'Explorer', icon: 'explore' },
  ]

  return (
    <div className="bg-background text-on-background font-body-md overflow-hidden h-screen flex">
      {/* SideNavBar */}
      <aside className="bg-surface dark:bg-surface border-r border-outline-variant dark:border-outline-variant h-screen w-64 left-0 top-0 flex flex-col py-gutter fixed z-[60]">
        <div className="px-gutter mb-8">
          <h1 className="font-display-lg text-display-lg font-bold text-primary dark:text-primary tracking-tighter">
            ProTrader
          </h1>
          <p className="text-on-surface-variant font-label-caps uppercase tracking-widest text-[10px]">Terminal v2.1</p>
        </div>

        <nav className="flex-grow space-y-1">
          {navItems.map((item) => {
            const isActive = activePage === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`group flex items-center w-full px-gutter py-3 transition-colors duration-200 text-left ${
                  isActive 
                    ? 'text-primary dark:text-primary font-bold border-r-2 border-primary bg-surface-variant/30' 
                    : 'text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-variant dark:hover:bg-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined mr-3">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto px-4 space-y-1">
          <button className="group flex items-center w-full py-2 px-3 text-left transition-colors duration-200 text-on-surface-variant dark:text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30 rounded">
            <span className="material-symbols-outlined mr-3 text-[20px]">help</span>
            <span className="text-body-sm font-body-sm">Help</span>
          </button>
          <button className="group flex items-center w-full py-2 px-3 text-left transition-colors duration-200 text-on-surface-variant dark:text-on-surface-variant hover:text-error hover:bg-surface-variant/30 rounded">
            <span className="material-symbols-outlined mr-3 text-[20px]">logout</span>
            <span className="text-body-sm font-body-sm">Logout</span>
          </button>
          <div className="flex items-center gap-3 px-3 py-4 border-t border-outline-variant mt-4">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
              <span className="text-on-primary-container text-[10px] font-bold">JD</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-body-sm font-bold truncate">John Doe</span>
              <span className="text-[10px] text-on-surface-variant truncate">Premium Account</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        {/* Content Canvas */}
        <div className="flex-1 overflow-y-auto bg-background flex flex-col relative h-[calc(100vh-2.5rem)]">
          {children}
        </div>

        {/* Fixed Footer */}
        <footer className="bg-surface-container-lowest dark:bg-surface-container-lowest border-t border-outline-variant dark:border-outline-variant h-10 flex items-center justify-between px-gutter z-40 flex-shrink-0">
          <div className="flex items-center space-x-6">
            <span className="font-label-caps text-label-caps text-on-surface-variant">PROTRADER © 2026</span>
            <span className="font-data-mono text-[10px] text-secondary flex items-center">
              <span className="w-2 h-2 bg-secondary rounded-full mr-2 animate-pulse"></span>
              SYSTEMS ONLINE
            </span>
            <span className="font-data-mono text-[10px] text-on-surface-variant">MARKET DATA DELAYED 15M.</span>
          </div>
          <div className="flex items-center space-x-6 font-data-mono text-data-mono text-on-surface-variant">
            <a className="hover:text-secondary transition-opacity duration-200" href="#">Terms</a>
            <a className="hover:text-secondary transition-opacity duration-200" href="#">Privacy</a>
            <a className="hover:text-secondary transition-opacity duration-200" href="#">API Docs</a>
            <a className="hover:text-secondary transition-opacity duration-200" href="#">Support</a>
          </div>
        </footer>
      </div>
    </div>
  )
}
