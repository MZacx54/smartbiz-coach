
import React, { useState } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [currency, setCurrency] = useState('NGN');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Call Backend API
    try {
      if (isLogin) {
        const response = await authService.login({ username: email, password });
        onLogin(response.user);
      } else {
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

        // If registration was successful, we now get a token provided backend was updated
        if (response.token) {
          localStorage.setItem('sb_auth_token', response.token); // Manually set token if not handled in service
          onLogin(response.user);
        } else {
          // Fallback if backend doesn't return token (old behavior)
          const loginResponse = await authService.login({ username: email, password });
          onLogin(loginResponse.user);
        }
      }
    } catch (error: any) {
      console.error("Auth Error", error);
      let errorMsg = "Authentication failed. Please check your credentials.";

      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'object') {
          // Extract first error message from object
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
              {isLogin ? 'Sign In' : 'Get Started'}
            </h3>
            <p className="text-slate-500 text-sm mt-2">
              {isLogin ? 'Access your business dashboard.' : 'Create your professional account.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-md hover:bg-slate-800 transition-all shadow-md mt-2 flex justify-center items-center text-sm tracking-wide"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm border-t border-slate-100 pt-6">
            <span className="text-slate-500">
              {isLogin ? "New to SmartBiz? " : "Already have an account? "}
            </span>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-900 font-bold hover:underline"
            >
              {isLogin ? 'Create Account' : 'Sign In'}
            </button>
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
