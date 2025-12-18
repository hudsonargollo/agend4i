import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Scissors, Calendar, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { 
  createBookingConflictError, 
  createExternalServiceError, 
  validateBookingData, 
  generateAlternativeSlots, 
  withRetry,
  formatErrorMessage,
  type AppError 
} from '@/lib/errorHandling';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProfessionalCard } from '@/components/ProfessionalCard';
import { InlineAvailabilityPicker } from '@/components/booking/InlineAvailabilityPicker';
import { BookingSlot } from '@/components/booking/TimeSlotGrid';
import { CustomerInfoForm, CustomerInfo } from '@/components/booking/CustomerInfoForm';
import { BookingSummary } from '@/components/booking/BookingSummary';
import { BookingConfirmation } from '@/components/booking/BookingConfirmation';
import { BookingConflictHandler } from '@/components/booking/BookingConflictHandler';

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

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // Booking flow state - keep service selection as initial step
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
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [error, setError] = useState<AppError | string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [retryingOperation, setRetryingOperation] = useState(false);
  const [suggestedSlots, setSuggestedSlots] = useState<TimeSlot[]>([]);
  
  // Responsive layout state
  const isMobile = useIsMobile();
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<BookingSlot | null>(null);
  
  // Customer information state
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  // Booking conflict state
  const [showingConflictResolution, setShowingConflictResolution] = useState(false);

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
  const checkAvailability = async (dateStr: string, staffId: string, isRetry: boolean = false) => {
    if (!tenant || !dateStr || !staffId) return;
    
    if (!isRetry) {
      setError(null);
      setSuggestedSlots([]);
    }
    
    const retryKey = `availability_${tenant.id}_${staffId}_${dateStr}`;
    
    try {
      const result = await withRetry(async () => {
        const timeSlots = generateTimeSlots(dateStr);
        const selectedService = services.find(s => s.id === bookingData.serviceId);
        if (!selectedService) throw new Error('Service not found');
        
        const availabilityPromises = timeSlots.map(async (time) => {
          const startDateTime = new Date(`${dateStr}T${time}:00`);
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
          setShowingConflictResolution(true);
          
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
          // Update customer info and track preferences
          const { error: updateError } = await supabase
            .from('customers')
            .update({
              name: bookingData.customerName,
              email: bookingData.customerEmail || null,
              // Track preferred staff if this is a repeat booking
              preferred_staff_id: bookingData.staffId,
              // Update contact date
              last_contact_date: new Date().toISOString(),
              // Ensure active status
              is_active: true
            })
            .eq('id', customerId);

          if (updateError) {
            throw createExternalServiceError('database', updateError);
          }
        } else {
          // Create new customer with marketing data
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              tenant_id: tenant.id,
              name: bookingData.customerName,
              phone: bookingData.customerPhone,
              email: bookingData.customerEmail || null,
              // Marketing and consent fields
              marketing_consent: true, // Implied consent by booking
              whatsapp_consent: true, // Default to true for WhatsApp notifications
              email_consent: bookingData.customerEmail ? true : false,
              // Acquisition tracking
              acquisition_source: 'direct', // Default, can be enhanced with UTM params
              // Initial segmentation
              customer_segment: 'new',
              is_active: true
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
      // Booking confirmation will be handled in unified flow
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

  // Remove wizard step navigation logic - unified flow handles this differently

  // Update booking data
  const updateBookingData = (field: keyof BookingFormData, value: string) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuggestedSlots([]);
  };

  // Retry failed operations - simplified for unified flow
  const retryOperation = async () => {
    setRetryingOperation(true);
    setError(null);
    
    try {
      if (bookingData.date && bookingData.staffId) {
        await checkAvailability(bookingData.date, bookingData.staffId, true);
      }
    } catch (err) {
      console.error('Retry operation failed:', err);
    } finally {
      setRetryingOperation(false);
    }
  };

  // Remove step-dependent availability checking - will be handled by unified flow

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

  // Service selection content - keep as initial step
  const renderServiceSelection = () => (
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

  // Unified booking flow - responsive layout switching
  const renderUnifiedBookingFlow = () => {
    if (isMobile) {
      // Mobile: Accordion pattern
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
            <div className="space-y-3">
              {staff.map((member) => (
                <ProfessionalCard
                  key={member.id}
                  professional={{
                    id: member.id,
                    name: member.display_name,
                    avatarUrl: member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.display_name}`,
                    role: member.role || 'Profissional'
                  }}
                  isSelected={selectedProfessionalId === member.id}
                  onSelect={handleProfessionalSelect}
                  expandedContent={
                    selectedProfessionalId === member.id && selectedService ? (
                      <div className="pt-4">
                        <InlineAvailabilityPicker
                          professionalId={member.id}
                          tenantId={tenant?.id || ''}
                          serviceDuration={selectedService.duration_min}
                          selectedDate={selectedDate}
                          onDateChange={handleDateChange}
                          onTimeSlotSelect={handleTimeSlotSelect}
                        />
                      </div>
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      );
    } else {
      // Desktop: Split view pattern
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Professional List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Escolha o profissional</h2>
            {staff.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum profissional disponível no momento
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {staff.map((member) => (
                  <ProfessionalCard
                    key={member.id}
                    professional={{
                      id: member.id,
                      name: member.display_name,
                      avatarUrl: member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.display_name}`,
                      role: member.role || 'Profissional'
                    }}
                    isSelected={selectedProfessionalId === member.id}
                    onSelect={handleProfessionalSelect}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Panel: Availability Calendar */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Disponibilidade</h2>
            {selectedProfessionalId && selectedService ? (
              <Card>
                <CardContent className="p-6">
                  <InlineAvailabilityPicker
                    professionalId={selectedProfessionalId}
                    tenantId={tenant?.id || ''}
                    serviceDuration={selectedService.duration_min}
                    selectedDate={selectedDate}
                    onDateChange={handleDateChange}
                    onTimeSlotSelect={handleTimeSlotSelect}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione um profissional para ver a disponibilidade</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      );
    }
  };

  // Handle professional selection with state management
  const handleProfessionalSelect = (professionalId: string) => {
    if (isMobile) {
      // On mobile, toggle selection (accordion behavior)
      if (selectedProfessionalId === professionalId) {
        setSelectedProfessionalId(null);
        // Clear related state when deselecting
        setSelectedTimeSlot(null);
        updateBookingData('staffId', '');
        updateBookingData('time', '');
      } else {
        setSelectedProfessionalId(professionalId);
        // Clear time slot when switching professionals (prevent data mismatches)
        setSelectedTimeSlot(null);
        updateBookingData('time', '');
        // Preserve selectedServiceId when switching professionals
        // (serviceId is already preserved in bookingData state)
      }
    } else {
      // On desktop, always select (split view behavior)
      setSelectedProfessionalId(professionalId);
      // Clear time slot when switching professionals (prevent data mismatches)
      setSelectedTimeSlot(null);
      updateBookingData('time', '');
      // Preserve selectedServiceId when switching professionals
      // (serviceId is already preserved in bookingData state)
    }
  };

  // Handle time slot selection
  const handleTimeSlotSelect = (slot: BookingSlot) => {
    setSelectedTimeSlot(slot);
    // Update booking data for compatibility with existing booking logic
    updateBookingData('staffId', selectedProfessionalId || '');
    updateBookingData('date', selectedDate.toISOString().split('T')[0]);
    updateBookingData('time', slot.time);
  };

  // Handle date change
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    // Clear time slot when date changes
    setSelectedTimeSlot(null);
    updateBookingData('time', '');
  };

  // Handle starting a new booking
  const handleNewBooking = () => {
    // Reset all booking state
    setBookingId(null);
    setSelectedProfessionalId(null);
    setSelectedTimeSlot(null);
    setSelectedDate(new Date());
    setCustomerInfo({
      name: '',
      phone: '',
      email: '',
      notes: ''
    });
    setBookingData({
      serviceId: '',
      staffId: '',
      date: '',
      time: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      notes: ''
    });
    setError(null);
    setSuggestedSlots([]);
    setShowingConflictResolution(false);
  };

  // Handle selecting an alternative time slot from conflict resolution
  const handleSelectAlternative = (slot: BookingSlot) => {
    setSelectedTimeSlot(slot);
    setShowingConflictResolution(false);
    setError(null);
    setSuggestedSlots([]);
    // Update booking data
    updateBookingData('time', slot.time);
  };

  // Handle retrying after conflict
  const handleRetryAfterConflict = async () => {
    setShowingConflictResolution(false);
    setError(null);
    setSuggestedSlots([]);
    
    // Refresh availability to get updated slots
    if (selectedProfessionalId && selectedDate && selectedService) {
      await checkAvailability(
        selectedDate.toISOString().split('T')[0], 
        selectedProfessionalId, 
        true
      );
    }
  };

  // Handle customer info change
  const handleCustomerInfoChange = (info: CustomerInfo) => {
    setCustomerInfo(info);
    // Update booking data for compatibility with existing booking logic
    updateBookingData('customerName', info.name);
    updateBookingData('customerPhone', info.phone);
    updateBookingData('customerEmail', info.email);
    updateBookingData('notes', info.notes);
  };

  // Handle back from customer form
  const handleBackFromCustomerForm = () => {
    setSelectedTimeSlot(null);
    updateBookingData('time', '');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with branding - simplified without step navigation */}
      <div 
        className="py-6 px-4"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center">
            <div className="text-center">
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
                <p>{typeof error === 'string' ? error : formatErrorMessage(error)}</p>
                
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

        {/* Show service selection if no service is selected */}
        {!bookingData.serviceId && renderServiceSelection()}
        
        {/* Unified booking flow - responsive layout */}
        {bookingData.serviceId && !selectedTimeSlot && renderUnifiedBookingFlow()}
        
        {/* Customer information form - appears after time slot selection */}
        {bookingData.serviceId && selectedTimeSlot && selectedService && selectedStaff && !bookingId && (
          <>
            <BookingSummary
              service={selectedService}
              staff={selectedStaff}
              timeSlot={selectedTimeSlot}
              date={selectedDate}
              tenantName={tenant?.name || ''}
            />
            <CustomerInfoForm
              customerInfo={customerInfo}
              onCustomerInfoChange={handleCustomerInfoChange}
              onSubmit={submitBooking}
              onBack={handleBackFromCustomerForm}
              isSubmitting={submittingBooking}
              error={error}
            />
          </>
        )}

        {/* Booking conflict resolution - appears when there's a booking conflict */}
        {showingConflictResolution && selectedService && selectedStaff && (
          <BookingConflictHandler
            suggestedSlots={suggestedSlots}
            onSelectAlternative={handleSelectAlternative}
            onRetry={handleRetryAfterConflict}
            isRetrying={retryingOperation}
            professionalName={selectedStaff.display_name}
            selectedDate={selectedDate}
            serviceDuration={selectedService.duration_min}
          />
        )}

        {/* Booking confirmation - appears after successful booking */}
        {bookingId && selectedService && selectedStaff && selectedTimeSlot && (
          <BookingConfirmation
            bookingId={bookingId}
            service={selectedService}
            staff={selectedStaff}
            timeSlot={selectedTimeSlot}
            date={selectedDate}
            customerInfo={customerInfo}
            tenantName={tenant?.name || ''}
            onNewBooking={handleNewBooking}
          />
        )}
      </main>
    </div>
  );
}
