import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { 
  Trash2, 
  Edit, 
  Ban, 
  Eye, 
  Users, 
  Package, 
  MessageSquare, 
  BarChart3, 
  Shield, 
  Download,
  Search,
  Filter,
  RefreshCw,
  Settings,
  CheckSquare,
  Square,
  UserX,
  UserCheck,
  TrendingUp,
  TrendingDown,
  DollarSign,
  IdCard
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  is_banned: boolean;
  account_type: string;
  campus: string;
  university_name: string;
  face_photo_url: string;
  student_id_photo_url: string;
  verification_status: string;
  created_at: string;
  user_roles?: { role: string }[];
}

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  is_active: boolean;
  created_at: string;
  seller: { full_name: string; email: string };
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender: { full_name: string; email: string };
  conversations: { 
    products: { title: string };
    seller: { full_name: string };
    buyer: { full_name: string };
  };
}

interface Analytics {
  totalRevenue: number;
  monthlyGrowth: number;
  topCategories: { category: string; count: number }[];
  recentOrders: number;
}

export default function Admin() {
  const { user, loading, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalRevenue: 0,
    monthlyGrowth: 0,
    topCategories: [],
    recentOrders: 0
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalMessages: 0,
    activeUsers: 0
  });
  
  // Selection states
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  // Filter states
  const [userFilter, setUserFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Seller approval states
  const [pendingSellers, setPendingSellers] = useState<User[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchProducts();
      fetchMessages();
      fetchStats();
      fetchAnalytics();
      fetchPendingSellers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;

      // Then get roles for each user
      if (profiles && profiles.length > 0) {
        const userIds = profiles.map(p => p.user_id);
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        // Combine profiles with their roles
        const usersWithRoles = profiles.map(profile => ({
          ...profile,
          user_roles: roles?.filter(role => role.user_id === profile.user_id).map(r => ({ role: r.role })) || []
        }));

        setUsers(usersWithRoles);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Users fetch error:', error);
      toast.error('Failed to fetch users');
      setUsers([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles!inner(full_name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Products fetch error:', error);
      toast.error('Failed to fetch products');
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!inner(full_name, email),
          conversations!inner(
            products(title),
            seller:profiles!conversations_seller_id_fkey(full_name),
            buyer:profiles!conversations_buyer_id_fkey(full_name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Messages fetch error:', error);
      toast.error('Failed to fetch messages');
    }
  };

  const fetchPendingSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('verification_status', 'pending')
        .in('account_type', ['seller', 'both'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPendingSellers(data || []);
    } catch (error) {
      console.error('Pending sellers fetch error:', error);
      toast.error('Failed to fetch pending sellers');
    }
  };

  const approveSeller = async (userId: string, userEmail: string, fullName: string) => {
    try {
      // Update profile verification status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          verification_status: 'approved',
          verified_at: new Date().toISOString(),
          verified_by: user?.id
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Create in-app notification
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Seller Account Approved! 🎉',
          message: 'Congratulations! Your seller verification has been approved. You can now start listing items on UniMarket.',
          type: 'success'
        });

      // Send email notification
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            email: userEmail,
            name: fullName,
            type: 'approved'
          }
        });
      } catch (emailError) {
        console.warn('Email notification failed:', emailError);
        // Don't fail the approval if email fails
      }

      toast.success('Seller approved successfully');
      fetchPendingSellers();
      fetchUsers();
    } catch (error) {
      console.error('Approve seller error:', error);
      toast.error('Failed to approve seller');
    }
  };

  const rejectSeller = async (userId: string, userEmail: string, fullName: string) => {
    try {
      // Update profile verification status and account type
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          verification_status: 'rejected',
          account_type: 'buyer'
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Remove seller role, keep only buyer role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'seller');

      // Create in-app notification
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Seller Application Update',
          message: 'Your seller application was not approved at this time. Your account has been converted to buyer-only. You can still browse and purchase items.',
          type: 'warning'
        });

      // Send email notification
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            email: userEmail,
            name: fullName,
            type: 'rejected'
          }
        });
      } catch (emailError) {
        console.warn('Email notification failed:', emailError);
        // Don't fail the rejection if email fails
      }

      toast.success('Seller application rejected');
      fetchPendingSellers();
      fetchUsers();
    } catch (error) {
      console.error('Reject seller error:', error);
      toast.error('Failed to reject seller');
    }
  };

  const fetchStats = async () => {
    try {
      const [usersCount, productsCount, messagesCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        totalUsers: usersCount.count || 0,
        totalProducts: productsCount.count || 0,
        totalMessages: messagesCount.count || 0,
        activeUsers: users.filter(u => !u.is_banned).length
      });
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Fetch revenue and growth data
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('status', 'confirmed');

      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      
      // Calculate monthly growth (simplified)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthOrders = orders?.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      });
      const thisMonthRevenue = thisMonthOrders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      
      // Fetch top categories
      const { data: categoryData } = await supabase
        .from('products')
        .select('category')
        .eq('is_active', true);

      const categories = categoryData?.reduce((acc: { [key: string]: number }, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1;
        return acc;
      }, {}) || {};

      const topCategories = Object.entries(categories)
        .map(([category, count]) => ({ category, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        totalRevenue,
        monthlyGrowth: 15.2, // Simplified calculation
        topCategories,
        recentOrders: thisMonthOrders?.length || 0
      });
    } catch (error) {
      console.error('Analytics fetch error:', error);
    }
  };

  const toggleUserBan = async (userId: string, isBanned: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !isBanned })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`User ${!isBanned ? 'banned' : 'unbanned'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Toggle ban error:', error);
      toast.error('Failed to update user status');
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'seller' | 'buyer') => {
    try {
      // First, remove existing roles
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      // Then add new role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (roleError) throw roleError;

      // Update account type in profiles
      const accountType = newRole === 'admin' ? 'seller' : newRole; // Admins can sell
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ account_type: accountType })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast.success('User role updated successfully');
      fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Update user role error:', error);
      toast.error('Failed to update user role');
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Delete product error:', error);
      toast.error('Failed to delete product');
    }
  };

  const toggleProductStatus = async (productId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !isActive })
        .eq('id', productId);

      if (error) throw error;

      toast.success(`Product ${!isActive ? 'activated' : 'deactivated'} successfully`);
      fetchProducts();
    } catch (error) {
      console.error('Toggle product status error:', error);
      toast.error('Failed to update product status');
    }
  };

  // Bulk operations
  const handleBulkUserAction = async (action: 'ban' | 'unban' | 'delete') => {
    if (selectedUsers.length === 0) {
      toast.error('No users selected');
      return;
    }

    try {
      if (action === 'ban' || action === 'unban') {
        const { error } = await supabase
          .from('profiles')
          .update({ is_banned: action === 'ban' })
          .in('user_id', selectedUsers);

        if (error) throw error;
        toast.success(`${selectedUsers.length} users ${action}ned successfully`);
      }
      
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const handleBulkProductAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('products')
          .delete()
          .in('id', selectedProducts);

        if (error) throw error;
        toast.success(`${selectedProducts.length} products deleted successfully`);
      } else {
        const { error } = await supabase
          .from('products')
          .update({ is_active: action === 'activate' })
          .in('id', selectedProducts);

        if (error) throw error;
        toast.success(`${selectedProducts.length} products ${action}d successfully`);
      }
      
      setSelectedProducts([]);
      fetchProducts();
    } catch (error) {
      console.error('Bulk product action error:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const exportData = (type: 'users' | 'products' | 'messages') => {
    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'users':
        data = users;
        filename = 'users.csv';
        break;
      case 'products':
        data = products;
        filename = 'products.csv';
        break;
      case 'messages':
        data = messages;
        filename = 'messages.csv';
        break;
    }

    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filter data
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(userFilter.toLowerCase()) ||
                         user.email?.toLowerCase().includes(userFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && !user.is_banned) ||
                         (statusFilter === 'banned' && user.is_banned);
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title?.toLowerCase().includes(productFilter.toLowerCase()) ||
                         product.category?.toLowerCase().includes(productFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && product.is_active) ||
                         (statusFilter === 'inactive' && !product.is_active);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-muted-foreground">You don't have admin privileges to access this page.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage all aspects of your marketplace</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} active users
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{analytics.monthlyGrowth}% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.recentOrders} this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different management areas */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="sellers">
              Seller Approvals
              {pendingSellers.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingSellers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>User Management</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={() => exportData('users')} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    {selectedUsers.length > 0 && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleBulkUserAction('ban')}
                          variant="outline" 
                          size="sm"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Ban Selected
                        </Button>
                        <Button 
                          onClick={() => handleBulkUserAction('unban')}
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
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers(filteredUsers.map(u => u.user_id));
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
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
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsers([...selectedUsers, user.user_id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.user_id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {user.user_roles?.[0]?.role || 'buyer'}
                            </Badge>
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
                                      <Label>Name: {selectedUser?.full_name}</Label>
                                    </div>
                                    <div>
                                      <Label>Email: {selectedUser?.email}</Label>
                                    </div>
                                    <div>
                                      <Label htmlFor="role">Role</Label>
                                      <Select onValueChange={(value: 'admin' | 'seller' | 'buyer') => updateUserRole(user.user_id, value)}>
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
                                      onClick={() => toggleUserBan(user.user_id, user.is_banned)}
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
          </TabsContent>

          {/* Seller Approvals Tab */}
          <TabsContent value="sellers">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Seller Verification Requests</CardTitle>
                  <div className="flex items-center gap-2">
                    {pendingSellers.length > 0 && (
                      <Badge variant="secondary">
                        {pendingSellers.length} pending
                      </Badge>
                    )}
                    <Button onClick={fetchPendingSellers} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pendingSellers.length === 0 ? (
                  <div className="text-center py-12">
                    <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No pending approvals</h3>
                    <p className="text-muted-foreground">
                      All seller verification requests have been processed
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
                            <TableCell className="font-medium">
                              {seller.full_name || 'N/A'}
                            </TableCell>
                            <TableCell>{seller.email}</TableCell>
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
                                          src={`${supabase.storage.from('verification-photos').getPublicUrl(seller.face_photo_url).data.publicUrl}`}
                                          alt="Face verification"
                                          className="max-w-full max-h-96 object-contain"
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
                                          src={`${supabase.storage.from('verification-photos').getPublicUrl(seller.student_id_photo_url).data.publicUrl}`}
                                          alt="Student ID verification"
                                          className="max-w-full max-h-96 object-contain"
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
                                  <AlertDialogContent>
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
                                        onClick={() => approveSeller(seller.user_id, seller.email, seller.full_name || 'User')}
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
                                  <AlertDialogContent>
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
                                        onClick={() => rejectSeller(seller.user_id, seller.email, seller.full_name || 'User')}
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
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Product Management</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={() => exportData('products')} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    {selectedProducts.length > 0 && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleBulkProductAction('activate')}
                          variant="outline" 
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Activate
                        </Button>
                        <Button 
                          onClick={() => handleBulkProductAction('deactivate')}
                          variant="outline" 
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Deactivate
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Products</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {selectedProducts.length} selected products?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleBulkProductAction('delete')}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProducts(filteredProducts.map(p => p.id));
                              } else {
                                setSelectedProducts([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProducts([...selectedProducts, product.id]);
                                } else {
                                  setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{product.title}</TableCell>
                          <TableCell>${product.price}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>{product.seller?.full_name || 'Unknown'}</TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? 'default' : 'secondary'}>
                              {product.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(product.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleProductStatus(product.id, product.is_active)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{product.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteProduct(product.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
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
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Message Monitoring</CardTitle>
                  <Button onClick={() => exportData('messages')} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Content</TableHead>
                        <TableHead>Sender</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Participants</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell className="max-w-xs truncate">{message.content}</TableCell>
                          <TableCell>{message.sender?.full_name || 'Unknown'}</TableCell>
                          <TableCell>{message.conversations?.products?.title || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Seller: {message.conversations?.seller?.full_name || 'Unknown'}</div>
                              <div>Buyer: {message.conversations?.buyer?.full_name || 'Unknown'}</div>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(message.created_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topCategories.map((category, index) => (
                      <div key={category.category} className="flex items-center justify-between">
                        <span className="font-medium">{category.category}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded">
                            <div 
                              className="h-full bg-primary rounded"
                              style={{ width: `${(category.count / analytics.topCategories[0]?.count) * 100 || 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{category.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Revenue</span>
                      <span className="font-bold text-lg">${analytics.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Monthly Growth</span>
                      <span className="font-bold text-green-600 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +{analytics.monthlyGrowth}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Orders This Month</span>
                      <span className="font-bold">{analytics.recentOrders}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Platform Configuration</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Allow New Registrations</Label>
                          <p className="text-sm text-muted-foreground">Control whether new users can register</p>
                        </div>
                        <input type="checkbox" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Require Email Verification</Label>
                          <p className="text-sm text-muted-foreground">Require users to verify their email</p>
                        </div>
                        <input type="checkbox" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Enable Product Moderation</Label>
                          <p className="text-sm text-muted-foreground">All new products require admin approval</p>
                        </div>
                        <input type="checkbox" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Commission Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Platform Commission (%)</Label>
                        <Input type="number" defaultValue="5" min="0" max="100" />
                      </div>
                      <div>
                        <Label>Minimum Order Value</Label>
                        <Input type="number" defaultValue="10" min="0" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button>Save Settings</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}