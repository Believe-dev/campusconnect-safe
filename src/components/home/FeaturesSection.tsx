import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, MessageCircle, TrendingUp } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Secure Transactions',
    description: 'Escrow payments and monitored chat ensure safe trading within your university community.',
    color: 'text-university-green',
  },
  {
    icon: MessageCircle,
    title: 'In-App Messaging',
    description: 'Chat safely with sellers through our monitored system. No external contact needed.',
    color: 'text-university-green',
  },
  {
    icon: TrendingUp,
    title: 'Student Verified',
    description: 'Only verified university students can join. Build trust within your academic community.',
    color: 'text-university-green',
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <section className="py-12 sm:py-16 bg-gradient-to-br from-muted/20 to-primary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12 fade-in">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Why Students Choose UniMarket
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built specifically for university communities with safety and trust at the core
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              className="text-center student-card hover-lift micro-bounce group animate-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <CardHeader className="pb-4">
                <div className="relative mx-auto mb-3 sm:mb-4 w-fit">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <feature.icon className={`h-10 w-10 sm:h-12 sm:w-12 ${feature.color} relative z-10 drop-shadow-sm group-hover:scale-110 transition-transform duration-200`} />
                </div>
                <CardTitle className="text-lg sm:text-xl font-semibold group-hover:text-primary transition-colors duration-200">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm sm:text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};