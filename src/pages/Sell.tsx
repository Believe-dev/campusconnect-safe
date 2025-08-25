import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, X } from 'lucide-react';
import Header from '@/components/layout/Header';

const categories = [
  'Books & Textbooks',
  'Electronics',
  'Fashion & Accessories',
  'Food & Beverages',
  'Services',
  'Sports & Recreation',
  'Home & Living',
  'Other'
];

const campuses = [
  'University of Lagos',
  'University of Ibadan',
  'Ahmadu Bello University',
  'University of Nigeria, Nsukka',
  'Obafemi Awolowo University',
  'University of Benin',
  'Other'
];

const Sell = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    stock_quantity: '1',
    condition: 'good',
    campus: ''
  });
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkSellerAccess();
  }, []);

  const checkSellerAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('account_type, full_name')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (profile.account_type === 'buyer') {
        toast({
          title: "Access Denied",
          description: "Only seller accounts can list products. Upgrade your account in Profile settings.",
          variant: "destructive",
        });
        navigate('/profile');
        return;
      }

      setUserProfile(profile);
    } catch (error) {
      console.error('Error checking seller access:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { error } = await supabase
        .from('products')
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          price: parseFloat(formData.price),
          stock_quantity: parseInt(formData.stock_quantity),
          condition: formData.condition,
          campus: formData.campus,
          seller_id: user.id,
          images: [] // TODO: Implement image upload
        });

      if (error) throw error;

      toast({
        title: "Product Listed",
        description: "Your product has been successfully listed!",
      });
      navigate('/');
    } catch (error) {
      console.error('Error listing product:', error);
      toast({
        title: "Error",
        description: "Failed to list product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files).slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded mb-4"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">List Your Product</CardTitle>
            <p className="text-muted-foreground">Fill in the details to list your product on UniMarket</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Product Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Engineering Mathematics Textbook"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your product..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="campus">Campus</Label>
                  <Select onValueChange={(value) => setFormData({ ...formData, campus: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {campuses.map(campus => (
                        <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price (₦) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="5000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    min="1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="condition">Condition</Label>
                  <Select onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="good" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="images">Product Images</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    id="images"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="images"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload images (max 5)
                    </span>
                  </label>
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {images.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Listing Product...' : 'List Product'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Sell;