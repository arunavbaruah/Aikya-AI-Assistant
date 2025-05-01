import { UserButton, useUser } from "@clerk/clerk-react"
import { Link } from "react-router-dom"

const Auth = () => {
  const { isSignedIn } = useUser()

  return (
    <div className="auth-container">
      {isSignedIn ? (
        <UserButton afterSignOutUrl="/" />
      ) : (
        <div className="auth-buttons">
          <Link to="/sign-in" className="auth-button">Sign In</Link>
          <Link to="/sign-up" className="auth-button">Sign Up</Link>
        </div>
      )}
    </div>
  )
}

export default Auth
