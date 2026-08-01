import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { useThemeStore } from './theme-store'

interface AccentColorState {
  /** Hex color, or `null` to use the app's default purple accent from index.css. */
  accentColor: string | null
  setAccentColor: (hex: string) => void
  resetAccentColor: () => void
}

/** Extracts just the hue (0-360) from a hex color — saturation/lightness stay fixed
 *  per design so any chosen color keeps the same contrast/readability. */
function hexToHue(hex: string): number {
  const clean = hex.replace('#', '')
  const r = Number.parseInt(clean.slice(0, 2), 16) / 255
  const g = Number.parseInt(clean.slice(2, 4), 16) / 255
  const b = Number.parseInt(clean.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return 0

  let h: number
  if (max === r) h = ((g - b) / delta) % 6
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4
  h = Math.round(h * 60)
  return h < 0 ? h + 360 : h
}

type VarTemplate = Record<string, (hue: number) => string>

const LIGHT_TEMPLATE: VarTemplate = {
  '--primary': (h) => `${h} 83% 58%`,
  '--ring': (h) => `${h} 83% 58%`,
  '--accent': (h) => `${h} 60% 96%`,
  '--accent-foreground': (h) => `${h} 83% 40%`,
  '--sidebar-accent': (h) => `${h} 60% 96%`,
  '--sidebar-accent-foreground': (h) => `${h} 83% 40%`,
}

const DARK_TEMPLATE: VarTemplate = {
  '--primary': (h) => `${h} 83% 66%`,
  '--ring': (h) => `${h} 83% 66%`,
  '--accent': (h) => `${h} 40% 20%`,
  '--accent-foreground': (h) => `${h} 83% 82%`,
  '--sidebar-accent': (h) => `${h} 40% 20%`,
  '--sidebar-accent-foreground': (h) => `${h} 83% 82%`,
}

const ALL_VAR_NAMES = Object.keys(LIGHT_TEMPLATE)

function applyAccentColor(hex: string | null) {
  const root = document.documentElement
  if (!hex) {
    for (const name of ALL_VAR_NAMES) root.style.removeProperty(name)
    return
  }
  const hue = hexToHue(hex)
  const template = useThemeStore.getState().theme === 'dark' ? DARK_TEMPLATE : LIGHT_TEMPLATE
  for (const [name, toValue] of Object.entries(template)) {
    root.style.setProperty(name, toValue(hue))
  }
}

export const useAccentColorStore = create<AccentColorState>()(
  persist(
    (set) => ({
      accentColor: null,
      setAccentColor: (hex) => {
        applyAccentColor(hex)
        set({ accentColor: hex })
      },
      resetAccentColor: () => {
        applyAccentColor(null)
        set({ accentColor: null })
      },
    }),
    {
      name: 'workspace-accent-color',
      onRehydrateStorage: () => (state) => {
        if (state?.accentColor) applyAccentColor(state.accentColor)
      },
    },
  ),
)

// The CSS variable overrides above are theme-specific (light/dark use different
// saturation/lightness), so re-apply the chosen hue whenever the theme flips —
// otherwise a custom accent set in light mode would keep light-mode values after
// switching to dark.
useThemeStore.subscribe((state, prevState) => {
  if (state.theme === prevState.theme) return
  const accentColor = useAccentColorStore.getState().accentColor
  if (accentColor) applyAccentColor(accentColor)
})
