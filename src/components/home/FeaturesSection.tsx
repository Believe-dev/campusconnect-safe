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
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="text-center">
              <CardHeader className="pb-4">
                <feature.icon className={`h-10 w-10 sm:h-12 sm:w-12 ${feature.color} mx-auto mb-3 sm:mb-4`} />
                <CardTitle className="text-lg sm:text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm sm:text-base">
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