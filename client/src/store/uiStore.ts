import { create } from 'zustand';

interface UIState {
  isLoading: boolean;
  isSidebarOpen: boolean;
  currentModal: string | null;
  
  // Actions
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isLoading: false,
  isSidebarOpen: true,
  currentModal: null,

  setLoading: (loading) => set({ isLoading: loading }),
  
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  
  openModal: (modalId) => set({ currentModal: modalId }),
  
  closeModal: () => set({ currentModal: null }),
}));
