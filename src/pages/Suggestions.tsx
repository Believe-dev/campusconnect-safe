import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Lightbulb, Send } from 'lucide-react';
import { PullToRefresh } from '@/components/common/PullToRefresh';

const Suggestions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    priority: 'medium'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('suggestions').insert({
        user_id: user.id,
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        priority: formData.priority,
        status: 'pending'
      });

      if (error) throw error;

      toast({
        title: "Suggestion Submitted",
        description: "Thank you for your feedback! We'll review your suggestion.",
      });

      // Reset form
      setFormData({
        title: '',
        category: '',
        description: '',
        priority: 'medium'
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit suggestion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    // Reset form to initial state
    setFormData({
      title: '',
      category: '',
      description: '',
      priority: 'medium'
    });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 text-university-green" />
            <h1 className="text-3xl font-bold text-primary mb-2">
              Share Your Ideas
            </h1>
            <p className="text-muted-foreground">
              Help us improve UniMarket by sharing your suggestions and feedback
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Submit a Suggestion</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief title for your suggestion"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full h-10 px-3 text-sm border border-input bg-background rounded-md"
                  >
                    <option value="">Select a category</option>
                    <option value="ui_ux">User Interface & Experience</option>
                    <option value="features">New Features</option>
                    <option value="performance">Performance</option>
                    <option value="security">Security</option>
                    <option value="mobile">Mobile App</option>
                    <option value="search">Search & Discovery</option>
                    <option value="messaging">Messaging</option>
                    <option value="payments">Payments</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your suggestion in detail. What problem does it solve? How would it improve the platform?"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={6}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.description.length}/1000 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full h-10 px-3 text-sm border border-input bg-background rounded-md"
                  >
                    <option value="low">Low - Nice to have</option>
                    <option value="medium">Medium - Would be helpful</option>
                    <option value="high">High - Important improvement</option>
                    <option value="critical">Critical - Major issue</option>
                  </select>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? "Submitting..." : "Submit Suggestion"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Need immediate help or have a bug to report?
            </p>
            <Button
              variant="outline"
              onClick={() => window.open('https://wa.me/2349133054018', '_blank')}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              Contact Support on WhatsApp
            </Button>
          </div>
          </div>
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Suggestions;