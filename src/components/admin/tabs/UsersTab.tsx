import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Download, UserX, UserCheck, Edit, Ban, Shield } from 'lucide-react';
import { Profile } from '@/lib/types';

interface UsersTabProps {
  users: Profile[];
  onToggleBan: (userId: string, isBanned: boolean) => Promise<void>;
  onUpdateRole: (userId: string, role: 'admin' | 'seller' | 'buyer') => Promise<void>;
  onToggleVerification: (userId: string, isVerified: boolean, email: string, fullName: string) => Promise<void>;
  onExportData: () => void;
  onBulkAction: (action: 'ban' | 'unban', userIds: string[]) => Promise<void>;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  onToggleBan,
  onUpdateRole,
  onToggleVerification,
  onExportData,
  onBulkAction,
}) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(userFilter.toLowerCase()) ||
                         user.email?.toLowerCase().includes(userFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && !user.is_banned) ||
                         (statusFilter === 'banned' && user.is_banned);
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(u => u.user_id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>User Management</CardTitle>
          <div className="flex gap-2">
            <Button onClick={onExportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {selectedUsers.length > 0 && (
              <div className="flex gap-2">
                <Button 
                  onClick={() => onBulkAction('ban', selectedUsers)}
                  variant="outline" 
                  size="sm"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Ban Selected
                </Button>
                <Button 
                  onClick={() => onBulkAction('unban', selectedUsers)}
                  variant="outline" 
                  size="sm"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Unban Selected
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Campus</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.user_id)}
                      onCheckedChange={(checked) => handleSelectUser(user.user_id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.account_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_banned ? 'destructive' : 'default'}>
                      {user.is_banned ? 'Banned' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.campus || 'N/A'}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <p><strong>Name:</strong> {selectedUser?.full_name}</p>
                              <p><strong>Email:</strong> {selectedUser?.email}</p>
                            </div>
                            <div>
                              <label>Role</label>
                              <Select onValueChange={(value: 'admin' | 'seller' | 'buyer') => 
                                onUpdateRole(user.user_id, value)
                              }>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="buyer">Buyer</SelectItem>
                                  <SelectItem value="seller">Seller</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant={user.is_verified ? "outline" : "default"}
                              size="sm"
                              onClick={() => onToggleVerification(
                                user.user_id, 
                                user.is_verified, 
                                user.email, 
                                user.full_name
                              )}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              {user.is_verified ? 'Remove Verification' : 'Verify User'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Ban className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {user.is_banned ? 'Unban' : 'Ban'} User
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to {user.is_banned ? 'unban' : 'ban'} {user.full_name}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onToggleBan(user.user_id, user.is_banned)}
                            >
                              {user.is_banned ? 'Unban' : 'Ban'}
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
      </CardContent>
    </Card>
  );
};