import React, { useState } from 'react';
import { X } from 'lucide-react';

/**
 * DualPaneModal - Reusable Edit & Preview Interface
 * 
 * Left Pane: Editable form fields
 * Right Pane: Live preview of email/PDF
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - title: string
 * - leftPane: React component (form)
 * - rightPane: React component (preview)
 * - onSubmit: async function
 * - submitButtonText: string
 */
const DualPaneModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  leftPane: LeftPaneComponent,
  rightPane: RightPaneComponent,
  onSubmit,
  submitButtonText = 'Send',
  isSubmitting = false,
  formData,
  onFormChange,
  previewData,
  size = 'default' // 'default' or 'xl'
}) => {
  if (!isOpen) return null;

  const modalSizeClass = size === 'xl' ? 'max-w-[95vw]' : 'max-w-7xl';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className={`relative bg-white rounded-lg shadow-2xl w-full ${modalSizeClass} h-[90vh] flex flex-col`}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content: Dual Pane */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Pane - Edit Form */}
            <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Edit Details
                  </h3>
                  <div className="h-1 w-20 bg-indigo-600 rounded"></div>
                </div>
                <LeftPaneComponent 
                  formData={formData}
                  onChange={onFormChange}
                />
              </div>
            </div>

            {/* Right Pane - Live Preview */}
            <div className="w-1/2 bg-gray-50 overflow-y-auto">
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Live Preview
                  </h3>
                  <div className="h-1 w-20 bg-green-600 rounded"></div>
                </div>
                <RightPaneComponent previewData={previewData} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Preview your changes</span> before sending
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>{submitButtonText}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DualPaneModal;
