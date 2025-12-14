import React from 'react';
import { Professional } from '../types';
import { Check } from 'lucide-react';

interface ProfessionalCardProps {
  professional: Professional;
  isSelected: boolean;
  onSelect: (pro: Professional) => void;
}

export const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ professional, isSelected, onSelect }) => {
  return (
    <div 
      className={`relative p-4 mb-3 rounded-2xl transition-all duration-300 border cursor-pointer flex items-center gap-4 ${
        isSelected 
          ? 'bg-secondary border-primary shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
          : 'bg-card border-border hover:border-muted-foreground/30 shadow-sm'
      }`}
      onClick={() => onSelect(professional)}
    >
      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-border shrink-0">
        <img src={professional.avatarUrl} alt={professional.name} className="w-full h-full object-cover" />
      </div>
      
      <div className="flex-1">
        <h3 className={`font-semibold text-lg ${isSelected ? 'text-primary' : 'text-foreground'}`}>
          {professional.name}
        </h3>
        <p className="text-sm text-muted-foreground">{professional.role}</p>
      </div>

      <div className="flex items-center justify-center">
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          isSelected ? 'border-primary bg-primary' : 'border-border'
        }`}>
          {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />}
        </div>
      </div>
    </div>
  );
};
