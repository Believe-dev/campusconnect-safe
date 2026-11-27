import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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

// Extracted so the custom-days confirmation can hold its own pending-amount
// state - the surrounding table renders one of these per row inside a
// .map(), where hooks can't live directly.
const ExtendSubscriptionDialog = ({
  fullName,
  onExtend,
}: {
  fullName: string;
  onExtend: (days: number) => void;
}) => {
  const [customDays, setCustomDays] = useState('');
  const [confirmDays, setConfirmDays] = useState<number | null>(null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-flora-ink/15 bg-white px-3.5 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
        >
          <Calendar className="h-4 w-4" />
          Extend
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-flora-ink">Extend Subscription</DialogTitle>
          <DialogDescription className="text-flora-muted">
            Extend {fullName}'s seller subscription
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setConfirmDays(7)}
              className="inline-flex items-center justify-center rounded-full border border-flora-ink/15 bg-white px-4 py-2 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
            >
              +7 Days
            </button>
            <button
              type="button"
              onClick={() => setConfirmDays(30)}
              className="inline-flex items-center justify-center rounded-full border border-flora-ink/15 bg-white px-4 py-2 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
            >
              +30 Days
            </button>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Custom days"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                const days = parseInt(customDays, 10);
                if (days > 0) {
                  setConfirmDays(days);
                }
              }}
              className="inline-flex items-center justify-center rounded-full bg-flora-ink px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
            >
              Extend
            </button>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={confirmDays !== null} onOpenChange={(open) => !open && setConfirmDays(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-flora-ink">Confirm Extension</AlertDialogTitle>
            <AlertDialogDescription className="text-flora-muted">
              Extend {fullName}'s seller subscription by {confirmDays} day{confirmDays === 1 ? '' : 's'}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDays(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDays !== null) {
                  onExtend(confirmDays);
                }
                setConfirmDays(null);
                setCustomDays('');
              }}
            >
              Extend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

interface SellerSubscriptionManagerProps {
  // Lets the nav sidebar show a real expiring/expired badge without this
  // component's own fetch being duplicated at the Admin.tsx level.
  onCountsChange?: (expiringOrExpired: number) => void;
}

export const SellerSubscriptionManager = ({ onCountsChange }: SellerSubscriptionManagerProps = {}) => {
  const [subscriptions, setSubscriptions] = useState<SellerSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    const expiring = subscriptions.filter(s => s.subscription_status === 'Expiring Soon').length;
    const expired = subscriptions.filter(s => s.subscription_status === 'Expired').length;
    onCountsChange?.(expiring + expired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptions]);

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

        // Override status if features are not active
        if (!profile.seller_features_active && expiresAt) {
          const expiryDate = new Date(expiresAt);
          const now = new Date();
          if (expiryDate > now) {
            // If subscription hasn't expired but features are disabled, show as disabled
            subscriptionStatus = 'Disabled';
            sortPriority = -2;
          }
        } else if (!profile.seller_features_active) {
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

  const toggleSellerFeatures = async (userId: string, currentStatus: boolean, reason?: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          seller_features_active: !currentStatus,
          updated_at: new Date().toISOString(),
          ...(currentStatus && reason ? { admin_notes: reason } : {}),
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
              ? `Your seller features have been disabled by an administrator. Reason: ${reason}`
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
          <span className="inline-flex items-center gap-1 rounded-full bg-flora-leaf/15 px-2.5 py-0.5 text-xs font-medium text-flora-leaf">
            <CheckCircle className="h-3 w-3" />
            Active ({daysRemaining} days)
          </span>
        );
      case 'Expiring Soon':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            <Clock className="h-3 w-3" />
            Expiring ({daysRemaining} days)
          </span>
        );
      case 'Expired':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
            <AlertTriangle className="h-3 w-3" />
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-flora-chip px-2.5 py-0.5 text-xs font-medium text-flora-ink">
            No Subscription
          </span>
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
      <div className="rounded-3xl bg-flora-card p-6 shadow-card">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded-full bg-flora-chip"></div>
          <div className="h-32 rounded-2xl bg-flora-chip"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="rounded-3xl bg-flora-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-flora-ink">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-flora-ink">{stats.total}</div>
          <p className="text-sm font-medium text-flora-muted">Total Sellers</p>
        </div>

        <div className="rounded-3xl bg-flora-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-flora-leaf">
              <CheckCircle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-flora-leaf">{stats.active}</div>
          <p className="text-sm font-medium text-flora-muted">Active</p>
        </div>

        <div className="rounded-3xl bg-flora-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-amber-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-600">{stats.expiring}</div>
          <p className="text-sm font-medium text-flora-muted">Expiring Soon</p>
        </div>

        <div className="rounded-3xl bg-flora-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-red-600">{stats.expired}</div>
          <p className="text-sm font-medium text-flora-muted">Expired</p>
        </div>

        <div className="rounded-3xl bg-flora-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-flora-ink">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-flora-ink">₦{stats.totalRevenue.toLocaleString()}</div>
          <p className="text-sm font-medium text-flora-muted">Total Revenue</p>
        </div>
      </div>

      {/* Subscription Management */}
      <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-flora-ink">Seller Subscription Management</h2>
          <button
            type="button"
            onClick={fetchSubscriptions}
            className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-flora-muted" />
            <Input
              placeholder="Search sellers by name, email, or university..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="rounded-full border-flora-ink/15 bg-white pl-10 text-sm focus-visible:ring-flora-ink"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-full border border-flora-ink/15 bg-white px-3 py-2 text-sm text-flora-ink"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expiring soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="no subscription">No Subscription</option>
          </select>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                <TableHead className="text-flora-ink">Seller</TableHead>
                <TableHead className="text-flora-ink">University</TableHead>
                <TableHead className="text-flora-ink">Subscription Status</TableHead>
                <TableHead className="text-flora-ink">Last Payment</TableHead>
                <TableHead className="text-flora-ink">Total Paid</TableHead>
                <TableHead className="text-flora-ink">Features Active</TableHead>
                <TableHead className="text-flora-ink">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((subscription) => (
                <TableRow key={subscription.user_id} className="hover:bg-flora-chip/20">
                  <TableCell>
                    <p className="font-medium text-flora-ink">{subscription.full_name}</p>
                    <p className="text-sm text-flora-muted">{subscription.email}</p>
                  </TableCell>
                  <TableCell className="text-flora-muted">{subscription.university_name || 'N/A'}</TableCell>
                  <TableCell>
                    {getStatusBadge(subscription.subscription_status, subscription.days_remaining)}
                  </TableCell>
                  <TableCell className="text-flora-muted">
                    {subscription.seller_last_payment_date
                      ? new Date(subscription.seller_last_payment_date).toLocaleDateString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell className="text-flora-muted">₦{(subscription.total_paid || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        subscription.seller_features_active
                          ? 'bg-flora-leaf/15 text-flora-leaf'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {subscription.seller_features_active ? 'Active' : 'Disabled'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <ExtendSubscriptionDialog
                        fullName={subscription.full_name}
                        onExtend={(days) => extendSubscription(subscription.user_id, days)}
                      />

                      {/* Toggle Features */}
                      {subscription.seller_features_active ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
                            >
                              <Ban className="h-4 w-4" />
                              Disable
                            </button>
                          </DialogTrigger>
                          <DialogContent className="rounded-3xl">
                            <DialogHeader>
                              <DialogTitle className="text-flora-ink">Disable Seller Features</DialogTitle>
                              <DialogDescription className="text-flora-muted">
                                Provide a reason for disabling seller features for {subscription.full_name}. This is sent to them in their notification.
                              </DialogDescription>
                            </DialogHeader>
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const reason = formData.get('disable_reason') as string;
                                if (reason.trim()) {
                                  toggleSellerFeatures(subscription.user_id, true, reason.trim());
                                }
                              }}
                            >
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="disable_reason" className="text-flora-ink">Reason *</Label>
                                  <Textarea
                                    name="disable_reason"
                                    placeholder="e.g., Policy violation, suspected fraud, unresolved dispute..."
                                    required
                                    rows={3}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <DialogTrigger asChild>
                                    <Button type="button" variant="outline">Cancel</Button>
                                  </DialogTrigger>
                                  <Button type="submit" variant="destructive">Disable Features</Button>
                                </div>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-full bg-flora-ink px-3.5 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
                            >
                              <Ban className="h-4 w-4" />
                              Enable
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-flora-ink">Enable Seller Features</AlertDialogTitle>
                              <AlertDialogDescription className="text-flora-muted">
                                Are you sure you want to enable seller features for {subscription.full_name}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => toggleSellerFeatures(subscription.user_id, false)}
                              >
                                Enable
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
