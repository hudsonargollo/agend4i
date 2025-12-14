import React, { useState } from 'react';
import { Service } from '../types';
import { X, ChevronUp, ArrowRight, Trash2 } from 'lucide-react';

interface SmartCartProps {
  cart: Service[];
  onContinue: () => void;
  onRemoveItem?: (service: Service) => void;
  label?: string;
}

export const SmartCart: React.FC<SmartCartProps> = ({ cart, onContinue, onRemoveItem, label = "Continuar" }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (cart.length === 0) return null;

  const totalDuration = cart.reduce((acc, curr) => acc + curr.duration, 0);
  const totalPrice = cart.reduce((acc, curr) => acc + curr.price, 0);
  const count = cart.length;

  const hours = Math.floor(totalDuration / 60);
  const mins = totalDuration % 60;
  const durationString = hours > 0 
    ? `${hours}h${mins > 0 ? ` ${mins}min` : ''}` 
    : `${mins} min`;

  return (
    <>
      {/* Expanded Cart Details Modal (Bottom Sheet) */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" 
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="absolute bottom-28 left-4 right-4 bg-card border border-border rounded-2xl p-4 shadow-2xl animate-fade-in-up" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wide">Seu Carrinho</h3>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-secondary p-3 rounded-xl border border-border/50">
                  <div className="flex-1 pr-4">
                    <div className="text-foreground font-semibold text-sm">{item.name}</div>
                    <div className="text-muted-foreground text-xs flex items-center gap-2 mt-0.5">
                      <span>R$ {item.price}</span>
                      <span className="w-0.5 h-0.5 bg-muted-foreground/50 rounded-full"></span>
                      <span>{item.duration} min</span>
                    </div>
                  </div>
                  {onRemoveItem && (
                    <button 
                      onClick={() => {
                        onRemoveItem(item);
                        if(cart.length <= 1) setIsOpen(false);
                      }}
                      className="text-primary p-2 hover:bg-primary/10 rounded-full transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Cart Bar */}
      <div className="fixed bottom-6 left-4 right-4 z-50 animate-fade-in-up">
        <div className="w-full bg-foreground dark:bg-card text-background dark:text-foreground font-medium h-[4.5rem] rounded-[2rem] shadow-2xl flex items-stretch overflow-hidden relative border dark:border-border">
          
          {/* Left Side: Toggle Details */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex flex-col items-start justify-center pl-5 pr-2 flex-1 hover:bg-foreground/90 dark:hover:bg-secondary transition-colors text-left group active:opacity-80"
          >
            <div className="flex items-center gap-2">
              <span className="bg-background dark:bg-foreground text-foreground dark:text-background text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                {count} {count === 1 ? 'Serviço' : 'Serviços'}
              </span>
              <div className={`text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                <ChevronUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm pl-1 mt-0.5">
              <span className="font-semibold">{durationString}</span>
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full"></span>
              <span className="font-semibold text-muted-foreground">R$ {totalPrice}</span>
            </div>
          </button>

          {/* Divider */}
          <div className="my-auto h-8 w-[1px] bg-muted-foreground/30"></div>

          {/* Right Side: Action */}
          <button 
             onClick={onContinue}
             className="px-6 flex items-center gap-2 font-bold text-base hover:bg-foreground/90 dark:hover:bg-secondary transition-colors active:opacity-80"
          >
            {label}
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </>
  );
};
