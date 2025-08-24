import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Shield, Star, Package, MessageCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface Profile {
  full_name: string;
  email: string;
  university_name?: string;
  student_id?: string;
  phone_number?: string;
  campus?: string;
  account_type: string;
  avatar_url?: string;
  bio?: string;
  is_verified: boolean;
  rating: number;
  total_reviews: number;
}

const Profile = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          university_name: profile.university_name,
          student_id: profile.student_id,
          phone_number: profile.phone_number,
          campus: profile.campus,
          bio: profile.bio,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded mb-4"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-primary">Profile</h1>
            <Button
              variant={editing ? "outline" : "brand"}
              onClick={() => editing ? setEditing(false) : setEditing(true)}
            >
              {editing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card className="lg:col-span-1">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                      <AvatarFallback className="bg-university-green text-white text-lg">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    {profile.is_verified && (
                      <div className="absolute -bottom-1 -right-1 bg-verified-blue rounded-full p-1.5">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <h2 className="text-xl font-semibold">{profile.full_name}</h2>
                    <p className="text-muted-foreground">{profile.email}</p>
                    
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Badge variant="outline">{profile.account_type}</Badge>
                      {profile.is_verified && (
                        <Badge variant="outline" className="text-verified-blue">
                          Verified
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{profile.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{profile.total_reviews} reviews</span>
                      </div>
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="text-center text-sm text-muted-foreground">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Profile Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      disabled={!editing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div>
                    <Label htmlFor="university">University</Label>
                    <Input
                      id="university"
                      value={profile.university_name || ''}
                      onChange={(e) => setProfile({ ...profile, university_name: e.target.value })}
                      disabled={!editing}
                      placeholder="e.g., University of Lagos"
                    />
                  </div>

                  <div>
                    <Label htmlFor="student_id">Student ID</Label>
                    <Input
                      id="student_id"
                      value={profile.student_id || ''}
                      onChange={(e) => setProfile({ ...profile, student_id: e.target.value })}
                      disabled={!editing}
                      placeholder="e.g., 19/55EC/00123"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profile.phone_number || ''}
                      onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                      disabled={!editing}
                      placeholder="e.g., +234 801 234 5678"
                    />
                  </div>

                  <div>
                    <Label htmlFor="campus">Campus</Label>
                    <Select
                      value={profile.campus || ''}
                      onValueChange={(value) => setProfile({ ...profile, campus: value })}
                      disabled={!editing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select campus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="University of Lagos">University of Lagos</SelectItem>
                        <SelectItem value="University of Ibadan">University of Ibadan</SelectItem>
                        <SelectItem value="Ahmadu Bello University">Ahmadu Bello University</SelectItem>
                        <SelectItem value="University of Nigeria, Nsukka">University of Nigeria, Nsukka</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio || ''}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    disabled={!editing}
                    placeholder="Tell others about yourself..."
                    rows={3}
                  />
                </div>

                {editing && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;