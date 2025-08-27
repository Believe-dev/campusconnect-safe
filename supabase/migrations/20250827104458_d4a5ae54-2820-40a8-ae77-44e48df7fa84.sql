-- Insert demo products across all categories using existing user
INSERT INTO public.products (title, description, category, price, stock_quantity, condition, campus, seller_id, images) VALUES
-- Books & Textbooks
('Engineering Mathematics by K.A. Stroud', 'Excellent condition textbook for engineering students. All pages intact, minimal highlighting.', 'Books & Textbooks', 8500, 1, 'excellent', 'University of Lagos', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400']),
('Organic Chemistry Textbook', 'Used organic chemistry textbook. Good for 2nd year chemistry students.', 'Books & Textbooks', 6000, 1, 'good', 'University of Ibadan', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400']),
('Computer Science Past Questions', 'Collection of past exam questions from 2018-2023. Very helpful for exam prep.', 'Books & Textbooks', 2500, 3, 'good', 'University of Lagos', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400']),

-- Electronics
('HP Laptop 15-inch', 'Core i5, 8GB RAM, 256GB SSD. Perfect for students. Battery life 6+ hours.', 'Electronics', 185000, 1, 'good', 'University of Lagos', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400']),
('iPhone 12 64GB', 'Barely used iPhone 12. No scratches, all accessories included. iOS updated.', 'Electronics', 320000, 1, 'excellent', 'Ahmadu Bello University', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400']),
('Samsung Galaxy Earbuds', 'Wireless earbuds in perfect condition. Great sound quality for music and calls.', 'Electronics', 25000, 2, 'new', 'University of Nigeria, Nsukka', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400']),
('Scientific Calculator (Casio)', 'Casio FX-991EX scientific calculator. Essential for math and engineering courses.', 'Electronics', 12000, 4, 'good', 'University of Lagos', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400']),

-- Fashion & Accessories
('Vintage Denim Jacket', 'Stylish denim jacket, perfect for campus fashion. Size M, unisex design.', 'Fashion & Accessories', 8000, 1, 'good', 'University of Ibadan', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400']),
('Adidas Campus Sneakers', 'White Adidas sneakers, size 42. Comfortable for daily wear around campus.', 'Fashion & Accessories', 35000, 1, 'good', 'University of Lagos', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400']),
('Leather Backpack', 'Durable leather backpack perfect for carrying books and laptop. Multiple compartments.', 'Fashion & Accessories', 22000, 2, 'excellent', 'Obafemi Awolowo University', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400']),

-- Food & Beverages
('Homemade Zobo (Per Bottle)', 'Fresh and healthy zobo drink made with natural ingredients. Available daily.', 'Food & Beverages', 500, 20, 'new', 'University of Lagos', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400']),
('Fresh Fruit Salad', 'Mixed fruit salad with pineapple, watermelon, and orange. Made fresh daily.', 'Food & Beverages', 800, 10, 'new', 'University of Ibadan', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400']),

-- Services
('Mathematics Tutoring', 'Expert math tutoring for calculus, algebra, and statistics. ₦3000 per session.', 'Services', 3000, 50, 'new', 'University of Lagos', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1509869175650-a1d97972541a?w=400']),
('Laptop Repair Service', 'Professional laptop repair and maintenance. Screen replacement, hardware upgrades.', 'Services', 5000, 100, 'new', 'Ahmadu Bello University', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400']),
('Assignment Typing Service', 'Professional document typing and formatting. Fast turnaround, quality guaranteed.', 'Services', 200, 200, 'new', 'University of Nigeria, Nsukka', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400']),

-- Sports & Recreation
('Football (Soccer Ball)', 'FIFA approved football in excellent condition. Great for campus sports.', 'Sports & Recreation', 4500, 3, 'good', 'University of Lagos', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1614632537190-23e4b6f6c7d4?w=400']),
('Basketball Shoes (Nike)', 'Nike basketball shoes size 43. Great grip and comfort for court games.', 'Sports & Recreation', 28000, 1, 'good', 'University of Benin', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400']),
('Yoga Mat', 'Premium yoga mat for fitness and meditation. Non-slip surface, easy to clean.', 'Sports & Recreation', 6500, 5, 'excellent', 'Obafemi Awolowo University', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400']),

-- Home & Living
('Study Desk Lamp', 'Adjustable LED desk lamp perfect for late-night studying. Energy efficient.', 'Home & Living', 7500, 6, 'new', 'University of Lagos', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400']),
('Mini Fridge', 'Compact mini fridge ideal for hostel rooms. Energy efficient, quiet operation.', 'Home & Living', 65000, 1, 'good', 'University of Ibadan', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400']),

-- Other
('Guitar (Acoustic)', 'Beautiful acoustic guitar in great condition. Perfect for music lovers and beginners.', 'Other', 45000, 1, 'good', 'University of Lagos', '197cc55f-a224-4bcb-9f0c-f4abd3639626', ARRAY['https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=400']);