// SignIn.jsx
import { SignIn } from '@clerk/clerk-react';

const SignInPage = () => (
  <div className="auth-page">
    <SignIn 
      path="/sign-in"
      routing="path"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
    />
  </div>
);

export default SignInPage;