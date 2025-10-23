import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

import { useToast } from "@/hooks/use-toast";
import { usePaystack } from "@/hooks/usePaystack";
import { BUSINESS_RULES, NIGERIAN_UNIVERSITIES } from "@/lib/constants";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Building,
  IdCard,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Shield,
  Sparkles,
  Star,
} from "lucide-react";

import { User as AuthUser } from "@supabase/supabase-js";

// Validation schemas
const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const buyerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  university: z.string().min(1, "University is required"),
});

const sellerPersonalSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  university: z.string().min(1, "University is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  businessName: z.string().min(2, "Business name is required"),
  studentId: z.string().min(1, "Student ID is required"),
});

const sellerVerificationSchema = z.object({
  bio: z.string().min(20, "Bio must be at least 20 characters"),
});

type SigninFormData = z.infer<typeof signinSchema>;
type BuyerFormData = z.infer<typeof buyerSchema>;
type SellerPersonalData = z.infer<typeof sellerPersonalSchema>;
type SellerVerificationData = z.infer<typeof sellerVerificationSchema>;

interface SignupPageProps {
  onSuccess?: () => void;
}

const SignupPage = ({ onSuccess }: SignupPageProps) => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer");
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { initializePayment } = usePaystack();

  // Form states
  const [buyerData, setBuyerData] = useState<Partial<BuyerFormData>>({});
  const [sellerPersonalData, setSellerPersonalData] = useState<
    Partial<SellerPersonalData>
  >({});
  const [sellerVerificationData, setSellerVerificationData] = useState<
    Partial<SellerVerificationData>
  >({});

  // Form hooks
  const signinForm = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
  });

  const buyerForm = useForm<BuyerFormData>({
    resolver: zodResolver(buyerSchema),
    defaultValues: buyerData,
  });

  const sellerPersonalForm = useForm<SellerPersonalData>({
    resolver: zodResolver(sellerPersonalSchema),
    defaultValues: sellerPersonalData,
  });

  const sellerVerificationForm = useForm<SellerVerificationData>({
    resolver: zodResolver(sellerVerificationSchema),
    defaultValues: sellerVerificationData,
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

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const getStepProgress = () => {
    if (mode === "signin" || accountType === "buyer") return 100;
    return ((currentStep - 1) / 3) * 100;
  };

  const getStepTitle = () => {
    if (mode === "signin") return "Welcome back";
    if (accountType === "buyer") return "Create Your Account";

    switch (currentStep) {
      case 1:
        return "Personal Details";
      case 2:
        return "About";
      case 3:
        return "Payment";
      default:
        return "Signup";
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
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyerSignup = async (data: BuyerFormData) => {
    setLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            university_name: data.university,
            account_type: "buyer",
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account.",
      });

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSellerPersonalNext = (data: SellerPersonalData) => {
    setSellerPersonalData(data);
    setCurrentStep(2);
  };

  const handleSellerVerificationNext = async (data: SellerVerificationData) => {
    setSellerVerificationData(data);
    setCurrentStep(3);
  };

  const handlePaymentSuccess = async (reference: string) => {
    setLoading(true);
    try {
      const combinedData = {
        ...sellerPersonalData,
        ...sellerVerificationData,
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
      }

      toast({
        title: "Seller Account Created!",
        description: "Your account has been created and payment confirmed.",
      });

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      const amount = BUSINESS_RULES.sellerRegistration.fee * 100; // Convert to kobo
      const paymentRef = `SELLER_REG_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      initializePayment({
        email: sellerPersonalData.email!,
        amount,
        currency: "NGN",
        ref: paymentRef,
        onSuccess: (response) => {
          handlePaymentSuccess(response.reference);
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

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <img
                src="/logo.png"
                alt="UniMarket"
                className="h-12 w-12 object-contain"
              />
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                UniMarket
              </h1>
              <p className="text-sm text-muted-foreground">
                Nigeria's #1 Student Marketplace
              </p>
            </div>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-brand border border-primary/10 overflow-hidden"
        >
          {/* Mode Toggle */}
          <div className="p-6 pb-0">
            <div className="flex bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-1 mb-6 border border-border/30">
              <button
                onClick={() => {
                  setMode("signin");
                  setCurrentStep(1);
                }}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === "signin"
                    ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMode("signup");
                  setCurrentStep(1);
                }}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === "signup"
                    ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                Sign Up
              </button>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {getStepTitle()}
              </h2>
              <p className="text-muted-foreground mt-1">
                {mode === "signin"
                  ? "Enter your credentials to continue"
                  : accountType === "buyer"
                  ? "Join thousands of students shopping safely"
                  : "Start your selling journey with zero commission"}
              </p>
            </div>
            {/* Account Type Selector for Signup */}
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="accountType"
                    className="text-foreground font-medium"
                  >
                    Select Account Type
                  </Label>
                  <select
                    id="accountType"
                    value={accountType}
                    onChange={(e) => {
                      setAccountType(e.target.value as "buyer" | "seller");
                      setCurrentStep(1);
                    }}
                    className="h-12 w-full border border-border focus:border-primary focus:ring-primary/20 rounded-xl bg-card px-3 py-2 text-sm"
                  >
                    <option value="buyer">Buyer - Shop & Buy</option>
                    <option value="seller">Seller - Sell & Earn</option>
                  </select>
                </div>
              </motion.div>
            )}

            {/* Progress Bar for Seller Signup */}
            {mode === "signup" && accountType === "seller" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6"
              >
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span
                    className={
                      currentStep >= 1 ? "text-primary font-medium" : ""
                    }
                  >
                    Personal
                  </span>
                  <span
                    className={
                      currentStep >= 2 ? "text-primary font-medium" : ""
                    }
                  >
                    About
                  </span>
                  <span
                    className={
                      currentStep >= 3 ? "text-primary font-medium" : ""
                    }
                  >
                    Payment
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden border border-border/30">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${getStepProgress()}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            )}
          </div>

          <div className="px-6 pb-6">
            <AnimatePresence mode="wait">
              {mode === "signin" ? (
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
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label
                        htmlFor="signin-email"
                        className="text-foreground font-medium"
                      >
                        Email
                      </Label>
                      <Input
                        id="signin-email"
                        type="email"
                        {...signinForm.register("email")}
                        placeholder="your@university.edu.ng"
                        className="h-12 border-border focus:border-primary focus:ring-primary/20 rounded-xl bg-card"
                      />
                      {signinForm.formState.errors.email && (
                        <p className="text-sm text-red-500">
                          {signinForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="signin-password"
                        className="text-foreground font-medium"
                      >
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          {...signinForm.register("password")}
                          placeholder="Enter your password"
                          className="h-12 border-border focus:border-primary focus:ring-primary/20 rounded-xl pr-12 bg-card"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-0 bottom-0 flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      {signinForm.formState.errors.password && (
                        <p className="text-sm text-red-500">
                          {signinForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Signing in...
                        </div>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </motion.div>
              ) : accountType === "buyer" ? (
                <motion.div
                  key="buyer-form"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  <form
                    onSubmit={buyerForm.handleSubmit(handleBuyerSignup)}
                    className="space-y-4"
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="fullName"
                          className="text-foreground font-medium"
                        >
                          Full Name
                        </Label>
                        <Input
                          id="fullName"
                          {...buyerForm.register("fullName")}
                          placeholder="Enter your full name"
                          className="h-12 border-border focus:border-primary focus:ring-primary/20 rounded-xl bg-card"
                        />
                        {buyerForm.formState.errors.fullName && (
                          <p className="text-sm text-red-500">
                            {buyerForm.formState.errors.fullName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="email"
                          className="text-foreground font-medium"
                        >
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          {...buyerForm.register("email")}
                          placeholder="your@university.edu.ng"
                          className="h-12 border-border focus:border-primary focus:ring-primary/20 rounded-xl bg-card"
                        />
                        {buyerForm.formState.errors.email && (
                          <p className="text-sm text-red-500">
                            {buyerForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="password"
                          className="text-foreground font-medium"
                        >
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            {...buyerForm.register("password")}
                            placeholder="Create a strong password"
                            className="h-12 border-border focus:border-primary focus:ring-primary/20 rounded-xl pr-12 bg-card"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-0 bottom-0 flex items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        {buyerForm.formState.errors.password && (
                          <p className="text-sm text-red-500">
                            {buyerForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="university"
                          className="text-foreground font-medium"
                        >
                          University
                        </Label>
                        <select
                          {...buyerForm.register("university")}
                          className="h-12 w-full border border-border focus:border-primary focus:ring-primary/20 rounded-xl bg-card px-3 py-2 text-sm"
                        >
                          <option value="">Select your university</option>
                          {NIGERIAN_UNIVERSITIES.map((uni) => (
                            <option key={uni} value={uni}>
                              {uni}
                            </option>
                          ))}
                        </select>
                        {buyerForm.formState.errors.university && (
                          <p className="text-sm text-red-500">
                            {buyerForm.formState.errors.university.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mt-6"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating Account...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Create Buyer Account
                        </div>
                      )}
                    </Button>
                  </form>
                </motion.div>
              ) : (
                // Seller Multi-Step Form
                <>
                  {currentStep === 1 && (
                    <motion.div
                      key="seller-step-1"
                      variants={stepVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                    >
                      <form
                        onSubmit={sellerPersonalForm.handleSubmit(
                          handleSellerPersonalNext
                        )}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="fullName"
                              className="text-foreground font-medium"
                            >
                              Full Name
                            </Label>
                            <Input
                              {...sellerPersonalForm.register("fullName")}
                              placeholder="Enter your full name"
                              className="h-12 border-border focus:border-primary focus:ring-primary/20 rounded-xl bg-card"
                            />
                            {sellerPersonalForm.formState.errors.fullName && (
                              <p className="text-sm text-red-500">
                                {
                                  sellerPersonalForm.formState.errors.fullName
                                    .message
                                }
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor="email"
                              className="text-foreground font-medium"
                            >
                              University Email
                            </Label>
                            <Input
                              type="email"
                              {...sellerPersonalForm.register("email")}
                              placeholder="student@university.edu.ng"
                              className="h-12 border-border focus:border-primary focus:ring-primary/20 rounded-xl bg-card"
                            />
                            {sellerPersonalForm.formState.errors.email && (
                              <p className="text-sm text-red-500">
                                {
                                  sellerPersonalForm.formState.errors.email
                                    .message
                                }
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="password"
                            className="text-foreground font-medium"
                          >
                            Password
                          </Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              {...sellerPersonalForm.register("password")}
                              placeholder="Create a strong password"
                              className="h-12 border-border focus:border-primary focus:ring-primary/20 rounded-xl pr-12 bg-card"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-0 bottom-0 flex items-center justify-center text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          {sellerPersonalForm.formState.errors.password && (
                            <p className="text-sm text-red-500">
                              {
                                sellerPersonalForm.formState.errors.password
                                  .message
                              }
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="university"
                              className="text-foreground font-medium"
                            >
                              University
                            </Label>
                            <select
                              {...sellerPersonalForm.register("university")}
                              className="h-12 w-full border border-border focus:border-primary focus:ring-primary/20 rounded-xl bg-card px-3 py-2 text-sm"
                            >
                              <option value="">Select university</option>
                              {NIGERIAN_UNIVERSITIES.map((uni) => (
                                <option key={uni} value={uni}>
                                  {uni}
                                </option>
                              ))}
                            </select>
                            {sellerPersonalForm.formState.errors.university && (
                              <p className="text-sm text-red-500">
                                {
                                  sellerPersonalForm.formState.errors.university
                                    .message
                                }
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="phone"
                              className="text-foreground font-medium"
                            >
                              WhatsApp Number
                            </Label>
                            <Input
                              {...sellerPersonalForm.register("phone")}
                              placeholder="+234 801 234 5678"
                              className="h-12 border-border focus:border-primary focus:ring-primary/20 rounded-xl bg-card"
                            />
                            {sellerPersonalForm.formState.errors.phone && (
                              <p className="text-sm text-red-500">
                                {
                                  sellerPersonalForm.formState.errors.phone
                                    .message
                                }
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="studentId"
                              className="text-foreground font-medium"
                            >
                              Matric Number
                            </Label>
                            <Input
                              {...sellerPersonalForm.register("studentId")}
                              placeholder="e.g., 19/55EC/00123"
                              className="h-12 border-border focus:border-primary focus:ring-primary/20 rounded-xl bg-card"
                            />
                            {sellerPersonalForm.formState.errors.studentId && (
                              <p className="text-sm text-red-500">
                                {
                                  sellerPersonalForm.formState.errors.studentId
                                    .message
                                }
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="businessName"
                              className="text-foreground font-medium"
                            >
                              Business Name
                            </Label>
                            <Input
                              {...sellerPersonalForm.register("businessName")}
                              placeholder="Your business/store name"
                              className="h-12 border-border focus:border-primary focus:ring-primary/20 rounded-xl bg-card"
                            />
                            {sellerPersonalForm.formState.errors
                              .businessName && (
                              <p className="text-sm text-red-500">
                                {
                                  sellerPersonalForm.formState.errors
                                    .businessName.message
                                }
                              </p>
                            )}
                          </div>
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mt-6"
                        >
                          <ArrowRight className="h-5 w-5 mr-2" />
                          Continue
                        </Button>
                      </form>
                    </motion.div>
                  )}

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
                        onSubmit={sellerVerificationForm.handleSubmit(
                          handleSellerVerificationNext
                        )}
                        className="space-y-6"
                      >
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="bio"
                              className="text-foreground font-medium"
                            >
                              Short Bio
                            </Label>
                            <Textarea
                              {...sellerVerificationForm.register("bio")}
                              placeholder="Tell buyers about yourself and what you sell..."
                              className="min-h-[100px] border-border focus:border-primary focus:ring-primary/20 rounded-xl resize-none bg-card"
                            />
                            {sellerVerificationForm.formState.errors.bio && (
                              <p className="text-sm text-red-500">
                                {
                                  sellerVerificationForm.formState.errors.bio
                                    .message
                                }
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep(1)}
                            className="flex-1 h-12 border-border text-gray-900 hover:text-gray-700 rounded-xl"
                          >
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1 h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                          >
                            <ArrowRight className="h-5 w-5 mr-2" />
                            Continue to Payment
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
                      <div className="space-y-6">
                        <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Shield className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                Registration Fee
                              </h3>
                              <p className="text-2xl font-bold text-primary">
                                ₦{BUSINESS_RULES.sellerRegistration.fee}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm text-foreground">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              <span>Unlock unlimited earning potential</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              <span>0% commission on all sales</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              <span>Access to premium seller features</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep(2)}
                            className="flex-1 h-12 border-border text-gray-900 hover:text-gray-700 rounded-xl"
                          >
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back
                          </Button>
                          <Button
                            onClick={handlePayment}
                            disabled={loading}
                            className="flex-1 h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                          >
                            {loading ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Bottom Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-6"
        >
          <p className="text-slate-600">
            {mode === "signin"
              ? "Don't have an account?"
              : "Already have an account?"}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="ml-2 text-primary font-semibold hover:underline transition-colors"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export { SignupPage };
export default SignupPage;
