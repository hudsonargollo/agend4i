import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Scissors, MapPin } from 'lucide-react';
import { BookingSlot } from './TimeSlotGrid';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price: number;
  category: string | null;
}

interface Staff {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: string | null;
}

interface BookingSummaryProps {
  service: Service;
  staff: Staff;
  timeSlot: BookingSlot;
  date: Date;
  tenantName: string;
}

export function BookingSummary({ 
  service, 
  staff, 
  timeSlot, 
  date, 
  tenantName 
}: BookingSummaryProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (startTime: Date, endTime: Date) => {
    const start = startTime.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    const end = endTime.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    return `${start} - ${end}`;
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scissors className="w-5 h-5" />
          Resumo do agendamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Establishment */}
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{tenantName}</span>
        </div>

        {/* Service */}
        <div className="flex items-start gap-3">
          <Scissors className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">{service.name}</p>
            {service.description && (
              <p className="text-sm text-muted-foreground">{service.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {service.duration_min}min
              </Badge>
              <span className="text-sm font-semibold text-primary">
                R$ {service.price.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Professional */}
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <img
              src={staff.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${staff.display_name}`}
              alt={staff.display_name}
              className="w-6 h-6 rounded-full object-cover"
            />
            <div>
              <span className="font-medium">{staff.display_name}</span>
              {staff.role && (
                <span className="text-sm text-muted-foreground ml-2">• {staff.role}</span>
              )}
            </div>
          </div>
        </div>

        {/* Date and Time */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium capitalize">{formatDate(date)}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{formatTime(timeSlot.startTime, timeSlot.endTime)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}