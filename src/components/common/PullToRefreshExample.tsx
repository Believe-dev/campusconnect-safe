import React, { useState, useCallback } from 'react';
import { PullToRefresh } from './PullToRefresh';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ExampleItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

export const PullToRefreshExample: React.FC = () => {
  const [items, setItems] = useState<ExampleItem[]>([
    {
      id: '1',
      title: 'Sample Product 1',
      description: 'This is a sample product description',
      timestamp: new Date().toLocaleTimeString()
    },
    {
      id: '2',
      title: 'Sample Product 2',
      description: 'Another sample product description',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const [refreshCount, setRefreshCount] = useState(0);

  const handleRefresh = useCallback(async () => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Update items with new timestamp
    setItems(prevItems => 
      prevItems.map(item => ({
        ...item,
        timestamp: new Date().toLocaleTimeString()
      }))
    );
    
    setRefreshCount(prev => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Pull-to-Refresh Demo
            </h1>
            <p className="text-gray-600">
              Pull down from the top to refresh the content
            </p>
            <Badge variant="outline" className="mt-2">
              Refreshed {refreshCount} times
            </Badge>
          </div>

          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-gray-600 mb-3">{item.description}</p>
                  <div className="text-sm text-gray-500">
                    Last updated: {item.timestamp}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">How to use:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Pull down from the top of the page</li>
              <li>• Watch the animated indicator appear</li>
              <li>• Pull past the threshold to trigger refresh</li>
              <li>• Release to start the refresh process</li>
            </ul>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
};

export default PullToRefreshExample;