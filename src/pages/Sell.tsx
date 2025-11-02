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
import { PullToRefresh } from '@/components/common/PullToRefresh';
import { CompressedImageUpload } from '@/components/ui/CompressedImageUpload';


const categories = [
  'Books & Textbooks',
  'Electronics',
  'Fashion & Accessories',
  'Food & Beverages',
  'Cosmetics & Skincare',
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
  const [accessDenied, setAccessDenied] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    customCategory: '',
    price: '',
    stock_quantity: '',
    condition: 'good',
    university_name: '',
    available_sizes: [] as string[]
  });
  const [customSize, setCustomSize] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState<boolean[]>([false, false, false]);
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
        .select('full_name, university_name, account_type, seller_status')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Check if user is approved seller
      if (profile.account_type === 'buyer' || profile.seller_status !== 'approved') {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      setUserProfile(profile);
      // Auto-populate university from user's profile - this cannot be changed
      if (profile.university_name) {
        setFormData(prev => ({ ...prev, university_name: profile.university_name }));
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadUserProfile();
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
    
    // Set default stock quantity if not provided
    const stockQuantity = formData.stock_quantity ? parseInt(formData.stock_quantity) : 1;
    if (stockQuantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Stock quantity must be greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    const uploadedImages = images.filter(url => url);
    if (uploadedImages.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please upload at least one product image",
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

      // Re-verify seller status before submission (prevent race conditions)
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('account_type, seller_status')
        .eq('user_id', user.id)
        .single();

      if (profileError || !currentProfile) {
        toast({
          title: "Error",
          description: "Unable to verify your account status",
          variant: "destructive",
        });
        return;
      }

      if (currentProfile.account_type === 'buyer' || currentProfile.seller_status !== 'approved') {
        toast({
          title: "Access Denied",
          description: "You must be an approved seller to list products",
          variant: "destructive",
        });
        navigate('/profile');
        return;
      }

      // Use already uploaded image URLs
      const imageUrls = images.filter(url => url); // Filter out empty strings
      
      // Use custom category if "Other" is selected
      const finalCategory = formData.category === 'Other' ? formData.customCategory : formData.category;

      const { error } = await supabase
        .from('products')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: finalCategory,
          price: parseFloat(formData.price),
          stock_quantity: stockQuantity,
          condition: formData.condition,
          campus: formData.university_name,
          seller_id: user.id,
          images: imageUrls,
          available_sizes: formData.available_sizes.length > 0 ? formData.available_sizes : null
        });

      if (error) {
        if (error.message.includes('approved sellers')) {
          toast({
            title: "Access Denied",
            description: "Only approved sellers can list products",
            variant: "destructive",
          });
          navigate('/profile');
          return;
        }
        throw error;
      }

      toast({
        title: "Product Listed",
        description: "Your product has been successfully listed!",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to list product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = (url: string, index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      newImages[index] = url;
      return newImages;
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      newImages[index] = '';
      return newImages;
    });
  };

  const addSize = () => {
    if (customSize.trim() && !formData.available_sizes.includes(customSize.trim())) {
      setFormData(prev => ({
        ...prev,
        available_sizes: [...prev.available_sizes, customSize.trim()]
      }));
      setCustomSize('');
    }
  };

  const removeSize = (sizeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      available_sizes: prev.available_sizes.filter(size => size !== sizeToRemove)
    }));
  };

  const addPredefinedSize = (size: string) => {
    if (!formData.available_sizes.includes(size)) {
      setFormData(prev => ({
        ...prev,
        available_sizes: [...prev.available_sizes, size]
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6 text-center">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">🚫</div>
                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-muted-foreground mb-4">
                  You need to be an approved seller to list products.
                </p>
                <Button onClick={() => navigate('/profile')} variant="outline">
                  Go to Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
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
                  <Label htmlFor="stock">Stock Quantity (Optional)</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    min="1"
                    placeholder="1 (default)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to default to 1 item
                  </p>
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
                <Label>Product Images * (Max 3)</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload up to 3 high-quality images of your product
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="space-y-2">
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center bg-gray-50/50">
                        {images[index] ? (
                          <div className="relative">
                            <img
                              src={images[index]}
                              alt={`Product ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg mb-2"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeImage(index)}
                              className="w-full"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-600">
                              Image {index + 1}
                            </div>
                            <CompressedImageUpload
                              onUpload={(url) => handleImageUpload(url, index)}
                              bucket="product-images"
                              path={`${Date.now()}-${index}.jpg`}
                              uploading={uploadingImages[index]}
                              setUploading={(uploading) => {
                                setUploadingImages(prev => {
                                  const newState = [...prev];
                                  newState[index] = uploading;
                                  return newState;
                                });
                              }}
                              label={index === 0 ? "Upload Main Image" : "Upload Image"}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">
                  {images.filter(img => img).length}/3 images uploaded
                  {images.filter(img => img).length === 0 && " - At least 1 image is required"}
                </p>
              </div>

              <div>
                <Label>Product Sizes (Optional)</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Add sizes if your product comes in different sizes (e.g., clothing, shoes)
                </p>
                
                {/* Predefined size buttons */}
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">Common sizes:</p>
                  <div className="flex flex-wrap gap-2">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <Button
                        key={size}
                        type="button"
                        variant={formData.available_sizes.includes(size) ? "default" : "outline"}
                        size="sm"
                        onClick={() => addPredefinedSize(size)}
                        disabled={formData.available_sizes.includes(size)}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom size input */}
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add custom size (e.g., 42, 43, One Size)"
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSize();
                      }
                    }}
                  />
                  <Button type="button" onClick={addSize} disabled={!customSize.trim()}>
                    Add
                  </Button>
                </div>

                {/* Selected sizes */}
                {formData.available_sizes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Selected sizes:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.available_sizes.map(size => (
                        <div key={size} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                          {size}
                          <button
                            type="button"
                            onClick={() => removeSize(size)}
                            className="ml-1 text-primary hover:text-primary/70"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
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
      </PullToRefresh>
    </div>
  );
};

export default Sell;