import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RefreshCw, UserCheck, Eye, IdCard, CheckSquare, UserX } from 'lucide-react';
import { Profile } from '@/lib/types';

interface SellerApprovalsTabProps {
  pendingSellers: Profile[];
  onApproveSeller: (userId: string, email: string, fullName: string) => Promise<void>;
  onRejectSeller: (userId: string, email: string, fullName: string) => Promise<void>;
  onRefresh: () => void;
}

export const SellerApprovalsTab: React.FC<SellerApprovalsTabProps> = ({
  pendingSellers,
  onApproveSeller,
  onRejectSeller,
  onRefresh,
}) => {
  const getImageUrl = (filePath: string | null) => {
    if (!filePath) return null;
    if (filePath.startsWith('http')) return filePath;
    return `https://ssqplkrxtrvfptrsnpow.supabase.co/storage/v1/object/public/verification-photos/${filePath}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Seller Account Approvals</CardTitle>
          <div className="flex items-center gap-2">
            {pendingSellers.length > 0 && (
              <Badge variant="secondary">
                {pendingSellers.length} pending
              </Badge>
            )}
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Approve or reject users who want to become sellers on the platform
        </p>
      </CardHeader>
      <CardContent>
        {pendingSellers.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pending seller approvals</h3>
            <p className="text-muted-foreground">
              All seller account requests have been processed
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>University</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Verification Photos</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingSellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={seller.avatar_url} alt={seller.full_name} />
                          <AvatarFallback className="bg-university-green text-white text-sm">
                            {seller.full_name ? seller.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{seller.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">ID: {seller.user_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{seller.email}</p>
                    </TableCell>
                    <TableCell>{seller.university_name || 'N/A'}</TableCell>
                    <TableCell>{seller.campus || 'N/A'}</TableCell>
                    <TableCell>
                      {new Date(seller.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {seller.face_photo_url && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Face Photo
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Face Verification Photo</DialogTitle>
                              </DialogHeader>
                              <div className="flex justify-center">
                                <img 
                                  src={getImageUrl(seller.face_photo_url)}
                                  alt="Face verification"
                                  className="max-w-full max-h-96 object-contain border rounded"
                                  onError={(e) => {
                                    const target = e.currentTarget as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {seller.student_id_photo_url && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <IdCard className="h-4 w-4 mr-1" />
                                ID Photo
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Student ID Verification Photo</DialogTitle>
                              </DialogHeader>
                              <div className="flex justify-center">
                                <img 
                                  src={getImageUrl(seller.student_id_photo_url)}
                                  alt="Student ID verification"
                                  className="max-w-full max-h-96 object-contain border rounded"
                                  onError={(e) => {
                                    const target = e.currentTarget as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="default" size="sm">
                              <CheckSquare className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve Seller Application</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to approve {seller.full_name}'s seller application? 
                                This will allow them to list items on the marketplace and they will receive 
                                an email notification.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => onApproveSeller(seller.user_id, seller.email, seller.full_name || 'User')}
                              >
                                Approve
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <UserX className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reject Seller Application</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to reject {seller.full_name}'s seller application? 
                                Their account will be converted to buyer-only and they will receive 
                                an email notification.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => onRejectSeller(seller.user_id, seller.email, seller.full_name || 'User')}
                              >
                                Reject
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};