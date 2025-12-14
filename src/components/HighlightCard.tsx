import React, { useState } from 'react';
import { Service } from '../types';
import { Clock, Info, X, Plus, Check } from 'lucide-react';

interface HighlightCardProps {
  service: Service;
  isSelected: boolean;
  onToggle: (service: Service) => void;
}

export const HighlightCard: React.FC<HighlightCardProps> = ({ service, isSelected, onToggle }) => {
  const [showInfo, setShowInfo] = useState(false);

  const bgStyle = service.imageUrl 
    ? { backgroundImage: `url(${service.imageUrl})` }
    : { background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)' };

  return (
    <div 
      className={`relative flex-none w-[280px] h-[160px] rounded-2xl overflow-hidden snap-center cursor-pointer group shadow-lg hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 ease-out border ${isSelected ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}
      onClick={() => {
        if (!isSelected) {
          onToggle(service);
          setShowInfo(true);
        } else {
          if (!showInfo) onToggle(service);
        }
      }}
    >
      {/* Background Image with Zoom Effect */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110 will-change-transform"
        style={bgStyle}
      />
      
      {/* Dark Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent transition-opacity duration-500 ${isSelected ? 'opacity-90' : 'opacity-70 group-hover:opacity-60'}`} />

      {/* Selected Border/Overlay */}
      <div className={`absolute inset-0 border-[3px] border-primary rounded-2xl z-20 pointer-events-none transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />

      {/* Info Button (Top Right) */}
      <button 
        className={`absolute top-3 right-3 z-30 w-8 h-8 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 border ${showInfo ? 'bg-white text-black border-white' : 'bg-black/30 text-zinc-300 border-white/10 hover:bg-black/50 hover:text-white'}`}
        onClick={(e) => {
          e.stopPropagation();
          setShowInfo(!showInfo);
        }}
      >
        {showInfo ? <X className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Info className="w-3.5 h-3.5" strokeWidth={2.5} />}
      </button>

      {/* Info Overlay (Details) - Sliding Up */}
      <div 
        className={`absolute inset-0 bg-zinc-950/95 backdrop-blur-xl z-20 p-5 flex flex-col transition-all duration-500 ${
            showInfo ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto pr-1">
            <h3 className="text-white font-bold text-lg leading-tight mb-2">{service.name}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
                {service.description}
            </p>
        </div>
        
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
             <div className="text-xs text-zinc-400 font-medium">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <Clock className="w-3 h-3" /> 
                    {service.duration} min
                </div>
                <div className="text-zinc-500">Valor Total</div>
             </div>
             
             <div className="flex items-center gap-3">
                 <span className="font-bold text-white text-lg">R$ {service.price}</span>
                 <button 
                    onClick={() => onToggle(service)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                        isSelected 
                        ? 'bg-primary/10 text-primary border border-primary/50 hover:bg-primary/20' 
                        : 'bg-white text-black hover:bg-zinc-200'
                    }`}
                 >
                    {isSelected ? 'Remover' : 'Adicionar'}
                 </button>
             </div>
        </div>
      </div>

      {/* Main Content (Bottom) */}
      <div className={`absolute inset-0 p-4 flex flex-col justify-end z-10 transition-all duration-500 delay-75 ${showInfo ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
        <div className="flex justify-between items-end gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/90 text-white px-1.5 py-0.5 rounded shadow-sm backdrop-blur-md">
                Destaque
              </span>
              {isSelected && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/90 text-primary px-1.5 py-0.5 rounded shadow-sm backdrop-blur-md">
                  Selecionado
                </span>
              )}
            </div>
            <h3 className="text-white font-bold text-lg leading-tight drop-shadow-lg line-clamp-2 pr-6 group-hover:text-red-100 transition-colors">
              {service.name}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 text-zinc-300 text-xs font-medium drop-shadow-md">
               <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {service.duration}m</span>
               <span className="w-0.5 h-0.5 bg-zinc-400 rounded-full"></span>
               <span>{service.description.split('.')[0]}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
             <div className="text-white font-bold text-lg drop-shadow-lg">
               R$ {service.price}
             </div>
             <div 
               className={`w-8 h-8 rounded-full flex items-center justify-center mt-1.5 transition-all duration-300 ${
                 isSelected ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/40' : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30 group-hover:bg-primary group-hover:text-white'
               }`}
             >
                {isSelected ? (
                   <Check className="w-4 h-4" strokeWidth={3} />
                ) : (
                   <Plus className="w-4 h-4" strokeWidth={3} />
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
