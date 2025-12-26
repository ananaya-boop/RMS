import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DualPaneModal from './DualPaneModal';
import PDFPreviewPane from './PDFPreviewPane';
import { AlertCircle, Info, Plus, Trash2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * EmergentOfferModal - Emergent-specific offer generation with Indian payroll structure
 * Triggered when moving candidate from HR Round to Offer stage
 */
const EmergentOfferModal = ({ isOpen, onClose, candidate, job, onSuccess }) => {
  const [formData, setFormData] = useState({
    // Position Details
    designation: job?.title || '',
    department: job?.department || '',
    work_location: job?.location || '',
    joining_date: '',
    reporting_manager: '',
    probation_months: 6,
    notice_period_days: 30,
    
    // Emergent Salary Structure (Annual amounts in INR)
    salary_components: {
      basic_salary: 0,
      hra: 0,
      conveyance_allowance: 19200, // ₹1600/month * 12
      special_allowance: 0,
      lta: 30000,
      medical_allowance: 15000,
      performance_bonus: 0,
      joining_bonus: 0
    },
    
    // Calculated fields
    gross_annual_ctc: 0,
    employee_pf: 0,
    employee_esic: 0,
    professional_tax: 2400, // Karnataka default
    employer_pf: 0,
    employer_esic: 0,
    take_home_monthly: 0,
    
    // Statutory Data (Mandatory for Offer)
    statutory_data: {
      pan: candidate?.statutory_data?.pan || '',
      aadhaar_masked: candidate?.statutory_data?.aadhaar_masked || '',
      uan: candidate?.statutory_data?.uan || ''
    },
    
    // Bank Details (Mandatory for Offer)
    bank_details: {
      account_number: candidate?.bank_details?.account_number || '',
      ifsc_code: candidate?.bank_details?.ifsc_code || '',
      bank_name: candidate?.bank_details?.bank_name || '',
      account_holder_name: candidate?.name || ''
    },
    
    // Emergent Employee Master Fields
    personal_email: candidate?.email || '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    
    send_email: true
  });

  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showStatutoryForm, setShowStatutoryForm] = useState(false);

  // Calculate PF, ESIC, and other deductions automatically
  useEffect(() => {
    calculateSalaryBreakdown();
  }, [formData.salary_components]);

  const calculateSalaryBreakdown = () => {
    const { basic_salary } = formData.salary_components;
    const gross = Object.values(formData.salary_components).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    
    // PF Calculation (applicable if basic > ₹15,000/month = ₹1,80,000/year)
    let employeePF = 0;
    let employerPF = 0;
    if (basic_salary > 180000) {
      employeePF = Math.round(basic_salary * 0.12);
      employerPF = Math.round(basic_salary * 0.12); // 3.67% EPF + 8.33% EPS
    }
    
    // ESIC Calculation (applicable if gross ≤ ₹21,000/month = ₹2,52,000/year)
    let employeeESIC = 0;
    let employerESIC = 0;
    if (gross <= 252000) {
      employeeESIC = Math.round(gross * 0.0075);
      employerESIC = Math.round(gross * 0.0325);
    }
    
    // Professional Tax (Karnataka)
    const professionalTax = gross > 180000 ? 2400 : 0;
    
    // Take Home Calculation
    const monthlyGross = gross / 12;
    const monthlyDeductions = (employeePF + employeeESIC + professionalTax) / 12;
    const takeHomeMonthly = Math.round(monthlyGross - monthlyDeductions);
    
    setFormData(prev => ({
      ...prev,
      gross_annual_ctc: gross,
      employee_pf: employeePF,
      employee_esic: employeeESIC,
      professional_tax: professionalTax,
      employer_pf: employerPF,
      employer_esic: employerESIC,
      take_home_monthly: takeHomeMonthly
    }));
  };

  // Smart Basic/HRA Distribution based on CTC
  const distributeFromCTC = (targetCTC) => {
    // Typical Emergent distribution:
    // Basic: 40% of gross, HRA: 50% of basic, Rest: Special Allowance
    const basic = Math.round(targetCTC * 0.40);
    const hra = Math.round(basic * 0.50);
    const fixedComponents = 19200 + 30000 + 15000; // Conveyance + LTA + Medical
    const specialAllowance = targetCTC - basic - hra - fixedComponents;
    
    setFormData(prev => ({
      ...prev,
      salary_components: {
        ...prev.salary_components,
        basic_salary: basic,
        hra: hra,
        special_allowance: Math.max(0, specialAllowance)
      }
    }));
  };

  // Load preview when form is complete
  useEffect(() => {
    if (isFormValid()) {
      loadPreview();
    }
  }, [
    formData.designation,
    formData.joining_date,
    formData.gross_annual_ctc,
    formData.reporting_manager
  ]);

  const isFormValid = () => {
    const errors = {};
    
    // Position details validation
    if (!formData.designation) errors.designation = 'Required';
    if (!formData.department) errors.department = 'Required';
    if (!formData.work_location) errors.work_location = 'Required';
    if (!formData.joining_date) errors.joining_date = 'Required';
    if (!formData.reporting_manager) errors.reporting_manager = 'Required';
    
    // Salary validation
    if (formData.gross_annual_ctc <= 0) errors.salary = 'CTC must be greater than 0';
    
    // Statutory data validation (Mandatory for Emergent)
    if (!formData.statutory_data.pan) {
      errors.pan = 'PAN is mandatory';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.statutory_data.pan)) {
      errors.pan = 'Invalid PAN format (e.g., ABCDE1234F)';
    }
    
    if (!formData.statutory_data.aadhaar_masked) {
      errors.aadhaar = 'Aadhaar is mandatory';
    } else if (!/^XXXX-XXXX-\d{4}$/.test(formData.statutory_data.aadhaar_masked)) {
      errors.aadhaar = 'Invalid masked Aadhaar format (XXXX-XXXX-1234)';
    }
    
    // Bank details validation
    if (!formData.bank_details.account_number) {
      errors.account_number = 'Required';
    } else if (!/^\d{9,18}$/.test(formData.bank_details.account_number)) {
      errors.account_number = 'Invalid account number (9-18 digits)';
    }
    
    if (!formData.bank_details.ifsc_code) {
      errors.ifsc_code = 'Required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bank_details.ifsc_code)) {
      errors.ifsc_code = 'Invalid IFSC format (e.g., HDFC0001234)';
    }
    
    if (!formData.bank_details.bank_name) errors.bank_name = 'Required';
    
    // Emergency contact
    if (!formData.emergency_contact_name) errors.emergency_contact_name = 'Required';
    if (!formData.emergency_contact_number) {
      errors.emergency_contact_number = 'Required';
    } else if (!/^\+91-\d{10}$/.test(formData.emergency_contact_number)) {
      errors.emergency_contact_number = 'Format: +91-9876543210';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const loadPreview = async () => {
    if (!isFormValid()) return;
    
    setIsLoadingPreview(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BACKEND_URL}/api/offers/preview`,
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
    if (!isFormValid()) {
      alert('Please fill all mandatory fields correctly');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BACKEND_URL}/api/offers/send`,
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
      alert('Failed to process offer: ' + (error.response?.data?.detail || error.message));
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

  const LeftPane = () => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
      {/* Candidate Info */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
        <h4 className="text-sm font-semibold text-indigo-900 mb-2">Candidate Information</h4>
        <p className="text-base font-medium text-gray-900">{candidate?.name}</p>
        <p className="text-sm text-gray-600">{candidate?.email}</p>
        <p className="text-sm text-gray-600">{candidate?.phone}</p>
      </div>

      {/* Alert: Mandatory Fields */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-2">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">Emergent Compliance Required</p>
          <p className="text-xs mt-1">All fields marked with * are mandatory for Emergent Employee Master integration</p>
        </div>
      </div>

      {/* Quick CTC Calculator */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-3">Quick CTC Calculator</h4>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            placeholder="Enter target CTC (e.g., 2500000)"
            className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                distributeFromCTC(parseInt(e.target.value));
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = e.target.previousSibling;
              distributeFromCTC(parseInt(input.value));
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            Auto-Fill
          </button>
        </div>
        <p className="text-xs text-blue-700 mt-2">Press Enter or click Auto-Fill to distribute CTC across Emergent components</p>
      </div>

      {/* Position Details */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Position Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Designation *
            </label>
            <input
              type="text"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm ${
                validationErrors.designation ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Senior Software Engineer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Department *
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm ${
                validationErrors.department ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Engineering"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Work Location *
            </label>
            <input
              type="text"
              value={formData.work_location}
              onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm ${
                validationErrors.work_location ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Bangalore, India"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reporting Manager *
            </label>
            <input
              type="text"
              value={formData.reporting_manager}
              onChange={(e) => setFormData({ ...formData, reporting_manager: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm ${
                validationErrors.reporting_manager ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Joining Date *
            </label>
            <input
              type="date"
              value={formData.joining_date}
              onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm ${
                validationErrors.joining_date ? 'border-red-300' : 'border-gray-300'
              }`}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Probation (months)</label>
              <input
                type="number"
                value={formData.probation_months}
                onChange={(e) => setFormData({ ...formData, probation_months: parseInt(e.target.value) || 6 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                min="0"
                max="12"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notice Period (days)</label>
              <input
                type="number"
                value={formData.notice_period_days}
                onChange={(e) => setFormData({ ...formData, notice_period_days: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                min="0"
                max="90"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Emergent Salary Structure (Annexure A) */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Emergent Salary Breakup (Annexure A)</h4>
          <Info className="w-4 h-4 text-gray-400" />
        </div>

        <div className="space-y-3">
          {/* Basic Salary */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Basic Salary * (₹/year)
              <span className="text-gray-500 ml-1">(Typically 40% of CTC)</span>
            </label>
            <input
              type="number"
              value={formData.salary_components.basic_salary}
              onChange={(e) => updateSalaryComponent('basic_salary', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="600000"
              min="0"
              step="1000"
            />
          </div>

          {/* HRA */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              HRA (House Rent Allowance) * (₹/year)
              <span className="text-gray-500 ml-1">(Typically 50% of Basic)</span>
            </label>
            <input
              type="number"
              value={formData.salary_components.hra}
              onChange={(e) => updateSalaryComponent('hra', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="300000"
              min="0"
              step="1000"
            />
          </div>

          {/* Fixed Allowances */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Conveyance Allowance (₹/year)
              </label>
              <input
                type="number"
                value={formData.salary_components.conveyance_allowance}
                onChange={(e) => updateSalaryComponent('conveyance_allowance', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50"
                placeholder="19200"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">₹1,600/month × 12</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                LTA (Leave Travel Allowance)
              </label>
              <input
                type="number"
                value={formData.salary_components.lta}
                onChange={(e) => updateSalaryComponent('lta', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="30000"
                min="0"
                step="1000"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Medical Allowance (₹/year)
              </label>
              <input
                type="number"
                value={formData.salary_components.medical_allowance}
                onChange={(e) => updateSalaryComponent('medical_allowance', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="15000"
                min="0"
                step="1000"
              />
              <p className="text-xs text-gray-500 mt-1">₹1,250/month × 12</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Special Allowance (₹/year)
              </label>
              <input
                type="number"
                value={formData.salary_components.special_allowance}
                onChange={(e) => updateSalaryComponent('special_allowance', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="800000"
                min="0"
                step="1000"
              />
              <p className="text-xs text-gray-500 mt-1">Balancing component</p>
            </div>
          </div>

          {/* Variable Components */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Performance Bonus (₹/year)
              </label>
              <input
                type="number"
                value={formData.salary_components.performance_bonus}
                onChange={(e) => updateSalaryComponent('performance_bonus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="250000"
                min="0"
                step="10000"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Joining Bonus (₹ one-time)
              </label>
              <input
                type="number"
                value={formData.salary_components.joining_bonus}
                onChange={(e) => updateSalaryComponent('joining_bonus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="100000"
                min="0"
                step="10000"
              />
            </div>
          </div>
        </div>

        {/* CTC Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Gross Annual CTC</span>
              <span className="text-xl font-bold text-indigo-600">
                ₹ {formData.gross_annual_ctc.toLocaleString('en-IN')}
              </span>
            </div>
            
            <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-indigo-200">
              <div className="flex justify-between">
                <span>Employee PF (12% of Basic)</span>
                <span className="font-medium">- ₹ {formData.employee_pf.toLocaleString('en-IN')}</span>
              </div>
              {formData.employee_esic > 0 && (
                <div className="flex justify-between">
                  <span>Employee ESIC (0.75%)</span>
                  <span className="font-medium">- ₹ {formData.employee_esic.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Professional Tax</span>
                <span className="font-medium">- ₹ {formData.professional_tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-indigo-200">
                <span className="font-semibold">Approx. Monthly Take-Home</span>
                <span className="font-bold text-green-600">₹ {formData.take_home_monthly.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statutory Data (Collapsible) */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowStatutoryForm(!showStatutoryForm)}
          className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-900 hover:text-indigo-600"
        >
          <span>Statutory Data & Bank Details (Mandatory for Emergent) *</span>
          <span className="text-lg">{showStatutoryForm ? '−' : '+'}</span>
        </button>
        
        {showStatutoryForm && (
          <div className="mt-4 space-y-4">
            {/* Statutory IDs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  PAN Number * <span className="text-gray-500">(Format: ABCDE1234F)</span>
                </label>
                <input
                  type="text"
                  value={formData.statutory_data.pan}
                  onChange={(e) => setFormData({
                    ...formData,
                    statutory_data: { ...formData.statutory_data, pan: e.target.value.toUpperCase() }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm uppercase ${
                    validationErrors.pan ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="ABCDE1234F"
                  maxLength="10"
                />
                {validationErrors.pan && <p className="text-xs text-red-600 mt-1">{validationErrors.pan}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Aadhaar (Masked) * <span className="text-gray-500">(XXXX-XXXX-1234)</span>
                </label>
                <input
                  type="text"
                  value={formData.statutory_data.aadhaar_masked}
                  onChange={(e) => setFormData({
                    ...formData,
                    statutory_data: { ...formData.statutory_data, aadhaar_masked: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm ${
                    validationErrors.aadhaar ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="XXXX-XXXX-1234"
                  maxLength="14"
                />
                {validationErrors.aadhaar && <p className="text-xs text-red-600 mt-1">{validationErrors.aadhaar}</p>}
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  UAN (Universal Account Number) <span className="text-gray-500">(12 digits, optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.statutory_data.uan}
                  onChange={(e) => setFormData({
                    ...formData,
                    statutory_data: { ...formData.statutory_data, uan: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="123456789012"
                  maxLength="12"
                />
              </div>
            </div>

            {/* Bank Details */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Bank Account Number *
                </label>
                <input
                  type="text"
                  value={formData.bank_details.account_number}
                  onChange={(e) => setFormData({
                    ...formData,
                    bank_details: { ...formData.bank_details, account_number: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm ${
                    validationErrors.account_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="1234567890"
                />
                {validationErrors.account_number && <p className="text-xs text-red-600 mt-1">{validationErrors.account_number}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  IFSC Code * <span className="text-gray-500">(e.g., HDFC0001234)</span>
                </label>
                <input
                  type="text"
                  value={formData.bank_details.ifsc_code}
                  onChange={(e) => setFormData({
                    ...formData,
                    bank_details: { ...formData.bank_details, ifsc_code: e.target.value.toUpperCase() }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm uppercase ${
                    validationErrors.ifsc_code ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="HDFC0001234"
                  maxLength="11"
                />
                {validationErrors.ifsc_code && <p className="text-xs text-red-600 mt-1">{validationErrors.ifsc_code}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Bank Name *
                </label>
                <input
                  type="text"
                  value={formData.bank_details.bank_name}
                  onChange={(e) => setFormData({
                    ...formData,
                    bank_details: { ...formData.bank_details, bank_name: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm ${
                    validationErrors.bank_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="HDFC Bank"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Emergency Contact Name *
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm ${
                    validationErrors.emergency_contact_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Raj Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Emergency Contact Number * <span className="text-gray-500">(+91-9876543210)</span>
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact_number}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_number: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm ${
                    validationErrors.emergency_contact_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="+91-9876543210"
                />
                {validationErrors.emergency_contact_number && <p className="text-xs text-red-600 mt-1">{validationErrors.emergency_contact_number}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Send Email Option */}
      <div className="flex items-start pt-4 border-t border-gray-200">
        <input
          type="checkbox"
          id="send_email_offer"
          checked={formData.send_email}
          onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
          className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="send_email_offer" className="ml-3 text-sm text-gray-700">
          <span className="font-medium">Send offer letter via email</span>
          <p className="text-gray-500">Candidate will receive the offer letter PDF with Annexure A via email</p>
        </label>
      </div>
    </div>
  );

  const RightPane = () => (
    <div>
      {isLoadingPreview ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-4">Generating Emergent offer letter preview...</p>
          </div>
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
      title="Emergent Offer Letter - HR to Offer Transition"
      subtitle="Configure salary components and complete mandatory fields for Emergent Employee Master"
      leftPane={LeftPane}
      rightPane={RightPane}
      onSubmit={handleSubmit}
      submitButtonText="Generate & Send Offer Letter"
      isSubmitting={isSubmitting}
      size="xl"
    />
  );
};

export default EmergentOfferModal;
