import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img 
            src="/logo.png" 
            alt="UniMarket Logo" 
            className="h-12 w-12 object-contain"
          />
          <h2 className="text-2xl font-bold text-university-green">UniMarket</h2>
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">Oops! This page doesn't exist</p>
        <p className="text-gray-500 mb-8">The page you're looking for might have been moved or deleted.</p>
        <a 
          href="/" 
          className="inline-block bg-university-green text-white px-6 py-3 rounded-lg hover:bg-university-green/90 transition-colors font-medium"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
