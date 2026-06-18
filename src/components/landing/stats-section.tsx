'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Stat definition                                                    */
/* ------------------------------------------------------------------ */
interface StatItem {
  display: string; // final display text
  target: number;  // numeric target for counting (0 = skip counting)
  label: string;
}

const stats: StatItem[] = [
  { display: '150+', target: 150, label: 'Entreprises clientes' },
  { display: '10M+', target: 10, label: 'FCFA de commandes/mois' },
  { display: '58', target: 58, label: 'Villes couvertes' },
  { display: '95%', target: 95, label: 'Taux de satisfaction' },
];

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */
function useCounter(target: number, inView: boolean, duration = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView || target === 0) return;

    let start: number | null = null;
    let rafId: number;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [inView, target, duration]);

  return count;
}

/* ------------------------------------------------------------------ */
/*  Single stat card                                                   */
/* ------------------------------------------------------------------ */
function StatCard({ stat, index, inView }: { stat: StatItem; index: number; inView: boolean }) {
  const count = useCounter(stat.target, inView);

  // Build the displayed number string
  let numberStr: string;
  if (stat.target === 0) {
    numberStr = stat.display;
  } else if (stat.display.endsWith('M+')) {
    numberStr = `${count}M+`;
  } else if (stat.display.endsWith('%')) {
    numberStr = `${count}%`;
  } else if (stat.display.endsWith('+')) {
    numberStr = `${count}+`;
  } else {
    numberStr = String(count);
  }

  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: 'easeOut' }}
    >
      <span className="text-4xl md:text-5xl lg:text-6xl font-bold text-emerald-400 tabular-nums">
        {numberStr}
      </span>
      <p className="text-sm md:text-base text-slate-400 mt-2">{stat.label}</p>
      <div className="w-8 h-1 rounded-full bg-emerald-500/30 mx-auto mt-4" />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                            */
/* ------------------------------------------------------------------ */
export default function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-60px' });

  return (
    <section
      id="stats"
      ref={sectionRef}
      className="relative py-20 md:py-32 bg-slate-800/50 overflow-hidden"
    >
      {/* Background gradient accents */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 0% 0%, rgba(16,185,129,0.07) 0%, transparent 70%), ' +
            'radial-gradient(ellipse 50% 60% at 100% 100%, rgba(16,185,129,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        {/* Title */}
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-white text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          Des résultats{' '}
          <span className="text-emerald-400">concrets</span>
        </motion.h2>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
          {stats.map((stat, i) => (
            <StatCard key={i} stat={stat} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
