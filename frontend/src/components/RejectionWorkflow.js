import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DualPaneModal from './DualPaneModal';
import EmailPreviewPane from './EmailPreviewPane';
import { AlertTriangle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * RejectionWorkflow - Handle candidate rejection with DPDP data purge
 */
const RejectionWorkflow = ({ isOpen, onClose, candidate, onSuccess }) => {
  const [formData, setFormData] = useState({
    reason: '',
    custom_message: '',
    purge_data: true,
    send_email: true
  });

  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rejection reason options
  const rejectionReasons = [
    'Not enough relevant experience',
    'Skills mismatch with requirements',
    'Cultural fit concerns',
    'Budget constraints',
    'Selected another candidate',
    'Position requirements changed',
    'Other'
  ];

  // Load preview when form data changes
  useEffect(() => {
    if (formData.reason && candidate) {
      loadPreview();
    }
  }, [formData.reason, formData.custom_message, candidate]);

  const loadPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BACKEND_URL}/api/lifecycle/rejection-preview`,
        {
          candidate_id: candidate.id,
          reason: formData.reason,
          custom_message: formData.custom_message || null
        },
        {
          params: { candidate_id: candidate.id },
          headers: { Authorization: `Bearer ${token}` }
        }
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
        `${BACKEND_URL}/api/lifecycle/send-rejection`,
        {
          candidate_id: candidate.id,
          reason: formData.reason,
          custom_message: formData.custom_message || null,
          purge_data: formData.purge_data,
          send_email: formData.send_email
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(`Rejection email ${response.data.email_sent ? 'sent' : 'prepared'} successfully!\\n${response.data.data_purged ? 'Candidate data has been purged as per DPDP Act 2023.' : ''}`);\n        onSuccess?.();\n        onClose();\n      }\n    } catch (error) {\n      console.error('Failed to send rejection:', error);\n      alert('Failed to process rejection: ' + (error.response?.data?.detail || error.message));\n    } finally {\n      setIsSubmitting(false);\n    }\n  };\n\n  const LeftPane = () => (\n    <div className=\"space-y-6\">\n      {/* Candidate Info */}\n      <div className=\"bg-gray-50 rounded-lg p-4 border border-gray-200\">\n        <h4 className=\"text-sm font-semibold text-gray-700 mb-2\">Candidate</h4>\n        <p className=\"text-base font-medium text-gray-900\">{candidate?.name}</p>\n        <p className=\"text-sm text-gray-600\">{candidate?.email}</p>\n      </div>\n\n      {/* Rejection Reason */}\n      <div>\n        <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n          Rejection Reason *\n        </label>\n        <select\n          value={formData.reason}\n          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}\n          className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent\"\n          required\n        >\n          <option value=\"\">Select a reason...</option>\n          {rejectionReasons.map(reason => (\n            <option key={reason} value={reason}>{reason}</option>\n          ))}\n        </select>\n      </div>\n\n      {/* Custom Message */}\n      <div>\n        <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n          Additional Message (Optional)\n        </label>\n        <textarea\n          value={formData.custom_message}\n          onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}\n          rows={4}\n          className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent\"\n          placeholder=\"Add any personalized message for the candidate...\"\n        />\n      </div>\n\n      {/* Options */}\n      <div className=\"space-y-3\">\n        <div className=\"flex items-start\">\n          <input\n            type=\"checkbox\"\n            id=\"send_email\"\n            checked={formData.send_email}\n            onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}\n            className=\"mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded\"\n          />\n          <label htmlFor=\"send_email\" className=\"ml-3 text-sm text-gray-700\">\n            <span className=\"font-medium\">Send email notification</span>\n            <p className=\"text-gray-500\">Email will be sent to the candidate</p>\n          </label>\n        </div>\n\n        <div className=\"flex items-start\">\n          <input\n            type=\"checkbox\"\n            id=\"purge_data\"\n            checked={formData.purge_data}\n            onChange={(e) => setFormData({ ...formData, purge_data: e.target.checked })}\n            className=\"mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded\"\n          />\n          <label htmlFor=\"purge_data\" className=\"ml-3 text-sm text-gray-700\">\n            <span className=\"font-medium text-red-600\">Purge candidate data (DPDP Act 2023)</span>\n            <p className=\"text-gray-500\">Permanently delete all PII from the system</p>\n          </label>\n        </div>\n      </div>\n\n      {/* DPDP Compliance Notice */}\n      {formData.purge_data && (\n        <div className=\"bg-red-50 border-l-4 border-red-400 p-4\">\n          <div className=\"flex\">\n            <div className=\"flex-shrink-0\">\n              <AlertTriangle className=\"h-5 w-5 text-red-400\" />\n            </div>\n            <div className=\"ml-3\">\n              <h3 className=\"text-sm font-medium text-red-800\">Data Purge Action</h3>\n              <div className=\"mt-2 text-sm text-red-700\">\n                <p>This action will permanently delete:</p>\n                <ul className=\"list-disc list-inside mt-1\">\n                  <li>Name, email, phone number</li>\n                  <li>Resume and all documents</li>\n                  <li>Interview feedback and scorecards</li>\n                  <li>All personally identifiable information</li>\n                </ul>\n                <p className=\"mt-2 font-medium\">This action cannot be undone.</p>\n              </div>\n            </div>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n\n  const RightPane = () => (\n    <div>\n      {isLoadingPreview ? (\n        <div className=\"flex items-center justify-center h-64\">\n          <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600\"></div>\n        </div>\n      ) : (\n        <EmailPreviewPane previewData={previewData} />\n      )}\n    </div>\n  );\n\n  return (\n    <DualPaneModal\n      isOpen={isOpen}\n      onClose={onClose}\n      title=\"Rejection Workflow - DPDP Compliant\"\n      leftPane={LeftPane}\n      rightPane={RightPane}\n      onSubmit={handleSubmit}\n      submitButtonText=\"Confirm & Send Rejection\"\n      isSubmitting={isSubmitting}\n      formData={formData}\n      onFormChange={setFormData}\n      previewData={previewData}\n    />\n  );\n};\n\nexport default RejectionWorkflow;\n