import React from 'react'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { StrategyBuilder } from './pages/StrategyBuilder'
import { BacktestResults } from './pages/BacktestResults'
import { CompanyExplorer } from './pages/CompanyExplorer'
import { useBacktestStore } from './store/backtestStore'

const App: React.FC = () => {
  const { activePage } = useBacktestStore()

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />
      case 'builder':
        return <StrategyBuilder />
      case 'results':
        return <BacktestResults />
      case 'explorer':
        return <CompanyExplorer />
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout>
      {renderPage()}
    </Layout>
  )
}

export default App
