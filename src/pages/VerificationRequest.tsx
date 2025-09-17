import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Upload } from 'lucide-react';
import Header from '@/components/layout/Header';

const VerificationRequest = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [reason, setReason] = useState('');
  const [studentIdPhoto, setStudentIdPhoto] = useState<File | null>(null);
  const [hasStudentIdPhoto, setHasStudentIdPhoto] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reason.trim()) return;

    // Check if user has complete profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, university_name, student_id, phone_number, account_type, student_id_photo_url')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      toast({
        title: "Error",
        description: "Profile not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Check required fields (student_id is optional)
    const missingFields = [];
    if (!profile.full_name) missingFields.push('Full Name');
    if (!profile.university_name) missingFields.push('University');
    if (!profile.phone_number) missingFields.push('Phone Number');
    
    if (missingFields.length > 0) {
      toast({
        title: "Complete Your Profile",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    if (profile.account_type === 'buyer') {
      toast({
        title: "Sellers Only",
        description: "Only sellers can request verification.",
        variant: "destructive",
      });
      return;
    }

    setHasStudentIdPhoto(!!profile.student_id_photo_url);

    setLoading(true);
    try {
      // Upload student ID photo if provided
      if (studentIdPhoto) {
        const fileExt = studentIdPhoto.name.split('.').pop();
        const fileName = `${user.id}/student_id-${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('verification-photos')
          .upload(fileName, studentIdPhoto);
        
        if (error) throw error;
        
        // Update profile with student ID photo
        await supabase
          .from('profiles')
          .update({ student_id_photo_url: data.path })
          .eq('user_id', user.id);
      }
      
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
            message: `${profile.full_name} has requested verification: ${reason.substring(0, 50)}...`,
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="reason">Reason for Verification</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why you need verification (e.g., I'm a trusted seller, student representative, etc.)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>
              
              {!hasStudentIdPhoto && (
                <div>
                  <Label htmlFor="student-id">Student ID Photo *</Label>
                  <Input
                    id="student-id"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setStudentIdPhoto(e.target.files?.[0] || null)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a clear photo of your student ID card
                  </p>
                </div>
              )}
              
              <div>
                <Label htmlFor="documents">Supporting Documents (Optional)</Label>
                <Input
                  id="documents"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={(e) => setDocuments(Array.from(e.target.files || []))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload certificates or other supporting documents
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VerificationRequest;