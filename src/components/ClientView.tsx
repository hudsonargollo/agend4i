import React, { useState, useEffect, useRef } from 'react';
import { MOCK_PROVIDER, TIME_SLOTS } from '../constants';
import { Service, TimeSlot, Professional } from '../types';
import { ServiceCard } from './ServiceCard';
import { HighlightCard } from './HighlightCard';
import { SmartCart } from './SmartCart';
import { AIChat } from './AIChat';
import { LoyaltyCard } from './LoyaltyCard';
import { ProfessionalCard } from './ProfessionalCard';
import { Sun, Moon, ArrowLeft, MapPin, Phone, Star, User, Check, X, Trophy } from 'lucide-react';

interface ClientViewProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const ClientView: React.FC<ClientViewProps> = ({ isDarkMode, toggleTheme }) => {
  const [cart, setCart] = useState<Service[]>([]);
  const [step, setStep] = useState<'services' | 'professional' | 'calendar' | 'identify' | 'success'>('services');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [visits, setVisits] = useState(9);
  const [rewardUnlocked, setRewardUnlocked] = useState(false);

  useEffect(() => {
    const entranceTimer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: 0 });
      }
    }, 100);

    const slideTimer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
      }
    }, 1500);

    return () => {
      clearTimeout(entranceTimer);
      clearTimeout(slideTimer);
    };
  }, []);

  useEffect(() => {
    if (cart.length === 0 && step !== 'services' && step !== 'success') {
      setStep('services');
    }
  }, [cart, step]);

  const toggleService = (service: Service) => {
    setCart(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  const totalDuration = cart.reduce((acc, curr) => acc + curr.duration, 0);

  const initiateBooking = () => {
    setStep('identify');
  };

  const completeBooking = () => {
    if (!customerName || !customerPhone) return;

    setTimeout(() => {
      const newVisitCount = visits + 1;
      setVisits(newVisitCount);
      
      if (MOCK_PROVIDER.loyaltyProgram?.enabled && newVisitCount % MOCK_PROVIDER.loyaltyProgram.threshold === 0) {
        setRewardUnlocked(true);
      } else {
        setRewardUnlocked(false);
      }

      setStep('success');
    }, 800);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 9) {
      value = `${value.slice(0, 10)}-${value.slice(10)}`;
    }
    setCustomerPhone(value);
  };

  const highlights = MOCK_PROVIDER.services
    .filter(s => s.category === 'Combos')
    .sort((a, b) => (b.imageUrl ? 1 : 0) - (a.imageUrl ? 1 : 0));

  const categories = Array.from(new Set(MOCK_PROVIDER.services.map(s => s.category))).filter(c => c !== 'Combos');

  if (step === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-background">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Check className="w-12 h-12 text-primary" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-foreground">Agendado!</h1>
        <p className="text-muted-foreground mb-2 max-w-xs">
          Olá <strong>{customerName.split(' ')[0]}</strong>! Seu agendamento foi confirmado para Hoje às {selectedSlot?.time}.
        </p>
        <p className="text-muted-foreground text-sm mb-6">
           Com: <span className="text-foreground font-medium">{selectedProfessional?.name}</span>
        </p>

        {rewardUnlocked && MOCK_PROVIDER.loyaltyProgram && (
          <div className="w-full max-w-xs bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-xl p-4 mb-8 animate-pulse">
            <h3 className="text-orange-600 dark:text-orange-500 font-bold text-lg mb-1 flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" />
              Recompensa Desbloqueada!
            </h3>
            <p className="text-orange-700 dark:text-orange-200/80 text-sm">
              Você completou {visits} visitas! Um voucher de <strong>{MOCK_PROVIDER.loyaltyProgram.rewardDescription}</strong> foi enviado para seu WhatsApp ({customerPhone}).
            </p>
          </div>
        )}

        <button 
          onClick={() => {
            setCart([]);
            setSelectedSlot(null);
            setSelectedProfessional(null);
            setStep('services');
          }}
          className="bg-foreground text-background px-8 py-3 rounded-full font-semibold hover:opacity-90 transition"
        >
          Novo Agendamento
        </button>
      </div>
    );
  }

  if (step === 'identify') {
    return (
      <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 p-4 border-b border-border flex items-center gap-4">
          <button 
            onClick={() => setStep('calendar')}
            className="w-10 h-10 rounded-full bg-card flex items-center justify-center hover:bg-secondary shadow-sm border border-border"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">Identificação</h2>
        </div>

        <div className="p-6 flex-1 flex flex-col max-w-sm mx-auto w-full">
           <div className="mb-8 mt-4 text-center">
             <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
               <User className="w-8 h-8 text-primary" />
             </div>
             <h2 className="text-2xl font-bold text-foreground mb-2">Quem é você?</h2>
             <p className="text-muted-foreground text-sm">
               Precisamos do seu WhatsApp para pontuar no programa de fidelidade e enviar a confirmação.
             </p>
           </div>

           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Seu Nome</label>
               <input 
                 type="text" 
                 value={customerName}
                 onChange={(e) => setCustomerName(e.target.value)}
                 placeholder="Ex: João Silva"
                 className="w-full px-4 py-3.5 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">WhatsApp</label>
               <div className="relative">
                 <input 
                   type="tel" 
                   value={customerPhone}
                   onChange={handlePhoneChange}
                   placeholder="(00) 00000-0000"
                   className="w-full px-4 py-3.5 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
                 />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                   <Phone className="w-5 h-5" />
                 </div>
               </div>
             </div>
           </div>

           <div className="mt-8">
             <button 
               onClick={completeBooking}
               disabled={!customerName || customerPhone.length < 14}
               className="w-full bg-foreground text-background font-bold text-lg py-4 rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
               Confirmar Agendamento
             </button>
             <p className="text-center text-xs text-muted-foreground mt-4">
               Ao continuar, você concorda em receber mensagens sobre seu agendamento.
             </p>
           </div>
        </div>
      </div>
    );
  }

  if (step === 'professional') {
    return (
      <div className="min-h-screen pb-32 bg-background transition-colors duration-300">
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 p-4 border-b border-border flex items-center gap-4">
          <button 
            onClick={() => setStep('services')}
            className="w-10 h-10 rounded-full bg-card flex items-center justify-center hover:bg-secondary shadow-sm border border-border"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">Escolha o Profissional</h2>
        </div>

        <div className="p-4 pt-6">
          <p className="text-muted-foreground mb-6">Com quem você gostaria de realizar o serviço?</p>
          
          {MOCK_PROVIDER.professionals.map(pro => (
             <ProfessionalCard 
               key={pro.id}
               professional={pro}
               isSelected={selectedProfessional?.id === pro.id}
               onSelect={(professionalId) => {
                 const professional = MOCK_PROVIDER.professionals.find(p => p.id === professionalId);
                 if (professional) {
                   setSelectedProfessional(professional);
                 }
               }}
             />
          ))}
        </div>

        {selectedProfessional && (
           <SmartCart 
             cart={cart} 
             onContinue={() => setStep('calendar')} 
             onRemoveItem={toggleService}
             label="Ver Horários"
           />
        )}
      </div>
    );
  }

  if (step === 'calendar') {
    return (
      <div className="min-h-screen pb-32 bg-background transition-colors duration-300">
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 p-4 border-b border-border flex items-center gap-4">
          <button 
            onClick={() => setStep('professional')}
            className="w-10 h-10 rounded-full bg-card flex items-center justify-center hover:bg-secondary shadow-sm border border-border"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">Escolha o Horário</h2>
        </div>

        <div className="p-4">
          <div className="mb-6">
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {['Hoje', 'Amanhã', 'Qua 29', 'Qui 30'].map((day, i) => (
                <button 
                  key={day}
                  className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                    i === 0 
                      ? 'bg-foreground text-background' 
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {TIME_SLOTS.map(slot => (
              <button
                key={slot.id}
                disabled={!slot.available}
                onClick={() => setSelectedSlot(slot)}
                className={`py-4 rounded-xl text-center font-medium transition-all ${
                  !slot.available 
                    ? 'bg-secondary text-muted-foreground cursor-not-allowed line-through'
                    : selectedSlot?.id === slot.id
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                      : 'bg-card text-foreground hover:bg-secondary border border-border'
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
          
          {/* Summary Card */}
          <div className="mt-8 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
             <div className="px-4 py-3 border-b border-border bg-secondary/50 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumo do Pedido</span>
                <span className="text-xs font-medium text-muted-foreground">{cart.length} itens</span>
             </div>

             <div className="p-4 space-y-4">
               {cart.map(item => (
                 <div key={item.id} className="flex justify-between items-start group">
                    <div className="flex-1 pr-4">
                       <div className="text-sm font-medium text-foreground leading-tight mb-0.5">{item.name}</div>
                       <div className="text-xs text-muted-foreground">{item.duration} min</div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="text-sm font-medium text-foreground">R$ {item.price}</span>
                       <button 
                         onClick={() => toggleService(item)}
                         className="text-muted-foreground hover:text-primary p-1 rounded-full hover:bg-secondary transition-colors"
                       >
                         <X className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
               ))}
             </div>
             
             <div className="h-px bg-border mx-4"></div>

             <div className="p-4 bg-secondary/30">
                <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-muted-foreground">Profissional</span>
                    <span className="text-foreground font-medium">{selectedProfessional?.name}</span>
                </div>
                <div className="flex justify-between items-center mb-3 text-sm">
                  <span className="text-muted-foreground">Duração Total</span>
                  <span className="font-medium text-foreground">{Math.floor(totalDuration/60)}h {totalDuration%60 > 0 ? `${totalDuration%60}m` : ''}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-foreground pt-2 border-t border-border/50">
                  <span>Total</span>
                  <span>R$ {cart.reduce((a,c) => a + c.price, 0)}</span>
                </div>
             </div>
          </div>
        </div>

        {selectedSlot && (
          <SmartCart 
            cart={cart} 
            onContinue={initiateBooking} 
            onRemoveItem={toggleService}
            label={`Agendar às ${selectedSlot.time}`}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-background transition-colors duration-300">
      
      {/* Theme Toggle */}
      <div className="absolute top-2 right-2 z-50">
        <button 
          onClick={toggleTheme}
          className="bg-foreground/10 backdrop-blur text-foreground/60 p-2 rounded-full transition-all border border-foreground/5 hover:bg-foreground/20"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Profile Header */}
      <div className="p-6 pb-2 flex flex-col items-center text-center relative z-10">
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-card mb-4 shadow-2xl bg-card">
          <img src={MOCK_PROVIDER.avatarUrl} alt={MOCK_PROVIDER.name} className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center gap-2 text-foreground">
          {MOCK_PROVIDER.name}
          <Check className="w-5 h-5 text-primary fill-current" />
        </h1>
        <p className="text-muted-foreground text-sm mb-4">@{MOCK_PROVIDER.handle} • {MOCK_PROVIDER.location}</p>
        
        <div className="flex gap-4 mb-6 w-full justify-center">
          <a 
            href="https://www.google.com/maps" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-medium border border-border hover:border-muted-foreground/30 transition text-foreground shadow-sm"
          >
             <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            Como chegar
          </a>
          <a 
            href="https://api.whatsapp.com/send" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-medium border border-border hover:border-muted-foreground/30 transition text-foreground shadow-sm"
          >
             <Phone className="w-3.5 h-3.5 text-green-500" />
            WhatsApp
          </a>
        </div>
      </div>

      {/* Loyalty Card Section */}
      {MOCK_PROVIDER.loyaltyProgram && (
        <LoyaltyCard visits={visits} config={MOCK_PROVIDER.loyaltyProgram} />
      )}

      {/* Highlights Section (Combos Slideshow) */}
      {highlights.length > 0 && (
        <div className="mb-8 overflow-hidden">
           <div className="flex items-center gap-2 mb-3 px-6 animate-fade-in-up">
             <Star className="w-4 h-4 text-primary fill-current" />
             <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Destaques</h2>
           </div>
           
           <div 
             ref={scrollContainerRef}
             className="flex overflow-x-auto gap-4 px-6 pb-8 pt-2 no-scrollbar snap-x scroll-smooth transition-transform duration-700"
           >
             {highlights.map(service => (
               <HighlightCard 
                 key={service.id} 
                 service={service} 
                 isSelected={cart.some(s => s.id === service.id)}
                 onToggle={toggleService}
               />
             ))}
           </div>
        </div>
      )}

      {/* Services List categorized */}
      {categories.map(category => {
        const categoryServices = MOCK_PROVIDER.services.filter(s => s.category === category);
        if (categoryServices.length === 0) return null;
        
        return (
          <div key={category} className="px-4 mb-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 pl-1">{category}</h2>
            {categoryServices.map(service => (
              <ServiceCard 
                key={service.id} 
                service={service} 
                isSelected={cart.some(s => s.id === service.id)}
                onToggle={toggleService}
              />
            ))}
          </div>
        );
      })}

      <SmartCart 
        cart={cart} 
        onContinue={() => setStep('professional')} 
        onRemoveItem={toggleService}
      />
      <AIChat />
    </div>
  );
};
