import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SEO from './SEO';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-green-200">
            <SEO
                title="SmartBiz Coach | AI Platform for Nigerian SMEs"
                description="The ultimate operating system for Nigerian businesses. Generate premium business plans, social media content, invoices, and find grants instantly."
            />

            {/* Navigation Bar */}
            <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-green-600/20">
                                S
                            </div>
                            <span className="font-bold text-2xl tracking-tight text-slate-900 font-heading">SmartBiz</span>
                        </div>

                        <div className="hidden md:flex space-x-8 items-center">
                            <a href="#features" className="text-slate-600 hover:text-green-600 font-medium transition-colors">Features</a>
                            <a href="#how-it-works" className="text-slate-600 hover:text-green-600 font-medium transition-colors">How it Works</a>
                            <a href="#pricing" className="text-slate-600 hover:text-green-600 font-medium transition-colors">Pricing</a>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/login')}
                                className="hidden md:block text-slate-600 hover:text-slate-900 font-bold transition-colors"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => navigate('/register')}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="pt-32 pb-16 sm:pt-40 sm:pb-24 lg:pb-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-green-400/10 blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl pointer-events-none"></div>

                    <div className="text-center max-w-4xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <span className="inline-block py-1 px-3 rounded-full bg-green-100 text-green-700 text-sm font-bold tracking-wider uppercase mb-6 border border-green-200">
                                🚀 Built for Nigerian Entrepreneurs
                            </span>
                            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight font-heading mb-8 leading-[1.1]">
                                The Operating System for <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-400">Nigerian SMEs</span>
                            </h1>
                            <p className="mt-4 max-w-2xl text-xl text-slate-500 mx-auto leading-relaxed">
                                Brand, market, manage, and scale your business with AI. Stop juggling ten different apps. Generate business plans, manage inventory, track debtors, and find grants—all in one place.
                            </p>
                        </motion.div>

                        <motion.div
                            className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center gap-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <button
                                onClick={() => navigate('/register')}
                                className="w-full sm:w-auto flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-white bg-green-600 hover:bg-green-700 md:py-4 md:text-lg md:px-10 shadow-xl shadow-green-600/30 transition-all hover:-translate-y-1"
                            >
                                Start for Free
                            </button>
                            <button
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                className="mt-3 w-full sm:w-auto flex items-center justify-center px-8 py-4 border-2 border-slate-200 text-lg font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 md:py-4 md:text-lg md:px-10 transition-all sm:mt-0"
                            >
                                See Features
                            </button>
                        </motion.div>
                    </div>

                    {/* Dashboard Preview Image/Mockup Component */}
                    <motion.div
                        className="mt-20 relative max-w-5xl mx-auto"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                    >
                        <div className="rounded-2xl shadow-2xl overflow-hidden border border-slate-200 bg-white">
                            {/* Fake Browser header */}
                            <div className="bg-slate-100 flex items-center px-4 py-3 border-b border-slate-200">
                                <div className="flex space-x-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <div className="mx-auto bg-white rounded-md px-4 py-1 text-xs text-slate-400 font-mono shadow-sm border border-slate-200">
                                    app.smartbizcoach.com.ng
                                </div>
                            </div>

                            {/* Abstract Dashboard representation */}
                            <div className="flex aspect-[16/9] w-full bg-slate-50">
                                <div className="w-1/5 bg-white border-r border-slate-200 p-4 hidden md:block">
                                    <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-8"></div>
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4, 5, 6].map(i => (
                                            <div key={i} className="h-8 w-full bg-slate-100 rounded-md animate-pulse"></div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-1 p-8 overflow-hidden relative">
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse"></div>
                                        <div className="h-10 w-32 bg-green-100 rounded animate-pulse"></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6 mb-8">
                                        <div className="h-32 bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse"></div>
                                        <div className="h-32 bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse"></div>
                                        <div className="h-32 bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse"></div>
                                    </div>
                                    <div className="h-64 bg-white rounded-xl shadow-sm border border-slate-200 w-full animate-pulse"></div>

                                    {/* Floating Notification abstract */}
                                    <div className="absolute top-10 right-10 w-64 h-20 bg-white rounded-lg shadow-xl border border-slate-100 p-4 flex gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex-shrink-0"></div>
                                        <div className="flex-1 space-y-2 py-1">
                                            <div className="h-2 bg-slate-200 rounded w-full"></div>
                                            <div className="h-2 bg-slate-200 rounded w-2/3"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* Features Section */}
            <section id="features" className="py-24 bg-white border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-sm font-bold text-green-600 tracking-wide uppercase">Everything you need</h2>
                        <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-slate-900 sm:text-4xl font-heading">
                            A Complete Business Toolkit
                        </p>
                        <p className="mt-4 max-w-2xl text-xl text-slate-500 mx-auto">
                            Replace multiple subscriptions with one powerful platform perfectly adapted for the Nigerian market.
                        </p>
                    </div>

                    <div className="mt-10">
                        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
                            {/* Feature 1 */}
                            <div className="group bg-slate-50 rounded-2xl p-8 hover:bg-green-50 transition-colors border border-slate-100 hover:border-green-100">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform">
                                    ✨
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3 font-heading">AI Brand & Content</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Generate beautiful social media posts, captions, logos, and a unique brand identity tailored to your specific Nigerian audience.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="group bg-slate-50 rounded-2xl p-8 hover:bg-blue-50 transition-colors border border-slate-100 hover:border-blue-100">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform">
                                    💰
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3 font-heading">Find Funding</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Automatically match your business with available Nigerian and international grants, loans, and equity funding programs.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="group bg-slate-50 rounded-2xl p-8 hover:bg-purple-50 transition-colors border border-slate-100 hover:border-purple-100">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform">
                                    📒
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3 font-heading">Debtor Book (Gbege Book)</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Keep track of all customers owing you money. Automate polite WhatsApp reminders to recover your funds faster without stress.
                                </p>
                            </div>

                            {/* Feature 4 */}
                            <div className="group bg-slate-50 rounded-2xl p-8 hover:bg-orange-50 transition-colors border border-slate-100 hover:border-orange-100">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform">
                                    🧾
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3 font-heading">Smart Invoicing</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Generate instantly shareable, professional PDF invoices. Easily track paid and pending invoices to stay on top of cash flow.
                                </p>
                            </div>

                            {/* Feature 5 */}
                            <div className="group bg-slate-50 rounded-2xl p-8 hover:bg-teal-50 transition-colors border border-slate-100 hover:border-teal-100">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform">
                                    ⚖️
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3 font-heading">Compliance Checker</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Navigate CAC registrations, TIN generation, and regulatory requirements flawlessly to ensure your business remains legally sound.
                                </p>
                            </div>

                            {/* Feature 6 */}
                            <div className="group bg-slate-50 rounded-2xl p-8 hover:bg-indigo-50 transition-colors border border-slate-100 hover:border-indigo-100">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform">
                                    🛒
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3 font-heading">B2B Marketplace</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Source wholesale goods from trusted vendors or hire expert local freelancers instantly to fulfill your direct operational needs.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-slate-900 py-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h2 className="text-3xl font-extrabold text-white sm:text-4xl font-heading mb-6">
                        Ready to upgrade your hustle?
                    </h2>
                    <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                        Join thousands of smart Nigerian business owners organizing their operations and accelerating their growth today.
                    </p>
                    <button
                        onClick={() => navigate('/register')}
                        className="bg-green-500 hover:bg-green-400 text-slate-900 px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-xl shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-1"
                    >
                        Create Your Free Account
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 justify-between sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center space-x-2 mb-6">
                                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                                    S
                                </div>
                                <span className="font-bold text-xl text-slate-900 font-heading">SmartBiz</span>
                            </div>
                            <p className="text-slate-500 text-sm leading-relaxed mb-6">
                                The most comprehensive business management and growth tool built specifically for the Nigerian SME ecosystem.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-4 uppercase text-xs tracking-wider">Product</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-sm text-slate-500 hover:text-green-600 transition-colors">Features</a></li>
                                <li><a href="#" className="text-sm text-slate-500 hover:text-green-600 transition-colors">Pricing</a></li>
                                <li><a href="#" className="text-sm text-slate-500 hover:text-green-600 transition-colors">Success Stories</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-4 uppercase text-xs tracking-wider">Resources</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-sm text-slate-500 hover:text-green-600 transition-colors">Blog</a></li>
                                <li><a href="#" className="text-sm text-slate-500 hover:text-green-600 transition-colors">Help Center</a></li>
                                <li><a href="#" className="text-sm text-slate-500 hover:text-green-600 transition-colors">Grants Guide</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-4 uppercase text-xs tracking-wider">Company</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-sm text-slate-500 hover:text-green-600 transition-colors">About Us</a></li>
                                <li><a href="#" className="text-sm text-slate-500 hover:text-green-600 transition-colors">Contact</a></li>
                                <li><a href="#" className="text-sm text-slate-500 hover:text-green-600 transition-colors">Privacy Policy</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
                        <p>&copy; {new Date().getFullYear()} SmartBiz Coach. All rights reserved.</p>
                        <div className="flex space-x-6 mt-4 md:mt-0">
                            <a href="#" className="hover:text-slate-900">Twitter</a>
                            <a href="#" className="hover:text-slate-900">LinkedIn</a>
                            <a href="#" className="hover:text-slate-900">Instagram</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
