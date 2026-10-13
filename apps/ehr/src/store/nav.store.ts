import { create } from 'zustand';
import type { NavTab } from '@careconnect/types';

interface NavState {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const useNavStore = create<NavState>((set) => ({
  activeTab: 'Tracking Board',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

interface FilterState {
  location: string;
  provider: string;
  setLocation: (location: string) => void;
  setProvider: (provider: string) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  location: 'all',
  provider: 'all',
  setLocation: (location) => set({ location }),
  setProvider: (provider) => set({ provider }),
}));
