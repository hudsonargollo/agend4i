import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Star, Clock, Scissors, Calendar, User, Phone, Mail, ArrowLeft, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { 
  createBookingConflictError, 
  createExternalServiceError, 
  validateBookingData, 
  generateAlternativeSlots, 
  withRetry, 
  retryManager,
  formatErrorMessage,
  type AppError 
} from '@/lib/errorHandling';

interface TenantSettings {
  primary_color?: string;
  logo_url?: string;
}

interface Tenant {
  id: string;
  slug: string;
  name: string;
  settings: TenantSettings;
}

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

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingFormData {
  serviceId: string;
  staffId: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string;
}

type BookingStep = 'services' | 'staff' | 'datetime' | 'customer' | 'confirmation';

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // Booking flow state
  const [currentStep, setCurrentStep] = useState<BookingStep>('services');
  const [bookingData, setBookingData] = useState<BookingFormData>({
    serviceId: '',
    staffId: '',
    date: '',
    time: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: ''
  });
  
  // UI state
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [error, setError] = useState<AppError | string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [retryingOperation, setRetryingOperation] = useState(false);
  const [suggestedSlots, setSuggestedSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    const fetchTenantData = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();

      if (tenantError || !tenantData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const tenant: Tenant = {
        id: tenantData.id,
        slug: tenantData.slug,
        name: tenantData.name,
        settings: (tenantData.settings || {}) as TenantSettings,
      };

      setTenant(tenant);

      // Fetch services and staff in parallel
      const [servicesRes, staffRes] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('staff')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .eq('is_active', true)
          .order('display_name', { ascending: true }),
      ]);

      setServices(servicesRes.data || []);
      setStaff(staffRes.data || []);
      setLoading(false);
    };

    fetchTenantData();
  }, [slug]);

  // Generate time slots for a given date
  const generateTimeSlots = (date: string): string[] => {
    const slots: string[] = [];
    const startHour = 8; // 8 AM
    const endHour = 18; // 6 PM
    const intervalMinutes = 30;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  // Check availability for specific time slots with retry logic
  const checkAvailability = async (date: string, staffId: string, isRetry: boolean = false) => {
    if (!tenant || !date || !staffId) return;
    
    setCheckingAvailability(true);
    if (!isRetry) {
      setError(null);
      setSuggestedSlots([]);
    }
    
    const retryKey = `availability_${tenant.id}_${staffId}_${date}`;
    
    try {
      const result = await withRetry(async () => {
        const timeSlots = generateTimeSlots(date);
        const selectedService = services.find(s => s.id === bookingData.serviceId);
        if (!selectedService) throw new Error('Service not found');
        
        const availabilityPromises = timeSlots.map(async (time) => {
          const startDateTime = new Date(`${date}T${time}:00`);
          const endDateTime = new Date(startDateTime.getTime() + selectedService.duration_min * 60000);
          
          const { data, error } = await supabase.rpc('check_availability', {
            p_tenant_id: tenant.id,
            p_staff_id: staffId,
            p_start_time: startDateTime.toISOString(),
            p_end_time: endDateTime.toISOString()
          });
          
          if (error) {
            throw createExternalServiceError('database', error);
          }
          
          return { time, available: data === true };
        });
        
        return await Promise.all(availabilityPromises);
      }, retryKey, 2, 1000);
      
      setAvailableSlots(result);
    } catch (err) {
      console.error('Error checking availability:', err);
      if (err instanceof Error && 'type' in err) {
        setError(err as AppError);
      } else {
        setError(createExternalServiceError('database', err as Error));
      }
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Submit booking with enhanced error handling
  const submitBooking = async () => {
    // Validate form data
    const validationErrors = validateBookingData(bookingData);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]); // Show first validation error
      return;
    }

    if (!tenant) {
      setError('Erro interno: informações do estabelecimento não encontradas.');
      return;
    }

    setSubmittingBooking(true);
    setError(null);
    setSuggestedSlots([]);

    const retryKey = `booking_${tenant.id}_${bookingData.staffId}_${bookingData.date}_${bookingData.time}`;

    try {
      const result = await withRetry(async () => {
        const selectedService = services.find(s => s.id === bookingData.serviceId);
        if (!selectedService) {
          throw new Error('Serviço não encontrado.');
        }

        const startDateTime = new Date(`${bookingData.date}T${bookingData.time}:00`);
        const endDateTime = new Date(startDateTime.getTime() + selectedService.duration_min * 60000);

        // Double-check availability before submitting
        const { data: isAvailable, error: availabilityError } = await supabase.rpc('check_availability', {
          p_tenant_id: tenant.id,
          p_staff_id: bookingData.staffId,
          p_start_time: startDateTime.toISOString(),
          p_end_time: endDateTime.toISOString()
        });

        if (availabilityError) {
          throw createExternalServiceError('database', availabilityError);
        }

        if (!isAvailable) {
          // Generate alternative suggestions
          const alternatives = generateAlternativeSlots(bookingData.time, availableSlots);
          setSuggestedSlots(alternatives);
          
          throw createBookingConflictError(undefined, alternatives);
        }

        // Create or find customer
        let customerId: string;
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('phone', bookingData.customerPhone)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
          // Update customer info if provided
          const { error: updateError } = await supabase
            .from('customers')
            .update({
              name: bookingData.customerName,
              email: bookingData.customerEmail || null
            })
            .eq('id', customerId);

          if (updateError) {
            throw createExternalServiceError('database', updateError);
          }
        } else {
          // Create new customer
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              tenant_id: tenant.id,
              name: bookingData.customerName,
              phone: bookingData.customerPhone,
              email: bookingData.customerEmail || null
            })
            .select('id')
            .single();

          if (customerError || !newCustomer) {
            throw createExternalServiceError('database', customerError || new Error('Failed to create customer'));
          }
          customerId = newCustomer.id;
        }

        // Create booking
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            tenant_id: tenant.id,
            customer_id: customerId,
            service_id: bookingData.serviceId,
            staff_id: bookingData.staffId,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            status: 'pending',
            total_price: selectedService.price,
            notes: bookingData.notes || null
          })
          .select('id')
          .single();

        if (bookingError || !booking) {
          throw createExternalServiceError('database', bookingError || new Error('Failed to create booking'));
        }

        return booking.id;
      }, retryKey, 2, 1000);

      setBookingId(result);
      setCurrentStep('confirmation');
    } catch (err) {
      console.error('Error submitting booking:', err);
      
      if (err instanceof Error && 'type' in err) {
        const appError = err as AppError;
        setError(appError);
        
        // If it's a booking conflict, refresh availability to show updated slots
        if (appError.type === 'booking_conflict') {
          await checkAvailability(bookingData.date, bookingData.staffId, true);
        }
      } else {
        setError(createExternalServiceError('database', err as Error));
      }
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Handle step navigation
  const goToNextStep = () => {
    setError(null);
    
    switch (currentStep) {
      case 'services':
        if (!bookingData.serviceId) {
          setError('Selecione um serviço para continuar.');
          return;
        }
        setCurrentStep('staff');
        break;
      case 'staff':
        if (!bookingData.staffId) {
          setError('Selecione um profissional para continuar.');
          return;
        }
        setCurrentStep('datetime');
        break;
      case 'datetime':
        if (!bookingData.date || !bookingData.time) {
          setError('Selecione data e horário para continuar.');
          return;
        }
        setCurrentStep('customer');
        break;
      case 'customer':
        if (!bookingData.customerName || !bookingData.customerPhone) {
          setError('Nome e telefone são obrigatórios.');
          return;
        }
        submitBooking();
        break;
    }
  };

  const goToPreviousStep = () => {
    setError(null);
    
    switch (currentStep) {
      case 'staff':
        setCurrentStep('services');
        break;
      case 'datetime':
        setCurrentStep('staff');
        break;
      case 'customer':
        setCurrentStep('datetime');
        break;
    }
  };

  // Update booking data
  const updateBookingData = (field: keyof BookingFormData, value: string) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuggestedSlots([]);
  };

  // Retry failed operations
  const retryOperation = async () => {
    setRetryingOperation(true);
    setError(null);
    
    try {
      if (currentStep === 'datetime' && bookingData.date && bookingData.staffId) {
        await checkAvailability(bookingData.date, bookingData.staffId, true);
      } else if (currentStep === 'customer') {
        await submitBooking();
      }
    } catch (err) {
      console.error('Retry operation failed:', err);
    } finally {
      setRetryingOperation(false);
    }
  };

  // Effect to check availability when date/staff changes
  useEffect(() => {
    if (currentStep === 'datetime' && bookingData.date && bookingData.staffId) {
      checkAvailability(bookingData.date, bookingData.staffId);
    }
  }, [bookingData.date, bookingData.staffId, currentStep]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Scissors className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-xl font-bold mb-2">Estabelecimento não encontrado</h1>
            <p className="text-muted-foreground">
              O link que você acessou não existe ou foi desativado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = tenant?.settings?.primary_color || '#000000';

  // Get selected items for display
  const selectedService = services.find(s => s.id === bookingData.serviceId);
  const selectedStaff = staff.find(s => s.id === bookingData.staffId);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'services':
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Escolha o serviço</h2>
            {services.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum serviço disponível no momento
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <Card 
                    key={service.id} 
                    className={`cursor-pointer transition-colors ${
                      bookingData.serviceId === service.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-secondary/50'
                    }`}
                    onClick={() => updateBookingData('serviceId', service.id)}
                  >
                    <CardContent className="py-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{service.duration_min}min</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">R$ {service.price.toFixed(2)}</p>
                        {bookingData.serviceId === service.id && (
                          <CheckCircle className="w-5 h-5 text-primary mt-2" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'staff':
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Escolha o profissional</h2>
            {staff.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum profissional disponível no momento
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {staff.map((member) => (
                  <Card 
                    key={member.id}
                    className={`cursor-pointer transition-colors ${
                      bookingData.staffId === member.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-secondary/50'
                    }`}
                    onClick={() => updateBookingData('staffId', member.id)}
                  >
                    <CardContent className="py-4 text-center">
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={member.display_name}
                          className="w-16 h-16 mx-auto rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center">
                          <span className="text-xl font-bold">{member.display_name[0]}</span>
                        </div>
                      )}
                      <p className="font-medium mt-2">{member.display_name}</p>
                      {member.role && (
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      )}
                      {bookingData.staffId === member.id && (
                        <CheckCircle className="w-5 h-5 text-primary mx-auto mt-2" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'datetime':
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Escolha data e horário</h2>
            
            {/* Date picker */}
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={bookingData.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => updateBookingData('date', e.target.value)}
              />
            </div>

            {/* Time slots */}
            {bookingData.date && (
              <div className="space-y-2">
                <Label>Horários disponíveis</Label>
                {checkingAvailability ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={bookingData.time === slot.time ? "default" : "outline"}
                        disabled={!slot.available}
                        onClick={() => updateBookingData('time', slot.time)}
                        className="h-10"
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'customer':
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Seus dados</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  value={bookingData.customerName}
                  onChange={(e) => updateBookingData('customerName', e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={bookingData.customerPhone}
                  onChange={(e) => updateBookingData('customerPhone', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={bookingData.customerEmail}
                  onChange={(e) => updateBookingData('customerEmail', e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={bookingData.notes}
                  onChange={(e) => updateBookingData('notes', e.target.value)}
                  placeholder="Alguma observação especial?"
                  rows={3}
                />
              </div>
            </div>

            {/* Booking summary */}
            <Card className="bg-secondary/20">
              <CardContent className="py-4">
                <h3 className="font-medium mb-2">Resumo do agendamento</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Serviço:</strong> {selectedService?.name}</p>
                  <p><strong>Profissional:</strong> {selectedStaff?.display_name}</p>
                  <p><strong>Data:</strong> {new Date(bookingData.date).toLocaleDateString('pt-BR')}</p>
                  <p><strong>Horário:</strong> {bookingData.time}</p>
                  <p><strong>Duração:</strong> {selectedService?.duration_min}min</p>
                  <p><strong>Valor:</strong> R$ {selectedService?.price.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'confirmation':
        return (
          <div className="space-y-4 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold text-green-700">Agendamento confirmado!</h2>
            
            <Card>
              <CardContent className="py-6">
                <div className="space-y-2 text-sm">
                  <p><strong>Número do agendamento:</strong> {bookingId}</p>
                  <p><strong>Serviço:</strong> {selectedService?.name}</p>
                  <p><strong>Profissional:</strong> {selectedStaff?.display_name}</p>
                  <p><strong>Data:</strong> {new Date(bookingData.date).toLocaleDateString('pt-BR')}</p>
                  <p><strong>Horário:</strong> {bookingData.time}</p>
                  <p><strong>Cliente:</strong> {bookingData.customerName}</p>
                  <p><strong>Telefone:</strong> {bookingData.customerPhone}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Seu agendamento foi criado com sucesso!</p>
              <p>Em breve você receberá uma confirmação.</p>
            </div>

            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              style={{ backgroundColor: primaryColor }}
            >
              Fazer novo agendamento
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with branding */}
      <div 
        className="py-6 px-4"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            {currentStep !== 'services' && currentStep !== 'confirmation' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousStep}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            
            <div className="flex-1 text-center">
              {tenant?.settings?.logo_url ? (
                <img 
                  src={tenant.settings.logo_url} 
                  alt={tenant.name}
                  className="w-12 h-12 mx-auto rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-12 h-12 mx-auto rounded-full bg-white/20 flex items-center justify-center">
                  <Scissors className="w-6 h-6 text-white" />
                </div>
              )}
              <h1 className="text-lg font-bold mt-2 text-white">{tenant?.name}</h1>
            </div>
            
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <div className="space-y-2">
                <p>{formatErrorMessage(error)}</p>
                
                {/* Show retry button for retryable errors */}
                {typeof error === 'object' && 'type' in error && error.type === 'external_service_error' && error.retryable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryOperation}
                    disabled={retryingOperation}
                    className="mt-2"
                  >
                    {retryingOperation ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Tentando novamente...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Tentar novamente
                      </>
                    )}
                  </Button>
                )}

                {/* Show suggested time slots for booking conflicts */}
                {typeof error === 'object' && 'type' in error && error.type === 'booking_conflict' && suggestedSlots.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2">Horários alternativos disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            updateBookingData('time', slot.time);
                            setError(null);
                          }}
                          className="text-xs"
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {renderStepContent()}

        {/* Navigation buttons */}
        {currentStep !== 'confirmation' && (
          <div className="mt-6 flex justify-end">
            <Button 
              onClick={goToNextStep}
              disabled={submittingBooking}
              style={{ backgroundColor: primaryColor }}
            >
              {submittingBooking ? 'Agendando...' : 
               currentStep === 'customer' ? 'Confirmar agendamento' : 'Continuar'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
