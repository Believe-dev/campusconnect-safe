import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Shield,
  UserCheck,
  Mail,
  Upload,
  Camera,
  IdCard,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from "@supabase/supabase-js";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { SellerSetupModal } from "@/components/seller/SellerSetupModal";
import { BannedUserModal } from "@/components/auth/BannedUserModal";

const AuthPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [university, setUniversity] = useState("");
  const [universityOpen, setUniversityOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer");

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSellerSetup, setShowSellerSetup] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        !target.closest("#signup-university") &&
        !target.closest(".university-dropdown")
      ) {
        setUniversityOpen(false);
      }
    };

    if (universityOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [universityOpen]);

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    // Keep the selected account type
    const finalAccountType = accountType;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName.trim(),
          university_name: university,
          student_id: studentId.trim(),
          phone_number: phoneNumber.trim(),
          account_type: finalAccountType,
        },
      },
    });

    // Create notification for sellers to upload documents
    if (!error && data.user && accountType === "seller") {
      await supabase.from("notifications").insert({
        user_id: data.user.id,
        title: "Complete Your Seller Profile",
        message:
          "Upload your profile picture and student ID card to get approved as a seller.",
        type: "seller_setup",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      // Check if user is banned after successful login
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_banned, admin_notes")
        .eq("user_id", data.user.id)
        .single();

      if (profile?.is_banned) {
        setIsBanned(true);
        setBanReason(profile.admin_notes || "No reason provided");
        await supabase.auth.signOut();
        return { error: new Error("Account is banned") };
      }
    }

    return { error };
  };

  const handleAuth = async (isSignUp: boolean) => {
    // Input sanitization and validation
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedFullName = fullName.trim();
    const sanitizedStudentId = studentId.trim();
    const sanitizedPhoneNumber = phoneNumber.trim();

    if (!sanitizedEmail || !password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Password strength validation
    if (isSignUp && password.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    // Different validation for buyers vs sellers
    if (isSignUp && accountType === "buyer") {
      // Buyers need minimal information
      if (!sanitizedFullName || !university) {
        toast({
          title: "Missing Information",
          description: "Please fill in your name and university.",
          variant: "destructive",
        });
        return;
      }

      // Name validation
      if (sanitizedFullName.length < 2 || sanitizedFullName.length > 50) {
        toast({
          title: "Invalid Name",
          description: "Name must be between 2 and 50 characters.",
          variant: "destructive",
        });
        return;
      }
    } else if (isSignUp && accountType === "seller") {
      // Sellers need complete information
      if (
        !sanitizedFullName ||
        !university ||
        !sanitizedStudentId ||
        !sanitizedPhoneNumber
      ) {
        toast({
          title: "Missing Information",
          description:
            "Please fill in all required fields: name, university, student ID card photo, and phone number.",
          variant: "destructive",
        });
        return;
      }

      // Name validation
      if (sanitizedFullName.length < 2 || sanitizedFullName.length > 50) {
        toast({
          title: "Invalid Name",
          description: "Name must be between 2 and 50 characters.",
          variant: "destructive",
        });
        return;
      }

      // Student ID validation
      if (sanitizedStudentId.length < 5 || sanitizedStudentId.length > 20) {
        toast({
          title: "Invalid Matric Number",
          description: "Matric Number must be between 5 and 20 characters.",
          variant: "destructive",
        });
        return;
      }

      // Phone number validation
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(sanitizedPhoneNumber.replace(/\s/g, ""))) {
        toast({
          title: "Invalid Phone Number",
          description:
            "Please enter a valid phone number with your country code.",
          variant: "destructive",
        });
        return;
      }

      // Validate school email for sellers
      if (
        !sanitizedEmail.includes(".edu") &&
        !sanitizedEmail.includes("student") &&
        !sanitizedEmail.includes("school") &&
        !sanitizedEmail.includes("university")
      ) {
        toast({
          title: "School Email Required",
          description: "Sellers must use a school/university email address.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    const { error } = isSignUp
      ? await signUp(sanitizedEmail, password)
      : await signIn(sanitizedEmail, password);

    if (error) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    } else if (isSignUp) {
      const message =
        accountType === "seller"
          ? "Account created! Please check your email to verify. Your seller account will be reviewed by admin for approval."
          : "Account created! Please check your email to verify your account.";
      toast({
        title: "Account Created!",
        description: message,
      });

      // Show setup modal for sellers, onboarding for buyers
      if (accountType === "seller") {
        setTimeout(() => {
          setShowSellerSetup(true);
        }, 1000);
      } else {
        setTimeout(() => {
          setShowOnboarding(true);
        }, 1000);
      }
    } else {
      toast({
        title: "Welcome Back!",
        description: "Successfully signed in to UniMarket.",
      });
      
      // Handle redirect after auth
      const redirectPath = localStorage.getItem('redirect_after_auth');
      if (redirectPath) {
        localStorage.removeItem('redirect_after_auth');
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 1000);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-brand">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img
              src="/logo.png"
              alt="UniMarket Logo"
              className="h-8 w-8 object-contain"
            />
            <h1 className="text-2xl font-bold text-university-green">
              UniMarket
            </h1>
          </div>
          <CardDescription className="text-base">
            Nigeria's trusted university marketplace
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAuth(false);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your university email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={100}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="brand"
                  className="w-full"
                  disabled={loading}
                >
                  <Mail className="h-4 w-4" />
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAuth(true);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <div className="relative">
                    <select
                      value={accountType}
                      onChange={(e) =>
                        setAccountType(e.target.value as "buyer" | "seller")
                      }
                      className="w-full h-10 px-3 text-sm border border-input bg-background rounded-md"
                    >
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">
                    {accountType === "seller" ? "University Email" : "Email"}
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder={
                      accountType === "seller"
                        ? "student@university.edu.ng"
                        : "your@email.com"
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name *</Label>
                  <Input
                    id="signup-name"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-university">University *</Label>
                  <div className="relative">
                    <Input
                      id="signup-university"
                      placeholder="Search and select your university..."
                      value={university}
                      onChange={(e) => {
                        setUniversity(e.target.value);
                        setUniversityOpen(true);
                      }}
                      onFocus={() => setUniversityOpen(true)}
                    />
                    {universityOpen && (
                      <div className="university-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {[
                          "Abia State University",
                          "Abubakar Tafawa Balewa University",
                          "Achievers University",
                          "Adamawa State University",
                          "Adeleke University",
                          "Afe Babalola University",
                          "African University of Science and Technology",
                          "Ahmadu Bello University",
                          "Ajayi Crowther University",
                          "Akwa Ibom State University",
                          "Alex Ekwueme Federal University",
                          "American University of Nigeria",
                          "Anchor University",
                          "Augustine University",
                          "Babcock University",
                          "Baze University",
                          "Bayero University Kano",
                          "Bells University of Technology",
                          "Benson Idahosa University",
                          "Bingham University",
                          "Bowen University",
                          "Caleb University",
                          "Caritas University",
                          "Chrisland University",
                          "Christopher University",
                          "Clifford University",
                          "Coal City University",
                          "Covenant University",
                          "Crawford University",
                          "Cross River University of Technology",
                          "Delta State University",
                          "Eastern Palm University",
                          "Ebonyi State University",
                          "Edo University",
                          "Ekiti State University",
                          "Elizade University",
                          "Enugu State University of Science and Technology",
                          "Federal University Birnin Kebbi",
                          "Federal University Dutse",
                          "Federal University Dutsin-Ma",
                          "Federal University Gashua",
                          "Federal University Gusau",
                          "Federal University Kashere",
                          "Federal University Lafia",
                          "Federal University Lokoja",
                          "Federal University Ndufu-Alike",
                          "Federal University of Agriculture, Abeokuta",
                          "Federal University of Agriculture, Makurdi",
                          "Federal University of Petroleum Resources",
                          "Federal University of Technology, Akure",
                          "Federal University of Technology, Minna",
                          "Federal University of Technology, Owerri",
                          "Federal University Otuoke",
                          "Federal University Oye-Ekiti",
                          "Federal University Wukari",
                          "Fountain University",
                          "Godfrey Okoye University",
                          "Gombe State University",
                          "Gregory University",
                          "Hallmark University",
                          "Hezekiah University",
                          "Igbinedion University",
                          "Imo State University",
                          "Joseph Ayo Babalola University",
                          "Kaduna State University",
                          "Kano University of Science and Technology",
                          "Kebbi State University of Science and Technology",
                          "Kogi State University",
                          "Kwara State University",
                          "Ladoke Akintola University of Technology",
                          "Lagos State University",
                          "Landmark University",
                          "Lead City University",
                          "Madonna University",
                          "Michael Okpara University of Agriculture",
                          "Modibbo Adama University of Technology",
                          "Mountain Top University",
                          "Nasarawa State University",
                          "Niger Delta University",
                          "Nile University of Nigeria",
                          "Nnamdi Azikiwe University",
                          "Northwest University",
                          "Novena University",
                          "Obafemi Awolowo University",
                          "Obong University",
                          "Oduduwa University",
                          "Olabisi Onabanjo University",
                          "Osun State University",
                          "Pan-Atlantic University",
                          "Paul University",
                          "Plateau State University",
                          "Redeemer's University",
                          "Renaissance University",
                          "Rhema University",
                          "Rivers State University",
                          "Salem University",
                          "Samuel Adegboyega University",
                          "Sokoto State University",
                          "Summit University",
                          "Taraba State University",
                          "Tansian University",
                          "University of Abuja",
                          "University of Agriculture and Environmental Sciences",
                          "University of Benin",
                          "University of Calabar",
                          "University of Ibadan",
                          "University of Ilorin",
                          "University of Jos",
                          "University of Lagos",
                          "University of Maiduguri",
                          "University of Nigeria, Nsukka",
                          "University of Port Harcourt",
                          "University of Uyo",
                          "Veritas University",
                          "Wesley University",
                          "Western Delta University",
                          "Yobe State University",
                          "Yusuf Maitama Sule University",
                        ]
                          .filter((uni) =>
                            uni.toLowerCase().includes(university.toLowerCase())
                          )
                          .sort()
                          .map((uni) => (
                            <div
                              key={uni}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={() => {
                                setUniversity(uni);
                                setUniversityOpen(false);
                              }}
                            >
                              {uni}
                            </div>
                          ))}
                        {[
                          "Abia State University",
                          "Abubakar Tafawa Balewa University",
                          "Achievers University",
                          "Adamawa State University",
                          "Adeleke University",
                          "Afe Babalola University",
                          "African University of Science and Technology",
                          "Ahmadu Bello University",
                          "Ajayi Crowther University",
                          "Akwa Ibom State University",
                          "Alex Ekwueme Federal University",
                          "American University of Nigeria",
                          "Anchor University",
                          "Augustine University",
                          "Babcock University",
                          "Baze University",
                          "Bayero University Kano",
                          "Bells University of Technology",
                          "Benson Idahosa University",
                          "Bingham University",
                          "Bowen University",
                          "Caleb University",
                          "Caritas University",
                          "Chrisland University",
                          "Christopher University",
                          "Clifford University",
                          "Coal City University",
                          "Covenant University",
                          "Crawford University",
                          "Cross River University of Technology",
                          "Delta State University",
                          "Eastern Palm University",
                          "Ebonyi State University",
                          "Edo University",
                          "Ekiti State University",
                          "Elizade University",
                          "Enugu State University of Science and Technology",
                          "Federal University Birnin Kebbi",
                          "Federal University Dutse",
                          "Federal University Dutsin-Ma",
                          "Federal University Gashua",
                          "Federal University Gusau",
                          "Federal University Kashere",
                          "Federal University Lafia",
                          "Federal University Lokoja",
                          "Federal University Ndufu-Alike",
                          "Federal University of Agriculture, Abeokuta",
                          "Federal University of Agriculture, Makurdi",
                          "Federal University of Petroleum Resources",
                          "Federal University of Technology, Akure",
                          "Federal University of Technology, Minna",
                          "Federal University of Technology, Owerri",
                          "Federal University Otuoke",
                          "Federal University Oye-Ekiti",
                          "Federal University Wukari",
                          "Fountain University",
                          "Godfrey Okoye University",
                          "Gombe State University",
                          "Gregory University",
                          "Hallmark University",
                          "Hezekiah University",
                          "Igbinedion University",
                          "Imo State University",
                          "Joseph Ayo Babalola University",
                          "Kaduna State University",
                          "Kano University of Science and Technology",
                          "Kebbi State University of Science and Technology",
                          "Kogi State University",
                          "Kwara State University",
                          "Ladoke Akintola University of Technology",
                          "Lagos State University",
                          "Landmark University",
                          "Lead City University",
                          "Madonna University",
                          "Michael Okpara University of Agriculture",
                          "Modibbo Adama University of Technology",
                          "Mountain Top University",
                          "Nasarawa State University",
                          "Niger Delta University",
                          "Nile University of Nigeria",
                          "Nnamdi Azikiwe University",
                          "Northwest University",
                          "Novena University",
                          "Obafemi Awolowo University",
                          "Obong University",
                          "Oduduwa University",
                          "Olabisi Onabanjo University",
                          "Osun State University",
                          "Pan-Atlantic University",
                          "Paul University",
                          "Plateau State University",
                          "Redeemer's University",
                          "Renaissance University",
                          "Rhema University",
                          "Rivers State University",
                          "Salem University",
                          "Samuel Adegboyega University",
                          "Sokoto State University",
                          "Summit University",
                          "Taraba State University",
                          "Tansian University",
                          "University of Abuja",
                          "University of Agriculture and Environmental Sciences",
                          "University of Benin",
                          "University of Calabar",
                          "University of Ibadan",
                          "University of Ilorin",
                          "University of Jos",
                          "University of Lagos",
                          "University of Maiduguri",
                          "University of Nigeria, Nsukka",
                          "University of Port Harcourt",
                          "University of Uyo",
                          "Veritas University",
                          "Wesley University",
                          "Western Delta University",
                          "Yobe State University",
                          "Yusuf Maitama Sule University",
                        ].filter((uni) =>
                          uni.toLowerCase().includes(university.toLowerCase())
                        ).length === 0 &&
                          university && (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              No universities found
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                {accountType === "seller" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signup-student-id">Matric Number*</Label>
                      <Input
                        id="signup-student-id"
                        placeholder="e.g., 19/55EC/00123"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">
                        WhatsApp Phone Number *
                      </Label>
                      <Input
                        id="signup-phone"
                        placeholder="e.g., +234 801 234 5678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use your WhatsApp number for easy communication with
                        buyers
                      </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                        <Shield className="h-4 w-4 inline mr-1" />
                        After signup, you'll be guided to upload your profile
                        picture and student ID Card for seller approval.
                      </p>
                    </div>
                  </>
                )}
                <Button
                  type="submit"
                  variant="brand"
                  className="w-full"
                  disabled={loading}
                >
                  <UserCheck className="h-4 w-4" />
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
                <div className="text-xs text-muted-foreground text-center">
                  <Shield className="h-3 w-3 inline mr-1" />
                  By signing up, you agree to keep all transactions on UniMarket
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="text-center">
          <p className="text-sm text-muted-foreground">
            Secure marketplace for Nigerian students
          </p>
        </CardFooter>
      </Card>

      <OnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      <SellerSetupModal
        open={showSellerSetup}
        onClose={() => {
          setShowSellerSetup(false);
          window.location.href = "/profile";
        }}
      />

      <BannedUserModal
        open={isBanned}
        userEmail={email}
        banReason={banReason}
      />
    </div>
  );
};

export default AuthPage;
