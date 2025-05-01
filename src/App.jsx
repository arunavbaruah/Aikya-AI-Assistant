import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar';
import Main from './components/Main/Main';
import SignInPage from './components/SignIn';
import SignUpPage from './components/SignUp';
import './App.css';

const App = () => {
  return (
    <div className="app">
      <Sidebar />
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
      </Routes>
    </div>
  );
};

export default App;