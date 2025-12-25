import React, { useState } from 'react';
import axios from 'axios';
import { AlertTriangle, RotateCcw, FileText } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * OfferRollbackModal - Confirmation modal for rolling back from Offer to HR Round
 */
const OfferRollbackModal = ({ isOpen, onClose, candidate, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rollbackReasons = [
    'Candidate requested changes to offer',
    'Salary negotiation required',
    'Benefits adjustment needed',
    'Title or role clarification',
    'Start date modification',
    'Internal approval pending',
    'Other'
  ];

  const handleRollback = async () => {
    if (!reason) {
      alert('Please select a reason for rollback');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      
      // Call rollback API
      const response = await axios.post(
        `${BACKEND_URL}/api/lifecycle/rollback-offer`,
        {
          candidate_id: candidate.id,
          reason: reason
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Candidate rolled back to HR Round. The offer letter remains accessible for reference.');
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Failed to rollback:', error);
      alert('Failed to rollback: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <RotateCcw className="text-orange-600" size={24} />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Rollback to HR Round</h3>
              <p className="text-sm text-gray-600">Move candidate back for re-negotiation</p>
            </div>
          </div>

          {/* Candidate Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <p className="text-sm font-medium text-gray-700">Candidate</p>
            <p className="text-base font-semibold text-gray-900">{candidate?.name}</p>
            <p className="text-sm text-gray-600">{candidate?.email}</p>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Important:</strong> Rolling back will return the candidate to the HR Round stage. 
                  The existing offer letter will remain accessible but inactive. Use this when offer terms need renegotiation.
                </p>
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Rollback *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              <option value="">Select a reason...</option>
              {rollbackReasons.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* What Happens */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-blue-900 mb-2">What happens next:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Candidate moved back to HR Round</li>
              <li>✓ Offer letter marked as inactive</li>
              <li>✓ Can create new offer after negotiation</li>
              <li>✓ Lifecycle event logged for audit trail</li>
              <li>✓ No emails sent (manual follow-up required)</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRollback}
              disabled={isSubmitting || !reason}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Rollback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingRollbackModal;
