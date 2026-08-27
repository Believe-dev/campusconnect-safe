import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { SellerKycModal } from "@/components/seller/SellerKycModal";
import {
  ShoppingBag,
  MessageCircle,
  Shield,
  Package,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
  CheckCircle,
  Users,
  Sparkles,
  Building2,
  ShieldCheck,
} from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

// Icons are always bare component references (never pre-rendered JSX
// elements) - the renderer below does `const StepIcon = step.icon;
// <StepIcon />`, which throws if `step.icon` is already an element rather
// than a component type.
const onboardingSteps = [
  {
    title: "Welcome to UniMarket!",
    subtitle: "Your Campus Marketplace",
    content:
      "Connect with fellow students to buy and sell items safely on campus.",
    icon: ShoppingBag,
    features: [
      { icon: Shield, text: "100% verified student sellers" },
      { icon: Users, text: "Campus-only community" },
      { icon: CheckCircle, text: "Secure transactions" },
    ],
  },
  {
    title: "Verify Identity & Anchor Bank Account",
    subtitle: "CBN Compliant Anchor BaaS Integration",
    content:
      "Verify your BVN, NIN, or Photo ID to activate your free Anchor NUBAN Bank Account and unlock higher deposit & transfer limits.",
    icon: Building2,
    isKycStep: true,
    features: [
      { icon: ShieldCheck, text: "Real-time BVN & NIN verification via Anchor" },
      { icon: Building2, text: "Free Anchor Virtual NUBAN Account" },
      { icon: Wallet, text: "High daily transfer caps & instant bank payouts" },
    ],
  },
  {
    title: "Discover & Shop",
    subtitle: "Find What You Need",
    content:
      "Browse textbooks, electronics, furniture and more from trusted student sellers.",
    icon: Search,
    features: [
      { icon: Search, text: "Smart search & filters" },
      { icon: Star, text: "Seller ratings & reviews" },
      { icon: Package, text: "Detailed item descriptions" },
    ],
  },
  {
    title: "Safe Communication",
    subtitle: "Chat Securely",
    content:
      "Message sellers through our monitored system - no personal info sharing required.",
    icon: MessageCircle,
    features: [
      { icon: Shield, text: "All chats monitored for safety" },
      { icon: MessageCircle, text: "No contact sharing needed" },
      { icon: CheckCircle, text: "Report system available" },
    ],
  },
  {
    title: "Secure Payments & Escrow",
    subtitle: "Protected Transactions",
    content:
      "Pay safely via Anchor Virtual NUBAN or Card. Money stays locked in Anchor Escrow until seller delivers.",
    icon: Shield,
    features: [
      { icon: Shield, text: "Anchor Escrow Buyer Protection" },
      { icon: Wallet, text: "Card deposits & Bank Transfers" },
      { icon: Package, text: "Order tracking & approval releases" },
    ],
  },
  {
    title: "Start Earning",
    subtitle: "Become a Seller",
    content:
      "Turn your unused items into cash by becoming a verified student seller.",
    icon: Sparkles,
    features: [
      { icon: CheckCircle, text: "Get verified as student seller" },
      { icon: Package, text: "List items with photos" },
      { icon: Wallet, text: "Receive secure payments" },
    ],
  },
];

export const OnboardingModal = ({ open, onClose }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showKycModal, setShowKycModal] = useState(false);
  const { user } = useAuth();

  // Filter steps: Hide KYC step for general buyers so sign-up & onboarding remain 100% friction-free
  const activeSteps = onboardingSteps.filter((s) => !s.isKycStep || user?.user_metadata?.account_type === "seller");

  const nextStep = () => {
    if (currentStep < activeSteps.length - 1) {
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

  const step = activeSteps[currentStep] || activeSteps[0];
  const StepIcon = step.icon;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[100vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-bold text-flora-ink">
              How UniMarket Works
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step content — one consistent flora treatment across every
                step instead of a different color gradient per step, so
                stepping through doesn't feel like six unrelated screens. */}
            <div className="rounded-3xl bg-flora-chip p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-flora-ink">
                <StepIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-flora-ink">{step.title}</h3>
              <p className="mt-1 text-sm font-medium text-flora-leaf">{step.subtitle}</p>
              <p className="mt-3 leading-relaxed text-flora-muted">{step.content}</p>

              {step.isKycStep && user && (
                <button
                  type="button"
                  onClick={() => setShowKycModal(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-flora-ink px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Verify Identity Now (BVN / NIN / Photo ID)
                </button>
              )}
            </div>

            {/* Features List */}
            <div className="space-y-2">
              {step.features.map((feature, index) => {
                const FeatureIcon = feature.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-flora-chip text-flora-leaf">
                      <FeatureIcon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-flora-ink">
                      {feature.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Progress Indicators */}
            <div className="flex justify-center gap-2">
              {activeSteps.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to step ${index + 1}`}
                  onClick={() => setCurrentStep(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? "w-6 bg-flora-leaf"
                      : "w-2 bg-flora-chip hover:bg-flora-tagBg"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center gap-2 rounded-full border border-flora-ink/10 px-5 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              {currentStep === activeSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="flex items-center gap-2 rounded-full bg-flora-ink px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
                >
                  Get Started
                  <Sparkles className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 rounded-full bg-flora-ink px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {user && (
        <SellerKycModal
          userId={user.id}
          open={showKycModal}
          onClose={() => setShowKycModal(false)}
        />
      )}
    </>
  );
};
