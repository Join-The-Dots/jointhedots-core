import { useState, useEffect } from "react"

export type ThemeMode = "light" | "dark" | "system"

const THEME_STORAGE_KEY = "llm-agent-theme"

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    // Get saved theme or default to system
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return (saved as ThemeMode) || "system"
  })

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (themeMode === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    }
    return themeMode === "dark"
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    
    const updateTheme = () => {
      let shouldBeDark: boolean
      
      if (themeMode === "system") {
        shouldBeDark = mediaQuery.matches
      } else {
        shouldBeDark = themeMode === "dark"
      }
      
      setIsDark(shouldBeDark)
      
      // Update document data-theme attribute
      document.documentElement.setAttribute(
        "data-theme", 
        themeMode === "system" ? (shouldBeDark ? "dark" : "light") : themeMode
      )
    }

    updateTheme()

    // Listen for system theme changes when in system mode
    if (themeMode === "system") {
      mediaQuery.addEventListener("change", updateTheme)
      return () => mediaQuery.removeEventListener("change", updateTheme)
    }
  }, [themeMode])

  const setTheme = (newTheme: ThemeMode) => {
    setThemeMode(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  }

  const toggleTheme = () => {
    if (themeMode === "system") {
      // If system, switch to opposite of current system preference
      const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setTheme(systemIsDark ? "light" : "dark")
    } else if (themeMode === "light") {
      setTheme("dark")
    } else {
      setTheme("light")
    }
  }

  const cycleTheme = () => {
    if (themeMode === "light") {
      setTheme("dark")
    } else if (themeMode === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  return {
    themeMode,
    isDark,
    setTheme,
    toggleTheme,
    cycleTheme,
  }
}