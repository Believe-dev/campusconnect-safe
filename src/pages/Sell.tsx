import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PullToRefresh } from '@/components/common/PullToRefresh';
import { ListingPhotoUpload } from '@/components/sell/ListingPhotoUpload';
import { cn } from '@/lib/utils';
import { ShieldCheck, X } from 'lucide-react';

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

// Condition (New/Excellent/Good/Fair) doesn't mean anything for a service
// listing - hidden rather than shown-but-irrelevant.
const CATEGORIES_WITHOUT_CONDITION = new Set(['Services']);

// Sizes are an apparel/footwear concept - showing the field for a textbook
// or a service listing was the previous behavior (unconditional) and read
// as a generic form that doesn't know what it's listing.
const SIZE_CATEGORIES = new Set(['Fashion & Accessories']);

// Categories with real counterfeit/authenticity risk - ties into the
// Prohibited Items policy (Terms of Service Section 7). Left off Books,
// Food, and Services, where a "brand name" confirmation doesn't apply.
const AUTHENTICITY_CATEGORIES = new Set([
  'Fashion & Accessories',
  'Electronics',
  'Cosmetics & Skincare',
  'Sports & Recreation',
  'Home & Living',
  'Other',
]);

const CONDITIONS = ['new', 'excellent', 'good', 'fair'] as const;
const PREDEFINED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const STEPS = ['Basics', 'Photos', 'Pricing', 'Details'] as const;

interface FormData {
  title: string;
  description: string;
  category: string;
  customCategory: string;
  price: string;
  stock_quantity: string;
  condition: string;
  university_name: string;
  available_sizes: string[];
  authenticityConfirmed: boolean;
}

const Sell = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    customCategory: '',
    price: '',
    stock_quantity: '',
    condition: 'good',
    university_name: '',
    available_sizes: [],
    authenticityConfirmed: false,
  });
  const [customSize, setCustomSize] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

      if (profile.account_type === 'buyer' || profile.seller_status !== 'approved') {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      setUserProfile(profile);
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

  const needsCondition = !CATEGORIES_WITHOUT_CONDITION.has(formData.category);
  const needsSizes = SIZE_CATEGORIES.has(formData.category);
  const needsAuthenticity = AUTHENTICITY_CATEGORIES.has(formData.category);

  // Switching category can leave stale answers to fields that no longer
  // apply (sizes picked while "Fashion" was selected, an authenticity
  // confirmation that was never re-shown for the new category) - clear
  // rather than silently carry them into the submitted listing.
  const handleCategoryChange = (category: string) => {
    setFormData(prev => ({
      ...prev,
      category,
      customCategory: category === 'Other' ? prev.customCategory : '',
      available_sizes: SIZE_CATEGORIES.has(category) ? prev.available_sizes : [],
      authenticityConfirmed: AUTHENTICITY_CATEGORIES.has(category) ? prev.authenticityConfirmed : false,
    }));
  };

  const addSize = () => {
    if (customSize.trim() && !formData.available_sizes.includes(customSize.trim())) {
      setFormData(prev => ({ ...prev, available_sizes: [...prev.available_sizes, customSize.trim()] }));
      setCustomSize('');
    }
  };

  const removeSize = (sizeToRemove: string) => {
    setFormData(prev => ({ ...prev, available_sizes: prev.available_sizes.filter(size => size !== sizeToRemove) }));
  };

  const addPredefinedSize = (size: string) => {
    if (!formData.available_sizes.includes(size)) {
      setFormData(prev => ({ ...prev, available_sizes: [...prev.available_sizes, size] }));
    }
  };

  const stepError = (s: number): string | null => {
    if (s === 0) {
      if (!formData.title.trim()) return 'Product title is required';
      if (!formData.category) return 'Please select a category';
      if (formData.category === 'Other' && !formData.customCategory.trim()) return 'Please specify the custom category';
    }
    if (s === 1) {
      if (images.length === 0) return 'Please upload at least one product image';
    }
    if (s === 2) {
      if (!formData.price || parseFloat(formData.price) <= 0) return 'Please enter a valid price';
      const stock = formData.stock_quantity ? parseInt(formData.stock_quantity) : 1;
      if (stock <= 0) return 'Stock quantity must be greater than 0';
    }
    if (s === 3) {
      if (needsAuthenticity && !formData.authenticityConfirmed) {
        return "Please confirm the item's authenticity to continue";
      }
    }
    return null;
  };

  const goNext = () => {
    const error = stepError(step);
    if (error) {
      toast({ title: 'Almost there', description: error, variant: 'destructive' });
      return;
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    for (let s = 0; s <= step; s++) {
      const error = stepError(s);
      if (error) {
        toast({ title: 'Almost there', description: error, variant: 'destructive' });
        setStep(s);
        return;
      }
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('account_type, seller_status')
        .eq('user_id', user.id)
        .single();

      if (profileError || !currentProfile) {
        toast({
          title: "Couldn't verify your account",
          description: "Please try again in a moment.",
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

      const finalCategory = formData.category === 'Other' ? formData.customCategory : formData.category;
      const stockQuantity = formData.stock_quantity ? parseInt(formData.stock_quantity) : 1;

      const { error } = await supabase
        .from('products')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: finalCategory,
          price: parseFloat(formData.price),
          stock_quantity: stockQuantity,
          condition: needsCondition ? formData.condition : null,
          campus: formData.university_name,
          seller_id: user.id,
          images,
          available_sizes: needsSizes && formData.available_sizes.length > 0 ? formData.available_sizes : null
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

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Product Listed",
        description: "Your product has been successfully listed!",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Couldn't list your product",
        description: "Please check your details and try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/2 rounded-full bg-flora-chip" />
            <div className="h-2 w-full rounded-full bg-flora-chip" />
            <div className="h-96 rounded-3xl bg-flora-chip/60" />
          </div>
        </main>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-3xl bg-flora-card p-8 text-center shadow-card">
            <div className="mx-auto mb-4 text-3xl">🚫</div>
            <h2 className="mb-2 text-2xl font-bold text-flora-ink">Access Denied</h2>
            <p className="mb-4 text-flora-muted">
              You need to be an approved seller to list products.
            </p>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="rounded-full border border-flora-ink/15 px-6 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
            >
              Go to Profile
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <main className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-8 md:pb-8">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-flora-ink sm:text-3xl">List Your Product</h1>
            <p className="mt-1 text-sm text-flora-muted">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
          </div>

          <div className="mb-6 flex gap-1.5">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i <= step ? 'bg-flora-leaf' : 'bg-flora-chip'
                )}
              />
            ))}
          </div>

          <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-8">
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-flora-ink" htmlFor="title">
                    Product Title *
                  </label>
                  <input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Engineering Mathematics Textbook"
                    className="mt-1.5 h-12 w-full rounded-2xl border-0 bg-flora-chip px-4 text-sm text-flora-ink placeholder:text-flora-muted focus:outline-none focus:ring-2 focus:ring-flora-leaf/40"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-flora-ink">Category *</label>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryChange(cat)}
                        className={cn(
                          'rounded-2xl border px-3 py-3 text-left text-sm font-medium transition',
                          formData.category === cat
                            ? 'border-flora-leaf bg-flora-tagBg text-flora-tagText'
                            : 'border-flora-ink/10 bg-white text-flora-ink hover:bg-flora-chip'
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  {formData.category === 'Other' && (
                    <input
                      value={formData.customCategory}
                      onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                      placeholder="Enter custom category"
                      className="mt-2 h-12 w-full rounded-2xl border-0 bg-flora-chip px-4 text-sm text-flora-ink placeholder:text-flora-muted focus:outline-none focus:ring-2 focus:ring-flora-leaf/40"
                    />
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-flora-ink" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your product..."
                    rows={4}
                    className="mt-1.5 w-full rounded-2xl border-0 bg-flora-chip px-4 py-3 text-sm text-flora-ink placeholder:text-flora-muted focus:outline-none focus:ring-2 focus:ring-flora-leaf/40"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-flora-ink">Product Photos *</label>
                  <p className="mt-0.5 text-xs text-flora-muted">
                    Up to 3 photos. The first one is your listing's cover photo.
                  </p>
                </div>
                <ListingPhotoUpload images={images} onChange={setImages} maxImages={3} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-flora-ink" htmlFor="price">
                    Price (₦) *
                  </label>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="5000"
                    className="mt-1.5 h-12 w-full rounded-2xl border-0 bg-flora-chip px-4 text-sm text-flora-ink placeholder:text-flora-muted focus:outline-none focus:ring-2 focus:ring-flora-leaf/40"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-flora-ink" htmlFor="stock">
                    Stock Quantity (Optional)
                  </label>
                  <input
                    id="stock"
                    type="number"
                    min="1"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="1 (default)"
                    className="mt-1.5 h-12 w-full rounded-2xl border-0 bg-flora-chip px-4 text-sm text-flora-ink placeholder:text-flora-muted focus:outline-none focus:ring-2 focus:ring-flora-leaf/40"
                  />
                  <p className="mt-1 text-xs text-flora-muted">Leave empty to default to 1 item</p>
                </div>

                {needsCondition && (
                  <div>
                    <label className="text-sm font-semibold text-flora-ink">Condition</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {CONDITIONS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormData({ ...formData, condition: c })}
                          className={cn(
                            'rounded-full border px-4 py-2 text-sm font-medium capitalize transition',
                            formData.condition === c
                              ? 'border-flora-ink bg-flora-ink text-white'
                              : 'border-flora-ink/15 bg-white text-flora-ink hover:bg-flora-chip'
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {needsSizes && (
                  <div>
                    <label className="text-sm font-semibold text-flora-ink">Product Sizes (Optional)</label>
                    <p className="mt-0.5 text-xs text-flora-muted">Add the sizes this item is available in</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {PREDEFINED_SIZES.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => addPredefinedSize(size)}
                          disabled={formData.available_sizes.includes(size)}
                          className={cn(
                            'rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                            formData.available_sizes.includes(size)
                              ? 'cursor-not-allowed border-flora-leaf bg-flora-tagBg text-flora-tagText'
                              : 'border-flora-ink/15 bg-white text-flora-ink hover:bg-flora-chip'
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input
                        value={customSize}
                        onChange={(e) => setCustomSize(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSize();
                          }
                        }}
                        placeholder="Add custom size (e.g., 42, One Size)"
                        className="h-11 flex-1 rounded-2xl border-0 bg-flora-chip px-4 text-sm text-flora-ink placeholder:text-flora-muted focus:outline-none focus:ring-2 focus:ring-flora-leaf/40"
                      />
                      <button
                        type="button"
                        onClick={addSize}
                        disabled={!customSize.trim()}
                        className="rounded-2xl bg-flora-ink px-4 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-40"
                      >
                        Add
                      </button>
                    </div>

                    {formData.available_sizes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {formData.available_sizes.map((size) => (
                          <span
                            key={size}
                            className="flex items-center gap-1.5 rounded-full bg-flora-chip px-3 py-1.5 text-sm text-flora-ink"
                          >
                            {size}
                            <button type="button" onClick={() => removeSize(size)} aria-label={`Remove size ${size}`}>
                              <X className="h-3.5 w-3.5 text-flora-muted hover:text-flora-ink" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {needsAuthenticity && (
                  <label className="flex items-start gap-3 rounded-2xl border border-flora-leaf/25 bg-flora-tagBg/40 p-4">
                    <input
                      type="checkbox"
                      checked={formData.authenticityConfirmed}
                      onChange={(e) => setFormData({ ...formData, authenticityConfirmed: e.target.checked })}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-flora-ink/30 text-flora-leaf focus:ring-2 focus:ring-flora-leaf/40"
                    />
                    <span className="text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-flora-ink">
                        <ShieldCheck className="h-4 w-4 text-flora-leaf" />
                        Authenticity confirmation
                      </span>
                      <span className="mt-1 block text-flora-muted">
                        If this item uses a brand name, I confirm it's genuine — not a replica, counterfeit, or
                        unauthorized copy. See our{' '}
                        <a
                          href="/terms-of-service#prohibited-items"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-flora-leaf underline"
                        >
                          Prohibited Items policy
                        </a>
                        .
                      </span>
                    </span>
                  </label>
                )}

                <div className="rounded-2xl bg-flora-chip p-4 text-sm text-flora-muted">
                  <p className="font-medium text-flora-ink">Listing to {formData.university_name || 'your university'}</p>
                  <p className="mt-0.5">University is set from your profile and can't be changed here.</p>
                </div>
              </div>
            )}

            <div className="mt-8 flex gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 rounded-full border border-flora-ink/15 py-3 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                >
                  Back
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex-[2] rounded-full bg-flora-ink py-3 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-[2] rounded-full bg-flora-ink py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Listing Product...' : 'List Product'}
                </button>
              )}
            </div>
          </div>
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Sell;
