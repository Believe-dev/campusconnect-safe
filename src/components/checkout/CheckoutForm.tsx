import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, MapPin, CreditCard } from 'lucide-react';
import { CheckoutForm as CheckoutFormType } from '@/lib/types';
import { NIGERIAN_STATES } from '@/lib/constants';

interface CheckoutFormProps {
  formData: CheckoutFormType;
  onFieldChange: (field: keyof CheckoutFormType, value: string) => void;
  errors?: Record<string, string>;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({
  formData,
  onFieldChange,
  errors = {},
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Contact Information */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="fullName" className="text-sm sm:text-base">
                Full Name *
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => onFieldChange('fullName', e.target.value)}
                className={`text-sm sm:text-base ${errors.fullName ? 'border-destructive' : ''}`}
                required
              />
              {errors.fullName && (
                <p className="text-xs text-destructive mt-1">{errors.fullName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email" className="text-sm sm:text-base">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => onFieldChange('email', e.target.value)}
                className={`text-sm sm:text-base ${errors.email ? 'border-destructive' : ''}`}
                required
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="phone" className="text-sm sm:text-base">
              Phone Number *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => onFieldChange('phone', e.target.value)}
              placeholder="+234 801 234 5678"
              className={errors.phone ? 'border-destructive' : ''}
              required
            />
            {errors.phone && (
              <p className="text-xs text-destructive mt-1">{errors.phone}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Delivery Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Street Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => onFieldChange('address', e.target.value)}
              placeholder="Enter your full address"
              rows={3}
              className={errors.address ? 'border-destructive' : ''}
              required
            />
            {errors.address && (
              <p className="text-xs text-destructive mt-1">{errors.address}</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => onFieldChange('city', e.target.value)}
                className={errors.city ? 'border-destructive' : ''}
                required
              />
              {errors.city && (
                <p className="text-xs text-destructive mt-1">{errors.city}</p>
              )}
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => onFieldChange('state', value)}
              >
                <SelectTrigger className={errors.state ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {NIGERIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-xs text-destructive mt-1">{errors.state}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={formData.paymentMethod}
            onValueChange={(value) => onFieldChange('paymentMethod', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paystack">
                Paystack (Card/Bank/Transfer)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            Secure payment via Paystack - supports cards, bank transfers, and USSD
          </p>
        </CardContent>
      </Card>
    </div>
  );
};