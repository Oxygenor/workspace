import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      setTheme: (theme) => {
        applyThemeClass(theme)
        set({ theme })
      },
      toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        applyThemeClass(next)
        set({ theme: next })
      },
    }),
    {
      name: 'workspace-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeClass(state.theme)
        }
      },
    },
  ),
)
