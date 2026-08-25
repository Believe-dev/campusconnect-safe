import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/enhanced-button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

interface BannedUserModalProps {
  open: boolean;
  userEmail: string;
  banReason?: string;
}

export const BannedUserModal = ({
  open,
  userEmail,
  banReason,
}: BannedUserModalProps) => {
  const [message, setMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmitAppeal = async () => {
    if (
      !message.trim() ||
      !fullName.trim() ||
      !matricNumber.trim() ||
      !email.trim()
    ) {
      toast({
        title: "Missing Information",
        description:
          "Please fill in all required fields with your banned account details",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("ban_appeals").insert({
        user_email: email,
        full_name: fullName,
        matric_number: matricNumber,
        message: message,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Appeal Submitted",
        description: "Your appeal has been sent to the admin team for review.",
      });

      setMessage("");
      setFullName("");
      setMatricNumber("");
      setEmail("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit appeal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-red-600 flex items-center justify-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Account Banned
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 text-center">
              Your account has been banned from UniMarket.
              {banReason && (
                <>
                  <br />
                  <strong>Reason:</strong> {banReason}
                </>
              )}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Submit an Appeal</h3>
            <p className="text-xs text-muted-foreground">
              Please provide your account details exactly as they appear in your
              banned account.
            </p>

            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <p className="text-xs text-muted-foreground mb-1">
                Enter the full name associated with your banned account
              </p>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name on your banned account"
                required
              />
            </div>

            <div>
              <Label htmlFor="userEmail">Email Address *</Label>
              <p className="text-xs text-muted-foreground mb-1">
                Enter the email address of your banned account
              </p>
              <Input
                id="userEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@university.edu"
                required
              />
            </div>

            <div>
              <Label htmlFor="matricNumber">Matric Number *</Label>
              <p className="text-xs text-muted-foreground mb-1">
                Enter the matric number from your banned account
              </p>
              <Input
                id="matricNumber"
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value)}
                placeholder="e.g., 19/55EC/00123"
                required
              />
            </div>

            <div>
              <Label htmlFor="message">Appeal Message *</Label>
              <p className="text-xs text-muted-foreground mb-1">
                Explain why you believe this ban should be lifted
              </p>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain your situation and why you believe the ban should be reconsidered..."
                rows={4}
                required
              />
            </div>

            <Button
              onClick={handleSubmitAppeal}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Submitting..." : "Submit Appeal"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
