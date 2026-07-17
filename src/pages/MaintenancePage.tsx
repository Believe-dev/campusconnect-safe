import { Clock } from "lucide-react";

const MaintenancePage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src="/logo.png"
            alt="UniMarket Logo"
            className="h-14 w-14 object-contain"
          />
          <h1 className="text-2xl font-bold text-university-green">
            UniMarket
          </h1>
        </div>

        <div className="flex items-center justify-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-university-green/10">
            <Clock className="h-7 w-7 text-university-green" />
          </span>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            We'll be back soon
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            UniMarket is temporarily unavailable while we make some important
            updates. We'll be back soon and will notify registered users when
            we're live again.
          </p>
          <p className="text-muted-foreground">Thanks for your patience.</p>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
