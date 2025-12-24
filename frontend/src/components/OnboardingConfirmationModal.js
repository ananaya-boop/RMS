import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, IndianRupee, User, MapPin, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function OnboardingConfirmationModal({ candidate, isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    designation: '',
    joining_date: '',
    ctc_annual: '',
    basic_salary: '',
    hra: '',
    special_allowance: '',
    bonus: '',
    reporting_manager: '',
    work_location: ''
  });

  const calculateTotal = () => {
    const basic = parseFloat(formData.basic_salary) || 0;
    const hra = parseFloat(formData.hra) || 0;
    const special = parseFloat(formData.special_allowance) || 0;
    const bonus = parseFloat(formData.bonus) || 0;
    return basic + hra + special + bonus;
  };

  const handleConfirmAndSend = async () => {
    // Validation
    if (!formData.designation || !formData.joining_date || !formData.reporting_manager || !formData.work_location) {
      toast.error('Please fill all required fields');
      return;
    }

    const totalCTC = calculateTotal();
    if (totalCTC <= 0) {
      toast.error('Please enter valid CTC components');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Prepare CTC breakup
      const ctcBreakup = {
        basic_salary: parseFloat(formData.basic_salary) || 0,
        hra: parseFloat(formData.hra) || 0,
        special_allowance: parseFloat(formData.special_allowance) || 0,
        bonus: parseFloat(formData.bonus) || 0
      };

      // Generate and send appointment letter
      await axios.post(
        `${API}/candidates/${candidate.id}/generate-appointment-letter`,
        {
          candidate_id: candidate.id,
          designation: formData.designation,
          joining_date: new Date(formData.joining_date).toISOString(),
          ctc_annual: totalCTC,
          ctc_breakup: ctcBreakup,
          reporting_manager: formData.reporting_manager,
          work_location: formData.work_location
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      toast.success('🎉 Appointment letter generated and sent successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate appointment letter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            Onboarding Confirmation
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-2">
            You are about to onboard <strong>{candidate?.name}</strong>. Please confirm the final details before the appointment letter is sent.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Candidate Info */}
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h4 className="font-semibold text-indigo-900 mb-2">Candidate Information</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-indigo-700">Name:</span>
                <span className="ml-2 font-medium text-indigo-900">{candidate?.name}</span>
              </div>
              <div>
                <span className="text-indigo-700">Email:</span>
                <span className="ml-2 font-medium text-indigo-900">{candidate?.email}</span>
              </div>
              <div>
                <span className="text-indigo-700">Phone:</span>
                <span className="ml-2 font-medium text-indigo-900">{candidate?.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-indigo-700">Skills:</span>
                <span className="ml-2 font-medium text-indigo-900">{candidate?.skills?.join(', ') || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Appointment Details Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="designation" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Designation *
              </Label>
              <Input
                id="designation"
                data-testid="designation-input"
                placeholder="Senior Software Engineer"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="joining_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Joining Date *
              </Label>
              <Input
                id="joining_date"
                data-testid="joining-date-input"
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="work_location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Work Location *
              </Label>
              <Input
                id="work_location"
                data-testid="work-location-input"
                placeholder="Bangalore, India"
                value={formData.work_location}
                onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="reporting_manager" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Reporting Manager *
              </Label>
              <Input
                id="reporting_manager"
                data-testid="reporting-manager-input"
                placeholder="John Doe, Engineering Manager"
                value={formData.reporting_manager}
                onChange={(e) => setFormData({ ...formData, reporting_manager: e.target.value })}
              />
            </div>
          </div>

          {/* CTC Breakup */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <Label className="flex items-center gap-2 text-base font-semibold mb-4">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
              Annual CTC Breakup (₹)
            </Label>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="basic_salary" className="text-sm">Basic Salary *</Label>
                <Input
                  id="basic_salary"
                  data-testid="basic-salary-input"
                  type="number"
                  placeholder="500000"
                  value={formData.basic_salary}
                  onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="hra" className="text-sm">HRA (House Rent Allowance) *</Label>
                <Input
                  id="hra"
                  data-testid="hra-input"
                  type="number"
                  placeholder="200000"
                  value={formData.hra}
                  onChange={(e) => setFormData({ ...formData, hra: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="special_allowance" className="text-sm">Special Allowance</Label>
                <Input
                  id="special_allowance"
                  data-testid="special-allowance-input"
                  type="number"
                  placeholder="150000"
                  value={formData.special_allowance}
                  onChange={(e) => setFormData({ ...formData, special_allowance: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="bonus" className="text-sm">Performance Bonus</Label>
                <Input
                  id="bonus"
                  data-testid="bonus-input"
                  type="number"
                  placeholder="50000"
                  value={formData.bonus}
                  onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-900">Total Annual CTC:</span>
                <span className="text-2xl font-bold text-emerald-600">
                  ₹ {calculateTotal().toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📧 What happens when you confirm?</h4>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li>Professional appointment letter PDF will be generated</li>
              <li>Letter will include all entered details and CTC breakup</li>
              <li>Email will be sent to candidate with PDF attachment</li>
              <li>Document will be stored in candidate's profile</li>
              <li>Activity will be logged in audit trail</li>
              <li>Candidate status will remain as "Onboarded"</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            data-testid="cancel-onboarding-btn"
            onClick={onClose}
            variant="outline"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            data-testid="confirm-send-btn"
            onClick={handleConfirmAndSend}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? 'Generating...' : '✉️ Confirm & Send Appointment Letter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
