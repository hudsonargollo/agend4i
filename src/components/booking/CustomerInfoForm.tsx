import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Phone, Mail, MessageSquare, AlertCircle } from 'lucide-react';
import { validateBookingData, ValidationError, AppError, formatErrorMessage } from '@/lib/errorHandling';

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

interface CustomerInfoFormProps {
  customerInfo: CustomerInfo;
  onCustomerInfoChange: (info: CustomerInfo) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
  error?: string | ValidationError | AppError | null;
}

export function CustomerInfoForm({
  customerInfo,
  onCustomerInfoChange,
  onSubmit,
  onBack,
  isSubmitting = false,
  error = null
}: CustomerInfoFormProps) {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const updateField = (field: keyof CustomerInfo, value: string) => {
    const updatedInfo = { ...customerInfo, [field]: value };
    onCustomerInfoChange(updatedInfo);
    
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const mockBookingData = {
      serviceId: 'mock', // These will be validated elsewhere
      staffId: 'mock',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      customerEmail: customerInfo.email
    };
    
    const errors = validateBookingData(mockBookingData).filter(error => 
      ['customerName', 'customerPhone', 'customerEmail'].includes(error.field)
    );
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    onSubmit();
  };

  const getFieldError = (field: string) => {
    return validationErrors.find(error => error.field === field)?.message;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Suas informações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {typeof error === 'string' ? error : formatErrorMessage(error as AppError)}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="customer-name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome completo *
              </Label>
              <Input
                id="customer-name"
                type="text"
                value={customerInfo.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Digite seu nome completo"
                className={getFieldError('customerName') ? 'border-red-500 focus:border-red-500' : ''}
                disabled={isSubmitting}
                required
              />
              {getFieldError('customerName') && (
                <p className="text-sm text-red-600">{getFieldError('customerName')}</p>
              )}
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="customer-phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telefone/WhatsApp *
              </Label>
              <Input
                id="customer-phone"
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(11) 99999-9999"
                className={getFieldError('customerPhone') ? 'border-red-500 focus:border-red-500' : ''}
                disabled={isSubmitting}
                required
              />
              {getFieldError('customerPhone') && (
                <p className="text-sm text-red-600">{getFieldError('customerPhone')}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Usaremos para confirmar seu agendamento via WhatsApp
              </p>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="customer-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email (opcional)
              </Label>
              <Input
                id="customer-email"
                type="email"
                value={customerInfo.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="seu@email.com"
                className={getFieldError('customerEmail') ? 'border-red-500 focus:border-red-500' : ''}
                disabled={isSubmitting}
              />
              {getFieldError('customerEmail') && (
                <p className="text-sm text-red-600">{getFieldError('customerEmail')}</p>
              )}
            </div>

            {/* Notes Field */}
            <div className="space-y-2">
              <Label htmlFor="customer-notes" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Observações (opcional)
              </Label>
              <Textarea
                id="customer-notes"
                value={customerInfo.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Alguma observação especial para seu atendimento?"
                rows={3}
                disabled={isSubmitting}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Máximo 200 caracteres
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isSubmitting}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Confirmando...' : 'Confirmar agendamento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}