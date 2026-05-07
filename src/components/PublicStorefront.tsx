import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, ShoppingBag, ShieldCheck, Globe, ArrowRight, Star, Heart, MapPin, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { BrandIdentity } from '../types';
import api from '../services/api';

// Inline SVG replacements for brand icons
const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
  </svg>
);

const TwitterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const PublicStorefront: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [brand, setBrand] = useState<BrandIdentity | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [brandRes, productsRes] = await Promise.all([
          api.get(`/api/brand/u/${slug}/`),
          api.get(`/api/marketplace/products/u/${slug}/`)
        ]);
        setBrand(brandRes.data);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Store not found or moved.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-black text-slate-800 mb-4">404</h1>
        <p className="text-slate-500 mb-8 max-w-md">{error}</p>
        <Link to="/" className="text-indigo-600 font-semibold hover:underline">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 md:p-16"
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 mb-6 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              VERIFIED SELLER
            </div>
            <h1 className="text-5xl md:text-6xl font-black mb-4 leading-tight">{brand.businessName}</h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl">{brand.socialBio}</p>

            {/* Contact Info */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              {brand.phone && (
                <a
                  href={`tel:${brand.phone}`}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                >
                  <Phone className="w-5 h-5" />
                  {brand.phone}
                </a>
              )}
              <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-3">
              {brand.taglines.map((tag, idx) => (
                <span key={idx} className="px-4 py-2 bg-slate-700 rounded-full text-sm text-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Logo/Brand Image */}
          {brand.logoUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="md:flex-shrink-0"
            >
              <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-2xl">
                <img src={brand.logoUrl} alt={brand.businessName} className="w-full h-full object-cover" />
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Products Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-black text-slate-900 mb-8">Featured Products</h2>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow group"
              >
                <div className="relative h-56 bg-slate-200 overflow-hidden">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  )}
                  <button className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-slate-100 transition-colors">
                    <Heart className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg text-slate-900 mb-2">{product.name}</h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{product.description}</p>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-indigo-600">₦{product.price}</span>
                    {product.price_max && <span className="text-sm text-slate-500">up to ₦{product.price_max}</span>}
                  </div>

                  <button className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                    <ShoppingBag className="w-5 h-5" />
                    View Details
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">No products yet</p>
          </div>
        )}
      </div>

      {/* About Section */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-black text-slate-900 mb-8">About {brand.businessName}</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="inline-block p-3 bg-indigo-100 rounded-lg mb-4">
                <Globe className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Niche</h3>
              <p className="text-slate-600">{brand.niche}</p>
            </div>

            <div>
              <div className="inline-block p-3 bg-purple-100 rounded-lg mb-4">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Vibe</h3>
              <p className="text-slate-600">{brand.vibe}</p>
            </div>

            <div>
              <div className="inline-block p-3 bg-pink-100 rounded-lg mb-4">
                <MessageCircle className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Tagline</h3>
              <p className="text-slate-600">{brand.taglines[0] || 'Premium quality guaranteed'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicStorefront;
