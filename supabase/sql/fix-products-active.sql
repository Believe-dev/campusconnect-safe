-- Fix products to be active by default
UPDATE products SET is_active = true WHERE is_active IS NULL OR is_active = false;