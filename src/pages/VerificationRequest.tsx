import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Upload, AlertCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Alert, AlertDescription } from '@/components/ui/alert';

const VerificationRequest = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [reason, setReason] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [canRequest, setCanRequest] = useState(false);

  useEffect(() => {
    if (user) {
      checkProfile();
    }
  }, [user]);

  const checkProfile = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, university_name, student_id, phone_number, account_type, student_id_photo_url, avatar_url')
      .eq('user_id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      
      const hasRequiredFields = profileData.full_name && 
                               profileData.university_name && 
                               profileData.phone_number &&
                               (profileData.account_type === 'seller' || profileData.account_type === 'both');
      
      const hasPhotos = profileData.avatar_url && profileData.student_id_photo_url;
      
      setCanRequest(hasRequiredFields && hasPhotos);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reason.trim()) return;

    setLoading(true);
    try {

      
      // Upload documents if any
      const documentUrls = [];
      for (const doc of documents) {
        const fileExt = doc.name.split('.').pop();
        const fileName = `verification/${user.id}/${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('verification-photos')
          .upload(fileName, doc);
        
        if (error) throw error;
        documentUrls.push(data.path);
      }

      // Create verification request
      const { error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          reason: reason.trim(),
          documents: documentUrls,
          status: 'pending'
        });

      if (error) {
        console.error('Verification request error:', error);
        throw error;
      }

      // Notify admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins) {
        for (const admin of admins) {
          const { error: adminNotifError } = await supabase.from('notifications').insert({
            user_id: admin.user_id,
            title: 'New Verification Request 📝',
            message: `${profile?.full_name || 'User'} has requested verification: ${reason.substring(0, 50)}...`,
            type: 'info'
          });
          
          if (adminNotifError) {
            console.error('Failed to notify admin:', adminNotifError);
          }
        }
      }
      
      // Send confirmation notification to user
      const { error: userNotifError } = await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Verification Request Submitted ✅',
        message: 'Your verification request has been submitted and is under review. You will be notified once it is processed.',
        type: 'success'
      });
      
      if (userNotifError) {
        console.error('Failed to create user confirmation notification:', userNotifError);
      }

      toast({
        title: "Request Submitted",
        description: "Your verification request has been submitted for review.",
      });

      navigate('/profile');
    } catch (error) {
      console.error('Error submitting verification request:', error);
      toast({
        title: "Error",
        description: "Failed to submit verification request.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Request Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!canRequest ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You need to complete your profile before requesting verification.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Required for Verification:</h3>
                  <div className="space-y-1 text-sm">
                    <p className={profile?.full_name ? 'text-green-600' : 'text-red-600'}>
                      {profile?.full_name ? '✓' : '✗'} Complete profile information
                    </p>
                    <p className={profile?.avatar_url ? 'text-green-600' : 'text-red-600'}>
                      {profile?.avatar_url ? '✓' : '✗'} Profile photo (will be used as face verification)
                    </p>
                    <p className={profile?.student_id_photo_url ? 'text-green-600' : 'text-red-600'}>
                      {profile?.student_id_photo_url ? '✓' : '✗'} Student ID photo
                    </p>
                    <p className={(profile?.account_type === 'seller' || profile?.account_type === 'both') ? 'text-green-600' : 'text-red-600'}>
                      {(profile?.account_type === 'seller' || profile?.account_type === 'both') ? '✓' : '✗'} Seller account
                    </p>
                  </div>
                </div>
                
                <Button onClick={() => navigate('/profile')} className="w-full">
                  Complete Profile
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Verification Process</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>✓ Your profile photo will be used as face verification</p>
                    <p>✓ Your uploaded student ID will be used for identity verification</p>
                    <p>• Only provide your reason and any additional supporting documents</p>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="reason">Reason for Verification *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Explain why you need verification (e.g., I'm a trusted seller, student representative, active community member, etc.)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="documents">Additional Supporting Documents (Optional)</Label>
                  <Input
                    id="documents"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => setDocuments(Array.from(e.target.files || []))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload certificates, awards, or other documents that support your verification request
                  </p>
                </div>

                <Button type="submit" disabled={loading || !reason.trim()} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? 'Submitting...' : 'Submit Verification Request'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VerificationRequest;