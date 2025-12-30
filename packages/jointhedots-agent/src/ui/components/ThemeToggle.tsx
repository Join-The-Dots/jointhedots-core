import React from "react"
import { useTheme } from "../hooks/useTheme.ts"

export const ThemeToggle: React.FC = () => {
  const { themeMode, cycleTheme } = useTheme()

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return '☀️'
      case 'dark':
        return '🌙'
      case 'system':
        return '💻'
      default:
        return '☀️'
    }
  }

  const getTooltipText = () => {
    return `Current: ${themeMode} theme. Click to cycle through light → dark → system`
  }

  return (
    <div className="theme-toggle">
      <button
        onClick={cycleTheme}
        className="btn icon"
        title={getTooltipText()}
        aria-label={`Switch theme (current: ${themeMode})`}
      >
        <span className="theme-icon">
          {getThemeIcon()}
        </span>
      </button>
    </div>
  )
}