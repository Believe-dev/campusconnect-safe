import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  RefreshCw, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Search,
  CreditCard,
  Ban
} from 'lucide-react';

interface SellerSubscription {
  user_id: string;
  full_name: string;
  email: string;
  university_name: string;
  seller_features_active: boolean;
  seller_subscription_expires_at: string | null;
  seller_subscription_type: string;
  seller_last_payment_date: string | null;
  subscription_status: 'No Subscription' | 'Expired' | 'Expiring Soon' | 'Active';
  days_remaining: number;
  total_subscriptions: number;
  total_paid: number;
}

export const SellerSubscriptionManager = () => {
  const [subscriptions, setSubscriptions] = useState<SellerSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      
      // Query profiles and seller_subscriptions to get total_paid
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          email,
          university_name,
          seller_features_active,
          seller_subscription_expires_at,
          seller_subscription_type,
          seller_last_payment_date
        `)
        .in('account_type', ['seller', 'both'])
        .order('seller_subscription_expires_at', { ascending: true, nullsFirst: false });

      if (error) throw error;

      // Get total paid amounts for each user (all subscriptions, not just active)
      const { data: subscriptionTotals, error: totalsError } = await supabase
        .from('seller_subscriptions')
        .select('user_id, amount');

      if (totalsError) console.error('Error fetching subscription totals:', totalsError);

      // Calculate totals by user
      const totalsByUser = (subscriptionTotals || []).reduce((acc, sub) => {
        acc[sub.user_id] = (acc[sub.user_id] || 0) + (sub.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      // Process data to add calculated fields
      const processedData = (profiles || []).map(profile => {
        const expiresAt = profile.seller_subscription_expires_at;
        let subscriptionStatus = 'No Subscription';
        let daysRemaining = -1;
        let sortPriority = 1000;

        if (expiresAt) {
          const expiryDate = new Date(expiresAt);
          const now = new Date();
          const diffTime = expiryDate.getTime() - now.getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (daysRemaining <= 0) {
            subscriptionStatus = 'Expired';
            daysRemaining = 0;
            sortPriority = 0;
          } else if (daysRemaining <= 7) {
            subscriptionStatus = 'Expiring Soon';
            sortPriority = daysRemaining;
          } else {
            subscriptionStatus = 'Active';
            sortPriority = daysRemaining;
          }
        } else {
          sortPriority = -1;
        }

        if (!profile.seller_features_active) {
          sortPriority = -2;
        }

        return {
          ...profile,
          subscription_status: subscriptionStatus,
          days_remaining: daysRemaining,
          sort_priority: sortPriority,
          total_subscriptions: 0,
          total_paid: totalsByUser[profile.user_id] || 0
        };
      });

      processedData.sort((a, b) => {
        return a.sort_priority - b.sort_priority;
      });

      setSubscriptions(processedData);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch seller subscriptions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const extendSubscription = async (userId: string, days: number) => {
    try {
      // Direct database update (migration functions not available yet)
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('seller_subscription_expires_at')
        .eq('user_id', userId)
        .single();

      const currentExpiry = currentProfile?.seller_subscription_expires_at 
        ? new Date(currentProfile.seller_subscription_expires_at)
        : new Date();
      
      const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + (days * 24 * 60 * 60 * 1000));

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          seller_subscription_expires_at: newExpiry.toISOString(),
          seller_features_active: true,
          seller_subscription_type: 'monthly',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Update Error:', updateError);
        throw updateError;
      }

      // Send notification
      try {
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'subscription_extended',
            title: 'Subscription Extended',
            message: `Your seller subscription has been extended by ${days} days by an administrator.`,
            created_at: new Date().toISOString()
          });
      } catch (notifError) {
        console.log('Notification error (non-critical):', notifError);
      }

      toast({
        title: 'Success',
        description: `Subscription extended by ${days} days`,
      });
      
      fetchSubscriptions();
    } catch (error) {
      console.error('Error extending subscription:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to extend subscription: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  const toggleSellerFeatures = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          seller_features_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Send notification
      try {
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: currentStatus ? 'features_disabled' : 'features_enabled',
            title: currentStatus ? 'Seller Features Disabled' : 'Seller Features Enabled',
            message: currentStatus 
              ? 'Your seller features have been disabled by an administrator.'
              : 'Your seller features have been enabled by an administrator.',
            created_at: new Date().toISOString()
          });
      } catch (notifError) {
        console.log('Notification error (non-critical):', notifError);
      }

      toast({
        title: 'Success',
        description: `Seller features ${!currentStatus ? 'enabled' : 'disabled'}`,
      });
      
      fetchSubscriptions();
    } catch (error) {
      console.error('Error toggling seller features:', error);
      toast({
        title: 'Error',
        description: 'Failed to update seller features',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string, daysRemaining: number) => {
    switch (status) {
      case 'Active':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active ({daysRemaining} days)
          </Badge>
        );
      case 'Expiring Soon':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Expiring ({daysRemaining} days)
          </Badge>
        );
      case 'Expired':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            No Subscription
          </Badge>
        );
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.full_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      sub.email?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      sub.university_name?.toLowerCase().includes(searchFilter.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      sub.subscription_status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.subscription_status === 'Active').length,
    expiring: subscriptions.filter(s => s.subscription_status === 'Expiring Soon').length,
    expired: subscriptions.filter(s => s.subscription_status === 'Expired').length,
    totalRevenue: subscriptions.reduce((sum, s) => sum + (s.total_paid || 0), 0),
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sellers</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.expiring}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Seller Subscription Management</CardTitle>
            <Button onClick={fetchSubscriptions} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sellers by name, email, or university..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expiring soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="no subscription">No Subscription</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>University</TableHead>
                  <TableHead>Subscription Status</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Features Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((subscription) => (
                  <TableRow key={subscription.user_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{subscription.full_name}</p>
                        <p className="text-sm text-muted-foreground">{subscription.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{subscription.university_name || 'N/A'}</TableCell>
                    <TableCell>
                      {getStatusBadge(subscription.subscription_status, subscription.days_remaining)}
                    </TableCell>
                    <TableCell>
                      {subscription.seller_last_payment_date 
                        ? new Date(subscription.seller_last_payment_date).toLocaleDateString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>₦{(subscription.total_paid || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={subscription.seller_features_active ? 'default' : 'destructive'}>
                        {subscription.seller_features_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {/* Extend Subscription Dialog */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Calendar className="h-4 w-4 mr-1" />
                              Extend
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Extend Subscription</DialogTitle>
                              <DialogDescription>
                                Extend {subscription.full_name}'s seller subscription
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <Button 
                                  onClick={() => extendSubscription(subscription.user_id, 7)}
                                  variant="outline"
                                >
                                  +7 Days
                                </Button>
                                <Button 
                                  onClick={() => extendSubscription(subscription.user_id, 30)}
                                  variant="outline"
                                >
                                  +30 Days
                                </Button>
                              </div>
                              <div className="flex gap-2">
                                <Input 
                                  type="number" 
                                  placeholder="Custom days"
                                  id={`custom-days-${subscription.user_id}`}
                                />
                                <Button 
                                  onClick={() => {
                                    const input = document.getElementById(`custom-days-${subscription.user_id}`) as HTMLInputElement;
                                    const days = parseInt(input.value);
                                    if (days > 0) {
                                      extendSubscription(subscription.user_id, days);
                                    }
                                  }}
                                >
                                  Extend
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Toggle Features */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant={subscription.seller_features_active ? "destructive" : "default"} 
                              size="sm"
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              {subscription.seller_features_active ? 'Disable' : 'Enable'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {subscription.seller_features_active ? 'Disable' : 'Enable'} Seller Features
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to {subscription.seller_features_active ? 'disable' : 'enable'} seller features for {subscription.full_name}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => toggleSellerFeatures(subscription.user_id, subscription.seller_features_active)}
                              >
                                {subscription.seller_features_active ? 'Disable' : 'Enable'}
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
    </div>
  );
};