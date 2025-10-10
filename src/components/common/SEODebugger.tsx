import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * SEO Debugger Component - Shows current meta tags for debugging
 * Only visible in development mode
 */
export const SEODebugger = () => {
  const [metaTags, setMetaTags] = useState<{ [key: string]: string }>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (import.meta.env.DEV) {
      setIsVisible(true);
    }

    const updateMetaTags = () => {
      const tags: { [key: string]: string } = {};
      
      // Get all meta tags
      const metaElements = document.querySelectorAll('meta');
      metaElements.forEach((meta) => {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        const content = meta.getAttribute('content');
        
        if (name && content && (
          name.startsWith('og:') || 
          name.startsWith('twitter:') || 
          name.startsWith('product:') ||
          name === 'description' ||
          name === 'keywords'
        )) {
          tags[name] = content;
        }
      });

      // Get title
      tags['title'] = document.title;

      // Get canonical URL
      const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (canonical) {
        tags['canonical'] = canonical.href;
      }

      setMetaTags(tags);
    };

    // Update immediately
    updateMetaTags();

    // Update when DOM changes (for dynamic updates)
    const observer = new MutationObserver(updateMetaTags);
    observer.observe(document.head, { 
      childList: true, 
      subtree: true, 
      attributes: true,
      attributeFilter: ['content']
    });

    return () => observer.disconnect();
  }, []);

  if (!isVisible || Object.keys(metaTags).length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="bg-white/95 backdrop-blur-sm border-2 border-blue-200 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            🔍 SEO Debug
            <Badge variant="outline" className="text-xs">DEV</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 max-h-96 overflow-y-auto">
          <div className="space-y-2 text-xs">
            {Object.entries(metaTags).map(([key, value]) => (
              <div key={key} className="border-b border-gray-100 pb-1">
                <div className="font-medium text-blue-600">{key}:</div>
                <div className="text-gray-700 break-words">{value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};