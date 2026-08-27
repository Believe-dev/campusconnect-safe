import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Upload, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CreateLiveFeedDialogProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export const CreateLiveFeedDialog = ({ children, onSuccess }: CreateLiveFeedDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: ''
  });
  const { toast } = useToast();
  const { user } = useAuth();



  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('live-feed-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('live-feed-images')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.title || !formData.price || !imageFile) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and upload an image",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const imageUrl = await uploadImage(imageFile);

      // Get user's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      const { error } = await supabase
        .from('live_feed')
        .insert({
          seller_id: profile.id,
          title: formData.title,
          description: formData.description,
          price: price,
          image_url: imageUrl,
          location: formData.location,
        });

      if (error) throw error;

      toast({
        title: "Live Feed Posted!",
        description: "Your item will be visible for 24 hours",
      });

      setFormData({
        title: '',
        description: '',
        price: '',
        location: ''
      });
      setImageFile(null);
      setOpen(false);
      onSuccess?.();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-flora-leaf" aria-hidden="true" />
            Post to Live Feed
          </DialogTitle>
          <DialogDescription>
            Share a quick item that expires in 24 hours
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image" className="text-flora-ink">Photo *</Label>
            <div className="border-2 border-dashed border-flora-ink/15 rounded-2xl p-4 text-center transition hover:border-flora-leaf/40">
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <label htmlFor="image" className="cursor-pointer">
                {imageFile ? (
                  <div className="space-y-2">
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-xl"
                    />
                    <p className="text-sm text-flora-leaf">{imageFile.name}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-flora-muted" />
                    <p className="text-sm text-flora-muted">Click to upload image</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-flora-ink">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="What are you selling?"
              maxLength={100}
              className="rounded-2xl border-0 bg-flora-chip focus-visible:ring-flora-leaf/40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price" className="text-flora-ink">Price (₦) *</Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder="0"
              min="0"
              step="0.01"
              className="rounded-2xl border-0 bg-flora-chip focus-visible:ring-flora-leaf/40"
            />
          </div>



          <div className="space-y-2">
            <Label htmlFor="location" className="text-flora-ink">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., Main Campus, Hostel A"
              className="rounded-2xl border-0 bg-flora-chip focus-visible:ring-flora-leaf/40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-flora-ink">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description..."
              rows={3}
              maxLength={500}
              className="rounded-2xl border-0 bg-flora-chip focus-visible:ring-flora-leaf/40"
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-2xl">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
            <p className="text-xs text-amber-800">
              This item will automatically expire in 24 hours if not sold
            </p>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="rounded-full border border-flora-ink/10 px-5 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-full bg-flora-ink px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Posting..." : "Post Live"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};