import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import ContextProvider from './context/Context.jsx';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SignInPage from './components/SignIn';
import SignUpPage from './components/SignUp';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: '#4b90ff',
          colorText: 'white',
          colorBackground: '#121923',
        },
        elements: {
          card: {
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
          }
        }
      }}
    >
      <BrowserRouter>
        <ContextProvider>
          <Routes>
            <Route path="/*" element={<App />} />
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
          </Routes>
        </ContextProvider>
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);