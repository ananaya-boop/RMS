import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { X, UserMinus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WITHDRAWAL_REASONS = [
  'Better Offer',
  'Process Speed',
  'Role Mismatch',
  'Personal Reasons',
  'Company Culture Concerns',
  'Compensation Expectations',
  'Other'
];

export default function WithdrawalSidebar({ candidate, onClose, onWithdrawn }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reason: 'Better Offer',
    purge_immediately: false
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/candidates/${candidate.id}/withdraw`,
        formData,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      toast.success('Candidate withdrawal processed successfully');
      onWithdrawn();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      data-testid="withdrawal-sidebar"
      className="fixed right-0 top-0 h-full w-96 bg-white border-l-4 border-l-amber-600 shadow-2xl z-50 flex flex-col"
    >
      <div className="p-4 border-b bg-amber-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-600 rounded-lg">
            <UserMinus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-amber-900">Withdraw Candidate</h3>
            <p className="text-xs text-amber-700">{candidate.name}</p>
          </div>
        </div>
        <button 
          data-testid="close-withdrawal-sidebar"
          onClick={onClose}
          className="p-1 hover:bg-amber-100 rounded transition-colors"
        >
          <X className="w-5 h-5 text-amber-700" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Warning Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">Important Notice</h4>
              <p className="text-sm text-amber-800">
                Withdrawing a candidate will:
              </p>
              <ul className="text-sm text-amber-800 mt-2 space-y-1 ml-4 list-disc">
                <li>Stop all active interview alerts</li>
                <li>Cancel scheduled interviews</li>
                <li>Update candidate status to "Withdrawn"</li>
                <li>Send acknowledgment email to candidate</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Reason Dropdown */}
        <div>
          <Label htmlFor="reason" className="text-base font-semibold mb-2 block">
            Reason for Withdrawal *
          </Label>
          <select
            id="reason"
            data-testid="withdrawal-reason-select"
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          >
            {WITHDRAWAL_REASONS.map(reason => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            This helps us improve our recruitment process
          </p>
        </div>

        {/* Data Purge Checkbox */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <Label className="text-sm font-semibold text-slate-900">Data Handling (DPDP Act)</Label>
          
          <div className="flex items-start space-x-3">
            <Checkbox
              id="purge_immediately"
              data-testid="purge-immediately-checkbox"
              checked={formData.purge_immediately}
              onCheckedChange={(checked) => setFormData({ ...formData, purge_immediately: checked })}
            />
            <div>
              <label
                htmlFor="purge_immediately"
                className="text-sm font-medium text-slate-900 cursor-pointer leading-none"
              >
                Purge data immediately per candidate request?
              </label>
              <p className="text-xs text-slate-600 mt-1">
                {formData.purge_immediately 
                  ? "All candidate data will be permanently deleted within 48 hours."
                  : "Data will be retained for 6 months in talent pool for future opportunities."}
              </p>
            </div>
          </div>
        </div>

        {/* Automated Acknowledgment Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Automated Acknowledgment</h4>
          <p className="text-xs text-blue-800 mb-2">
            The candidate will receive an email containing:
          </p>
          <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
            <li>Confirmation of withdrawal</li>
            <li>Data handling policy details</li>
            <li>Link to 1-minute exit survey</li>
            <li>DPDP Act compliance notice</li>
          </ul>
        </div>

        {/* Preview */}
        <div className="bg-slate-100 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Summary</h4>
          <div className="text-sm space-y-1">
            <p><strong>Candidate:</strong> {candidate.name}</p>
            <p><strong>Email:</strong> {candidate.email}</p>
            <p><strong>Reason:</strong> {formData.reason}</p>
            <p><strong>Data Action:</strong> {formData.purge_immediately ? 'Delete Immediately' : 'Retain for 6 months'}</p>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-slate-50 space-y-2">
        <Button
          data-testid="confirm-withdrawal-btn"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          <UserMinus className="w-4 h-4 mr-2" />
          {loading ? 'Processing...' : 'Confirm Withdrawal'}
        </Button>
        <Button
          data-testid="cancel-withdrawal-btn"
          onClick={onClose}
          disabled={loading}
          variant="ghost"
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
