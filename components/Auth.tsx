
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const routerLocation = useLocation();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password' | 'reset_password_code'>(
    routerLocation.pathname.includes('register') ? 'register' : 'login'
  );
  const [isLoading, setIsLoading] = useState(false);

  // Sync state if route changes between /login and /register while mounted
  useEffect(() => {
    if (routerLocation.pathname.includes('register')) {
      setAuthMode('register');
    } else if (routerLocation.pathname.includes('login')) {
      setAuthMode('login');
    }
  }, [routerLocation.pathname]);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [currency, setCurrency] = useState('NGN');

  // Password Recovery State
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (authMode === 'login') {
        const response = await authService.login({ username: email, password });
        onLogin(response.user);
      } else if (authMode === 'register') {
        const response = await authService.register({
          username: email,
          email,
          password,
          first_name: name,
          business_name: businessName,
          phone,
          location,
          currency,
          has_onboarded: true
        });

        if (response.token) {
          localStorage.setItem('sb_auth_token', response.token);
          onLogin(response.user);
        } else {
          const loginResponse = await authService.login({ username: email, password });
          onLogin(loginResponse.user);
        }
      } else if (authMode === 'forgot_password') {
        const response = await authService.forgotPassword(email);
        let alertMessage = "A 6-digit reset code has been sent to your email.";
        if (response.debug_code) {
          alertMessage += ` (Debug Code: ${response.debug_code})`;
          setCode(response.debug_code); // Pre-fill debug code for easy local testing
        }
        alert(alertMessage);
        setAuthMode('reset_password_code');
        setIsLoading(false);
      } else if (authMode === 'reset_password_code') {
        await authService.resetPassword({
          email,
          code,
          new_password: newPassword
        });
        alert("Password has been reset successfully! You can now sign in with your new password.");
        setAuthMode('login');
        setPassword('');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Auth Error", error);
      let errorMsg = "Authentication failed. Please check your credentials.";

      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'object') {
          const firstKey = Object.keys(data)[0];
          const firstError = data[firstKey];
          errorMsg = `${firstKey}: ${Array.isArray(firstError) ? firstError[0] : firstError}`;
        } else if (data.error) {
          errorMsg = data.error;
        }
      }
      alert(errorMsg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-slate-200">

        {/* Left Side - Visual (Formal) */}
        <div className="hidden md:flex flex-col justify-center items-center bg-slate-900 text-white p-12 w-1/2 relative overflow-hidden">
          {/* Formal Pattern */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-800/50 to-slate-900/90"></div>

          <div className="relative z-10 text-center max-w-md">
            <div className="w-16 h-16 bg-white rounded-lg mx-auto flex items-center justify-center text-slate-900 text-3xl font-bold shadow-lg mb-8">
              S
            </div>
            <h2 className="text-3xl font-heading font-bold mb-4 tracking-tight">SmartBiz Coach</h2>
            <p className="text-slate-300 leading-relaxed text-lg font-light">
              The professional operating system for Nigerian businesses. Brand, Market, and Manage with confidence.
            </p>

            <div className="mt-12 grid grid-cols-3 gap-6 text-center border-t border-slate-700 pt-8">
              <div>
                <p className="text-2xl font-bold">50k+</p>
                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Users</p>
              </div>
              <div>
                <p className="text-2xl font-bold">99%</p>
                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Uptime</p>
              </div>
              <div>
                <p className="text-2xl font-bold">24/7</p>
                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Support</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-white">
          <div className="mb-10">
            <h3 className="text-2xl font-bold font-heading text-slate-900">
              {authMode === 'login' && 'Sign In'}
              {authMode === 'register' && 'Get Started'}
              {authMode === 'forgot_password' && 'Reset Password'}
              {authMode === 'reset_password_code' && 'Verify Code'}
            </h3>
            <p className="text-slate-500 text-sm mt-2">
              {authMode === 'login' && 'Access your business dashboard.'}
              {authMode === 'register' && 'Create your professional account.'}
              {authMode === 'forgot_password' && 'Enter your email to receive a recovery code.'}
              {authMode === 'reset_password_code' && 'Enter the 6-digit code and a new password.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {authMode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-md bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Business Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-md bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Lagos Ventures"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Phone</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-md bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="080..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Location</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-md bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Lagos"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Currency</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setCurrency('NGN')}
                      className={`flex-1 py-2 border rounded-md text-sm font-bold transition-colors ${currency === 'NGN' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      ₦ Naira
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={`flex-1 py-2 border rounded-md text-sm font-bold transition-colors ${currency === 'USD' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      $ Dollar
                    </button>
                  </div>
                </div>
              </>
            )}

            {authMode !== 'reset_password_code' ? (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-md bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verifying Email</label>
                <div className="w-full px-4 py-3 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-sm font-medium">
                  {email}
                </div>
              </div>
            )}

            {(authMode === 'login' || authMode === 'register') && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 rounded-md bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {authMode === 'login' && (
              <div className="text-right mt-1">
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot_password')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {authMode === 'reset_password_code' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">6-Digit Reset Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-md bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all text-sm text-center font-bold tracking-widest text-slate-850"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">New Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 rounded-md bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-md hover:bg-slate-800 transition-all shadow-md mt-2 flex justify-center items-center text-sm tracking-wide"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {authMode === 'login' && 'Sign In'}
                  {authMode === 'register' && 'Create Account'}
                  {authMode === 'forgot_password' && 'Send Reset Code'}
                  {authMode === 'reset_password_code' && 'Reset Password'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm border-t border-slate-100 pt-6">
            {authMode === 'login' && (
              <>
                <span className="text-slate-500">New to SmartBiz? </span>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="text-slate-900 font-bold hover:underline"
                >
                  Create Account
                </button>
              </>
            )}
            {authMode === 'register' && (
              <>
                <span className="text-slate-500">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-slate-900 font-bold hover:underline"
                >
                  Sign In
                </button>
              </>
            )}
            {(authMode === 'forgot_password' || authMode === 'reset_password_code') && (
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="text-slate-900 font-bold hover:underline flex items-center justify-center mx-auto gap-2"
              >
                &larr; Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 text-center w-full text-xs text-slate-400 pointer-events-none">
        &copy; {new Date().getFullYear()} SmartBiz Coach. Secure & Encrypted.
      </div>
    </div>
  );
};

export default Auth;
