import { useState } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { testOGTags, generateShareableUrl } from '@/utils/shareUtils';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const OGTestComponent = () => {
  const [productId, setProductId] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleTestOG = () => {
    if (!productId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a product ID',
        variant: 'destructive',
      });
      return;
    }
    testOGTags(productId.trim());
  };

  const handleCopyUrl = async () => {
    if (!productId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a product ID',
        variant: 'destructive',
      });
      return;
    }

    const url = generateShareableUrl(productId.trim());
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Product URL copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy URL',
        variant: 'destructive',
      });
    }
  };

  const testUrls = [
    {
      name: 'OpenGraph.xyz',
      url: (id: string) => `https://www.opengraph.xyz/url/${encodeURIComponent(generateShareableUrl(id))}`,
    },
    {
      name: 'Facebook Debugger',
      url: (id: string) => `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(generateShareableUrl(id))}`,
    },
    {
      name: 'Twitter Card Validator',
      url: (id: string) => `https://cards-dev.twitter.com/validator?url=${encodeURIComponent(generateShareableUrl(id))}`,
    },
    {
      name: 'LinkedIn Inspector',
      url: (id: string) => `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(generateShareableUrl(id))}`,
    },
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>OG Tags Testing Tool</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test how your product links appear when shared on social media platforms
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter Product ID (e.g., 123e4567-e89b-12d3-a456-426614174000)"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleCopyUrl} variant="outline" size="icon">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {productId.trim() && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Generated URL:</p>
            <p className="text-sm text-muted-foreground break-all">
              {generateShareableUrl(productId.trim())}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {testUrls.map((tool) => (
            <Button
              key={tool.name}
              onClick={() => {
                if (!productId.trim()) {
                  toast({
                    title: 'Error',
                    description: 'Please enter a product ID',
                    variant: 'destructive',
                  });
                  return;
                }
                window.open(tool.url(productId.trim()), '_blank');
              }}
              variant="outline"
              className="justify-start"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {tool.name}
            </Button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>How to test:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Enter a valid product ID from your database</li>
            <li>Click any testing tool to open it in a new tab</li>
            <li>The tool will show you how the link appears when shared</li>
            <li>Check that the image, title, and description are correct</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};