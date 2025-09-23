import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")
    
    // Force light mode as default, ignore system preference unless explicitly set
    if (theme === "system") {
      root.classList.add("light")
      root.style.colorScheme = "light"
      return
    }

    root.classList.add(theme)
    
    // Override any browser auto dark mode - Phoenix browser fix
    root.style.colorScheme = theme === "dark" ? "dark" : "light"
    
    // Bypass browser default mode completely
    root.style.setProperty("color-scheme", "none", "important")
    document.body.style.setProperty("color-scheme", "none", "important")
    
    if (theme === "light") {
      root.style.setProperty("background-color", "white", "important")
      document.body.style.setProperty("background-color", "white", "important")
    } else {
      root.style.setProperty("background-color", "hsl(140 25% 8%)", "important")
      document.body.style.setProperty("background-color", "hsl(140 25% 8%)", "important")
    }
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}