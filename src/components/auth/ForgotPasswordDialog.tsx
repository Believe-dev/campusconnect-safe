import { useState } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle } from 'lucide-react';

interface ForgotPasswordDialogProps {
  children: React.ReactNode;
}

export const ForgotPasswordDialog = ({ children }: ForgotPasswordDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const handleForgotPassword = () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    const message = `Hi UniMarket Support,\n\nI need help resetting my password for my account.\n\nEmail: ${email}\n\nPlease assist me with password reset instructions.\n\nThank you!`;
    const whatsappUrl = `https://wa.me/2349133054018?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');

    toast({
      title: "WhatsApp Opened",
      description: "Send the message to our support team for password reset help",
    });

    setEmail('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-flora-ink">
            <MessageCircle className="h-5 w-5 text-flora-leaf" />
            Forgot Password
          </DialogTitle>
          <DialogDescription className="text-flora-muted">
            Enter your email address and we'll help you reset your password via WhatsApp support.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-sm font-medium text-flora-ink">
              Email Address
            </Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="h-12 w-full rounded-2xl border border-flora-ink/10 bg-white px-3 text-sm text-flora-ink placeholder:text-flora-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flora-leaf/30 focus-visible:border-flora-leaf"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="h-11 rounded-full border border-flora-ink/20 bg-white text-flora-ink font-semibold transition hover:bg-flora-chip hover:text-flora-ink"
          >
            Cancel
          </Button>
          <Button
            variant="ghost"
            onClick={handleForgotPassword}
            className="h-11 rounded-full bg-flora-ink text-white font-semibold shadow-card transition hover:bg-flora-ink hover:brightness-110 hover:text-white"
          >
            Contact Support
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
