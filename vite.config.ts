import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_WA_DIRECT_SUPPORT': JSON.stringify(
      process.env.VITE_WA_DIRECT_SUPPORT ||
      process.env.WA_DIRECT_SUPPORT ||
      process.env.VITE_SUPPORT_WHATSAPP ||
      process.env.SUPPORT_WHATSAPP ||
      process.env.VITE_SUPPORT_PHONE ||
      process.env.SUPPORT_PHONE ||
      ''
    ),
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-pdf': ['jspdf', 'html-to-image'],
          'vendor-icons': ['lucide-react'],
          'vendor-utils': ['axios', 'dompurify'],
        }
      }
    }
  }
});

