import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export function ThemeDetectionModal() {
  const [open, setOpen] = useState(false)
  const { setTheme } = useTheme()

  useEffect(() => {
    const hasSeenModal = localStorage.getItem("theme-detection-seen")
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    
    if (!hasSeenModal && systemPrefersDark) {
      setOpen(true)
    }
  }, [])

  const handleChoice = (choice: "dark" | "light") => {
    setTheme(choice)
    localStorage.setItem("theme-detection-seen", "true")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Dark Mode Detected
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We detected dark mode for your device. Do you want to switch to dark mode or stay on light mode?
          </p>
          <div className="flex gap-3">
            <Button 
              onClick={() => handleChoice("dark")} 
              className="flex-1 flex items-center gap-2"
            >
              <Moon className="h-4 w-4" />
              Switch to Dark
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleChoice("light")} 
              className="flex-1 flex items-center gap-2"
            >
              <Sun className="h-4 w-4" />
              Stay Light
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}