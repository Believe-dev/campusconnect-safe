import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, IdCard, CheckCircle, ArrowRight } from 'lucide-react';

interface SellerSetupModalProps {
  open: boolean;
  onClose: () => void;
}

export const SellerSetupModal = ({ open, onClose }: SellerSetupModalProps) => {
  const [step, setStep] = useState(1);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Complete Your Seller Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {step === 1 && (
            <Card>
              <CardContent className="p-6 text-center">
                <Camera className="h-12 w-12 text-university-green mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Step 1: Upload Profile Picture</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a clear photo of your face. This will be your profile picture and used for verification.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Tip:</strong> Use good lighting and face the camera directly for best results.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardContent className="p-6 text-center">
                <IdCard className="h-12 w-12 text-university-green mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Step 2: Upload Student ID Card</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Take a clear photo of your student ID card. Make sure all text is readable.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    <strong>Important:</strong> Your student ID must match the details you provided during signup.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Ready for Approval!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you upload both documents, our admin team will review your seller application within 24-48 hours.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-800">
                    <strong>Next:</strong> You'll be redirected to your profile page to upload the documents.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between items-center pt-4">
            <div className="flex space-x-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i <= step ? 'bg-university-green' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <Button onClick={handleNext} variant="brand">
              {step < 3 ? (
                <>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                'Go to Profile'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};