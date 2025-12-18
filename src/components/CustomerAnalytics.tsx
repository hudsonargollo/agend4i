import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, MessageCircle, Mail, Phone, Calendar, DollarSign } from 'lucide-react';

interface CustomerAnalytic {
  id: string;
  name: string;
  phone: string;
  email: string;
  customer_segment: string;
  total_bookings: number;
  total_spent: number;
  average_booking_value: number;
  last_booking_date: string;
  booking_frequency: string;
  acquisition_source: string;
  marketing_consent: boolean;
  whatsapp_consent: boolean;
  email_consent: boolean;
  is_active: boolean;
  loyalty_points: number;
  days_since_last_booking: number;
  churn_risk: string;
  ltv_category: string;
  preferred_staff_name: string;
}

interface MarketingSegment {
  customer_segment: string;
  acquisition_source: string;
  customer_count: number;
  avg_ltv: number;
  avg_bookings: number;
  marketing_consent_count: number;
  whatsapp_consent_count: number;
  email_consent_count: number;
  active_last_30_days: number;
  active_last_90_days: number;
}

export const CustomerAnalytics: React.FC = () => {
  const { currentTenant } = useTenant();
  const [customers, setCustomers] = useState<CustomerAnalytic[]>([]);
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [churnFilter, setChurnFilter] = useState<string>('all');

  useEffect(() => {
    if (currentTenant) {
      fetchCustomerData();
      fetchMarketingSegments();
    }
  }, [currentTenant]);

  const fetchCustomerData = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('customer_analytics')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('total_spent', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
    }
  };

  const fetchMarketingSegments = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('marketing_segments')
        .select('*')
        .eq('tenant_id', currentTenant.id);

      if (error) throw error;
      setSegments(data || []);
    } catch (error) {
      console.error('Error fetching marketing segments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone?.includes(searchTerm) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSegment = segmentFilter === 'all' || customer.customer_segment === segmentFilter;
    const matchesChurn = churnFilter === 'all' || customer.churn_risk === churnFilter;
    
    return matchesSearch && matchesSegment && matchesChurn;
  });

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'vip': return 'bg-purple-100 text-purple-800';
      case 'regular': return 'bg-blue-100 text-blue-800';
      case 'new': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChurnRiskColor = (risk: string) => {
    switch (risk) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'churned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
  const avgLTV = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  const marketingConsentCount = customers.filter(c => c.marketing_consent).length;
  const whatsappConsentCount = customers.filter(c => c.whatsapp_consent).length;

  if (loading) {
    return <div className="p-6">Loading customer analytics...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Analytics & Marketing</h1>
        <Button onClick={() => window.location.reload()}>
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {customers.filter(c => c.days_since_last_booking <= 30).length} active last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Avg LTV: R$ {avgLTV.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Marketing Consent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketingConsentCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalCustomers > 0 ? Math.round((marketingConsentCount / totalCustomers) * 100) : 0}% consent rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WhatsApp Consent</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{whatsappConsentCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalCustomers > 0 ? Math.round((whatsappConsentCount / totalCustomers) * 100) : 0}% consent rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by segment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Segments</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={churnFilter} onValueChange={setChurnFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by churn risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Database ({filteredCustomers.length} customers)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{customer.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getSegmentColor(customer.customer_segment)}>
                      {customer.customer_segment}
                    </Badge>
                    <Badge className={getChurnRiskColor(customer.churn_risk)}>
                      {customer.churn_risk}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Spent:</span>
                    <div className="font-medium">R$ {customer.total_spent.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bookings:</span>
                    <div className="font-medium">{customer.total_bookings}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Frequency:</span>
                    <div className="font-medium">{customer.booking_frequency}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Booking:</span>
                    <div className="font-medium">
                      {customer.days_since_last_booking ? 
                        `${customer.days_since_last_booking} days ago` : 
                        'Never'
                      }
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 text-xs">
                  {customer.marketing_consent && (
                    <Badge variant="outline" className="text-green-600">Marketing ✓</Badge>
                  )}
                  {customer.whatsapp_consent && (
                    <Badge variant="outline" className="text-blue-600">WhatsApp ✓</Badge>
                  )}
                  {customer.email_consent && (
                    <Badge variant="outline" className="text-purple-600">Email ✓</Badge>
                  )}
                  <Badge variant="outline">
                    Source: {customer.acquisition_source}
                  </Badge>
                  {customer.preferred_staff_name && (
                    <Badge variant="outline">
                      Prefers: {customer.preferred_staff_name}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Marketing Segments Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Segments Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((segment, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h4 className="font-semibold capitalize">
                  {segment.customer_segment} - {segment.acquisition_source}
                </h4>
                <div className="mt-2 space-y-1 text-sm">
                  <div>Customers: {segment.customer_count}</div>
                  <div>Avg LTV: R$ {segment.avg_ltv?.toFixed(2) || '0.00'}</div>
                  <div>Avg Bookings: {segment.avg_bookings?.toFixed(1) || '0'}</div>
                  <div>WhatsApp Consent: {segment.whatsapp_consent_count}</div>
                  <div>Active (30d): {segment.active_last_30_days}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};