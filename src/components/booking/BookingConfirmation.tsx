import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Calendar, Clock, User, Scissors, MapPin, Phone, Mail, MessageSquare, Share2 } from 'lucide-react';

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

interface BookingSlot {
  startTime: Date;
  endTime: Date;
  time: string;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

interface BookingConfirmationProps {
  bookingId: string;
  service: Service;
  staff: Staff;
  timeSlot: BookingSlot;
  date: Date;
  customerInfo: CustomerInfo;
  tenantName: string;
  onNewBooking: () => void;
}

export function BookingConfirmation({
  bookingId,
  service,
  staff,
  timeSlot,
  date,
  customerInfo,
  tenantName,
  onNewBooking
}: BookingConfirmationProps) {
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

  const shareBooking = () => {
    const message = `🎉 Agendamento confirmado!\n\n` +
      `📍 ${tenantName}\n` +
      `✂️ ${service.name}\n` +
      `👤 ${staff.display_name}\n` +
      `📅 ${formatDate(date)}\n` +
      `⏰ ${formatTime(timeSlot.startTime, timeSlot.endTime)}\n\n` +
      `ID do agendamento: ${bookingId}`;

    if (navigator.share) {
      navigator.share({
        title: 'Agendamento Confirmado',
        text: message
      });
    } else {
      navigator.clipboard.writeText(message);
      // Could show a toast notification here
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Success Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-green-700 mb-2">
          Agendamento confirmado!
        </h1>
        <p className="text-muted-foreground">
          Seu horário foi reservado com sucesso
        </p>
        <Badge variant="outline" className="mt-2">
          ID: {bookingId}
        </Badge>
      </motion.div>

      {/* Booking Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5" />
              Detalhes do agendamento
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
      </motion.div>

      {/* Customer Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Suas informações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{customerInfo.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{customerInfo.phone}</span>
            </div>
            {customerInfo.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{customerInfo.email}</span>
              </div>
            )}
            {customerInfo.notes && (
              <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-sm">{customerInfo.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Important Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">Informações importantes:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Você receberá uma confirmação via WhatsApp</li>
                <li>• Chegue com 5 minutos de antecedência</li>
                <li>• Para cancelar ou reagendar, entre em contato conosco</li>
                <li>• Guarde o ID do agendamento para referência</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="flex gap-3"
      >
        <Button
          variant="outline"
          onClick={shareBooking}
          className="flex-1"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Compartilhar
        </Button>
        <Button
          onClick={onNewBooking}
          className="flex-1"
        >
          Novo agendamento
        </Button>
      </motion.div>
    </motion.div>
  );
}