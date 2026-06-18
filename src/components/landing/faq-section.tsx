'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: "Qu'est-ce que Teranga Biz ?",
    answer:
      "Teranga Biz est un ERP SaaS conçu pour les entreprises de distribution en Afrique de l'Ouest. Il combine CRM, gestion des ventes, carte territoriale et intégration WhatsApp pour vous aider à vendre plus efficacement.",
  },
  {
    question: 'Dois-je avoir des compétences techniques ?',
    answer:
      "Non, Teranga Biz est conçu pour être utilisé sans connaissances techniques. L'interface est intuitive, et nous proposons des formations gratuites à l'onboarding.",
  },
  {
    question: "Comment fonctionne l'intégration WhatsApp ?",
    answer:
      "Vos clients accèdent à votre boutique en ligne, ajoutent des produits au panier, et cliquent sur 'Commander sur WhatsApp'. Un message pré-rempli s'ouvre avec le récap de la commande, et celle-ci est automatiquement enregistrée dans votre dashboard.",
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer:
      "Oui, toutes les données sont hébergées sur des serveurs sécurisés avec chiffrement SSL. Chaque entreprise a son espace isolé (multi-tenant), et nous effectuons des backups quotidiens.",
  },
  {
    question: 'Puis-je essayer gratuitement ?',
    answer:
      "Oui, le plan Starter est gratuit et illimité dans le temps. Vous pouvez aussi tester le plan Pro pendant 14 jours sans engagement.",
  },
];

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 rounded-xl hover:bg-slate-800/50 transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="font-medium text-white">{question}</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ml-4 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="text-slate-400 leading-relaxed pl-11 pb-5 pr-4">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="faq" className="py-20 md:py-32 bg-slate-900">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Questions fréquentes
          </h2>
        </motion.div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12"
        >
          {faqs.map((faq, index) => (
            <FaqItem
              key={index}
              question={faq.question}
              answer={faq.answer}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
