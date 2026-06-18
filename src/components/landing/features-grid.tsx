'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { MapPin, MessageCircle, Users, Check } from 'lucide-react';

interface FeatureCard {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  bullets: string[];
}

const features: FeatureCard[] = [
  {
    icon: <MapPin className="h-6 w-6" />,
    iconBg: 'bg-emerald-500/10',
    title: 'Carte Territoriale Intelligente',
    description:
      "Visualisez vos clients en temps réel. Leads en rouge, négociations en orange, clients actifs en vert. Identifiez vos zones de croissance.",
    bullets: [
      'Géolocalisation automatique',
      'Filtres par région, commercial, statut',
      'Heatmap des ventes',
    ],
  },
  {
    icon: <MessageCircle className="h-6 w-6" />,
    iconBg: 'bg-amber-500/10',
    title: 'Commandes WhatsApp en 1 Clic',
    description:
      'Vos clients commandent directement via WhatsApp. Panier en ligne, envoi automatique, enregistrement dans votre dashboard.',
    bullets: [
      'Boutique publique sans inscription',
      'Message pré-rempli avec détails',
      'Suivi des commandes en temps réel',
    ],
  },
  {
    icon: <Users className="h-6 w-6" />,
    iconBg: 'bg-blue-500/10',
    title: 'CRM & Suivi Commercial',
    description:
      'Gérez vos commerciaux, suivez leurs performances, pilotez vos objectifs. Historique complet de chaque client.',
    bullets: [
      'Fiches clients 360°',
      'Classement automatique des commerciaux',
      'Rapports de performance',
    ],
  },
];

const iconColorMap: Record<number, string> = {
  0: 'text-emerald-500',
  1: 'text-amber-500',
  2: 'text-blue-500',
};

export default function FeaturesGrid() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="features" ref={ref} className="py-20 md:py-32 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Tout ce dont vous avez besoin
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Une plateforme complète, pensée pour le terrain
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto mt-16">
          {features.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: index * 0.15,
                ease: 'easeOut',
              }}
              className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
            >
              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center ${iconColorMap[index]}`}
              >
                {card.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-white mt-4">{card.title}</h3>

              {/* Description */}
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">{card.description}</p>

              {/* Bullet Points */}
              <ul className="mt-5 space-y-2.5">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-300">{bullet}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
