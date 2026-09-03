import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./drawer";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}

// A proper mobile bottom sheet (Vaul drawer, swipe-to-dismiss, drag handle)
// on phones and a centered dialog on desktop, instead of one dialog markup
// shrunk down with cramped padding for both. Used for the Analytics detail
// view and the Escrow breakdown - the two spots on the seller dashboard
// that were previously a fixed-size modal regardless of viewport.
export const ResponsiveModal = ({
  open,
  onOpenChange,
  title,
  children,
  contentClassName,
}: ResponsiveModalProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="border-flora-ink/10 bg-flora-card">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg font-bold text-flora-ink">{title}</DrawerTitle>
          </DrawerHeader>
          <div className={cn("max-h-[70vh] overflow-y-auto px-4 pb-6", contentClassName)}>
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-flora-ink/10 bg-flora-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-flora-ink">{title}</DialogTitle>
        </DialogHeader>
        <div className={contentClassName}>{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export default ResponsiveModal;
