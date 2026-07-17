import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  MessageCircle,
  Shield,
  Package,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Play,
  Search,
  Star,
  CheckCircle,
  Users,
  Sparkles,
} from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const onboardingSteps = [
  {
    title: "Welcome to UniMarket!",
    subtitle: "Your Campus Marketplace",
    content:
      "Connect with fellow students to buy and sell items safely on campus.",
    icon: (
      <div className="relative">
        <div className="absolute inset-0 bg-university-green/20 rounded-full animate-pulse"></div>
        <ShoppingBag className="h-16 w-16 text-university-green relative z-10" />
      </div>
    ),
    gradient: "from-university-green/10 to-emerald-50",
    features: [
      {
        icon: <Shield className="h-4 w-4" />,
        text: "Verified student sellers",
      },
      { icon: <Users className="h-4 w-4" />, text: "Campus-only community" },
      {
        icon: <CheckCircle className="h-4 w-4" />,
        text: "Secure transactions",
      },
    ],
  },
  {
    title: "Discover & Shop",
    subtitle: "Find What You Need",
    content:
      "Browse textbooks, electronics, furniture and more from trusted student sellers.",
    icon: (
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse"></div>
        <Search className="h-16 w-16 text-blue-600 relative z-10" />
      </div>
    ),
    gradient: "from-blue-50 to-indigo-50",
    features: [
      { icon: <Search className="h-4 w-4" />, text: "Smart search & filters" },
      { icon: <Star className="h-4 w-4" />, text: "Seller ratings & reviews" },
      {
        icon: <Package className="h-4 w-4" />,
        text: "Detailed item descriptions",
      },
    ],
  },
  {
    title: "Safe Communication",
    subtitle: "Chat Securely",
    content:
      "Message sellers through our monitored system - no personal info sharing required.",
    icon: (
      <div className="relative">
        <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-pulse"></div>
        <MessageCircle className="h-16 w-16 text-purple-600 relative z-10" />
      </div>
    ),
    gradient: "from-purple-50 to-pink-50",
    features: [
      {
        icon: <Shield className="h-4 w-4" />,
        text: "All chats monitored for safety",
      },
      {
        icon: <MessageCircle className="h-4 w-4" />,
        text: "No contact sharing needed",
      },
      {
        icon: <CheckCircle className="h-4 w-4" />,
        text: "Report system available",
      },
    ],
  },
  {
    title: "Secure Payments",
    subtitle: "Protected Transactions",
    content:
      "Pay safely with buyer protection and automatic payment release system.",
    icon: (
      <div className="relative">
        <div className="absolute inset-0 bg-green-500/20 rounded-full animate-pulse"></div>
        <Shield className="h-16 w-16 text-green-600 relative z-10" />
      </div>
    ),
    gradient: "from-green-50 to-emerald-50",
    features: [
      {
        icon: <Shield className="h-4 w-4" />,
        text: "Buyer protection guarantee",
      },
      {
        icon: <Wallet className="h-4 w-4" />,
        text: "Secure payment processing",
      },
      {
        icon: <Package className="h-4 w-4" />,
        text: "Order tracking included",
      },
    ],
  },
  {
    title: "How Orders Work",
    subtitle: "Simple Process",
    content: "Easy 3-step process for both buyers and sellers.",
    icon: (
      <div className="relative">
        <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-pulse"></div>
        <Package className="h-16 w-16 text-orange-600 relative z-10" />
      </div>
    ),
    gradient: "from-orange-50 to-yellow-50",
    features: [
      {
        icon: <ShoppingBag className="h-4 w-4" />,
        text: "Add to cart → Checkout → Pay",
      },
      {
        icon: <Package className="h-4 w-4" />,
        text: "Seller ships → Buyer confirms",
      },
      {
        icon: <Wallet className="h-4 w-4" />,
        text: "Automatic payment release",
      },
    ],
  },
  {
    title: "Start Earning",
    subtitle: "Become a Seller",
    content:
      "Turn your unused items into cash by becoming a verified student seller.",
    icon: (
      <div className="relative">
        <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-pulse"></div>
        <Sparkles className="h-16 w-16 text-yellow-600 relative z-10" />
      </div>
    ),
    gradient: "from-yellow-50 to-amber-50",
    features: [
      {
        icon: <CheckCircle className="h-4 w-4" />,
        text: "Get verified as student seller",
      },
      { icon: <Package className="h-4 w-4" />, text: "List items with photos" },
      { icon: <Wallet className="h-4 w-4" />, text: "Receive secure payments" },
    ],
  },
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
    onClose();
  };

  const step = onboardingSteps[currentStep];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[100vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-university-green">
              How UniMarket Works
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main Content Card */}
          <Card
            className={`relative overflow-hidden border-0 shadow-lg bg-gradient-to-br ${step.gradient}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>

            <CardContent className="p-6 relative z-10">
              <div className="text-center space-y-4">
                <div className="flex justify-center">{step.icon}</div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-sm font-medium text-gray-600">
                    {step.subtitle}
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    {step.content}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features List */}
          <div className="space-y-3">
            {step.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-university-green/10 rounded-full flex items-center justify-center text-university-green">
                  {feature.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>

          {/* Progress Indicators */}
          <div className="flex justify-center gap-2">
            {onboardingSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-3 w-3 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "bg-university-green scale-125"
                    : index < currentStep
                    ? "bg-university-green/60"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-6"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep === onboardingSteps.length - 1 ? (
              <Button
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 bg-university-green hover:bg-university-green/90"
              >
                Get Started
                <Sparkles className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                className="flex items-center gap-2 px-6 bg-university-green hover:bg-university-green/90"
              >
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
