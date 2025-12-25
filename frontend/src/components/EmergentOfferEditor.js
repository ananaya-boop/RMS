import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DualPaneModal from './DualPaneModal';
import PDFPreviewPane from './PDFPreviewPane';
import { Plus, Minus, Calculator, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * EmergentOfferEditor - Offer letter with Emergent salary components
 */
const EmergentOfferEditor = ({ isOpen, onClose, candidate, job, onSuccess }) => {
  const [formData, setFormData] = useState({
    designation: job?.title || '',
    department: job?.department || '',
    work_location: job?.location || '',
    joining_date: '',
    salary_components: {
      basic: 0,
      hra: 0,
      conveyance: 0,
      special_allowance: 0,
      lta: 0,
      employer_pf: 0
    },
    reporting_manager: '',
    probation_months: 6,
    notice_period_days: 30,
    send_email: true
  });

  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculations, setCalculations] = useState({
    gross_salary: 0,
    ctc: 0
  });

  // Calculate totals whenever salary components change
  useEffect(() => {
    const gross = 
      parseFloat(formData.salary_components.basic || 0) +
      parseFloat(formData.salary_components.hra || 0) +
      parseFloat(formData.salary_components.conveyance || 0) +
      parseFloat(formData.salary_components.special_allowance || 0) +
      parseFloat(formData.salary_components.lta || 0);
    
    const ctc = gross + parseFloat(formData.salary_components.employer_pf || 0);
    
    setCalculations({ gross_salary: gross, ctc });
  }, [formData.salary_components]);

  // Load preview
  useEffect(() => {
    if (isFormValid()) {
      loadPreview();
    }
  }, [
    formData.designation,
    formData.joining_date,
    formData.salary_components,
    formData.reporting_manager
  ]);

  const isFormValid = () => {
    return (
      formData.designation &&
      formData.joining_date &&
      calculations.ctc > 0 &&
      formData.reporting_manager &&
      formData.department &&
      formData.work_location
    );
  };

  const loadPreview = async () => {
    if (!isFormValid()) return;
    
    setIsLoadingPreview(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BACKEND_URL}/api/emergent/offer-preview`,
        {
          candidate_id: candidate.id,
          ...formData
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPreviewData(response.data);
    } catch (error) {
      console.error('Failed to load preview:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BACKEND_URL}/api/emergent/send-offer`,
        {
          candidate_id: candidate.id,
          ...formData
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(`Offer letter ${response.data.email_sent ? 'sent' : 'generated'} successfully!`);
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Failed to send offer:', error);
      alert('Failed to send offer: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateSalaryComponent = (key, value) => {
    setFormData({
      ...formData,
      salary_components: {
        ...formData.salary_components,
        [key]: parseFloat(value) || 0
      }
    });
  };

  const autoCalculateSalary = (ctcAmount) => {
    const ctc = parseFloat(ctcAmount);
    if (!ctc) return;

    // Standard breakup percentages
    const basic = Math.round(ctc * 0.40);
    const hra = Math.round(ctc * 0.20);
    const conveyance = 19200; // Fixed per IT rules
    const lta = Math.round(ctc * 0.05);
    const employer_pf = Math.round(basic * 0.12); // 12% of basic
    const special_allowance = ctc - (basic + hra + conveyance + lta + employer_pf);

    setFormData({
      ...formData,
      salary_components: {
        basic,
        hra,
        conveyance,
        special_allowance,
        lta,
        employer_pf
      }
    });
  };

  const LeftPane = () => (
    <div className="space-y-6">
      {/* Candidate Info */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Candidate</h4>
        <p className="text-base font-medium text-gray-900">{candidate?.name}</p>
        <p className="text-sm text-gray-600">{candidate?.email}</p>
      </div>

      {/* Quick CTC Calculator */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Calculator size={20} className="text-blue-600" />
          <h4 className="text-sm font-semibold text-blue-900">Quick CTC Calculator</h4>
        </div>
        <div className="flex space-x-2">
          <input
            type="number"
            placeholder="Enter total CTC"
            className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            onBlur={(e) => autoCalculateSalary(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              const input = document.querySelector('input[placeholder="Enter total CTC"]');
              if (input?.value) autoCalculateSalary(input.value);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Auto-fill
          </button>
        </div>
        <p className="text-xs text-blue-700 mt-2">Automatically calculates breakup based on standard percentages</p>
      </div>

      {/* Position Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Designation *</label>
          <input
            type="text"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
          <input
            type="text"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Work Location *</label>
          <input
            type="text"
            value={formData.work_location}
            onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Reporting Manager *</label>
          <input
            type="text"
            value={formData.reporting_manager}
            onChange={(e) => setFormData({ ...formData, reporting_manager: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date *</label>
        <input
          type="date"
          value={formData.joining_date}
          onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      {/* Emergent Salary Components */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Salary Structure (Emergent Components)</h4>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">BASIC SALARY</label>
            <input
              type="number"
              value={formData.salary_components.basic}
              onChange={(e) => updateSalaryComponent('basic', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              min="0"
              step="1000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">HOUSE RENT ALLOWANCE (HRA)</label>
            <input
              type="number"
              value={formData.salary_components.hra}
              onChange={(e) => updateSalaryComponent('hra', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              min="0"
              step="1000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CONVEYANCE ALLOWANCE</label>
            <input
              type="number"
              value={formData.salary_components.conveyance}
              onChange={(e) => updateSalaryComponent('conveyance', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              min="0"
              step="100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">SPECIAL ALLOWANCE</label>
            <input
              type="number"
              value={formData.salary_components.special_allowance}
              onChange={(e) => updateSalaryComponent('special_allowance', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              min="0"
              step="1000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">LEAVE TRAVEL ALLOWANCE (LTA)</label>
            <input
              type="number"
              value={formData.salary_components.lta}
              onChange={(e) => updateSalaryComponent('lta', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              min="0"
              step="1000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">EMPLOYER PF CONTRIBUTION</label>
            <input
              type="number"
              value={formData.salary_components.employer_pf}
              onChange={(e) => updateSalaryComponent('employer_pf', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              min="0"
              step="100"
            />
          </div>
        </div>

        {/* Totals */}
        <div className="mt-6 pt-4 border-t-2 border-gray-300 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Gross Salary (Monthly)</span>
            <span className="text-base font-semibold text-green-600">
              ₹ {(calculations.gross_salary / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Gross Salary (Annual)</span>
            <span className="text-base font-semibold text-green-600">
              ₹ {calculations.gross_salary.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-base font-bold text-gray-900">Total CTC (Annual)</span>
            <span className="text-xl font-bold text-indigo-600">
              ₹ {calculations.ctc.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Probation (months)</label>
          <input
            type="number"
            value={formData.probation_months}
            onChange={(e) => setFormData({ ...formData, probation_months: parseInt(e.target.value) || 6 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            min="0"
            max="12"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notice Period (days)</label>
          <input
            type="number"
            value={formData.notice_period_days}
            onChange={(e) => setFormData({ ...formData, notice_period_days: parseInt(e.target.value) || 30 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            min="0"
            max="90"
          />
        </div>
      </div>

      {/* Send Email */}
      <div className="flex items-start">
        <input
          type="checkbox"
          id="send_email_offer"
          checked={formData.send_email}
          onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
          className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
        />
        <label htmlFor="send_email_offer" className="ml-3 text-sm text-gray-700">
          <span className="font-medium">Send email with offer letter</span>
          <p className="text-gray-500">Candidate will receive the offer letter via email</p>
        </label>
      </div>
    </div>
  );

  const RightPane = () => (
    <div>
      {isLoadingPreview ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : (
        <PDFPreviewPane previewData={previewData} />
      )}
    </div>
  );

  return (
    <DualPaneModal
      isOpen={isOpen}
      onClose={onClose}
      title="Offer Letter - Emergent Salary Components"
      leftPane={LeftPane}
      rightPane={RightPane}
      onSubmit={handleSubmit}
      submitButtonText="Send Offer Letter"
      isSubmitting={isSubmitting}
      formData={formData}
      onFormChange={setFormData}
      previewData={previewData}
    />
  );
};

export default EmergentOfferEditor;