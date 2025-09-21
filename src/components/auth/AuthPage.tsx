import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, UserCheck, Mail, Upload, Camera, IdCard, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User, Session } from '@supabase/supabase-js';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { SellerSetupModal } from '@/components/seller/SellerSetupModal';
import { BannedUserModal } from '@/components/auth/BannedUserModal';

const AuthPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [accountType, setAccountType] = useState<'buyer' | 'seller'>('buyer');

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSellerSetup, setShowSellerSetup] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
          full_name: fullName,
          university_name: university,
          student_id: studentId,
          phone_number: phoneNumber,
          account_type: finalAccountType,
        }
      }
    });

    // Create notification for sellers to upload documents
    if (!error && data.user && accountType === 'seller') {
      await supabase.from('notifications').insert({
        user_id: data.user.id,
        title: 'Complete Your Seller Profile',
        message: 'Upload your profile picture and student ID card to get approved as a seller.',
        type: 'seller_setup'
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
        .from('profiles')
        .select('is_banned, admin_notes')
        .eq('user_id', data.user.id)
        .single();
      
      if (profile?.is_banned) {
        setIsBanned(true);
        setBanReason(profile.admin_notes || 'No reason provided');
        await supabase.auth.signOut();
        return { error: new Error('Account is banned') };
      }
    }
    
    return { error };
  };

  const handleAuth = async (isSignUp: boolean) => {
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

      // Different validation for buyers vs sellers
      if (isSignUp && accountType === 'buyer') {
        // Buyers need minimal information
        if (!fullName || !university) {
          toast({
            title: "Missing Information", 
            description: "Please fill in your name and university.",
            variant: "destructive",
          });
          return;
        }
      } else if (isSignUp && accountType === 'seller') {
        // Sellers need complete information
        if (!fullName || !university || !studentId || !phoneNumber) {
          toast({
            title: "Missing Information", 
            description: "Please fill in all required fields: name, university, student ID, and phone number.",
            variant: "destructive",
          });
          return;
        }

        // Validate school email for sellers
        if (!email.includes('.edu') && !email.includes('student') && !email.includes('school') && !email.includes('university')) {
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
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    } else if (isSignUp) {
      const message = accountType === 'seller' 
        ? "Account created! Please check your email to verify. Your seller account will be reviewed by admin for approval."
        : "Account created! Please check your email to verify your account.";
      toast({
        title: "Account Created!",
        description: message,
      });
      
      // Show setup modal for sellers, onboarding for buyers
      if (accountType === 'seller') {
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
            <h1 className="text-2xl font-bold text-university-green">UniMarket</h1>
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
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your university email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button 
                variant="brand" 
                className="w-full" 
                onClick={() => handleAuth(false)}
                disabled={loading}
              >
                <Mail className="h-4 w-4" />
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select value={accountType} onValueChange={(value: 'buyer' | 'seller') => setAccountType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">{accountType === 'seller' ? 'University Email' : 'Email'}</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder={accountType === 'seller' ? 'student@university.edu.ng' : 'your@email.com'}
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                <Select value={university} onValueChange={setUniversity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your university" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="University of Lagos">University of Lagos</SelectItem>
                    <SelectItem value="University of Ibadan">University of Ibadan</SelectItem>
                    <SelectItem value="Ahmadu Bello University">Ahmadu Bello University</SelectItem>
                    <SelectItem value="University of Nigeria, Nsukka">University of Nigeria, Nsukka</SelectItem>
                    <SelectItem value="Obafemi Awolowo University">Obafemi Awolowo University</SelectItem>
                    <SelectItem value="University of Benin">University of Benin</SelectItem>
                    <SelectItem value="Federal University of Technology, Akure">Federal University of Technology, Akure</SelectItem>
                    <SelectItem value="Lagos State University">Lagos State University</SelectItem>
                    <SelectItem value="Covenant University">Covenant University</SelectItem>
                    <SelectItem value="Babcock University">Babcock University</SelectItem>
                    <SelectItem value="University of Port Harcourt">University of Port Harcourt</SelectItem>
                    <SelectItem value="Federal University of Technology, Minna">Federal University of Technology, Minna</SelectItem>
                    <SelectItem value="University of Calabar">University of Calabar</SelectItem>
                    <SelectItem value="Bayero University Kano">Bayero University Kano</SelectItem>
                    <SelectItem value="University of Jos">University of Jos</SelectItem>
                    <SelectItem value="Federal University, Oye-Ekiti">Federal University, Oye-Ekiti</SelectItem>
                    <SelectItem value="Nnamdi Azikiwe University">Nnamdi Azikiwe University</SelectItem>
                    <SelectItem value="University of Uyo">University of Uyo</SelectItem>
                    <SelectItem value="Rivers State University">Rivers State University</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>



              {accountType === 'seller' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="signup-student-id">Student ID *</Label>
                    <Input
                      id="signup-student-id"
                      placeholder="e.g., 19/55EC/00123"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number *</Label>
                    <Input
                      id="signup-phone"
                      placeholder="e.g., +234 801 234 5678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>



                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <Shield className="h-4 w-4 inline mr-1" />
                      After signup, you'll be guided to upload your profile picture and student ID for seller approval.
                    </p>
                  </div>
                </>
              )}
              <Button 
                variant="brand" 
                className="w-full" 
                onClick={() => handleAuth(true)}
                disabled={loading}
              >
                <UserCheck className="h-4 w-4" />
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
              <div className="text-xs text-muted-foreground text-center">
                <Shield className="h-3 w-3 inline mr-1" />
                By signing up, you agree to keep all transactions on UniMarket
              </div>
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
          window.location.href = '/profile';
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