import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, GraduationCap, UserCheck, Mail, Upload, Camera, IdCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User, Session } from '@supabase/supabase-js';

const AuthPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [campus, setCampus] = useState('');
  const [accountType, setAccountType] = useState<'buyer' | 'seller'>('buyer');
  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [studentIdPhoto, setStudentIdPhoto] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // THEN check for existing session
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

  const uploadVerificationPhoto = async (file: File, type: 'face' | 'student_id', userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${type}-${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('verification-photos')
      .upload(fileName, file);
    
    if (error) throw error;
    return data.path;
  };

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
          campus: campus,
          student_id: '',
          account_type: finalAccountType,
        }
      }
    });

    // If seller registration, upload verification photos and set verification status
    if (!error && data.user && accountType === 'seller' && facePhoto) {
      try {
        const facePhotoPath = await uploadVerificationPhoto(facePhoto, 'face', data.user.id);
        let studentIdPhotoPath = null;
        
        if (studentIdPhoto) {
          studentIdPhotoPath = await uploadVerificationPhoto(studentIdPhoto, 'student_id', data.user.id);
        }
        
        // Build public URL for face photo
        const publicUrl = `https://ssqplkrxtrvfptrsnpow.supabase.co/storage/v1/object/public/verification-photos/${facePhotoPath}`;
        console.log('Setting avatar URL:', publicUrl);

        // Update profile with all seller data
        const updateData: any = {
          full_name: fullName,
          university_name: university,
          campus: campus,
          face_photo_url: facePhotoPath,
          avatar_url: publicUrl,
          seller_status: 'pending',
        };
        
        if (studentIdPhotoPath) {
          updateData.student_id_photo_url = studentIdPhotoPath;
        }
        
        await supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', data.user.id);

        // Add seller role
        await supabase
          .from('user_roles')
          .insert({ user_id: data.user.id, role: 'seller' });
      } catch (uploadError) {
        console.error('Error uploading verification photos:', uploadError);
      }
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
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
        // Buyers only need email and password (any email allowed)
        if (!fullName) {
          toast({
            title: "Missing Information", 
            description: "Please provide your full name.",
            variant: "destructive",
          });
          return;
        }
      } else if (isSignUp && accountType === 'seller') {
        // Sellers need more strict validation
        if (!fullName || !university) {
          toast({
            title: "Missing Information", 
            description: "Sellers must provide their name and university.",
            variant: "destructive",
          });
          return;
        }

        // Validate .edu.ng email for sellers
        if (!email.endsWith('.edu.ng') && !email.includes('student')) {
          toast({
            title: "Invalid Email",
            description: "Sellers must use a valid university email address (.edu.ng) or student email.",
            variant: "destructive",
          });
          return;
        }

        // Require face photo for sellers (mandatory)
        if (!facePhoto) {
          toast({
            title: "Face Photo Required",
            description: "Sellers must upload a clear face photo for verification.",
            variant: "destructive",
          });
          return;
        }

        // Student ID is optional but recommended
        if (!studentIdPhoto) {
          toast({
            title: "Student ID Recommended",
            description: "Adding your student ID helps with faster verification.",
          });
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
            <GraduationCap className="h-8 w-8 text-university-green" />
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
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
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
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {accountType === 'seller' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name *</Label>
                    <Input
                      id="signup-name"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </>
              )}

              {accountType === 'buyer' && (
                <div className="space-y-2">
                  <Label htmlFor="buyer-name">Full Name *</Label>
                  <Input
                    id="buyer-name"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              )}

              {accountType === 'seller' && (
                <>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-university">University *</Label>
                    <Input
                      id="signup-university"
                      placeholder="University of Lagos"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-campus">Campus (Optional)</Label>
                    <Input
                      id="signup-campus"
                      placeholder="Main Campus"
                      value={campus}
                      onChange={(e) => setCampus(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Face Photo *</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFacePhoto(e.target.files?.[0] || null)}
                      />
                      <Camera className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">Clear photo of your face for verification</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Student ID Card Photo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setStudentIdPhoto(e.target.files?.[0] || null)}
                      />
                      <IdCard className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">Photo of your student ID card (helps with faster verification)</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <Shield className="h-4 w-4 inline mr-1" />
                      Your seller account will be reviewed by our admin team before approval.
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
    </div>
  );
};

export default AuthPage;