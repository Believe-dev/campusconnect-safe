import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ShoppingBag, 
  MessageCircle, 
  Shield, 
  Package, 
  Wallet,
  ChevronLeft,
  ChevronRight,
  Play
} from 'lucide-react';

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const onboardingSteps = [
  {
    title: "Welcome to UniMarket! 🎉",
    content: "Your safe campus marketplace for buying and selling items with fellow students.",
    icon: <ShoppingBag className="h-12 w-12 text-primary" />,
    features: [
      "Buy and sell safely on campus",
      "Verified student sellers only",
      "Secure messaging system"
    ]
  },
  {
    title: "Browse & Shop 🛍️",
    content: "Find textbooks, electronics, furniture and more from verified student sellers.",
    icon: <Package className="h-12 w-12 text-primary" />,
    features: [
      "Search by category or keyword",
      "Filter by price and location",
      "View seller ratings and reviews"
    ]
  },
  {
    title: "Secure Messaging 💬",
    content: "Chat safely with sellers through our monitored messaging system.",
    icon: <MessageCircle className="h-12 w-12 text-primary" />,
    features: [
      "All messages are monitored",
      "No contact info sharing allowed",
      "Report inappropriate behavior"
    ]
  },
  {
    title: "Safe Transactions 🔒",
    content: "Complete purchases securely with our built-in payment system.",
    icon: <Shield className="h-12 w-12 text-primary" />,
    features: [
      "Secure payment processing",
      "Buyer protection guarantee",
      "Order tracking and history"
    ]
  },
  {
    title: "Order Process 📦",
    content: "How buying and selling works on UniMarket.",
    icon: <Package className="h-12 w-12 text-primary" />,
    features: [
      "Buyer: Add to cart → Checkout → Pay",
      "Seller: Mark as shipped → Buyer confirms delivery",
      "Automatic payment release after confirmation"
    ]
  },
  {
    title: "Start Selling 💰",
    content: "Become a verified seller and earn money from items you no longer need.",
    icon: <Wallet className="h-12 w-12 text-primary" />,
    features: [
      "Get verified as a student seller",
      "List items with photos",
      "Receive payments securely"
    ]
  }
];

export const OnboardingModal = ({ open, onClose }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('unimarket_onboarding_completed', 'true');
    onClose();
  };

  const step = onboardingSteps[currentStep];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Getting Started
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex justify-center">
            {step.icon}
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-muted-foreground text-sm">{step.content}</p>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <ul className="space-y-2">
                {step.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          
          <div className="flex justify-center gap-2">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            {currentStep === onboardingSteps.length - 1 ? (
              <Button onClick={handleFinish} className="flex items-center gap-2">
                Get Started
                <Play className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={nextStep} className="flex items-center gap-2">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};