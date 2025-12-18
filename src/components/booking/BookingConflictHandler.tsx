import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { BookingSlot } from './TimeSlotGrid';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingConflictHandlerProps {
  suggestedSlots: TimeSlot[];
  onSelectAlternative: (slot: BookingSlot) => void;
  onRetry: () => void;
  isRetrying?: boolean;
  professionalName: string;
  selectedDate: Date;
  serviceDuration: number;
}

export function BookingConflictHandler({
  suggestedSlots,
  onSelectAlternative,
  onRetry,
  isRetrying = false,
  professionalName,
  selectedDate,
  serviceDuration
}: BookingConflictHandlerProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const createBookingSlot = (timeString: string): BookingSlot => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + serviceDuration);

    return {
      id: `${selectedDate.toISOString().split('T')[0]}-${timeString}`,
      professionalId: '', // Will be set by parent component
      startTime,
      endTime,
      time: timeString,
      isAvailable: true
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Alert className="mb-4 border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-700">
          <div className="space-y-3">
            <p className="font-medium">
              Ops! Este horário acabou de ser reservado por outro cliente.
            </p>
            <p className="text-sm">
              Mas não se preocupe! Temos outros horários disponíveis com {professionalName} 
              no dia {formatDate(selectedDate)}.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {suggestedSlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5" />
              Horários alternativos disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {suggestedSlots.map((slot) => (
                <Button
                  key={slot.time}
                  variant="outline"
                  onClick={() => onSelectAlternative(createBookingSlot(slot.time))}
                  className="h-12 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {slot.time}
                </Button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onRetry}
                disabled={isRetrying}
                className="flex-1"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Verificar novamente
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {suggestedSlots.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
            <h3 className="font-semibold mb-2">Nenhum horário alternativo encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Não há outros horários disponíveis com {professionalName} hoje.
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={onRetry}
                disabled={isRetrying}
                className="w-full"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verificando disponibilidade...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Verificar disponibilidade novamente
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Ou tente selecionar outro profissional ou data
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}