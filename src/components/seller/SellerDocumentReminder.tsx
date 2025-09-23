import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/enhanced-button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Camera, IdCard, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { emailService } from '@/utils/emailService';

interface Profile {
  avatar_url: string | null;
  student_id_photo_url: string | null;
  account_type: string;
  created_at: string;
  is_banned: boolean;
  email?: string;
  full_name?: string;
}

export const SellerDocumentReminder = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [daysSinceSignup, setDaysSinceSignup] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [hiddenUntil, setHiddenUntil] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
      checkHiddenStatus();
    }
  }, [user]);

  const checkHiddenStatus = () => {
    const hidden = localStorage.getItem(`seller_reminder_hidden_${user?.id}`);
    if (hidden) {
      const hiddenTime = parseInt(hidden);
      if (Date.now() < hiddenTime) {
        setHiddenUntil(hiddenTime);
      } else {
        localStorage.removeItem(`seller_reminder_hidden_${user?.id}`);
      }
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url, student_id_photo_url, account_type, created_at, is_banned')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setProfile(data);
      const days = Math.floor((Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24));
      setDaysSinceSignup(days);
    }
  };

  if (!profile || !['seller', 'both'].includes(profile.account_type) || dismissed || profile.is_banned || hiddenUntil) {
    return null;
  }

  const hasProfilePicture = !!profile.avatar_url;
  const hasStudentId = !!profile.student_id_photo_url;
  const isComplete = hasProfilePicture && hasStudentId;

  if (isComplete || daysSinceSignup > 4) {
    return null;
  }

  const getAlertVariant = () => {
    if (daysSinceSignup >= 4) return 'destructive';
    if (daysSinceSignup >= 3) return 'destructive';
    return 'default';
  };

  const getMessage = () => {
    switch (daysSinceSignup) {
      case 1:
        return 'Complete your seller profile by uploading your profile picture and student ID card.';
      case 2:
        return 'Your seller profile is still incomplete. Upload the required documents to start selling.';
      case 3:
        return 'Final reminder: Upload your documents within 24 hours to maintain your seller status.';
      case 4:
        return '⚠️ URGENT: Your seller features may be restricted today if documents are not uploaded. This maintains platform security.';
      default:
        return 'Upload your profile picture and student ID card to complete your seller profile.';
    }
  };

  return (
    <>
      {/* Fixed popup overlay */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
        <Card className={`max-w-md w-full ${daysSinceSignup >= 3 ? 'border-red-500 bg-red-50' : 'border-orange-500 bg-orange-50'}`}>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <AlertTriangle className={`h-12 w-12 mx-auto ${daysSinceSignup >= 3 ? 'text-red-500' : 'text-orange-500'}`} />
              
              <h3 className="font-bold text-lg">
                {daysSinceSignup >= 4 ? '🚨 URGENT: Account at Risk!' : '⚠️ Complete Your Seller Profile'}
              </h3>
              
              <p className="text-sm font-medium">
                {getMessage()}
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Camera className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Profile Picture: {hasProfilePicture ? '✅ Done' : '❌ Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <IdCard className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Student ID: {hasStudentId ? '✅ Done' : '❌ Missing'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  variant={daysSinceSignup >= 3 ? 'destructive' : 'brand'}
                  onClick={() => {
                    // Hide reminder for 24 hours
                    const hideUntil = Date.now() + (24 * 60 * 60 * 1000);
                    localStorage.setItem(`seller_reminder_hidden_${user?.id}`, hideUntil.toString());
                    setHiddenUntil(hideUntil);
                    
                    // Send notification to database and email
                    if (user && profile) {
                      const notificationTitle = '📋 Documents Required for Seller Approval';
                      const notificationMessage = 'You must upload your profile picture and student ID card to get approved as a seller. Your application cannot be processed without these documents.';
                      
                      // Database notification
                      supabase.from('notifications').insert({
                        user_id: user.id,
                        title: notificationTitle,
                        message: notificationMessage,
                        type: 'warning'
                      });
                      
                      // Email notification
                      emailService.sendNotificationEmail(
                        (profile as any).email,
                        (profile as any).full_name,
                        notificationTitle,
                        notificationMessage
                      );
                    }
                    
                    toast({
                      title: "Reminder Hidden",
                      description: "Your seller approval can't be granted without uploading required documents. This reminder will return tomorrow.",
                      variant: "destructive",
                    });
                    
                    navigate('/profile');
                  }}
                >
                  Upload Documents Now
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline" 
                  onClick={() => setDismissed(true)}
                >
                  Remind Me Later
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};