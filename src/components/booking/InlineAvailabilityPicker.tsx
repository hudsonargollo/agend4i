import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TimeSlotGrid, BookingSlot } from './TimeSlotGrid';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface InlineAvailabilityPickerProps {
  professionalId: string;
  tenantId: string;
  serviceDuration: number;
  selectedDate?: Date;
  onDateChange: (date: Date) => void;
  onTimeSlotSelect: (slot: BookingSlot) => void;
}

export function InlineAvailabilityPicker({
  professionalId,
  tenantId,
  serviceDuration,
  selectedDate,
  onDateChange,
  onTimeSlotSelect,
}: InlineAvailabilityPickerProps) {
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | undefined>();

  // Generate time slots for a given date
  const generateTimeSlots = (date: Date): { startTime: Date; endTime: Date }[] => {
    const slots: { startTime: Date; endTime: Date }[] = [];
    const startHour = 8; // 8 AM
    const endHour = 18; // 6 PM
    const intervalMinutes = 30;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const startTime = new Date(date);
        startTime.setHours(hour, minute, 0, 0);
        
        const endTime = new Date(startTime.getTime() + serviceDuration * 60000);
        
        slots.push({ startTime, endTime });
      }
    }
    return slots;
  };

  // Fetch availability from Supabase
  const fetchAvailability = async (date: Date) => {
    if (!professionalId || !tenantId) return;

    setLoading(true);
    setError(null);

    try {
      const timeSlots = generateTimeSlots(date);

      const availabilityPromises = timeSlots.map(async (slot) => {
        const { data, error: rpcError } = await supabase.rpc('check_availability', {
          p_tenant_id: tenantId,
          p_staff_id: professionalId,
          p_start_time: slot.startTime.toISOString(),
          p_end_time: slot.endTime.toISOString(),
        });

        if (rpcError) {
          throw rpcError;
        }

        return {
          id: `${professionalId}-${slot.startTime.toISOString()}`,
          professionalId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: data === true,
          time: slot.startTime.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
        } as BookingSlot;
      });

      const results = await Promise.all(availabilityPromises);
      setAvailableSlots(results);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setError('Erro ao carregar disponibilidade. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch availability when date or professional changes
  useEffect(() => {
    if (selectedDate && professionalId) {
      fetchAvailability(selectedDate);
      setSelectedSlot(undefined);
    }
  }, [selectedDate, professionalId]);

  const handleSlotSelect = (slot: BookingSlot) => {
    setSelectedSlot(slot);
    onTimeSlotSelect(slot);
  };

  const hasAvailableSlots = availableSlots.some((slot) => slot.isAvailable);

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onDateChange(date)}
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          className="rounded-md border"
        />
      </div>

      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div 
            key={selectedDate.toISOString()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            <h3 className="text-sm font-medium">Horários disponíveis</h3>
            
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>{error}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedDate && fetchAvailability(selectedDate)}
                        disabled={loading}
                        className="ml-2"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Tentar novamente
                      </Button>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              ) : !hasAvailableSlots ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-8 text-muted-foreground"
                >
                  <p>Nenhum horário disponível para esta data.</p>
                  <p className="text-sm mt-1">Tente selecionar outra data.</p>
                </motion.div>
              ) : (
                <motion.div
                  key="slots"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <TimeSlotGrid
                    slots={availableSlots}
                    selectedSlot={selectedSlot}
                    onSlotSelect={handleSlotSelect}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
