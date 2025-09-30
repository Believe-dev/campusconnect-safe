import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    // Persist theme preference
    localStorage.setItem('theme-preference', newTheme);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="h-8 px-3 gap-2 flex items-center justify-center"
    >
      <div className="relative flex items-center justify-center w-4 h-4">
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" />
        <Moon className="h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
      </div>
      <span className="text-xs font-medium">
        {theme === "light" ? "Dark Mode" : "Light Mode"}
      </span>
    </Button>
  )
}