import { SignupPage } from "@/components/auth/SignupPage";

const TestSignup = () => {
  return (
    <div className="min-h-screen">
      <SignupPage onSuccess={() => {
        console.log("Signup successful!");
        window.location.href = "/";
      }} />
    </div>
  );
};

export default TestSignup;