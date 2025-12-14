import React from 'react';
import { LoyaltyConfig } from '../types';
import { Star, Trophy } from 'lucide-react';

interface LoyaltyCardProps {
  visits: number;
  config: LoyaltyConfig;
}

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ visits, config }) => {
  if (!config.enabled) return null;

  const currentProgress = visits % config.threshold;
  const remaining = config.threshold - currentProgress;
  const stamps = Array.from({ length: config.threshold }, (_, i) => i + 1);
  const isRewardReady = currentProgress === 0 && visits > 0;

  return (
    <div className="mx-4 mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-orange-50/50 to-orange-100/50 dark:from-secondary dark:via-orange-950/10 dark:to-orange-900/20 border border-orange-200 dark:border-orange-900/30 shadow-lg group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 dark:bg-orange-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-400/5 dark:bg-orange-400/10 rounded-full blur-2xl -ml-6 -mb-6"></div>
      
      <div className="p-4 relative z-10">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-orange-600 dark:text-orange-500 font-bold text-sm tracking-wider uppercase flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5" strokeWidth={2.5} />
              Fidelidade
            </h3>
            <p className="text-muted-foreground text-xs mt-0.5 font-medium">
              {isRewardReady 
                ? "Recompensa Liberada!" 
                : `${remaining} ${remaining === 1 ? 'visita' : 'visitas'} para ganhar`}
            </p>
          </div>
          <div className="bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold border border-orange-200 dark:border-orange-500/20 shadow-sm">
            {visits} Visitas
          </div>
        </div>

        {/* Stamps Grid */}
        <div className="flex justify-between items-center gap-1.5 mt-2">
          {stamps.map((num) => {
            const isFilled = num <= currentProgress || (isRewardReady && currentProgress === 0);
            return (
              <div 
                key={num} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  isFilled ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-muted'
                }`}
              />
            );
          })}
        </div>
        
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
           <Trophy className={`w-3.5 h-3.5 ${isRewardReady ? "text-orange-500" : ""}`} />
           <span>Meta: <span className="text-foreground font-medium">{config.rewardDescription}</span></span>
        </div>
      </div>
    </div>
  );
};
