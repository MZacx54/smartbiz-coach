
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { User } from '../types';
import { authService } from '../services/authService';
import { NIGERIAN_STATES } from '../constants';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password' | 'reset_password_code'>(
    routerLocation.pathname.includes('register') ? 'register' : 'login'
  );
  const [isLoading, setIsLoading] = useState(false);

  // Password Visibility Toggle State
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Sync state if route changes between /login and /register while mounted
  useEffect(() => {
    if (routerLocation.pathname.includes('register')) {
      setAuthMode('register');
    } else if (routerLocation.pathname.includes('login')) {
      setAuthMode('login');
    }
  }, [routerLocation.pathname]);

  // Cohort & Referral URL State
  const searchParams = new URLSearchParams(routerLocation.search);
  const [cohort, setCohort] = useState<string>(searchParams.get('cohort') || '');
  const [refCode, setRefCode] = useState<string>(searchParams.get('ref') || '');

  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search);
    const c = params.get('cohort');
    const r = params.get('ref');
    if (c) setCohort(c);
    if (r) setRefCode(r);
  }, [routerLocation.search]);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Lagos');
  const [currency, setCurrency] = useState('NGN');

  // Password Recovery State
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [agreedToNdpr, setAgreedToNdpr] = useState(false);

  const DISPOSABLE_EMAIL_DOMAINS = new Set([
    'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'throwawaymail.com', 'trashmail.com', 'sharklasers.com', 'yopmail.com',
    'getairmail.com', 'dispostable.com', 'fakemailgenerator.com'
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validations
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (authMode === 'register') {
      const domain = cleanEmail.split('@')[1];
      if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
        toast.error("Please use a permanent business or personal email. Disposable email providers are not supported.");
        return;
      }
      if (password.length < 8) {
        toast.error("Password must contain at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match. Please verify.");
        return;
      }
      if (!agreedToNdpr) {
        toast.error("Please accept the Terms of Service and NDPA 2023 Privacy Policy to register.");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (authMode === 'login') {
        const response = await authService.login({ username: cleanEmail, password });
        toast.success("Welcome back!");
        onLogin(response.user);
      } else if (authMode === 'register') {
        const response = await authService.register({
          username: cleanEmail,
          email: cleanEmail,
          password,
          first_name: name.trim(),
          business_name: businessName.trim(),
          phone: phone.trim(),
          location,
          currency,
          cohort,
          ref: refCode
        });

        toast.success("Account created successfully!");
        if (response.token) {
          localStorage.setItem('sb_auth_token', response.token);
          onLogin(response.user);
        } else {
          const loginResponse = await authService.login({ username: cleanEmail, password });
          onLogin(loginResponse.user);
        }
      } else if (authMode === 'forgot_password') {
        await authService.forgotPassword(cleanEmail);
        toast.success("A 6-digit recovery code has been sent to your email.", { duration: 6000 });
        setAuthMode('reset_password_code');
      } else if (authMode === 'reset_password_code') {
        if (newPassword.length < 8) {
          toast.error("New password must be at least 8 characters long.");
          setIsLoading(false);
          return;
        }
        await authService.resetPassword({
          email: cleanEmail,
          code: code.trim(),
          new_password: newPassword
        });
        toast.success("Password reset successfully! You can now sign in with your new password.", { duration: 6000 });
        setAuthMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error("Auth Error", error);
      let errorMsg = "Authentication failed. Please check your credentials.";

      if (authMode === 'forgot_password') {
        errorMsg = "Could not send reset code. Please check your email address and try again.";
      } else if (authMode === 'reset_password_code') {
        errorMsg = "Invalid or expired reset code. Please verify and try again.";
      }

      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (Array.isArray(data)) {
          errorMsg = data[0];
        } else if (typeof data === 'object') {
          const keys = Object.keys(data);
          if (keys.length > 0) {
            const k = keys[0];
            const val = data[k];
            const valStr = Array.isArray(val) ? val[0] : (typeof val === 'object' ? JSON.stringify(val) : String(val));
            errorMsg = k === 'detail' || k === 'error' || k === 'message' || k === 'non_field_errors' 
              ? valStr 
              : `${k.charAt(0).toUpperCase() + k.slice(1).replace('_', ' ')}: ${valStr}`;
          }
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      toast.error(errorMsg, { duration: 6000 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans selection:bg-green-200">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-slate-200">

        {/* Left Side - Visual (Emerald Green Gradient Theme) */}
        <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-emerald-800 via-emerald-950 to-slate-950 text-white p-12 w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-green-500/20 via-transparent to-transparent pointer-events-none"></div>
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.28) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

          <div className="relative z-10 text-center max-w-md">
            <button
              type="button"
              onClick={() => navigate('/')}
              title="Go to SmartBiz Coach Home Page"
              className="inline-block mb-8 cursor-pointer hover:scale-105 transition-transform focus:outline-none"
            >
              <img src="/logo-square.png" alt="SmartBiz Coach" className="w-20 h-20 rounded-2xl mx-auto object-cover shadow-2xl border border-white/20" />
            </button>
            <h2 className="text-3xl font-heading font-extrabold mb-4 tracking-tight">SmartBiz Coach</h2>
            <p className="text-emerald-100 leading-relaxed text-base font-light">
              The professional AI-powered operating system for Nigerian entrepreneurs. Manage invoices, plan strategies, match grants, and close sales with confidence.
            </p>

            <div className="mt-12 grid grid-cols-3 gap-6 text-center border-t border-emerald-800/40 pt-8">
              <div>
                <p className="text-2xl font-black text-green-400">100%</p>
                <p className="text-[10px] text-emerald-300 uppercase tracking-widest mt-1">Offline POS</p>
              </div>
              <div>
                <p className="text-2xl font-black text-green-400">5-Sec</p>
                <p className="text-[10px] text-emerald-300 uppercase tracking-widest mt-1">Sale Entry</p>
              </div>
              <div>
                <p className="text-2xl font-black text-green-400">Free</p>
                <p className="text-[10px] text-emerald-300 uppercase tracking-widest mt-1">Core Ledger</p>
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {authMode === 'register' && (
              <>
                {/* Institutional / Chamber Cohort Banner */}
                {cohort && (
                  <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                      🏛️
                    </div>
                    <div>
                      <p className="font-extrabold text-emerald-950 text-xs">Institutional Chamber Enrollment Active</p>
                      <p className="text-emerald-700 text-[11px]">
                        Cohort: <span className="font-mono font-bold uppercase tracking-wide bg-emerald-100/70 px-1.5 py-0.5 rounded text-emerald-900">{cohort.replace(/[-_]/g, ' ')}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Referral Attribution Banner */}
                {refCode && !cohort && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-xs text-blue-900">
                    <span className="text-sm">🎁</span>
                    <div>
                      <p className="font-bold text-blue-950 text-xs">Referral Bonus Active</p>
                      <p className="text-blue-700 text-[11px]">Referred by: <span className="font-mono font-bold">{refCode}</span> (+50 BizCredits)</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="e.g. Chinedu Obi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Business Name</label>
                    <input
                      type="text"
                      required
                      autoComplete="organization"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="e.g. Lagos Ventures"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Phone Number</label>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="080... or +234..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Location / State</label>
                    <select
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm font-medium text-slate-800"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    >
                      <option value="" disabled>Select State / Location</option>
                      {NIGERIAN_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
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
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verifying Email</label>
                <div className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-sm font-medium">
                  {email}
                </div>
              </div>
            )}

            {(authMode === 'login' || authMode === 'register') && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 focus:outline-none transition-colors cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 focus:outline-none transition-colors cursor-pointer"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {authMode === 'login' && (
              <div className="text-right mt-1">
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot_password')}
                  className="text-xs font-bold text-slate-500 hover:text-green-600 transition-colors cursor-pointer"
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
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm text-center font-bold tracking-widest text-slate-850"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      className="w-full pl-4 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNewPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 focus:outline-none transition-colors cursor-pointer"
                      title={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {authMode === 'register' && (
              <div className="flex items-start gap-2.5 pt-1 text-left">
                <input
                  type="checkbox"
                  id="ndpr_consent"
                  checked={agreedToNdpr}
                  onChange={(e) => setAgreedToNdpr(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500 cursor-pointer"
                  required
                />
                <label htmlFor="ndpr_consent" className="text-xs text-slate-600 leading-tight select-none cursor-pointer">
                  I accept the <a href="/terms" target="_blank" className="text-green-600 underline font-bold">Terms of Service</a> and confirm lawful <a href="/privacy" target="_blank" className="text-green-600 underline font-bold">NDPA 2023 Data Processing</a>.
                </label>
              </div>
            )}

            {/* Buttons Group */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-green-600 text-white font-extrabold rounded-xl hover:bg-green-500 transition-all shadow-lg shadow-green-550/20 flex justify-center items-center text-sm tracking-wide cursor-pointer"
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
            </div>
          </form>

          <div className="mt-8 text-center text-sm border-t border-slate-100 pt-6">
            {authMode === 'login' && (
              <>
                <span className="text-slate-500">New to SmartBiz? </span>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="text-green-600 font-bold hover:underline"
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
                  className="text-green-600 font-bold hover:underline"
                >
                  Sign In
                </button>
              </>
            )}
            {(authMode === 'forgot_password' || authMode === 'reset_password_code') && (
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="text-green-650 font-bold hover:underline flex items-center justify-center mx-auto gap-2"
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
