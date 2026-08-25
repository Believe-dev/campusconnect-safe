# Seller Application System & Product Sizes Implementation

## Overview
This implementation adds two major features to the CampusConnect marketplace:
1. **Seller Application System**: Allows buyers to apply to become sellers with admin approval/rejection and notification system
2. **Product Sizing**: Adds optional size selection for products with display in order details

## Features Implemented

### 1. Seller Application System

#### Database Changes
- **New Table**: `seller_applications` - Tracks all seller applications with status and admin responses
- **New Column**: `seller_application_reason` in `profiles` table
- **New Functions**: 
  - `approve_seller_application()` - Handles approval with notifications
  - `reject_seller_application()` - Handles rejection with custom reasons

#### Components Created
- **SellerApplicationForm**: Form for buyers to apply to become sellers
- **SellerApplicationStatus**: Shows application status and allows reapplication
- **Updated SellerApprovalsTab**: Enhanced admin interface with reason viewing and custom responses

#### User Flow
1. **Buyer Application**: Buyers can apply through Profile page with detailed reason (min 50 characters)
2. **Admin Review**: Admins see applications with reasons and can approve/reject with custom messages
3. **Notifications**: Users receive notifications with admin responses on approval/rejection
4. **Status Tracking**: Users can see their application status and reapply if rejected

### 2. Product Sizing System

#### Database Changes
- **New Column**: `available_sizes` (TEXT[]) in `products` table
- **New Column**: `selected_size` (TEXT) in `orders` table

#### Components Created
- **SizeSelector**: Reusable component for size selection with predefined and custom sizes

#### User Flow
1. **Seller**: Can add sizes when listing products (predefined: XS, S, M, L, XL, XXL or custom sizes)
2. **Buyer**: Must select size if available before adding to cart
3. **Order Details**: Selected size is displayed in order information

## Technical Implementation

### Type Updates
```typescript
// Updated Profile interface
interface Profile {
  // ... existing fields
  seller_application_reason?: string;
}

// Updated Product interface  
interface Product {
  // ... existing fields
  available_sizes?: string[];
}

// Updated Order interface
interface Order {
  // ... existing fields
  selected_size?: string;
}
```

### Key Functions

#### Seller Application Approval
```sql
-- Function to approve seller applications
CREATE OR REPLACE FUNCTION approve_seller_application(
    application_id UUID,
    admin_response TEXT DEFAULT NULL
)
```

#### Seller Application Rejection
```sql
-- Function to reject seller applications
CREATE OR REPLACE FUNCTION reject_seller_application(
    application_id UUID,
    admin_response TEXT
)
```

### Admin Interface Updates
- **Enhanced SellerApprovalsTab**: Now shows application reasons and allows custom responses
- **Notification Integration**: Automatic notifications sent to users on approval/rejection
- **Application History**: Tracks all applications with timestamps and admin responses

### User Interface Updates
- **Profile Page**: Shows seller application status and allows new applications
- **Sell Page**: Enhanced with size selection for products
- **Product Details**: Size selector for products with available sizes
- **Orders Page**: Displays selected sizes in order details

## Security Features
- **RLS Policies**: Proper row-level security for seller applications
- **Input Validation**: Minimum character requirements for application reasons
- **Admin-Only Actions**: Only admins can approve/reject applications
- **Notification System**: Secure notification delivery with admin responses

## Database Migration
The implementation includes a comprehensive migration file:
`20250101000500_seller_application_and_product_sizes.sql`

This migration:
- Adds new columns to existing tables
- Creates the seller_applications table
- Sets up RLS policies
- Creates approval/rejection functions
- Updates the user signup process

## Benefits
1. **Quality Control**: Admin approval ensures only qualified sellers join the platform
2. **Better UX**: Clear application status and feedback for users
3. **Product Variety**: Size options make the platform suitable for clothing, shoes, etc.
4. **Order Accuracy**: Size selection reduces order disputes
5. **Transparency**: Users receive detailed feedback on application decisions

## Usage Examples

### Applying to Become a Seller
```typescript
// User fills out application form with detailed reason
const application = {
  reason: "I want to sell handmade jewelry and accessories...",
  status: "pending"
};
```

### Admin Approval/Rejection
```typescript
// Admin approves with custom message
await approveSellerApplication(applicationId, "Welcome to our seller community!");

// Admin rejects with detailed feedback
await rejectSellerApplication(applicationId, "Please provide more details about your products...");
```

### Adding Product Sizes
```typescript
// Seller adds sizes when creating product
const product = {
  title: "Cotton T-Shirt",
  available_sizes: ["S", "M", "L", "XL"],
  // ... other fields
};
```

### Size Selection in Cart
```typescript
// Buyer must select size before adding to cart
const cartItem = {
  product_id: productId,
  selected_size: "M",
  quantity: 1
};
```

This implementation provides a complete seller application workflow with admin oversight and enhances the product system with sizing capabilities, making the marketplace more professional and user-friendly.