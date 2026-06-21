import { create } from 'zustand'

export type ActivePage = 'dashboard' | 'builder' | 'results' | 'explorer';

interface BacktestStore {
  activePage: ActivePage;
  selectedBacktestId: number | null;
  activeBacktest: any | null;
  backtestList: any[];
  selectedSymbol: string | null;
  
  setActivePage: (page: ActivePage) => void;
  setSelectedBacktestId: (id: number | null) => void;
  setActiveBacktest: (backtest: any | null) => void;
  setBacktestList: (list: any[]) => void;
  setSelectedSymbol: (symbol: string | null) => void;
}

export const useBacktestStore = create<BacktestStore>((set) => ({
  activePage: 'dashboard',
  selectedBacktestId: null,
  activeBacktest: null,
  backtestList: [],
  selectedSymbol: 'RELIANCE.NS',
  
  setActivePage: (page) => set({ activePage: page }),
  setSelectedBacktestId: (id) => set({ selectedBacktestId: id }),
  setActiveBacktest: (backtest) => set({ activeBacktest: backtest }),
  setBacktestList: (list) => set({ backtestList: list }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
}))
