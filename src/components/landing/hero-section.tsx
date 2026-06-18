'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Rocket, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      id="hero"
      ref={ref}
      className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/20"
    >
      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left Content */}
          <div className="lg:w-1/2 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-sm text-emerald-400 mb-8">
                <span>🚀</span>
                <span>Nouveau : Intégration WhatsApp Business</span>
              </div>

              {/* Heading */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-white">Gérez votre distribution</span>
                <br />
                <span className="text-emerald-400">comme jamais auparavant</span>
              </h1>

              {/* Subtitle */}
              <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto lg:mx-0">
                Le premier ERP conçu pour les distributeurs africains. CRM intelligent, carte
                territoriale, commandes WhatsApp. Tout en un.
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-8 py-3.5 rounded-xl transition-colors duration-200 text-base">
                  <Rocket className="h-5 w-5" />
                  Démarrer gratuitement
                </Link>
                <Link href="/demo" className="inline-flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-medium px-8 py-3.5 rounded-xl transition-colors duration-200 text-base">
                  Voir la démo
                  <span className="ml-1">▶</span>
                </Link>
              </div>

              {/* Social Proof Stats */}
              <div className="mt-8 text-sm text-slate-500 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2">
                <span>✅ 150+ entreprises</span>
                <span className="hidden sm:inline">•</span>
                <span>📦 10M+ FCFA gérés</span>
                <span className="hidden sm:inline">•</span>
                <span>🌍 58 villes couvertes</span>
              </div>
            </motion.div>
          </div>

          {/* Right - Dashboard Mockup */}
          <div className="lg:w-1/2 flex justify-center">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-full max-w-lg rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 shadow-2xl shadow-black/40"
              >
                {/* Window top bar */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <div className="ml-4 flex-1 h-5 rounded bg-slate-700/50" />
                </div>

                {/* Mini Stat Cards Row */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Commandes', color: 'emerald', value: '248' },
                    { label: 'CA', color: 'amber', value: '12.5M' },
                    { label: 'Clients', color: 'blue', value: '1,240' },
                    { label: 'Produits', color: 'purple', value: '356' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg bg-slate-700/40 p-2.5 border border-slate-700/30"
                    >
                      <p className="text-[10px] text-slate-500 truncate">{stat.label}</p>
                      <p
                        className={`text-sm font-semibold mt-1 ${
                          stat.color === 'emerald'
                            ? 'text-emerald-400'
                            : stat.color === 'amber'
                              ? 'text-amber-400'
                              : stat.color === 'blue'
                                ? 'text-blue-400'
                                : 'text-purple-400'
                        }`}
                      >
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Fake Chart Area */}
                <div className="h-32 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-emerald-500/5 rounded-lg flex items-end p-3 gap-1.5 mb-4">
                  {[40, 65, 45, 80, 55, 70, 90, 60, 85, 50, 75, 95].map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-emerald-500/40 rounded-t-sm min-w-0"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>

                {/* Fake Table */}
                <div className="space-y-2">
                  {[
                    { width: '60%' },
                    { width: '45%' },
                    { width: '70%' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="h-3 rounded bg-slate-700/60"
                        style={{ width: row.width }}
                      />
                      <div className="flex-1 h-3 rounded bg-slate-700/30" />
                      <div className="h-3 w-12 rounded bg-slate-700/40" />
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
