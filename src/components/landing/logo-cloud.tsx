'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const companies = [
  'SARL Sandaga',
  'Groupe Teranga',
  'Distribution Dakar',
  'Société Thiès',
  'Commerce Kaolack',
  'Afrique Distribution',
  'Pro Service SA',
  'Mega Discount',
];

export default function LogoCloud() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <section id="logos" ref={ref} className="py-16 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="text-sm text-slate-500 uppercase tracking-wider text-center mb-10"
        >
          Ils nous font confiance
        </motion.p>

        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          {companies.map((name, index) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: 'easeOut',
              }}
              className="flex items-center justify-center"
            >
              <span className="text-lg md:text-xl font-semibold text-slate-600 hover:text-slate-400 transition-colors duration-300 select-none whitespace-nowrap">
                {name}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="text-xs text-slate-600 text-center mt-12"
        >
          Fait avec ❤️ à Dakar
        </motion.p>
      </div>
    </section>
  );
}
