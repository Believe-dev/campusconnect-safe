import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const StorageTest = () => {
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    const testStorageAccess = async () => {
      try {
        // Test if we can list files in the verification-photos bucket
        const { data, error } = await supabase.storage
          .from('verification-photos')
          .list('', { limit: 1 });

        if (error) {
          setTestResult(`Storage list error: ${error.message}`);
          return;
        }

        // Test if we can get a public URL
        const { data: urlData } = supabase.storage
          .from('verification-photos')
          .getPublicUrl('test.jpg');

        setTestResult(`Storage accessible. Public URL format: ${urlData.publicUrl}`);

        // Test if bucket is public
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        if (bucketError) {
          setTestResult(prev => prev + `\nBucket list error: ${bucketError.message}`);
          return;
        }

        const verificationBucket = buckets.find(b => b.id === 'verification-photos');
        setTestResult(prev => prev + `\nBucket public: ${verificationBucket?.public || 'false'}`);

      } catch (error) {
        setTestResult(`Test error: ${error}`);
      }
    };

    testStorageAccess();
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="font-bold mb-2">Storage Test Results:</h3>
      <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
    </div>
  );
};

export default StorageTest;