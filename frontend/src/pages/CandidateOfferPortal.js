import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, FileText, Download, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * CandidateOfferPortal - Candidate view to accept/reject offer
 * 
 * URL: /offer-acceptance/:token
 */
const CandidateOfferPortal = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [offerData, setOfferData] = useState(null);
  const [candidateData, setCandidateData] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [decision, setDecision] = useState(null); // 'accept' or 'reject'

  useEffect(() => {
    fetchOfferDetails();
  }, [token]);

  const fetchOfferDetails = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/offer-acceptance/${token}`);
      setOfferData(response.data.offer);
      setCandidateData(response.data.candidate);
      setSignatureName(response.data.candidate.name);
      setLoading(false);
    } catch (error) {
      setError(error.response?.data?.detail || 'Invalid or expired offer link');
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!signatureName.trim()) {
      alert('Please enter your name to sign');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${BACKEND_URL}/api/offer-acceptance/${token}/accept`, {
        signature_name: signatureName,
        signed_at: new Date().toISOString()
      });
      setDecision('accept');
    } catch (error) {
      alert('Failed to accept offer: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectOffer = async () => {
    const reason = prompt('Please share your reason for declining (optional):');
    
    setIsSubmitting(true);
    try {
      await axios.post(`${BACKEND_URL}/api/offer-acceptance/${token}/reject`, {
        rejection_reason: reason || 'Not specified'
      });
      setDecision('reject');
    } catch (error) {
      alert('Failed to process rejection: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className=\"min-h-screen flex items-center justify-center bg-gray-50\">
        <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600\"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className=\"min-h-screen flex items-center justify-center bg-gray-50\">
        <div className=\"max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center\">
          <AlertCircle size={48} className=\"mx-auto text-red-500 mb-4\" />
          <h2 className=\"text-xl font-semibold text-gray-900 mb-2\">Invalid Link</h2>
          <p className=\"text-gray-600\">{error}</p>
        </div>
      </div>
    );
  }

  if (decision) {
    return (
      <div className=\"min-h-screen flex items-center justify-center bg-gray-50\">
        <div className=\"max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center\">
          {decision === 'accept' ? (
            <>
              <CheckCircle size={64} className=\"mx-auto text-green-500 mb-4\" />
              <h2 className=\"text-2xl font-bold text-gray-900 mb-2\">🎉 Congratulations!</h2>
              <p className=\"text-gray-600 mb-4\">
                You have successfully accepted the offer. Our HR team will be in touch with you shortly for next steps.
              </p>
              <p className=\"text-sm text-gray-500\">
                Please check your email for pre-joining formalities.
              </p>
            </>
          ) : (
            <>
              <AlertCircle size={64} className=\"mx-auto text-orange-500 mb-4\" />
              <h2 className=\"text-2xl font-bold text-gray-900 mb-2\">Offer Declined</h2>
              <p className=\"text-gray-600 mb-4\">
                Your decision has been recorded. We appreciate your time and consideration.
              </p>
              <p className=\"text-sm text-gray-500\">
                We wish you the best in your career journey!
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className=\"min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4\">
      <div className=\"max-w-4xl mx-auto\">
        {/* Header */}
        <div className=\"bg-white rounded-lg shadow-lg p-8 mb-6\">
          <div className=\"text-center mb-6\">
            <h1 className=\"text-3xl font-bold text-gray-900 mb-2\">
              🎉 Job Offer - {offerData?.designation}
            </h1>
            <p className=\"text-gray-600\">
              Dear {candidateData?.name}, please review your offer letter below
            </p>
          </div>

          {/* Offer Summary */}
          <div className=\"bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200\">
            <div className=\"grid grid-cols-2 gap-6\">
              <div>
                <p className=\"text-sm text-gray-600 mb-1\">Position</p>
                <p className=\"text-lg font-semibold text-gray-900\">{offerData?.designation}</p>
              </div>
              <div>
                <p className=\"text-sm text-gray-600 mb-1\">Department</p>
                <p className=\"text-lg font-semibold text-gray-900\">{offerData?.department}</p>
              </div>
              <div>
                <p className=\"text-sm text-gray-600 mb-1\">Location</p>
                <p className=\"text-lg font-semibold text-gray-900\">{offerData?.work_location}</p>
              </div>
              <div>
                <p className=\"text-sm text-gray-600 mb-1\">Joining Date</p>
                <p className=\"text-lg font-semibold text-gray-900\">
                  {new Date(offerData?.joining_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className=\"mt-6 pt-6 border-t border-green-200\">
              <p className=\"text-sm text-gray-600 mb-2 text-center\">Annual Cost to Company (CTC)</p>
              <p className=\"text-4xl font-bold text-green-600 text-center\">
                ₹ {offerData?.ctc?.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* Offer Letter PDF */}
        <div className=\"bg-white rounded-lg shadow-lg p-8 mb-6\">
          <div className=\"flex items-center justify-between mb-4\">
            <h2 className=\"text-xl font-semibold text-gray-900 flex items-center space-x-2\">
              <FileText size={24} />
              <span>Offer Letter</span>
            </h2>
            <a
              href={offerData?.pdf_url}
              download
              className=\"flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors\"
            >
              <Download size={18} />
              <span>Download PDF</span>
            </a>
          </div>

          <iframe
            src={offerData?.pdf_url}
            className=\"w-full h-[600px] border border-gray-200 rounded-lg\"
            title=\"Offer Letter\"
          />
        </div>

        {/* Acceptance Section */}
        <div className=\"bg-white rounded-lg shadow-lg p-8\">
          <h2 className=\"text-xl font-semibold text-gray-900 mb-6\">
            Digital Signature
          </h2>

          <div className=\"mb-6\">
            <label className=\"block text-sm font-medium text-gray-700 mb-2\">
              Full Name (as signature) *
            </label>
            <input
              type=\"text\"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              className=\"w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent\"
              placeholder=\"Enter your full name\"
            />
            <p className=\"text-xs text-gray-500 mt-1\">
              By entering your name, you agree to the terms and conditions stated in the offer letter
            </p>
          </div>

          <div className=\"bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6\">
            <p className=\"text-sm text-yellow-800\">
              <strong>⚠️ Important:</strong> Once you accept this offer, you will be required to submit 
              statutory documents (PAN, Aadhaar, UAN, Bank details) within 7 days for payroll setup.
            </p>
          </div>

          <div className=\"flex space-x-4\">
            <button
              onClick={handleAcceptOffer}
              disabled={isSubmitting || !signatureName.trim()}
              className=\"flex-1 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-lg flex items-center justify-center space-x-2\"
            >
              {isSubmitting ? (
                <>
                  <svg className=\"animate-spin h-5 w-5\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\">
                    <circle className=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" strokeWidth=\"4\"></circle>
                    <path className=\"opacity-75\" fill=\"currentColor\" d=\"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z\"></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  <span>Accept Offer</span>
                </>
              )}
            </button>

            <button
              onClick={handleRejectOffer}
              disabled={isSubmitting}
              className=\"flex-1 px-6 py-4 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-lg\"
            >
              Decline Offer
            </button>
          </div>

          <p className=\"text-xs text-gray-500 text-center mt-4\">
            This is a legally binding agreement. Please read the offer letter carefully before accepting.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CandidateOfferPortal;
