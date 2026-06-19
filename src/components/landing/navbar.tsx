'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Produit', target: 'features' },
  { label: 'Fonctionnalités', target: 'spotlight' },
  { label: 'Tarifs', target: 'pricing' },
  { label: 'Témoignages', target: 'testimonials' },
  { label: 'Contact', target: 'cta' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (target: string) => {
    setMobileOpen(false);
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md border-b border-slate-800 ${
        scrolled ? 'bg-slate-900/95 shadow-lg shadow-black/20' : 'bg-slate-900/70'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-0.5 cursor-pointer">
            <span className="text-xl font-bold text-emerald-400">Teranga</span>
            <span className="text-xl font-bold text-amber-400">Biz</span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.target}
                onClick={() => handleNavClick(link.target)}
                className="text-sm text-slate-300 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <a href="/login" className="text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg transition-colors duration-200">
              Se connecter
            </a>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden text-slate-300 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden bg-slate-900/98 backdrop-blur-lg border-t border-slate-800 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.target}
                  onClick={() => handleNavClick(link.target)}
                  className="block w-full text-left text-base text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg px-4 py-3 transition-colors duration-200"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-4 border-t border-slate-800 mt-4">
                <a href="/login" className="block w-full text-center text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg transition-colors duration-200">
                  Se connecter
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
