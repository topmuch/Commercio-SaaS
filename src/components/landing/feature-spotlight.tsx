'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  MapPin,
  MessageCircle,
  ShoppingCart,
  FileText,
  Save,
  TrendingUp,
  RefreshCw,
  Crosshair,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Reusable animation variants                                         */
/* ------------------------------------------------------------------ */
const slideLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

const slideRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' as const },
  }),
};

/* ------------------------------------------------------------------ */
/*  Benefit item                                                       */
/* ------------------------------------------------------------------ */
function Benefit({ emoji, text, index }: { emoji: string; text: string; index: number }) {
  return (
    <motion.div
      className="flex items-start gap-3 text-slate-300 mt-3"
      variants={fadeUp}
      custom={index}
    >
      <span className="text-xl leading-none shrink-0">{emoji}</span>
      <span className="text-base md:text-lg">{text}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Map dots for the simulated map mockup                               */
/* ------------------------------------------------------------------ */
const mapDots = [
  { color: 'bg-red-500', top: '18%', left: '25%', label: 'Lead' },
  { color: 'bg-red-500', top: '35%', left: '60%', label: 'Lead' },
  { color: 'bg-red-500', top: '65%', left: '45%', label: 'Lead' },
  { color: 'bg-amber-500', top: '25%', left: '50%', label: 'Négociation' },
  { color: 'bg-amber-500', top: '50%', left: '30%', label: 'Négociation' },
  { color: 'bg-amber-500', top: '72%', left: '70%', label: 'Négociation' },
  { color: 'bg-emerald-500', top: '20%', left: '75%', label: 'Client' },
  { color: 'bg-emerald-500', top: '42%', left: '18%', label: 'Client' },
  { color: 'bg-emerald-500', top: '58%', left: '78%', label: 'Client' },
  { color: 'bg-emerald-500', top: '80%', left: '22%', label: 'Client' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function FeatureSpotlight() {
  const block1Ref = useRef<HTMLDivElement>(null);
  const block2Ref = useRef<HTMLDivElement>(null);
  const inView1 = useInView(block1Ref, { once: true, margin: '-80px' });
  const inView2 = useInView(block2Ref, { once: true, margin: '-80px' });

  return (
    <section id="spotlight">
      {/* ──────────────── Block 1: Map Feature ──────────────── */}
      <div className="py-20 md:py-32 bg-slate-900">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 max-w-7xl mx-auto px-4">
          {/* Left — Map Mockup */}
          <motion.div
            ref={block1Ref}
            variants={slideLeft}
            initial="hidden"
            animate={inView1 ? 'visible' : 'hidden'}
          >
            <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/50 shadow-2xl aspect-[4/3] relative">
              {/* Top bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-slate-200">Carte Commerces</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* Map area */}
              <div className="relative w-full flex-1 bg-slate-700/30 min-h-0" style={{ height: 'calc(100% - 3rem)' }}>
                {/* Subtle region boundaries */}
                <svg className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="none">
                  <line x1="20%" y1="30%" x2="80%" y2="30%" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="40%" y1="10%" x2="40%" y2="90%" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="15%" y1="60%" x2="75%" y2="60%" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="65%" y1="15%" x2="65%" y2="85%" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />
                </svg>

                {/* Dots */}
                {mapDots.map((dot, i) => (
                  <div
                    key={i}
                    className={`absolute ${dot.color} rounded-full w-3 h-3 shadow-lg shadow-black/40`}
                    style={{ top: dot.top, left: dot.left }}
                  >
                    {/* Ping ring */}
                    <span
                      className={`absolute inset-0 ${dot.color} rounded-full animate-ping opacity-20`}
                    />
                  </div>
                ))}

                {/* Legend */}
                <div className="absolute bottom-3 left-3 flex items-center gap-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Leads
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Négociations
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Clients
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right — Text */}
          <motion.div
            variants={slideRight}
            initial="hidden"
            animate={inView1 ? 'visible' : 'hidden'}
            className="flex flex-col justify-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Pilotez votre territoire{' '}
              <span className="text-emerald-400">comme un pro</span>
            </h2>
            <p className="text-lg text-slate-400 mt-4 leading-relaxed">
              Notre carte interactive vous donne une vision stratégique de votre réseau
              commercial. En un coup d'œil, identifiez les zones à fort potentiel et les
              clients à relancer.
            </p>

            <div className="mt-6 space-y-1">
              <Benefit emoji="🎯" text="Zones blanches détectables instantanément" index={0} />
              <Benefit emoji="📍" text="Géolocalisation GPS de chaque point de vente" index={1} />
              <Benefit emoji="🔄" text="Filtres dynamiques par région, commercial, statut" index={2} />
              <Benefit emoji="📈" text="CA par zone géographique" index={3} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ──────────────── Block 2: WhatsApp Feature ──────────────── */}
      <div className="py-20 md:py-32 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 max-w-7xl mx-auto px-4">
          {/* Left — Text */}
          <motion.div
            ref={block2Ref}
            variants={slideLeft}
            initial="hidden"
            animate={inView2 ? 'visible' : 'hidden'}
            className="flex flex-col justify-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Vendez via WhatsApp,{' '}
              <span className="text-emerald-400">enregistrez automatiquement</span>
            </h2>
            <p className="text-lg text-slate-400 mt-4 leading-relaxed">
              Fini les commandes perdues dans les conversations. Chaque commande WhatsApp est
              enregistrée dans votre ERP, suivie, facturée.
            </p>

            <div className="mt-6 space-y-1">
              <Benefit emoji="🛒" text="Boutique en ligne accessible sans compte" index={0} />
              <Benefit emoji="💬" text="Message WhatsApp pré-rempli avec le récap" index={1} />
              <Benefit emoji="💾" text="Sauvegarde automatique dans le dashboard" index={2} />
              <Benefit emoji="📄" text="Génération de factures en 1 clic" index={3} />
            </div>
          </motion.div>

          {/* Right — WhatsApp Mockup */}
          <motion.div
            variants={slideRight}
            initial="hidden"
            animate={inView2 ? 'visible' : 'hidden'}
          >
            <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/50 shadow-2xl aspect-[4/3] flex flex-col">
              {/* WhatsApp header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-[#075E54]">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Teranga Boutique</p>
                  <p className="text-xs text-green-200">En ligne</p>
                </div>
              </div>

              {/* Chat area */}
              <div className="flex-1 bg-[#0B141A] p-4 space-y-3">
                {/* Customer message */}
                <div className="flex justify-end">
                  <div className="bg-[#005C4B] rounded-lg rounded-tr-none px-3 py-2 max-w-[80%]">
                    <p className="text-sm text-white leading-relaxed">
                      Bonjour ! Je souhaite commander :
                      <br />
                      <span className="text-emerald-300">• 50x Savon VIP — 2 500 FCFA</span>
                      <br />
                      <span className="text-emerald-300">• 20x Huile Palmier — 3 000 FCFA</span>
                      <br />
                      <span className="text-emerald-300">• 30x Riz 25kg — 8 500 FCFA</span>
                    </p>
                    <p className="text-[10px] text-green-300/60 mt-1 text-right">10:42</p>
                  </div>
                </div>

                {/* System reply */}
                <div className="flex justify-start">
                  <div className="bg-slate-700/60 rounded-lg rounded-tl-none px-3 py-2 max-w-[80%]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-400">
                        Commande #CMD-2847
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      ✅ 3 produits — Total : <strong>465 000 FCFA</strong>
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button className="flex items-center gap-1 bg-emerald-500 text-white text-xs px-3 py-1 rounded-full">
                        <FileText className="w-3 h-3" /> Facture
                      </button>
                      <button className="flex items-center gap-1 bg-slate-600 text-white text-xs px-3 py-1 rounded-full">
                        <Save className="w-3 h-3" /> Enregistrer
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 text-right">10:42</p>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#1B2832] border-t border-slate-700/50">
                <div className="flex-1 bg-slate-700/50 rounded-full px-4 py-2 text-xs text-slate-500">
                  Tapez un message...
                </div>
                <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
