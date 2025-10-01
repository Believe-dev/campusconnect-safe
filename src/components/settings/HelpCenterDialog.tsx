import { useState } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { HelpCircle, MessageCircle, Book, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface HelpCenterDialogProps {
  children: React.ReactNode;
}

export const HelpCenterDialog = ({ children }: HelpCenterDialogProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactForm, setContactForm] = useState({ subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const faqs = [
    {
      question: "How do I create an account?",
      answer: "Click 'Sign Up' and choose between Buyer or Seller account. Sellers need university email and student ID verification."
    },
    {
      question: "How do I verify my student status?",
      answer: "Upload your student ID card in your profile settings. Admin will review and approve within 24-48 hours."
    },
    {
      question: "How do I list an item for sale?",
      answer: "Go to 'Sell Item', add photos, description, price, and category. Your listing will be live after approval."
    },
    {
      question: "How do payments work?",
      answer: "UniMarket facilitates secure transactions. Buyers pay through the platform, sellers receive payment after delivery confirmation."
    },
    {
      question: "What if I have issues with a transaction?",
      answer: "Contact our support team immediately. We have dispute resolution processes to protect both buyers and sellers."
    },
    {
      question: "How do I enable two-factor authentication?",
      answer: "Go to Settings > Account Settings > Two-Factor Authentication. Scan the QR code with your authenticator app."
    },
    {
      question: "Can I change my university?",
      answer: "Contact support with your new student ID. University changes require admin approval for security reasons."
    },
    {
      question: "How do I report suspicious activity?",
      answer: "Use the report button on any listing or profile, or contact support directly via WhatsApp or email."
    }
  ];

  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
- Email: ${user?.email || 'N/A'}
- Account ID: ${user?.id || 'N/A'}

Please assist me with this inquiry.

Thank you.`;

    const whatsappUrl = `https://wa.me/2349133054018?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');

    toast({
      title: "Redirecting to WhatsApp",
      description: "Opening WhatsApp with your message pre-filled",
    });

    setContactForm({ subject: '', message: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
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
          <TabsList className="grid w-full grid-cols-3">
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
                  <AccordionContent>
                    {faq.answer}
                  </AccordionContent>
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
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Getting Started Guide</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Complete guide for new users on UniMarket
                </p>
                <Button variant="outline" size="sm">
                  <Book className="h-4 w-4 mr-2" />
                  Read Guide
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Seller's Handbook</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Best practices for selling on UniMarket
                </p>
                <Button variant="outline" size="sm">
                  <Book className="h-4 w-4 mr-2" />
                  Read Guide
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Safety & Security</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  How to stay safe while buying and selling
                </p>
                <Button variant="outline" size="sm">
                  <Book className="h-4 w-4 mr-2" />
                  Read Guide
                </Button>
              </div>
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
                  onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Describe your issue in detail..."
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                />
              </div>

              <Button onClick={handleContactSubmit} className="w-full">
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Support via WhatsApp
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <p>Response time: Usually within 2-4 hours</p>
                <p>Support hours: 8 AM - 10 PM (WAT)</p>
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