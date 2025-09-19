import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-lift micro-bounce active:scale-95 hover:shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        
        // UniMarket specific variants
        brand: "gradient-brand text-primary-foreground shadow-brand hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 font-semibold",
        success: "bg-gradient-to-r from-success to-success/90 text-success-foreground shadow-success hover:from-success/90 hover:to-success hover:shadow-lg",
        warning: "bg-gradient-to-r from-warning to-warning/90 text-warning-foreground shadow hover:from-warning/90 hover:to-warning hover:shadow-md",
        accent: "bg-gradient-to-r from-accent to-accent/90 text-accent-foreground shadow hover:from-accent/90 hover:to-accent hover:shadow-md",
        verified: "bg-gradient-to-r from-verified-blue to-verified-blue/90 text-white shadow hover:from-verified-blue/90 hover:to-verified-blue hover:shadow-lg",
        trust: "bg-success/10 text-success border border-success/20 hover:bg-success/20 hover:border-success/30 hover:shadow-sm",
        marketplace: "bg-gradient-to-r from-university-green to-university-green/90 text-white shadow-brand hover:from-university-green/90 hover:to-university-green hover:shadow-lg hover:-translate-y-0.5",
        seller: "bg-gradient-to-r from-university-gold to-university-gold/90 text-foreground shadow hover:from-university-gold/90 hover:to-university-gold hover:shadow-md",
        buyer: "bg-gradient-to-r from-primary-muted to-primary-muted/90 text-primary hover:from-primary-muted/90 hover:to-primary-muted hover:shadow-sm",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }