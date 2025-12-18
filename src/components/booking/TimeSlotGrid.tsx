import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export interface BookingSlot {
  id: string;
  professionalId: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  time: string; // Formatted time string for compatibility with existing booking logic
}

interface TimeSlotGridProps {
  slots: BookingSlot[];
  selectedSlot?: BookingSlot;
  onSlotSelect: (slot: BookingSlot) => void;
}

export function TimeSlotGrid({ slots, selectedSlot, onSlotSelect }: TimeSlotGridProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {slots.map((slot, index) => (
        <motion.div
          key={slot.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.2, 
            delay: index * 0.05,
            ease: "easeOut"
          }}
        >
          <Button
            variant={selectedSlot?.id === slot.id ? "default" : "outline"}
            disabled={!slot.isAvailable}
            onClick={() => onSlotSelect(slot)}
            className={`h-10 w-full transition-all duration-200 ${
              !slot.isAvailable 
                ? 'opacity-40 cursor-not-allowed bg-muted/50 text-muted-foreground border-muted' 
                : 'hover:scale-105 active:scale-95'
            }`}
          >
            {formatTime(slot.startTime)}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}
