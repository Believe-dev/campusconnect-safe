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
    customCategory: '',
    price: '',
    stock_quantity: '1',
    condition: 'good',
    university_name: ''
  });
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, university_name')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setUserProfile(profile);
      // Auto-populate university from user's profile - this cannot be changed
      if (profile.university_name) {
        setFormData(prev => ({ ...prev, university_name: profile.university_name }));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadImages = async () => {
    const uploadedUrls = [];
    
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${i}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      
      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Product title is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.category) {
      toast({
        title: "Validation Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.category === 'Other' && !formData.customCategory.trim()) {
      toast({
        title: "Validation Error",
        description: "Please specify the custom category",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.stock_quantity || parseInt(formData.stock_quantity) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid stock quantity",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Upload images first
      const imageUrls = images.length > 0 ? await uploadImages() : [];
      
      // Use custom category if "Other" is selected
      const finalCategory = formData.category === 'Other' ? formData.customCategory : formData.category;

      const { error } = await supabase
        .from('products')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: finalCategory,
          price: parseFloat(formData.price),
          stock_quantity: parseInt(formData.stock_quantity),
          condition: formData.condition,
          campus: formData.university_name,
          seller_id: user.id,
          images: imageUrls
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
      const newFiles = Array.from(e.target.files);
      const remainingSlots = 3 - images.length;
      const filesToAdd = newFiles.slice(0, remainingSlots);
      setImages(prev => [...prev, ...filesToAdd]);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
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
            <p className="text-muted-foreground">Fill in the details to list your product on CampusConnect</p>
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
                  <div className="relative">
                    <select 
                      value={formData.category} 
                      onChange={(e) => setFormData({ ...formData, category: e.target.value, customCategory: '' })}
                      className="w-full h-10 px-3 text-sm border border-input bg-background rounded-md"
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  {formData.category === 'Other' && (
                    <div className="mt-2">
                      <Input
                        placeholder="Enter custom category"
                        value={formData.customCategory}
                        onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                        required
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="university">University</Label>
                  <Input
                    id="university"
                    value={formData.university_name || userProfile?.university_name || 'Not set'}
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                    placeholder="Your university will appear here"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    University is set from your profile and cannot be changed here
                  </p>
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
                  <div className="relative">
                    <select 
                      value={formData.condition} 
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="w-full h-10 px-3 text-sm border border-input bg-background rounded-md"
                    >
                      <option value="new">New</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                    </select>
                  </div>
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
                    disabled={images.length >= 3}
                  />
                  <label
                    htmlFor="images"
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors ${
                      images.length >= 3 
                        ? 'border-muted-foreground/10 bg-muted/30 cursor-not-allowed' 
                        : 'border-muted-foreground/25 cursor-pointer hover:bg-muted/50'
                    }`}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className={`text-sm ${
                      images.length >= 3 ? 'text-muted-foreground/50' : 'text-muted-foreground'
                    }`}>
                      {images.length >= 3 
                        ? `Maximum 3 images uploaded (${images.length}/3)` 
                        : `Click to upload images (${images.length}/3)`
                      }
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
                          className="w-full h-24 object-cover rounded"
                          onLoad={() => URL.revokeObjectURL(URL.createObjectURL(file))}
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