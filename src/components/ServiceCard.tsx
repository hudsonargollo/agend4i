import React, { useState } from 'react';
import { Service } from '../types';
import { Clock, Plus, Check, ChevronDown } from 'lucide-react';

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  onToggle: (service: Service) => void;
  isHighlight?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, isSelected, onToggle, isHighlight }) => {
  const [expanded, setExpanded] = useState(false);
  const isPackage = service.category === 'Packages' || service.category === 'Combos';

  return (
    <div 
      className={`relative p-4 mb-3 rounded-2xl transition-all duration-300 border group cursor-pointer ${
        isSelected 
          ? 'bg-secondary border-primary shadow-[0_0_20px_rgba(239,68,68,0.15)]' 
          : 'bg-card border-border hover:bg-secondary hover:border-muted-foreground/30 shadow-sm'
      }`}
      onClick={() => onToggle(service)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className={`font-semibold text-lg leading-tight ${isSelected ? 'text-primary' : 'text-foreground'}`}>
              {service.name}
            </h3>
            {isPackage && !isHighlight && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                Combo
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium mb-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {service.duration} min
            </div>
            <span className="w-1 h-1 rounded-full bg-border"></span>
            <div className="text-foreground">R$ {service.price}</div>
          </div>
          
          <div 
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
               <div className="text-sm text-muted-foreground pb-3 leading-relaxed">
                 {service.description}
               </div>
            </div>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-xs text-muted-foreground font-medium hover:text-primary transition-colors flex items-center gap-1"
          >
            {expanded ? 'Menos info' : 'Mais info'}
            <ChevronDown 
              className={`w-3 h-3 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        <div className="flex items-center justify-center pt-1">
          <button
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
              isSelected 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                : 'bg-secondary text-muted-foreground group-hover:bg-muted group-hover:text-foreground'
            }`}
          >
            {isSelected ? (
              <Check className="w-5 h-5" strokeWidth={3} />
            ) : (
              <Plus className="w-5 h-5" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
