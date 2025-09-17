import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, MessageSquare, DollarSign, TrendingUp } from 'lucide-react';

interface AdminStatsProps {
  stats: {
    totalUsers: number;
    totalProducts: number;
    totalMessages: number;
    activeUsers: number;
  };
  analytics: {
    totalRevenue: number;
    monthlyGrowth: number;
    recentOrders: number;
  };
}

export const AdminStats: React.FC<AdminStatsProps> = ({ stats, analytics }) => {
  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      subtitle: `${stats.activeUsers} active users`,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      subtitle: '+12% from last month',
      icon: Package,
      color: 'text-green-600',
    },
    {
      title: 'Revenue',
      value: `₦${analytics.totalRevenue.toFixed(2)}`,
      subtitle: (
        <span className="flex items-center">
          <TrendingUp className="h-3 w-3 mr-1" />
          +{analytics.monthlyGrowth}% from last month
        </span>
      ),
      icon: DollarSign,
      color: 'text-emerald-600',
    },
    {
      title: 'Messages',
      value: stats.totalMessages,
      subtitle: `${analytics.recentOrders} this month`,
      icon: MessageSquare,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};