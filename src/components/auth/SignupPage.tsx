import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/enhanced-button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog";

import { useToast } from "@/hooks/use-toast";
import { usePaystack } from "@/hooks/usePaystack";
import { useReferrals } from "@/hooks/useReferrals";
import { BUSINESS_RULES, NIGERIAN_UNIVERSITIES } from "@/lib/constants";
import {
  User,
  Eye,
  EyeOff,
  Building,
  CreditCard,
  CheckCircle,
  Check,
  ArrowLeft,
  ArrowRight,
  Shield,
  Sparkles,
  Gift,
  X,
} from "lucide-react";

import { User as AuthUser } from "@supabase/supabase-js";

// Validation schemas — split per step (see SignupPage's step layout below)
// instead of one giant schema per account type, since each step now submits
// and validates independently.
const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const buyerAccountSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  university: z.string().min(1, "University is required"),
});

const buyerReferralSchema = z.object({
  referralCode: z.string().optional(),
});

const sellerAccountSchema = buyerAccountSchema;

const sellerBusinessSchema = z.object({
  phone: z.string().min(10, "Valid phone number is required"),
  businessName: z.string().min(2, "Business name is required"),
  studentId: z.string().min(1, "Student ID is required"),
  referralCode: z.string().optional(),
});

const sellerAboutSchema = z.object({
  bio: z.string().min(20, "Bio must be at least 20 characters"),
});

type SigninFormData = z.infer<typeof signinSchema>;
type BuyerAccountData = z.infer<typeof buyerAccountSchema>;
type BuyerReferralData = z.infer<typeof buyerReferralSchema>;
type BuyerFormData = BuyerAccountData & BuyerReferralData;
type SellerAccountData = z.infer<typeof sellerAccountSchema>;
type SellerBusinessData = z.infer<typeof sellerBusinessSchema>;
type SellerAboutData = z.infer<typeof sellerAboutSchema>;

interface SignupPageProps {
  onSuccess?: () => void;
}

// Supabase/auth errors surface as Error instances at runtime; narrowing here
// instead of typing the catch param `any` keeps the toast copy honest when
// something throws a non-Error value (still falls back to a generic message).
const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

// Full-width, never gridded — email and password specifically need their
// full row so what's typed stays readable (a half-width column truncates a
// real email address or hides the tail end of a password behind the eye
// toggle). Short, low-stakes fields (name, university, matric number, etc.)
// are the only ones ever paired 2-up in a grid.
const inputClass =
  "h-12 w-full rounded-full border-0 bg-white px-5 text-sm text-flora-ink shadow-card placeholder:text-flora-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flora-leaf/40 lg:h-14 lg:px-6 lg:text-base";
const labelClass = "text-sm font-medium text-flora-ink lg:text-base";
const errorClass = "text-sm text-red-500";
const primaryButtonClass =
  "w-full h-12 rounded-full bg-flora-ink text-white font-semibold shadow-card transition hover:bg-flora-ink hover:brightness-110 hover:text-white lg:h-14 lg:text-base";
const outlineButtonClass =
  "h-12 flex-1 rounded-full border border-flora-ink/20 bg-white text-flora-ink font-semibold transition hover:bg-flora-chip hover:text-flora-ink lg:h-14 lg:text-base";

// Corner-notch geometry for the photo panel's close button. Two earlier
// passes (a mask-image circle straddling the panel's own corner, then an
// independent solid-color circle blob) both produced a visible seam: the
// blob's smooth circular edge was getting clipped by the panel's own
// *separately*-curved rounded-rect boundary (or its straight edges) at a
// non-tangent angle, which reads as a sharp kink wherever the two curves
// crossed — exactly what "curved not sharp" was pointing at.
//
// The fix, mirroring how ProductCard's docked cart-button notch actually
// avoids this: don't let an independent curve cross the panel's own
// boundary at all. The notch overlay is a single square sitting flush in
// the panel's top-left corner — its own top-left corner is *identical* to
// the panel's real corner (so the panel's existing overflow-hidden +
// rounded-[2.5rem] already handles that curve, nothing new to clash with),
// its top-right/bottom-left corners sit flush on the panel's straight top
// and left edges (a sharp corner meeting a straight line is seamless by
// construction), and only its bottom-right corner — the one that actually
// lands out in the middle of the flat photo, with nothing else nearby —
// gets an explicit round. One clean curve, nothing competing with it.
const CLOSE_BTN_SIZE = 44;
// Gap between the button and the panel's real top/left edges — the
// button sits inset within the notch square, not flush against it.
const CLOSE_BTN_INSET = 14;
// How much further the notch square extends past the button's far edge
// before its one rounded corner begins.
const CLOSE_NOTCH_TRAIL = 16;
const CLOSE_NOTCH_SIZE = CLOSE_BTN_INSET + CLOSE_BTN_SIZE + CLOSE_NOTCH_TRAIL;
const CLOSE_NOTCH_CORNER_RADIUS = 30;

// Defined at module scope, not inside SignupPage's render body — a
// component declared inline would get a new identity every render, which
// breaks the layoutId shared-element animation below (React would treat it
// as a different component type and force a remount instead of animating
// the FLIP between positions).
const StepIndicator = ({ steps, currentStep }: { steps: string[]; currentStep: number }) => (
  <div className="mb-3 flex shrink-0 items-center justify-center gap-1.5 lg:justify-start">
    {steps.map((label, i) => {
      const stepNum = i + 1;
      const isComplete = currentStep > stepNum;
      const isActive = currentStep === stepNum;
      return (
        <div key={label} className="flex items-center">
          <div
            className={cn(
              "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300",
              isComplete
                ? "bg-flora-leaf text-white"
                : isActive
                ? "text-flora-ink"
                : "bg-flora-chip text-flora-muted"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="step-active-ring"
                className="absolute inset-0 rounded-full bg-flora-tagBg ring-2 ring-flora-leaf"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative z-10">
              {isComplete ? <Check className="h-3.5 w-3.5" /> : stepNum}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="mx-1.5 h-0.5 w-6 overflow-hidden rounded-full bg-flora-chip sm:w-8">
              <motion.div
                className="h-full rounded-full bg-flora-leaf"
                initial={false}
                animate={{ width: isComplete ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          )}
        </div>
      );
    })}
  </div>
);

const SignupPage = ({ onSuccess }: SignupPageProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Lazy initializer reads the URL synchronously on first render (rather
  // than switching mode in an effect after mount), so a link like
  // `/auth?mode=signup` lands directly on the signup form instead of
  // flashing sign-in first — this is how Header's "Join" and "Sign In"
  // buttons pick which tab you land on.
  const [mode, setMode] = useState<"signin" | "signup">(() =>
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer");
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingBuyerData, setPendingBuyerData] = useState<BuyerFormData | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [validatingReferral, setValidatingReferral] = useState(false);
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const { toast } = useToast();
  const { initializePayment } = usePaystack();
  const { validateReferralCode, createReferral } = useReferrals();

  // Step-scoped form state, one slice per step so each step's form only
  // needs to know about its own fields.
  const [buyerAccountData, setBuyerAccountData] = useState<Partial<BuyerAccountData>>({});
  const [sellerAccountData, setSellerAccountData] = useState<Partial<SellerAccountData>>({});
  const [sellerBusinessData, setSellerBusinessData] = useState<Partial<SellerBusinessData>>({});
  const [sellerAboutData, setSellerAboutData] = useState<Partial<SellerAboutData>>({});

  // Form hooks
  const signinForm = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
  });

  const buyerAccountForm = useForm<BuyerAccountData>({
    resolver: zodResolver(buyerAccountSchema),
    defaultValues: buyerAccountData,
  });

  const buyerReferralForm = useForm<BuyerReferralData>({
    resolver: zodResolver(buyerReferralSchema),
  });

  const sellerAccountForm = useForm<SellerAccountData>({
    resolver: zodResolver(sellerAccountSchema),
    defaultValues: sellerAccountData,
  });

  const sellerBusinessForm = useForm<SellerBusinessData>({
    resolver: zodResolver(sellerBusinessSchema),
    defaultValues: sellerBusinessData,
  });

  const sellerAboutForm = useForm<SellerAboutData>({
    resolver: zodResolver(sellerAboutSchema),
    defaultValues: sellerAboutData,
  });

  // Check for existing user session and listen for auth changes
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    checkUser();

    // Check for referral code in URL
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferralCode(refParam);
      setMode('signup');
      validateReferral(refParam);
    }

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const validateReferral = async (code: string) => {
    if (!code) {
      setReferralValid(null);
      return;
    }

    setValidatingReferral(true);
    const isValid = await validateReferralCode(code);
    setReferralValid(isValid);
    setValidatingReferral(false);
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  // Step 1 is always "choose your account type" now, shared by both flows
  // — buyer is 3 steps total (Type, Account, Referral), seller is 4 (Type,
  // Account, Business, About + Payment). Kept in one place so the step
  // indicator, title, and step-reset logic can't drift out of sync.
  const stepLabels =
    accountType === "buyer"
      ? ["Type", "Account", "Referral"]
      : ["Type", "Account", "Business", "About"];

  const getStepTitle = () => {
    if (mode === "signin") return "Welcome back";
    if (currentStep === 1) return "Choose Your Account Type";
    if (accountType === "buyer") {
      return currentStep === 2 ? "Create Your Account" : "Got a Referral Code?";
    }
    switch (currentStep) {
      case 2:
        return "Create Your Account";
      case 3:
        return "Business Details";
      case 4:
        return "Tell Buyers About You";
      default:
        return "Signup";
    }
  };

  const getStepSubtitle = () => {
    if (mode === "signin") return "Enter your credentials to continue";
    if (currentStep === 1) return "Tell us how you'll be using UniMarket";
    if (accountType === "buyer") {
      return currentStep === 2
        ? "Join thousands of students shopping safely"
        : "Enter it below to unlock rewards — or skip if you don't have one";
    }
    switch (currentStep) {
      case 2:
        return "Start your selling journey with zero commission";
      case 3:
        return "Tell us where to reach you and what to call your store";
      default:
        return "A short bio builds trust with buyers";
    }
  };

  const handleSignin = async (data: SigninFormData) => {
    setLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "Successfully signed in to UniMarket.",
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: "Sign In Failed",
        description: getErrorMessage(error, "Failed to sign in. Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountTypeSelect = (type: "buyer" | "seller") => {
    setAccountType(type);
    setCurrentStep(2);
  };

  const handleBuyerAccountNext = (data: BuyerAccountData) => {
    setBuyerAccountData(data);
    setCurrentStep(3);
  };

  const handleBuyerReferralSubmit = (data: BuyerReferralData) => {
    setPendingBuyerData({ ...(buyerAccountData as BuyerAccountData), ...data });
    setShowConfirmModal(true);
  };

  const handleConfirmBuyerSignup = async () => {
    if (!pendingBuyerData) return;

    setLoading(true);
    setShowConfirmModal(false);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: pendingBuyerData.email,
        password: pendingBuyerData.password,
        options: {
          data: {
            full_name: pendingBuyerData.fullName,
            university_name: pendingBuyerData.university,
            account_type: "buyer",
          },
        },
      });

      if (error) throw error;

      // Create referral if code provided
      if (authData.user && pendingBuyerData.referralCode) {
        await createReferral(pendingBuyerData.referralCode);
      }

      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account.",
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: "Signup Failed",
        description: getErrorMessage(error, "Failed to create your account. Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setPendingBuyerData(null);
    }
  };

  const handleSwitchToSeller = () => {
    setShowConfirmModal(false);
    setAccountType("seller");
    // Skips the type-picker step — they just confirmed "seller" right here,
    // so re-showing that choice would be redundant. Straight to account
    // fields instead.
    setCurrentStep(2);
    setPendingBuyerData(null);
  };

  const handleSellerAccountNext = (data: SellerAccountData) => {
    setSellerAccountData(data);
    setCurrentStep(3);
  };

  const handleSellerBusinessNext = (data: SellerBusinessData) => {
    setSellerBusinessData(data);
    setCurrentStep(4);
  };

  const handlePaymentSuccess = async (reference: string, aboutData: SellerAboutData) => {
    setLoading(true);
    try {
      const combinedData = {
        ...sellerAccountData,
        ...sellerBusinessData,
        ...aboutData,
      };

      const { data: authData, error } = await supabase.auth.signUp({
        email: combinedData.email!,
        password: combinedData.password!,
        options: {
          data: {
            full_name: combinedData.fullName,
            university_name: combinedData.university,
            phone_number: combinedData.phone,
            business_name: combinedData.businessName,
            student_id: combinedData.studentId,
            account_type: "seller",
            payment_reference: reference,
            bio: combinedData.bio,
          },
        },
      });

      if (error) throw error;

      // Update profile with business info and activate subscription
      if (authData.user) {
        // Wait for profile creation
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        // Single comprehensive profile update
        await supabase
          .from("profiles")
          .update({
            business_name: combinedData.businessName,
            bio: combinedData.bio,
            seller_registration_paid: true,
            seller_registration_paid_at: new Date().toISOString(),
            seller_subscription_expires_at: expiryDate.toISOString(),
            seller_features_active: true,
            seller_subscription_type: "monthly",
            seller_last_payment_date: new Date().toISOString(),
            account_type: "seller",
            seller_status: "pending"
          })
          .eq("user_id", authData.user.id);

        // Record payment
        await supabase.from("seller_registration_payments").insert({
          user_id: authData.user.id,
          amount: BUSINESS_RULES.sellerRegistration.fee,
          payment_reference: reference,
          payment_method: "paystack",
          status: "completed",
        });

        // Create subscription record
        await supabase.from("seller_subscriptions").insert({
          user_id: authData.user.id,
          subscription_type: "monthly",
          amount: BUSINESS_RULES.sellerRegistration.fee,
          payment_reference: reference,
          starts_at: new Date().toISOString(),
          expires_at: expiryDate.toISOString(),
          status: "active",
        });

        // Create referral if code provided
        if (combinedData.referralCode) {
          await createReferral(combinedData.referralCode);
        }
      }

      toast({
        title: "Seller Account Created!",
        description: "Your account has been created and payment confirmed.",
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: "Signup Failed",
        description: getErrorMessage(error, "Failed to create your account. Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (aboutData: SellerAboutData) => {
    try {
      const amount = BUSINESS_RULES.sellerRegistration.fee * 100; // Convert to kobo
      const paymentRef = `SELLER_REG_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      initializePayment({
        email: sellerAccountData.email!,
        amount,
        currency: "NGN",
        ref: paymentRef,
        onSuccess: (response) => {
          handlePaymentSuccess(response.reference, aboutData);
        },
        onClose: () => {
          toast({
            title: "Payment Cancelled",
            description: "Please complete payment to finish registration.",
            variant: "destructive",
          });
        },
      });
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Step 3's bio field and the payment trigger are the same form now (see
  // seller step 3 below) — validate + stash the bio, then kick off Paystack
  // with it passed straight through rather than read back from state, since
  // setSellerAboutData wouldn't have flushed yet on this same tick.
  const handleSellerAboutSubmit = (data: SellerAboutData) => {
    setSellerAboutData(data);
    handlePayment(data);
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-flora-bgFrom via-flora-bgTo to-flora-tagBg/60 lg:flex">
      {/* Campus photo panel — large screens only, floating with margin on
          every side instead of full-bleed, so it reads as a card sitting
          on the page rather than a wall. Real UniMarket pop-up photography
          instead of stock/illustration, tinted with the flora gradient so
          it reads as part of the same brand system rather than a
          bolted-on marketing image. The close button docked into its
          top-left corner closes the whole auth page (see the button below)
          — it replaces the old standalone back-arrow button entirely, so
          this is now the only way back on every breakpoint. */}
      <div className="relative hidden shrink-0 lg:m-6 lg:block lg:w-[42%]">
        <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] shadow-floating">
          <img
            src="/UniMarket.jpg"
            alt="Students trading at a UniMarket campus pop-up"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-flora-ink via-flora-ink/55 to-flora-ink/10" />
          {/* The "cutout" — flush square in the panel's real corner (see
              the geometry comment above), colored to match the page
              background so it reads as a hole in the photo. Its top-left
              corner is left sharp/unrounded since it coincides with the
              panel's own corner (already curved by the panel's own
              overflow-hidden), but the other three corners are genuinely
              sharp 90° turns in the notch's own outline cutting into the
              flat photo — sitting flush on the panel's straight top/left
              edges doesn't hide that, it only hides the *outer* boundary,
              not the notch's own silhouette. All three get rounded. */}
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 bg-flora-bgFrom"
            style={{
              width: CLOSE_NOTCH_SIZE,
              height: CLOSE_NOTCH_SIZE,
              borderRadius: `0 ${CLOSE_NOTCH_CORNER_RADIUS}px ${CLOSE_NOTCH_CORNER_RADIUS}px ${CLOSE_NOTCH_CORNER_RADIUS}px`,
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-flora-leafBright/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-flora-leaf/25 blur-3xl"
          />

          <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
            {/* Pushed to the right instead of its old top-left spot — the
                close button now docks into that corner instead. */}
            <Link to="/" className="ml-auto inline-flex items-center gap-2">
              <img src="/logo.png" alt="UniMarket" className="h-9 w-9 object-contain" />
              <span className="text-xl font-bold text-white">UniMarket</span>
            </Link>

            <div className="max-w-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                ✦ Verified Campus Marketplace
              </span>
              <h2 className="mt-5 text-3xl font-bold leading-tight text-white xl:text-4xl">
                Buy &amp; sell safely with fellow students
              </h2>
              <p className="mt-4 leading-relaxed text-white/80">
                Real students, real campuses — every seller is verified
                before they can list a single item.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
                {["Free to join", "Verified students only", "Secure payments"].map(
                  (item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-flora-leafBright" />
                      <span>{item}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sits inset within the notch square above (see CLOSE_BTN_INSET) —
            fully inside the panel's own bounds now, so unlike earlier
            passes it isn't at risk of being clipped by anything and
            doesn't depend on the panel's margin at all. Closes the whole
            page (same action the old back-arrow button used to do), not
            just the photo. */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Close"
          className="absolute flex items-center justify-center rounded-full bg-white text-flora-ink shadow-card transition hover:brightness-105"
          style={{
            top: CLOSE_BTN_INSET,
            left: CLOSE_BTN_INSET,
            width: CLOSE_BTN_SIZE,
            height: CLOSE_BTN_SIZE,
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form panel — full-screen page on mobile (no floating card), the
          right-hand column on large screens. Inputs sit directly on the
          flora gradient/white background instead of being nested inside
          another card, since the layout itself (full-bleed page, or the
          split against the photo) already provides the visual structure a
          card would otherwise be there to fake. */}
      <div className="relative flex h-full flex-1 flex-col overflow-hidden">
        {/* Decorative glow accents — the photo panel carries its own on
            desktop, but mobile has no photo panel at all, so the form
            needs its own bit of visual richness rather than sitting on a
            flat gradient. Low opacity and pointer-events-none so they
            never compete with the (borderless) white input fields for
            attention. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-flora-leafBright/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-flora-leaf/15 blur-3xl"
        />

        {/* Mobile/tablet-only close button — the desktop photo panel
            carries its own docked-into-the-notch version (above), which is
            hidden below lg, so this covers every breakpoint that one
            doesn't. Safe-area aware since it can land at the very top of
            the screen on mobile with nothing else above it. */}
        <IconButton
          icon={X}
          label="Close"
          tone="light"
          size="sm"
          onClick={() => navigate(-1)}
          className="absolute left-4 top-[max(0.75rem,calc(env(safe-area-inset-top)+0.35rem))] z-20 sm:left-6 lg:hidden"
        />

        {/* Content starts near the top instead of being vertically centered
            — with the site header gone (see Header.tsx), centering here
            left a tall empty band above the form on large screens, right
            where the header used to sit. Top-aligning both closes that gap
            and matches the mobile layout, which is already top-aligned.
            The whole column is also non-scrollable (see the h-[100dvh]
            overflow-hidden ancestors above) — every gap/margin here is
            deliberately compact, email/password always keep their own full
            row for legibility, and everything else that reasonably can is
            gridded 2-up or moved to its own step, so even the longest step
            fits a real phone viewport without needing to scroll. */}
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-col overflow-hidden px-5 pb-3 pt-14 sm:px-8 sm:pt-16 lg:max-w-lg lg:px-12 lg:pb-6 lg:pt-14 xl:max-w-xl xl:px-20">
          {/* Logo — only needed here on mobile/tablet, where the photo
              panel (which already carries the logo) is hidden. */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 shrink-0 text-center lg:hidden"
          >
            <Link to="/" className="inline-flex items-center justify-center gap-2">
              <div className="relative">
                <img
                  src="/logo.png"
                  alt="UniMarket"
                  className="h-8 w-8 object-contain"
                />
                <Sparkles
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 h-3.5 w-3.5 text-flora-leafBright"
                />
              </div>
              <span className="text-lg font-bold text-flora-leaf">UniMarket</span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="mb-4 shrink-0 text-center lg:text-left">
              <h1 className="text-xl font-bold text-flora-ink lg:text-3xl">
                {getStepTitle()}
              </h1>
              <p className="mt-1 text-sm text-flora-muted lg:text-lg">
                {getStepSubtitle()}
              </p>
            </div>

            {/* Step indicator — buyer (3 steps) and seller (4 steps) both
                start with the account-type choice below as step 1. */}
            {mode === "signup" && <StepIndicator steps={stepLabels} currentStep={currentStep} />}

            <AnimatePresence mode="wait">
              {mode === "signup" && currentStep === 1 ? (
                <motion.div
                  key="account-type-step"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  {/* A real first step instead of a cramped inline dropdown
                      — same card-picker language as the buyer/seller
                      confirmation modal further down, just bigger since it
                      has a whole step to itself. */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleAccountTypeSelect("buyer")}
                      className="rounded-3xl border-2 border-flora-ink/10 bg-white p-5 text-center transition hover:border-flora-leaf hover:bg-flora-tagBg lg:p-6"
                    >
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-flora-leaf/15 text-flora-leaf lg:h-14 lg:w-14">
                        <User className="h-6 w-6 lg:h-7 lg:w-7" />
                      </span>
                      <div className="mt-3 font-semibold text-flora-ink lg:text-lg">Buyer</div>
                      <div className="mt-1 text-xs text-flora-muted lg:text-sm">
                        Shop & buy products
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAccountTypeSelect("seller")}
                      className="rounded-3xl border-2 border-flora-ink/10 bg-white p-5 text-center transition hover:border-flora-leaf hover:bg-flora-tagBg lg:p-6"
                    >
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-flora-leaf/15 text-flora-leaf lg:h-14 lg:w-14">
                        <Building className="h-6 w-6 lg:h-7 lg:w-7" />
                      </span>
                      <div className="mt-3 font-semibold text-flora-ink lg:text-lg">Seller</div>
                      <div className="mt-1 text-xs text-flora-muted lg:text-sm">
                        Sell & earn money
                      </div>
                    </button>
                  </div>
                </motion.div>
              ) : mode === "signin" ? (
                <motion.div
                  key="signin-form"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  <form
                    onSubmit={signinForm.handleSubmit(handleSignin)}
                    className="space-y-3"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="signin-email" className={labelClass}>
                        Email
                      </Label>
                      <Input
                        id="signin-email"
                        type="email"
                        {...signinForm.register("email")}
                        placeholder="your@university.edu.ng"
                        className={inputClass}
                      />
                      {signinForm.formState.errors.email && (
                        <p className={errorClass}>
                          {signinForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signin-password" className={labelClass}>
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          {...signinForm.register("password")}
                          placeholder="Enter your password"
                          className={cn(inputClass, "pr-12")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute bottom-0 right-3 top-0 flex items-center justify-center text-flora-muted hover:text-flora-ink"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      {signinForm.formState.errors.password && (
                        <p className={errorClass}>
                          {signinForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="ghost"
                      disabled={loading}
                      className={primaryButtonClass}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Signing in...
                        </div>
                      ) : (
                        "Sign In"
                      )}
                    </Button>

                    <div className="mt-3 text-center">
                      <ForgotPasswordDialog>
                        <button
                          type="button"
                          className="text-sm font-medium text-flora-leaf underline-offset-2 hover:underline"
                        >
                          Forgot password?
                        </button>
                      </ForgotPasswordDialog>
                    </div>
                  </form>
                </motion.div>
              ) : accountType === "buyer" ? (
                <>
                  {currentStep === 2 && (
                    <motion.div
                      key="buyer-step-2"
                      variants={stepVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                    >
                      <form
                        onSubmit={buyerAccountForm.handleSubmit(handleBuyerAccountNext)}
                        className="space-y-3"
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor="fullName" className={labelClass}>
                            Full Name
                          </Label>
                          <Input
                            id="fullName"
                            {...buyerAccountForm.register("fullName")}
                            placeholder="Enter your full name"
                            className={inputClass}
                          />
                          {buyerAccountForm.formState.errors.fullName && (
                            <p className={errorClass}>
                              {buyerAccountForm.formState.errors.fullName.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="email" className={labelClass}>
                            Email
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            {...buyerAccountForm.register("email")}
                            placeholder="your@university.edu.ng"
                            className={inputClass}
                          />
                          {buyerAccountForm.formState.errors.email && (
                            <p className={errorClass}>
                              {buyerAccountForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="password" className={labelClass}>
                            Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              {...buyerAccountForm.register("password")}
                              placeholder="Create a strong password"
                              className={cn(inputClass, "pr-12")}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              className="absolute bottom-0 right-3 top-0 flex items-center justify-center text-flora-muted hover:text-flora-ink"
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          {buyerAccountForm.formState.errors.password && (
                            <p className={errorClass}>
                              {buyerAccountForm.formState.errors.password.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="university" className={labelClass}>
                            University
                          </Label>
                          <select
                            id="university"
                            {...buyerAccountForm.register("university")}
                            className={inputClass}
                          >
                            <option value="">Select your university</option>
                            {NIGERIAN_UNIVERSITIES.map((uni) => (
                              <option key={uni} value={uni}>
                                {uni}
                              </option>
                            ))}
                          </select>
                          {buyerAccountForm.formState.errors.university && (
                            <p className={errorClass}>
                              {buyerAccountForm.formState.errors.university.message}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 flex gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setCurrentStep(1)}
                            className={outlineButtonClass}
                          >
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back
                          </Button>
                          <Button
                            type="submit"
                            variant="ghost"
                            className={cn(primaryButtonClass, "flex-1 w-auto")}
                          >
                            <ArrowRight className="h-5 w-5 mr-2" />
                            Continue
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div
                      key="buyer-step-3"
                      variants={stepVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                    >
                      <form
                        onSubmit={buyerReferralForm.handleSubmit(handleBuyerReferralSubmit)}
                        className="space-y-3"
                      >
                        {/* A dedicated, generously-spaced step for one
                            optional field reads as a deliberate "got a
                            code?" moment (the same pattern fintech/ride
                            apps use) rather than a sparse leftover screen. */}
                        <div className="rounded-3xl border border-flora-ink/10 bg-flora-chip p-5 text-center">
                          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-flora-leaf/15 text-flora-leaf">
                            <Gift className="h-6 w-6" />
                          </span>
                          <p className="mt-3 text-sm text-flora-muted">
                            Have a friend's referral code? Enter it to unlock
                            rewards for both of you.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="referralCode" className={labelClass}>
                            Referral Code (Optional)
                          </Label>
                          <Input
                            id="referralCode"
                            {...buyerReferralForm.register("referralCode")}
                            value={referralCode}
                            onChange={(e) => {
                              const code = e.target.value.toUpperCase();
                              setReferralCode(code);
                              buyerReferralForm.setValue("referralCode", code);
                              validateReferral(code);
                            }}
                            placeholder="Enter referral code"
                            className={cn(
                              inputClass,
                              referralValid === true
                                ? "ring-2 ring-flora-leaf"
                                : referralValid === false
                                ? "ring-2 ring-red-500"
                                : ""
                            )}
                          />
                          {validatingReferral && (
                            <p className="text-sm text-flora-muted">Validating...</p>
                          )}
                          {referralValid === true && (
                            <p className="text-sm text-flora-leaf">✓ Valid referral code</p>
                          )}
                          {referralValid === false && referralCode && (
                            <p className={errorClass}>Invalid referral code</p>
                          )}
                        </div>

                        <div className="mt-4 flex gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setCurrentStep(2)}
                            className={outlineButtonClass}
                          >
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back
                          </Button>
                          <Button
                            type="submit"
                            variant="ghost"
                            disabled={loading}
                            className={cn(primaryButtonClass, "flex-1 w-auto")}
                          >
                            {loading ? (
                              <div className="flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Creating...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5" />
                                Create Account
                              </div>
                            )}
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </>
              ) : (
                // Seller Multi-Step Form
                <>
                  {currentStep === 2 && (
                    <motion.div
                      key="seller-step-2"
                      variants={stepVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                    >
                      <form
                        onSubmit={sellerAccountForm.handleSubmit(handleSellerAccountNext)}
                        className="space-y-3"
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor="sellerFullName" className={labelClass}>
                            Full Name
                          </Label>
                          <Input
                            id="sellerFullName"
                            {...sellerAccountForm.register("fullName")}
                            placeholder="Enter your full name"
                            className={inputClass}
                          />
                          {sellerAccountForm.formState.errors.fullName && (
                            <p className={errorClass}>
                              {sellerAccountForm.formState.errors.fullName.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="sellerEmail" className={labelClass}>
                            University Email
                          </Label>
                          <Input
                            id="sellerEmail"
                            type="email"
                            {...sellerAccountForm.register("email")}
                            placeholder="student@university.edu.ng"
                            className={inputClass}
                          />
                          {sellerAccountForm.formState.errors.email && (
                            <p className={errorClass}>
                              {sellerAccountForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="sellerPassword" className={labelClass}>
                            Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="sellerPassword"
                              type={showPassword ? "text" : "password"}
                              {...sellerAccountForm.register("password")}
                              placeholder="Create a strong password"
                              className={cn(inputClass, "pr-12")}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              className="absolute bottom-0 right-3 top-0 flex items-center justify-center text-flora-muted hover:text-flora-ink"
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          {sellerAccountForm.formState.errors.password && (
                            <p className={errorClass}>
                              {sellerAccountForm.formState.errors.password.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="sellerUniversity" className={labelClass}>
                            University
                          </Label>
                          <select
                            id="sellerUniversity"
                            {...sellerAccountForm.register("university")}
                            className={inputClass}
                          >
                            <option value="">Select university</option>
                            {NIGERIAN_UNIVERSITIES.map((uni) => (
                              <option key={uni} value={uni}>
                                {uni}
                              </option>
                            ))}
                          </select>
                          {sellerAccountForm.formState.errors.university && (
                            <p className={errorClass}>
                              {sellerAccountForm.formState.errors.university.message}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 flex gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setCurrentStep(1)}
                            className={outlineButtonClass}
                          >
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back
                          </Button>
                          <Button
                            type="submit"
                            variant="ghost"
                            className={cn(primaryButtonClass, "flex-1 w-auto")}
                          >
                            <ArrowRight className="h-5 w-5 mr-2" />
                            Continue
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div
                      key="seller-step-3"
                      variants={stepVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                    >
                      <form
                        onSubmit={sellerBusinessForm.handleSubmit(handleSellerBusinessNext)}
                        className="space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="sellerPhone" className={labelClass}>
                              WhatsApp Number
                            </Label>
                            <Input
                              id="sellerPhone"
                              {...sellerBusinessForm.register("phone")}
                              placeholder="+234 801 234 5678"
                              className={inputClass}
                            />
                            {sellerBusinessForm.formState.errors.phone && (
                              <p className={errorClass}>
                                {sellerBusinessForm.formState.errors.phone.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="sellerStudentId" className={labelClass}>
                              Matric Number
                            </Label>
                            <Input
                              id="sellerStudentId"
                              {...sellerBusinessForm.register("studentId")}
                              placeholder="e.g., 19/55EC/00123"
                              className={inputClass}
                            />
                            {sellerBusinessForm.formState.errors.studentId && (
                              <p className={errorClass}>
                                {sellerBusinessForm.formState.errors.studentId.message}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="sellerBusinessName" className={labelClass}>
                            Business Name
                          </Label>
                          <Input
                            id="sellerBusinessName"
                            {...sellerBusinessForm.register("businessName")}
                            placeholder="Your business/store name"
                            className={inputClass}
                          />
                          {sellerBusinessForm.formState.errors.businessName && (
                            <p className={errorClass}>
                              {sellerBusinessForm.formState.errors.businessName.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor="sellerReferralCode"
                            className={cn(labelClass, "flex items-center gap-2")}
                          >
                            <Gift className="h-4 w-4 text-flora-leaf" />
                            Referral Code (Optional)
                          </Label>
                          <Input
                            id="sellerReferralCode"
                            {...sellerBusinessForm.register("referralCode")}
                            value={referralCode}
                            onChange={(e) => {
                              const code = e.target.value.toUpperCase();
                              setReferralCode(code);
                              sellerBusinessForm.setValue("referralCode", code);
                              validateReferral(code);
                            }}
                            placeholder="Enter referral code"
                            className={cn(
                              inputClass,
                              referralValid === true
                                ? "ring-2 ring-flora-leaf"
                                : referralValid === false
                                ? "ring-2 ring-red-500"
                                : ""
                            )}
                          />
                          {validatingReferral && (
                            <p className="text-sm text-flora-muted">Validating...</p>
                          )}
                          {referralValid === true && (
                            <p className="text-sm text-flora-leaf">✓ Valid referral code</p>
                          )}
                          {referralValid === false && referralCode && (
                            <p className={errorClass}>Invalid referral code</p>
                          )}
                        </div>

                        <div className="mt-4 flex gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setCurrentStep(2)}
                            className={outlineButtonClass}
                          >
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back
                          </Button>
                          <Button
                            type="submit"
                            variant="ghost"
                            className={cn(primaryButtonClass, "flex-1 w-auto")}
                          >
                            <ArrowRight className="h-5 w-5 mr-2" />
                            Continue
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {currentStep === 4 && (
                    <motion.div
                      key="seller-step-4"
                      variants={stepVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                    >
                      <form
                        onSubmit={sellerAboutForm.handleSubmit(handleSellerAboutSubmit)}
                        className="space-y-3"
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor="bio" className={labelClass}>
                            Short Bio
                          </Label>
                          <Textarea
                            id="bio"
                            {...sellerAboutForm.register("bio")}
                            placeholder="Tell buyers about yourself and what you sell..."
                            className={cn(inputClass, "min-h-[72px] resize-none rounded-3xl py-3")}
                          />
                          {sellerAboutForm.formState.errors.bio && (
                            <p className={errorClass}>
                              {sellerAboutForm.formState.errors.bio.message}
                            </p>
                          )}
                        </div>

                        <div className="rounded-3xl border border-flora-ink/10 bg-flora-chip p-4">
                          <div className="mb-2 flex items-center gap-3">
                            <div className="rounded-full bg-flora-leaf/15 p-2">
                              <Shield className="h-6 w-6 text-flora-leaf" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-flora-ink">
                                Registration Fee
                              </h3>
                              <p className="text-2xl font-bold text-flora-leaf">
                                ₦{BUSINESS_RULES.sellerRegistration.fee}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1.5 text-sm text-flora-ink">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-flora-leaf" />
                              <span>Unlock unlimited earning potential</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-flora-leaf" />
                              <span>0% commission on all sales</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-flora-leaf" />
                              <span>Access to premium seller features</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setCurrentStep(3)}
                            className={outlineButtonClass}
                          >
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back
                          </Button>
                          <Button
                            type="submit"
                            variant="ghost"
                            disabled={loading}
                            className={cn(primaryButtonClass, "flex-1 w-auto")}
                          >
                            {loading ? (
                              <div className="flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Processing...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Pay ₦{BUSINESS_RULES.sellerRegistration.fee}
                              </div>
                            )}
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Bottom Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-3 shrink-0 text-center text-sm"
          >
            <p className="text-flora-muted">
              {mode === "signin"
                ? "Don't have an account?"
                : "Already have an account?"}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setCurrentStep(1);
                }}
                className="ml-2 font-semibold text-flora-leaf transition-colors hover:underline"
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-flora-ink">
              Confirm Account Type
            </DialogTitle>
            <DialogDescription className="text-center text-flora-muted">
              Are you sure you want to create a buyer account?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border-2 border-flora-leaf bg-flora-tagBg p-4 text-center">
                <User className="mx-auto mb-2 h-6 w-6 text-flora-leaf" />
                <div className="text-sm font-medium text-flora-leaf">Buyer Account</div>
                <div className="text-xs text-flora-muted">Shop & Buy Products</div>
              </div>
              <div
                className="cursor-pointer rounded-2xl border-2 border-flora-ink/10 p-4 text-center transition-colors hover:border-flora-leaf hover:bg-flora-tagBg"
                onClick={handleSwitchToSeller}
              >
                <Building className="mx-auto mb-2 h-6 w-6 text-flora-muted" />
                <div className="text-sm font-medium text-flora-ink">Seller Account</div>
                <div className="text-xs text-flora-muted">Sell & Earn Money</div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowConfirmModal(false)}
                className={outlineButtonClass}
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                onClick={handleConfirmBuyerSignup}
                disabled={loading}
                className={cn(primaryButtonClass, "flex-1 w-auto")}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating...
                  </div>
                ) : (
                  "Create Buyer Account"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { SignupPage };
export default SignupPage;
