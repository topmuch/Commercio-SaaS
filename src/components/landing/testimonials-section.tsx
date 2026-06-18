'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Testimonial data                                                   */
/* ------------------------------------------------------------------ */
interface Testimonial {
  initials: string;
  name: string;
  role: string;
  quote: string;
}

const testimonials: Testimonial[] = [
  {
    initials: 'MD',
    name: 'Mamadou Diallo',
    role: 'Directeur Commercial, SARL Sandaga',
    quote:
      'Avant Teranga Biz, on perdait 30% des commandes WhatsApp. Maintenant, tout est tracé, facturé, suivi. Un game-changer.',
  },
  {
    initials: 'AB',
    name: 'Aissatou Ba',
    role: 'Gérante, Distribution Dakar',
    quote:
      "La carte territoriale m'a permis d'identifier 3 zones où on était absents. En 2 mois, on a ouvert 15 nouveaux comptes.",
  },
  {
    initials: 'IN',
    name: 'Ibrahima Ndoye',
    role: 'CEO, Groupe Teranga',
    quote:
      "L'interface est simple, mes commerciaux l'ont adoptée en une semaine. Le support WhatsApp est un plus énorme.",
  },
];

/* ------------------------------------------------------------------ */
/*  Stars component                                                    */
/* ------------------------------------------------------------------ */
function StarRating() {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={
            i < 4
              ? 'w-4 h-4 text-amber-400 fill-current'
              : 'w-4 h-4 text-slate-600 fill-current'
          }
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single card                                                        */
/* ------------------------------------------------------------------ */
function TestimonialCard({
  testimonial,
  index,
  inView,
}: {
  testimonial: Testimonial;
  index: number;
  inView: boolean;
}) {
  return (
    <motion.div
      className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: 'easeOut' }}
    >
      {/* Stars */}
      <StarRating />

      {/* Quote */}
      <blockquote className="relative mt-4">
        <span className="absolute -top-1 left-0 text-3xl text-emerald-500/20 font-serif leading-none select-none">
          ❝
        </span>
        <p className="text-slate-300 italic leading-relaxed pl-6 pr-2">
          {testimonial.quote}
        </p>
        <span className="absolute bottom-0 right-2 text-3xl text-emerald-500/20 font-serif leading-none select-none">
          ❞
        </span>
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-4 mt-6 pt-6 border-t border-slate-700/50">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <span className="text-emerald-400 font-semibold text-sm">
            {testimonial.initials}
          </span>
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-white truncate">{testimonial.name}</p>
          <p className="text-sm text-slate-500 truncate">{testimonial.role}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                            */
/* ------------------------------------------------------------------ */
export default function TestimonialsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-60px' });

  return (
    <section id="testimonials" ref={sectionRef} className="py-20 md:py-32 bg-slate-900">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ce que nos{' '}
            <span className="text-emerald-400">clients</span> disent
          </h2>
          <p className="text-lg text-slate-400 mt-4">
            Des distributeurs qui ont transformé leur business
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-16">
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} testimonial={t} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
