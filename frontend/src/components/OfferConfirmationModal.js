import React, { useState } from 'react';
import axios from 'axios';
import { CheckCircle, AlertCircle, FileText, Award } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * OfferConfirmationModal - Confirmation before generating offer letter
 * Shows readiness checks and triggers EmergentOfferEditor
 */
const OfferConfirmationModal = ({ candidate, isOpen, onClose, onProceedToOffer }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [readinessChecks, setReadinessChecks] = useState(null);

  React.useEffect(() => {
    if (isOpen && candidate) {
      checkReadiness();
    }
  }, [isOpen, candidate]);

  const checkReadiness = async () => {
    setIsChecking(true);
    try {
      const token = localStorage.getItem('token');
      
      // Check if all interviews are complete
      const scorecardResponse = await axios.get(
        `${BACKEND_URL}/api/scorecards/history/${candidate.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const scorecards = scorecardResponse.data;
      
      // Check if statutory data exists
      const hasStatutoryData = candidate.statutory_compliance && 
                               candidate.statutory_compliance.pan &&
                               candidate.statutory_compliance.aadhaar_masked;
      
      setReadinessChecks({
        hasScreening: scorecards.some(s => s.stage === 'screening'),
        hasRound1: scorecards.some(s => s.stage === 'round_1_technical'),
        hasRound2: scorecards.some(s => s.stage === 'round_2_recommended'),
        hasRound3: scorecards.some(s => s.stage === 'round_3_final'),
        hasHRRound: scorecards.some(s => s.stage === 'hr_round'),
        hasStatutoryData: hasStatutoryData,
        totalScores: scorecards.length
      });
    } catch (error) {
      console.error('Failed to check readiness:', error);
      setReadinessChecks({
        hasScreening: false,
        hasRound1: false,
        hasRound2: false,
        hasRound3: false,
        hasHRRound: false,
        hasStatutoryData: false,
        totalScores: 0
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleProceed = () => {
    onProceedToOffer?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Award className="text-green-600" size={24} />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Ready to Send Offer?</h3>
              <p className="text-sm text-gray-600">Review readiness before generating offer letter</p>
            </div>
          </div>

          {/* Candidate Info */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Candidate</p>
                <p className="text-lg font-semibold text-gray-900">{candidate?.name}</p>
                <p className="text-sm text-gray-600">{candidate?.email}</p>
              </div>
              {candidate?.experience_years && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Experience</p>
                  <p className="text-2xl font-bold text-green-600">{candidate.experience_years}</p>
                  <p className="text-xs text-gray-500">years</p>
                </div>
              )}
            </div>
          </div>

          {/* Readiness Checks */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <FileText size={16} />
              <span>Interview & Compliance Status</span>
            </h4>

            {isChecking ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-3 text-sm text-gray-600">Checking readiness...</span>
              </div>
            ) : readinessChecks ? (
              <div className="space-y-2">
                <CheckItem 
                  label="Screening Interview" 
                  completed={readinessChecks.hasScreening}
                />
                <CheckItem 
                  label="Round 1 (Technical)" 
                  completed={readinessChecks.hasRound1}
                />
                <CheckItem 
                  label="Round 2 (Intermediate)" 
                  completed={readinessChecks.hasRound2}
                  optional={true}
                />
                <CheckItem 
                  label="Round 3 (Final)" 
                  completed={readinessChecks.hasRound3}
                />
                <CheckItem 
                  label="HR Round" 
                  completed={readinessChecks.hasHRRound}
                />
                
                <div className="pt-3 mt-3 border-t border-gray-200">
                  <CheckItem 
                    label="Statutory Data (PAN, Aadhaar)" 
                    completed={readinessChecks.hasStatutoryData}
                    optional={true}
                  />
                </div>

                <div className="pt-3 mt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-900">
                      Total Interview Rounds Completed
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {readinessChecks.totalScores}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Warning */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Next Step:</strong> You'll be able to draft the offer letter with Emergent salary components, 
                  preview it, and send it to the candidate for digital signature.
                </p>
              </div>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-gray-900 mb-2">What happens next:</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✓ Offer Letter Editor will open</li>
              <li>✓ Configure CTC breakup (Basic, HRA, Conveyance, etc.)</li>
              <li>✓ Set joining date and reporting manager</li>
              <li>✓ Preview PDF before sending</li>
              <li>✓ Email sent with secure acceptance link</li>
              <li>✓ Candidate can digitally sign the offer</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleProceed}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <CheckCircle size={18} />
              <span>Proceed to Offer Editor</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckItem = ({ label, completed, optional = false }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
      <span className="text-sm text-gray-700">
        {label}
        {optional && <span className="ml-2 text-xs text-gray-500">(Optional)</span>}
      </span>
      {completed ? (
        <CheckCircle className="text-green-600" size={18} />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
      )}
    </div>
  );
};

export default OfferConfirmationModal;
