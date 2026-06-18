'use client';

import { Facebook, Linkedin, Twitter } from 'lucide-react';

const productLinks = [
  { label: 'Fonctionnalités', href: '#features' },
  { label: 'Tarifs', href: '#pricing' },
  { label: 'Accéder à l\'application', href: '/dashboard' },
  { label: 'Installer l\'App Mobile', href: '/install-app' },
];
// TODO: Create dedicated pages for À propos, Blog, Carrières
const companyLinks = [
  { label: 'À propos', href: '#' },
  { label: 'Blog', href: '#' },
  { label: 'Carrières', href: '#' },
  { label: 'Contact', href: '/contact' },
];
// TODO: Create dedicated pages for Centre d'aide, Documentation, Statut
const supportLinks = [
  { label: "Centre d'aide", href: '#' },
  { label: 'Documentation', href: '#' },
  { label: 'Statut', href: '#' },
  { label: 'WhatsApp Support', href: 'https://wa.me/221781234567', external: true },
];
// TODO: Create dedicated legal pages
const legalLinks = [
  { label: 'CGU', href: '#' },
  { label: 'Confidentialité', href: '#' },
  { label: 'Cookies', href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 4-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand column */}
          <div>
            <div className="text-lg font-bold">
              <span className="text-emerald-400">Teranga</span>
              <span className="text-amber-400">Biz</span>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              L'ERP qui comprend votre commerce. Conçu en Afrique, pour l'Afrique.
            </p>
            <div className="flex gap-4 mt-4">
              <a
                href="#"
                className="text-slate-500 hover:text-emerald-400 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-slate-500 hover:text-emerald-400 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-slate-500 hover:text-emerald-400 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Produit column */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Produit
            </h3>
            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Entreprise column */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Entreprise
            </h3>
            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support column */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Support
            </h3>
            <ul className="mt-4 space-y-3">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="text-sm text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <span className="text-sm text-slate-500">
                © {new Date().getFullYear()} Teranga Biz. Tous droits réservés.
              </span>
              <span className="text-sm text-slate-500 hidden sm:inline">
                Fait avec ❤️ à Dakar
              </span>
            </div>

            <div className="flex items-center gap-2">
              {legalLinks.map((link, index) => (
                <span key={link.label} className="flex items-center">
                  {index > 0 && <span className="mx-2 text-slate-700">|</span>}
                  <a href={link.href} className="text-sm text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">
                    {link.label}
                  </a>
                </span>
              ))}
            </div>
          </div>

          {/* Mobile-only "Fait avec" */}
          <p className="text-sm text-slate-500 text-center mt-3 sm:hidden">
            Fait avec ❤️ à Dakar
          </p>
        </div>
      </div>
    </footer>
  );
}
