import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-2xl group-[.toaster]:bg-white group-[.toaster]:text-flora-ink group-[.toaster]:border-flora-ink/10 group-[.toaster]:shadow-floating dark:group-[.toaster]:bg-gray-800",
          description: "group-[.toast]:text-flora-muted",
          actionButton:
            "group-[.toast]:rounded-full group-[.toast]:bg-flora-ink group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:rounded-full group-[.toast]:bg-flora-chip group-[.toast]:text-flora-ink",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
