import React, { useState, useEffect } from 'react';
import { useFeatureAccess } from '@/lib/featureGating';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Crown, 
  AlertCircle,
  UserPlus,
  Lock
} from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Staff = Tables<'staff'>;

interface StaffFormData {
  display_name: string;
  role: string;
  services_offered: string[];
  working_hours: any;
}

interface StaffManagementProps {
  onUpgrade?: () => void;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ onUpgrade }) => {
  const { currentTenant } = useTenant();
  const { checkFeature, canPerform, getUpgradeMessage, currentPlan } = useFeatureAccess();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState<StaffFormData>({
    display_name: '',
    role: 'staff',
    services_offered: [],
    working_hours: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load staff members
  useEffect(() => {
    if (currentTenant) {
      loadStaff();
    }
  }, [currentTenant]);

  const loadStaff = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
      setError('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!currentTenant) return;

    // Check if user can add more staff members
    const canAddStaff = canPerform('addStaffMember', staff.length);
    
    if (!canAddStaff) {
      setError(`Free Plan is limited to 1 staff member. ${getUpgradeMessage('multipleStaff')}`);
      return;
    }

    if (!formData.display_name.trim()) {
      setError('Staff name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { data, error } = await supabase
        .from('staff')
        .insert({
          tenant_id: currentTenant.id,
          display_name: formData.display_name.trim(),
          role: formData.role,
          services_offered: formData.services_offered,
          working_hours: formData.working_hours,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setStaff(prev => [...prev, data]);
      setShowAddDialog(false);
      setFormData({
        display_name: '',
        role: 'staff',
        services_offered: [],
        working_hours: null,
      });
    } catch (error) {
      console.error('Error adding staff:', error);
      setError('Failed to add staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!currentTenant) return;

    try {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: false })
        .eq('id', staffId)
        .eq('tenant_id', currentTenant.id);

      if (error) throw error;

      setStaff(prev => prev.filter(s => s.id !== staffId));
    } catch (error) {
      console.error('Error deleting staff:', error);
      setError('Failed to delete staff member');
    }
  };

  const canAddMoreStaff = canPerform('addStaffMember', staff.length);
  const isFreePlan = currentPlan === 'free';

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Staff Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse">Loading staff...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Staff Management
                {isFreePlan && (
                  <Badge variant="outline" className="text-xs">
                    Free Plan: 1 staff max
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage your team members and their access
              </CardDescription>
            </div>
            
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button 
                  disabled={!canAddMoreStaff}
                  className="flex items-center gap-2"
                >
                  {canAddMoreStaff ? (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Staff
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Staff Limit Reached
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Staff Member</DialogTitle>
                  <DialogDescription>
                    Add a new team member to your business
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="display_name">Staff Name</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                      placeholder="Enter staff member name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <select
                      id="role"
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-input rounded-md"
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {error && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddDialog(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddStaff}
                      disabled={submitting}
                    >
                      {submitting ? 'Adding...' : 'Add Staff'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Free Plan Limitation Warning */}
          {!canAddMoreStaff && isFreePlan && (
            <Alert className="mb-4 border-amber-200 bg-amber-50">
              <Crown className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <div className="space-y-2">
                  <p>You've reached the Free Plan limit of 1 staff member.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onUpgrade}
                    className="text-amber-700 border-amber-300 hover:bg-amber-100"
                  >
                    <Crown className="w-3 h-3 mr-1" />
                    Upgrade to Pro
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && !showAddDialog && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Staff List */}
          {staff.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No staff members yet</p>
              <Button 
                onClick={() => setShowAddDialog(true)}
                disabled={!canAddMoreStaff}
              >
                {canAddMoreStaff ? (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Staff Member
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Upgrade to Add Staff
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map((member) => (
                <Card key={member.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{member.display_name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {member.role}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Active
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStaff(member.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Plan Information */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Staff members: {staff.length} / {isFreePlan ? '1' : 'Unlimited'}
              </span>
              {isFreePlan && (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={onUpgrade}
                  className="text-primary p-0 h-auto"
                >
                  Upgrade for unlimited staff
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};