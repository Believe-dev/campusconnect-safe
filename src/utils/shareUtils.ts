/**
 * Utility functions for social media sharing with proper OG tag support
 */

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  images?: string[];
}

/**
 * Generate shareable URL that will show proper OG tags to crawlers
 */
export const generateShareableUrl = (productId: string): string => {
  return `https://unimarket.com.ng/product/${productId}`;
};

/**
 * Share product with native Web Share API or fallback to clipboard
 */
export const shareProduct = async (product: Product): Promise<boolean> => {
  const url = generateShareableUrl(product.id);
  const title = `${product.title} - ₦${product.price.toLocaleString()}`;
  const text = `Check out this ${product.title} on UniMarket! Only ₦${product.price.toLocaleString()}`;

  // Try Web Share API first (mobile browsers)
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return true;
    } catch (error) {
      // User cancelled or error occurred
      if (error.name === 'AbortError') {
        return false; // User cancelled
      }
      // Fall through to clipboard
    }
  }

  // Fallback: Copy to clipboard
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Generate WhatsApp share URL
 */
export const generateWhatsAppShareUrl = (product: Product): string => {
  const url = generateShareableUrl(product.id);
  const text = `Check out this ${product.title} on UniMarket! Only ₦${product.price.toLocaleString()} - ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

/**
 * Generate Telegram share URL
 */
export const generateTelegramShareUrl = (product: Product): string => {
  const url = generateShareableUrl(product.id);
  const text = `${product.title} - ₦${product.price.toLocaleString()}`;
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
};

/**
 * Generate Twitter share URL
 */
export const generateTwitterShareUrl = (product: Product): string => {
  const url = generateShareableUrl(product.id);
  const text = `Check out this ${product.title} on @unimarket_ng! Only ₦${product.price.toLocaleString()}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
};

/**
 * Generate Facebook share URL
 */
export const generateFacebookShareUrl = (product: Product): string => {
  const url = generateShareableUrl(product.id);
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
};

/**
 * Generate shareable seller profile URL
 */
export const generateSellerProfileUrl = (sellerId: string): string => {
  return `https://unimarket.com.ng/seller/${sellerId}`;
};

/**
 * Share seller profile with native Web Share API or fallback to clipboard
 */
export const shareSellerProfile = async (seller: { user_id: string; full_name: string; business_name?: string }): Promise<boolean> => {
  const url = generateSellerProfileUrl(seller.user_id);
  const name = seller.business_name || seller.full_name;
  const title = `${name} on UniMarket`;
  const text = `Check out ${name}'s store on UniMarket!`;

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') return false;
    }
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.cssText = 'position:fixed;left:-999999px;top:-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Test if URL generates proper OG tags (for debugging)
 */
export const testOGTags = (productId: string): void => {
  const testUrl = `https://www.opengraph.xyz/url/${encodeURIComponent(generateShareableUrl(productId))}`;
  window.open(testUrl, '_blank');
};