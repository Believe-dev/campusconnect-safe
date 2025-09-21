import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { 
  Shield, 
  Users, 
  CreditCard, 
  MessageSquare, 
  CheckCircle, 
  Truck,
  Star,
  BookOpen,
} from 'lucide-react';

export default function LearnMore() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">How UniMarket Works</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A secure marketplace designed specifically for university students to buy and sell textbooks, 
            electronics, and other campus essentials safely within their academic community.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Verified Students Only</CardTitle>
              <CardDescription>
                All sellers must verify their student status with university ID and photo verification
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CreditCard className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Secure Payments</CardTitle>
              <CardDescription>
                Escrow protection ensures sellers get paid and buyers receive their items safely
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Built-in Messaging</CardTitle>
              <CardDescription>
                Communicate directly with buyers and sellers through our secure messaging system
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Truck className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Campus Delivery</CardTitle>
              <CardDescription>
                Meet on campus or arrange secure delivery within your university area
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Star className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Rating System</CardTitle>
              <CardDescription>
                Build trust through our comprehensive rating and review system
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Campus Community</CardTitle>
              <CardDescription>
                Connect with students from your own university for safer transactions
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How it Works Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* For Buyers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-6 w-6" />
                  For Buyers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <h4 className="font-semibold">Browse Products</h4>
                    <p className="text-sm text-muted-foreground">Search for textbooks, electronics, and other items from verified student sellers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <h4 className="font-semibold">Contact Seller</h4>
                    <p className="text-sm text-muted-foreground">Use our messaging system to ask questions and negotiate</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <h4 className="font-semibold">Make Payment</h4>
                    <p className="text-sm text-muted-foreground">Pay securely through our escrow system for protection</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <h4 className="font-semibold">Receive Item</h4>
                    <p className="text-sm text-muted-foreground">Meet on campus or arrange delivery to receive your purchase</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* For Sellers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <img 
                    src="/logo.png" 
                    alt="UniMarket Logo" 
                    className="h-6 w-6 object-contain"
                  />
                  For Sellers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <h4 className="font-semibold">Get Verified</h4>
                    <p className="text-sm text-muted-foreground">Submit your student ID and photo for verification by our admin team</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <h4 className="font-semibold">List Items</h4>
                    <p className="text-sm text-muted-foreground">Once approved, create listings with photos and descriptions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <h4 className="font-semibold">Manage Orders</h4>
                    <p className="text-sm text-muted-foreground">Respond to buyers and manage your sales through the dashboard</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <h4 className="font-semibold">Get Paid</h4>
                    <p className="text-sm text-muted-foreground">Receive payment automatically once the buyer confirms delivery</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Safety Features */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Safety First</CardTitle>
            <CardDescription className="text-center">
              Your security is our top priority. Here's how we keep you safe:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1" />
                <div>
                  <h4 className="font-semibold">Identity Verification</h4>
                  <p className="text-sm text-muted-foreground">All sellers must verify their student status before they can list items</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1" />
                <div>
                  <h4 className="font-semibold">Escrow Protection</h4>
                  <p className="text-sm text-muted-foreground">Payments are held securely until both parties are satisfied</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1" />
                <div>
                  <h4 className="font-semibold">Campus-Only Access</h4>
                  <p className="text-sm text-muted-foreground">Only verified university students can participate</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1" />
                <div>
                  <h4 className="font-semibold">24/7 Support</h4>
                  <p className="text-sm text-muted-foreground">Our team is always available to help resolve any issues</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-6">
            Join thousands of students already using UniMarket to buy and sell safely on campus
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Sign Up Now</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/marketplace">Browse Marketplace</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}