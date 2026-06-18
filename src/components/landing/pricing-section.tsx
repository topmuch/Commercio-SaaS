'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, X } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    badge: 'Gratuit',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    price: '0 FCFA',
    priceSuffix: '/mois',
    description: 'Pour démarrer',
    highlighted: false,
    features: [
      { text: '3 utilisateurs', included: true },
      { text: '50 clients', included: true },
      { text: '200 produits', included: true },
      { text: 'Carte territoriale', included: true },
      { text: 'Boutique WhatsApp', included: true },
      { text: 'Rapports avancés', included: false },
      { text: 'IA Assistant', included: false },
    ],
    buttonLabel: 'Commencer gratuitement',
    buttonHref: '/register?plan=starter',
    buttonExternal: false,
    buttonStyle: 'w-full py-2.5 rounded-xl border border-slate-600 text-white hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all',
  },
  {
    name: 'Pro',
    badge: 'Populaire',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    price: '29 000 FCFA',
    priceSuffix: '/mois',
    description: 'Pour les PME en croissance',
    highlighted: true,
    features: [
      { text: '15 utilisateurs', included: true },
      { text: 'Clients illimités', included: true },
      { text: '2000 produits', included: true },
      { text: 'Rapports avancés', included: true },
      { text: 'IA Assistant', included: true },
      { text: 'Support prioritaire', included: true },
    ],
    buttonLabel: 'Essayer 14 jours',
    buttonHref: '/register?plan=pro',
    buttonExternal: false,
    buttonStyle: 'w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all',
  },
  {
    name: 'Enterprise',
    badge: 'Sur mesure',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    price: 'Sur mesure',
    priceSuffix: '',
    description: 'Pour les grands distributeurs',
    highlighted: false,
    features: [
      { text: 'Utilisateurs illimités', included: true },
      { text: 'Tout du Pro +', included: true },
      { text: 'API access', included: true },
      { text: 'Intégrations personnalisées', included: true },
      { text: 'Account manager dédié', included: true },
      { text: 'SLA garanti', included: true },
    ],
    buttonLabel: 'Nous contacter',
    buttonHref: '/contact?plan=enterprise',
    buttonExternal: false,
    buttonStyle: 'w-full py-2.5 rounded-xl border border-slate-600 text-white hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

export default function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="pricing" className="py-20 md:py-32 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Un tarif adapté à votre taille
          </h2>
          <p className="text-lg text-slate-400 text-center mt-4">
            Commencez gratuitement, évoluez selon vos besoins
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-16 items-start"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={cardVariants}
              className={`${plan.highlighted ? 'transform scale-105 relative z-10' : ''}`}
            >
              <div
                className={`${
                  plan.highlighted
                    ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : 'border-slate-700/50'
                } bg-slate-800/50 border rounded-2xl p-6 md:p-8`}
              >
                <span
                  className={`text-xs font-medium ${plan.badgeColor} border rounded-full px-3 py-1 inline-block`}
                >
                  {plan.badge}
                </span>

                <div className="mt-6">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  {plan.priceSuffix && (
                    <span className="text-slate-500">{plan.priceSuffix}</span>
                  )}
                </div>

                <p className="text-sm text-slate-400 mt-1">{plan.description}</p>

                <div className="border-t border-slate-700/50 my-6" />

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.buttonExternal ? (
                  <a href={plan.buttonHref} target="_blank" rel="noopener noreferrer" className={plan.buttonStyle + ' mt-8'}>
                    {plan.buttonLabel}
                  </a>
                ) : (
                  <Link href={plan.buttonHref} className={plan.buttonStyle + ' mt-8'}>
                    {plan.buttonLabel}
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
