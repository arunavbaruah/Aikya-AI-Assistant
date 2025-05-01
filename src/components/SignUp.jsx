// SignUp.jsx
import { SignUp } from '@clerk/clerk-react';

const SignUpPage = () => (
  <div className="auth-page">
    <SignUp 
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
      afterSignUpUrl="/"
    />
  </div>
);

export default SignUpPage;