import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const PageLoadError = () => (
  <Card className="max-w-md mx-auto mt-8">
    <CardHeader className="text-center">
      <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
      <CardTitle>Error Loading Page</CardTitle>
    </CardHeader>
    <CardContent className="text-center space-y-4">
      <p className="text-muted-foreground">
        We encountered an unexpected error. Please refresh the page.
      </p>
      <div className="flex gap-2 justify-center">
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    </CardContent>
  </Card>
);