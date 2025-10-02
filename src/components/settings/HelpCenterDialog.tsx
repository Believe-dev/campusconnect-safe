import { useState } from "react";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, MessageCircle, Book, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface GuideCardProps {
  title: string;
  description: string;
  content: string;
}

const GuideCard = ({ title, description, content }: GuideCardProps) => {
  const [showContent, setShowContent] = useState(false);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      
      {!showContent ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowContent(true)}
        >
          <Book className="h-4 w-4 mr-2" />
          Read Guide
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="max-h-96 overflow-y-auto p-3 bg-muted/30 rounded text-sm whitespace-pre-line">
            {content}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowContent(false)}
          >
            Close Guide
          </Button>
        </div>
      )}
    </div>
  );
};

interface HelpCenterDialogProps {
  children: React.ReactNode;
}

export const HelpCenterDialog = ({ children }: HelpCenterDialogProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contactForm, setContactForm] = useState({ subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const faqs = [
    {
      question: "How do I create an account?",
      answer:
        "Click 'Sign Up' and choose between Buyer or Seller account. Sellers need university email and student ID verification.",
    },
    {
      question: "How do I verify my student status?",
      answer:
        "Upload your student ID card in your profile settings. Admin will review and approve within 24-48 hours.",
    },
    {
      question: "How do I list an item for sale?",
      answer:
        "Go to 'Sell Item', add photos, description, price, and category. Your listing will be live after approval.",
    },
    {
      question: "How do payments work?",
      answer:
        "UniMarket facilitates secure transactions. Buyers pay through the platform, sellers receive payment after delivery confirmation.",
    },
    {
      question: "What if I have issues with a transaction?",
      answer:
        "Contact our support team immediately. We have dispute resolution processes to protect both buyers and sellers.",
    },
    {
      question: "How do I enable two-factor authentication?",
      answer:
        "Go to Settings > Account Settings > Two-Factor Authentication. Scan the QR code with your authenticator app.",
    },
    {
      question: "Can I change my university?",
      answer:
        "Contact support with your new student ID. University changes require admin approval for security reasons.",
    },
    {
      question: "How do I report suspicious activity?",
      answer:
        "Use the report button on any listing or profile, or contact support directly via WhatsApp or email.",
    },
  ];

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStartedGuide = `Welcome to CampusConnect! 🎓

1. ACCOUNT SETUP
   • Sign up with your university email
   • Choose account type: Buyer or Seller
   • Verify your student status with ID upload
   • Complete your profile with photo and details

2. BROWSING PRODUCTS
   • Use the search bar to find specific items
   • Filter by category, price, campus, condition
   • View product details, photos, and seller info
   • Check seller ratings and verification status

3. MAKING PURCHASES
   • Add items to cart or message seller directly
   • Use secure checkout with escrow protection
   • Track your orders in the Orders page
   • Leave reviews after successful transactions

4. GETTING VERIFIED
   • Upload clear student ID photo
   • Wait for admin approval (24-48 hours)
   • Verified users get trust badges
   • Higher visibility in search results

5. STAYING SAFE
   • Only deal with verified students
   • Meet in public campus locations
   • Use the built-in messaging system
   • Report suspicious activity immediately

Need help? Contact support via WhatsApp!`;

  const sellerGuide = `Seller's Handbook 📦

1. BECOMING A SELLER
   • Switch to seller account in settings
   • Upload student ID for verification
   • Wait for admin approval
   • Set up your seller profile

2. LISTING PRODUCTS
   • Go to "Sell Item" in navigation
   • Add high-quality photos (up to 5)
   • Write detailed, honest descriptions
   • Set competitive prices
   • Choose appropriate category and condition

3. MANAGING INVENTORY
   • Update stock quantities regularly
   • Mark items as sold when appropriate
   • Edit listings to improve visibility
   • Remove outdated listings

4. COMMUNICATION
   • Respond to messages promptly
   • Be professional and courteous
   • Provide accurate product information
   • Arrange safe meetup locations

5. PAYMENTS & WALLET
   • Receive payments through escrow system
   • Funds released after buyer confirmation
   • Request payouts to your bank account
   • Track earnings in wallet dashboard

6. BUILDING REPUTATION
   • Maintain high seller ratings
   • Provide excellent customer service
   • Ship/deliver items promptly
   • Resolve issues professionally

Tips for Success:
• Take clear, well-lit photos
• Price competitively
• Respond quickly to inquiries
• Be honest about item condition`;

  const safetyGuide = `Safety & Security Guide 🛡️

1. ACCOUNT SECURITY
   • Use strong, unique passwords
   • Enable two-factor authentication
   • Never share login credentials
   • Log out on shared devices

2. SAFE TRANSACTIONS
   • Only buy from verified sellers
   • Use the platform's escrow system
   • Never send money outside the platform
   • Keep transaction records

3. MEETING SAFELY
   • Meet in public campus locations
   • Bring a friend if possible
   • Meet during daylight hours
   • Trust your instincts

4. COMMUNICATION SAFETY
   • Use the built-in messaging system
   • Don't share personal information early
   • Be wary of urgent payment requests
   • Screenshot important conversations

5. RED FLAGS TO AVOID
   • Prices too good to be true
   • Requests for immediate payment
   • Sellers avoiding verification
   • Pressure to meet in private locations
   • Requests to communicate off-platform

6. REPORTING ISSUES
   • Use the report button on listings
   • Contact support immediately
   • Provide screenshots as evidence
   • Block problematic users

7. DISPUTE RESOLUTION
   • Try to resolve issues directly first
   • Use the dispute system if needed
   • Provide clear evidence
   • Follow admin guidance

Remember: Your safety is our priority!
When in doubt, contact support.`;

  const walletGuide = `Wallet & Payments Guide 💰

1. UNDERSTANDING YOUR WALLET
   • View balance in Wallet page
   • Track all transactions
   • See pending and completed payments
   • Monitor escrow transactions

2. ESCROW SYSTEM
   • Buyer pays into escrow when ordering
   • Funds held securely until delivery
   • Seller gets paid after confirmation
   • Automatic release after 7 days

3. MAKING PAYMENTS
   • Add items to cart
   • Proceed to secure checkout
   • Pay with card or bank transfer
   • Funds held in escrow protection

4. RECEIVING PAYMENTS (SELLERS)
   • Payments appear in wallet after delivery
   • Commission deducted automatically
   • Request payout to bank account
   • Processing takes 1-3 business days

5. PAYOUT PROCESS
   • Go to Wallet > Request Payout
   • Enter bank account details
   • Minimum payout: ₦1,000
   • Admin approval required

6. TRANSACTION FEES
   • 5% commission on sales
   • No fees for buyers
   • Payout processing fees may apply
   • Transparent fee structure

7. REFUNDS & DISPUTES
   • Refunds processed through escrow
   • Dispute resolution affects payments
   • Admin can release or refund funds
   • Keep transaction evidence

8. WALLET SECURITY
   • Monitor transactions regularly
   • Report unauthorized activity
   • Verify payout bank details
   • Keep receipts for tax purposes

Need help with payments? Contact support!`;

  const messagingGuide = `Messaging & Communication Guide 💬

1. STARTING CONVERSATIONS
   • Click "Message Seller" on product pages
   • Use pre-filled templates for quick inquiries
   • Be clear about your interest
   • Ask relevant questions

2. EFFECTIVE COMMUNICATION
   • Be polite and professional
   • Respond promptly to messages
   • Ask specific questions about products
   • Confirm meeting details clearly

3. MESSAGE FEATURES
   • Real-time messaging
   • Message status indicators
   • Photo sharing capabilities
   • Conversation history

4. CONVERSATION MANAGEMENT
   • All conversations in Messages page
   • Search through message history
   • Mark important conversations
   • Delete unwanted conversations

5. BEST PRACTICES
   • Keep conversations on-platform
   • Be specific about requirements
   • Confirm availability before meeting
   • Share location details safely

6. WHAT TO DISCUSS
   • Product condition and details
   • Price negotiations (if applicable)
   • Meeting location and time
   • Payment method confirmation

7. AVOIDING SCAMS
   • Don't share personal banking info
   • Avoid urgent payment requests
   • Be wary of too-good deals
   • Report suspicious behavior

8. NOTIFICATION SETTINGS
   • Enable push notifications
   • Set quiet hours if needed
   • Customize notification sounds
   • Manage email notifications

Tips:
• Use clear, concise language
• Be patient with responses
• Keep conversations friendly
• Screenshot important details`;

  const handleContactSubmit = () => {
    if (!contactForm.subject || !contactForm.message) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const whatsappMessage = `Hello UniMarket Support,

Subject: ${contactForm.subject}

Message: ${contactForm.message}

User Details:
- Email: ${user?.email || "N/A"}
- Account ID: ${user?.id || "N/A"}

Please assist me with this inquiry.

Thank you.`;

    const whatsappUrl = `https://wa.me/2349133054018?text=${encodeURIComponent(
      whatsappMessage
    )}`;
    window.open(whatsappUrl, "_blank");

    toast({
      title: "Redirecting to WhatsApp",
      description: "Opening WhatsApp with your message pre-filled",
    });

    setContactForm({ subject: "", message: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Help Center
          </DialogTitle>
          <DialogDescription>
            Find answers to common questions or contact our support team
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="faq" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-fit">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="guides">Guides</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
          </TabsList>

          <TabsContent value="faq" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search FAQs</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search for answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Accordion type="single" collapsible className="space-y-2">
              {filteredFAQs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {filteredFAQs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No FAQs found matching your search.
              </div>
            )}
          </TabsContent>

          <TabsContent value="guides" className="space-y-4">
            <div className="grid gap-4">
              <GuideCard 
                title="Getting Started Guide"
                description="Complete guide for new users on CampusConnect"
                content={getStartedGuide}
              />
              <GuideCard 
                title="Seller's Handbook"
                description="Best practices for selling on CampusConnect"
                content={sellerGuide}
              />
              <GuideCard 
                title="Safety & Security"
                description="How to stay safe while buying and selling"
                content={safetyGuide}
              />
              <GuideCard 
                title="Wallet & Payments"
                description="Understanding payments, escrow, and payouts"
                content={walletGuide}
              />
              <GuideCard 
                title="Messaging & Communication"
                description="How to communicate effectively with buyers/sellers"
                content={messagingGuide}
              />
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={contactForm.subject}
                  onChange={(e) =>
                    setContactForm((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Describe your issue in detail..."
                  value={contactForm.message}
                  onChange={(e) =>
                    setContactForm((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  rows={4}
                />
              </div>

              <Button onClick={handleContactSubmit} className="w-full">
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Support via WhatsApp
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <p>Response time: Usually within 2-4 hours</p>
                <p className="mt-1">Emergency support: Available 24/7</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
