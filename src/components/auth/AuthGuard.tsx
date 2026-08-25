export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  // Temporarily disabled to prevent logout loops
  return <>{children}</>;
};