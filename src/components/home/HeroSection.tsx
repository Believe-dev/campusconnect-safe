import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/enhanced-button';
import { ShoppingBag, Shield } from 'lucide-react';
import { APP_CONFIG, ROUTES } from '@/lib/constants';
import heroImage from '@/assets/hero-marketplace.jpg';

interface HeroSectionProps {
  isAuthenticated: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ isAuthenticated }) => {
  return (
    <section className="relative gradient-hero py-12 sm:py-16 lg:py-20 overflow-hidden">
      <div className="absolute inset-0 bg-black/20" />
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 transition-all duration-700 hover:opacity-40"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 animate-in slide-in-from-bottom-4 duration-500">
            {APP_CONFIG.description.split(' ').slice(0, 2).join(' ')}
            <span className="block gradient-accent bg-clip-text text-transparent animate-in slide-in-from-bottom-4 duration-700 delay-200">
              {APP_CONFIG.description.split(' ').slice(2).join(' ')}
            </span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto px-4 animate-in slide-in-from-bottom-4 duration-500 delay-300">
            Buy and sell safely within your university community. 
            <span className="block mt-1 font-medium text-white/95">Secure payments, verified students, monitored transactions.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 animate-in slide-in-from-bottom-4 duration-500 delay-500">
            {isAuthenticated ? (
              <Button variant="secondary" size="lg" className="sm:size-xl hover-lift micro-bounce shadow-lg hover:shadow-xl" asChild>
                <Link to={ROUTES.marketplace}>
                  <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Browse Products
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="lg" className="sm:size-xl hover-lift micro-bounce shadow-lg hover:shadow-xl" asChild>
                  <Link to={ROUTES.auth}>
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Join Marketplace
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="sm:size-xl text-white border-white/80 hover:bg-white hover:text-primary hover-lift micro-bounce backdrop-blur-sm" 
                  asChild
                >
                  <Link to="/learn-more">Learn More</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};