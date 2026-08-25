import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileCompletionModalProps {
  open: boolean;
  onClose: () => void;
  missingFields: string[];
  onComplete: () => void;
}

export const ProfileCompletionModal = ({ 
  open, 
  onClose, 
  missingFields, 
  onComplete 
}: ProfileCompletionModalProps) => {
  const navigate = useNavigate();
  
  const handleComplete = () => {
    onComplete();
    navigate('/profile');
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Complete Your Profile
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To start selling and get verified, please complete the following required fields:
          </p>
          
          <div className="space-y-2">
            {missingFields.map((field) => (
              <div key={field} className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 bg-orange-500 rounded-full" />
                <span>{field}</span>
              </div>
            ))}
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Why complete your profile?</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Get verified faster</li>
                  <li>• Build buyer trust</li>
                  <li>• Access all seller features</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Later
            </Button>
            <Button onClick={handleComplete} className="flex-1">
              Complete Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};