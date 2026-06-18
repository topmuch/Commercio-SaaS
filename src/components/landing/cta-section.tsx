'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Rocket, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function CtaSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="cta" className="py-20 md:py-32 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-slate-900 to-amber-950/20" />

      {/* Decorative blurred circle */}
      <div className="absolute -top-48 -right-48 w-96 h-96 rounded-full blur-3xl bg-emerald-500/10 pointer-events-none" />

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center">
            Prêt à transformer votre distribution ?
          </h2>
          <p className="text-lg text-slate-300 text-center mt-4">
            Rejoignez 150+ entreprises qui vendent plus avec Teranga Biz
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
            <Link href="/register" className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-xl font-medium transition-all inline-flex items-center justify-center gap-2">
              <Rocket className="w-5 h-5" />
              Démarrer gratuitement
            </Link>
            <Link href="/contact" className="border border-slate-500 hover:border-emerald-500/50 text-white px-8 py-3.5 rounded-xl transition-all inline-flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Parler à un conseiller
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
