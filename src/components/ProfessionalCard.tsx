import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Professional } from '../types';
import { Check } from 'lucide-react';

interface ProfessionalCardProps {
  professional: Professional;
  isSelected: boolean;
  onSelect: (professionalId: string) => void;
  expandedContent?: React.ReactNode;
  isAvailable?: boolean;
}

export const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ 
  professional, 
  isSelected, 
  onSelect, 
  expandedContent,
  isAvailable = true
}) => {
  return (
    <motion.div 
      className={`relative mb-3 rounded-2xl transition-all duration-300 border cursor-pointer overflow-hidden ${
        !isAvailable 
          ? 'bg-card/50 border-border/50 opacity-60 cursor-not-allowed' 
          : isSelected 
            ? 'bg-secondary border-primary ring-2 ring-primary shadow-[0_0_15px_rgba(0,255,0,0.3)]' 
            : 'bg-card border-border hover:border-muted-foreground/30 hover:ring-1 hover:ring-primary/50 shadow-sm'
      }`}
      layout
      initial={false}
      animate={{
        scale: isSelected ? 1.02 : 1,
        opacity: isAvailable ? 1 : 0.6,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
    >
      {/* Card Header */}
      <button 
        className="w-full p-4 flex items-center gap-4 text-left"
        onClick={() => isAvailable && onSelect(professional.id)}
        aria-label={`Select ${professional.name}`}
        disabled={!isAvailable}
      >
        <div className={`w-14 h-14 rounded-full overflow-hidden border-2 shrink-0 ${
          isAvailable ? 'border-border' : 'border-border/50'
        }`}>
          <img 
            src={professional.avatarUrl} 
            alt={professional.name} 
            className={`w-full h-full object-cover ${!isAvailable ? 'grayscale' : ''}`} 
          />
        </div>
        
        <div className="flex-1">
          <h3 className={`font-semibold text-lg ${
            !isAvailable 
              ? 'text-muted-foreground' 
              : isSelected 
                ? 'text-primary' 
                : 'text-foreground'
          }`}>
            {professional.name}
          </h3>
          <p className={`text-sm ${!isAvailable ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
            {professional.role}
            {!isAvailable && ' • Indisponível'}
          </p>
        </div>

        <div className="flex items-center justify-center">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSelected ? 'border-primary bg-primary' : 'border-border'
          }`}>
            {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />}
          </div>
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence initial={false}>
        {isSelected && expandedContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: {
                type: "spring",
                stiffness: 300,
                damping: 30
              },
              opacity: {
                duration: 0.2
              }
            }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border/50">
              {expandedContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
