/**
 * DesktopStage Component - Desktop Scrollytelling Experience
 * Implements pinned container for 200vh scroll distance with 3D dashboard animations
 * Requirements: 3.1, 3.2, 3.3
 */

import React, { useEffect, useRef, useState } from 'react';
import { loadGSAP, createScrollAnimations, setupAccessibleAnimations } from '@/lib/gsap-config';

interface FloatingCard {
  id: string;
  image: string;
  position: { x: number; y: number; z: number };
  className: string;
}

interface DesktopStageProps {
  dashboardImage: string;
  floatingCards: FloatingCard[];
  scrollDistance?: string;
}

export const DesktopStage: React.FC<DesktopStageProps> = ({
  dashboardImage,
  floatingCards,
  scrollDistance = '200vh'
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  useEffect(() => {
    let scrollTriggerInstance: any = null;
    let timeline: any = null;

    const initializeAnimations = async () => {
      try {
        // Dynamically import GSAP only when DesktopStage mounts (Requirements 7.2)
        const { gsap, ScrollTrigger } = await loadGSAP();
        setGsapLoaded(true);

        // Setup accessibility-aware animations
        const animationsAllowed = setupAccessibleAnimations(gsap, ScrollTrigger);
        setAnimationsEnabled(animationsAllowed);

        if (!animationsAllowed || !stageRef.current || !dashboardRef.current) {
          return;
        }

        // Create timeline for scrubbable and reversible animations (Requirements 3.4)
        timeline = gsap.timeline({
          defaults: { ease: 'power2.inOut' }
        });

        // Dashboard 2D to 3D transition sequence
        timeline
          .to(dashboardRef.current, {
            rotateX: 15,
            rotateY: -10,
            scale: 0.9,
            z: -100,
            duration: 1,
            transformStyle: 'preserve-3d',
          }, 0)
          .to('.floating-whatsapp', {
            x: -200,
            y: -150,
            z: 50,
            rotateZ: -15,
            duration: 0.8,
            ease: 'back.out(1.7)',
            transformStyle: 'preserve-3d',
          }, 0.2)
          .to('.floating-pix', {
            x: 200,
            y: -100,
            z: 30,
            rotateZ: 10,
            duration: 0.8,
            ease: 'back.out(1.7)',
            transformStyle: 'preserve-3d',
          }, 0.3)
          .to('.floating-calendar', {
            x: 0,
            y: -200,
            z: 80,
            rotateX: 20,
            duration: 0.8,
            ease: 'back.out(1.7)',
            transformStyle: 'preserve-3d',
          }, 0.4);

        // Create pinned hero section with scrubbable timeline (Requirements 3.1, 3.4)
        scrollTriggerInstance = ScrollTrigger.create({
          trigger: stageRef.current,
          start: 'top top',
          end: `+=${scrollDistance}`,
          pin: true,
          scrub: 1, // Makes animations scrubbable and reversible
          animation: timeline,
          onUpdate: (self: any) => {
            // Additional real-time updates can be added here if needed
            const progress = self.progress;
            
            // Add subtle parallax effect to background
            if (stageRef.current) {
              gsap.set(stageRef.current, {
                '--scroll-progress': progress,
              });
            }
          },
          onRefresh: () => {
            // Ensure animations are properly reset on refresh
            if (timeline) {
              timeline.progress(0);
            }
          }
        });

      } catch (error) {
        console.warn('Failed to load GSAP animations:', error);
        setAnimationsEnabled(false);
      }
    };

    initializeAnimations();

    // Cleanup function
    return () => {
      if (scrollTriggerInstance) {
        scrollTriggerInstance.kill();
      }
      if (timeline) {
        timeline.kill();
      }
    };
  }, [dashboardImage, floatingCards, scrollDistance]);

  return (
    <div 
      ref={stageRef}
      className="desktop-stage relative w-full h-screen overflow-hidden"
      style={{ 
        perspective: '1000px',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Dashboard Base */}
      <div 
        ref={dashboardRef}
        className="dashboard-base absolute inset-0 flex items-center justify-center"
        style={{ 
          transformStyle: 'preserve-3d',
          willChange: 'transform'
        }}
      >
        <img
          src={dashboardImage}
          alt="AgendAi Dashboard"
          className="max-w-4xl w-full h-auto rounded-lg shadow-2xl"
          style={{ 
            filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.3))',
            willChange: 'transform'
          }}
        />
      </div>

      {/* Floating Cards */}
      {floatingCards.map((card) => (
        <div
          key={card.id}
          className={`${card.className} absolute`}
          style={{
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            // Position cards initially at center, they'll animate out
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <img
            src={card.image}
            alt={`Floating ${card.id}`}
            className="w-64 h-auto rounded-lg shadow-xl"
            style={{ 
              filter: 'drop-shadow(0 15px 30px rgba(0, 0, 0, 0.2))',
            }}
          />
        </div>
      ))}

      {/* Accessibility fallback content */}
      {!animationsEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white p-8">
          <div className="text-center max-w-2xl">
            <h2 className="text-3xl font-bold mb-4">AgendAi Dashboard</h2>
            <p className="text-lg mb-6">
              Sua secretária virtual 24h com recursos avançados de agendamento, 
              notificações WhatsApp, pagamentos Pix e gestão de clientes.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">WhatsApp Automático</h3>
                <p>Confirmações e lembretes automáticos</p>
              </div>
              <div className="bg-white/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Pagamentos Pix</h3>
                <p>Receba pagamentos instantâneos</p>
              </div>
              <div className="bg-white/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Agenda Inteligente</h3>
                <p>IA que organiza seus horários</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {!gsapLoaded && animationsEnabled && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse text-white">
            Carregando experiência interativa...
          </div>
        </div>
      )}
    </div>
  );
};