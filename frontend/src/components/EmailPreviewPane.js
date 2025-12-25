import React from 'react';
import { Mail } from 'lucide-react';

/**
 * EmailPreviewPane - Displays HTML email preview
 */
const EmailPreviewPane = ({ previewData }) => {
  if (!previewData) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <Mail size={48} className="mx-auto mb-3 opacity-50" />
          <p>Fill in the form to see preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Email Headers */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
        <div className="flex">
          <span className="text-sm font-medium text-gray-500 w-20">To:</span>
          <span className="text-sm text-gray-900">{previewData.candidate_email}</span>
        </div>
        <div className="flex">
          <span className="text-sm font-medium text-gray-500 w-20">Subject:</span>
          <span className="text-sm text-gray-900 font-medium">{previewData.subject}</span>
        </div>
      </div>

      {/* Email Content Preview */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-600">EMAIL CONTENT</span>
        </div>
        <div 
          className="p-4 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: previewData.html_preview }}
        />
      </div>

      {/* Additional Info */}
      {previewData.will_purge_data && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Data Purge Warning</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Candidate's personal data will be permanently deleted after sending this email (DPDP Act 2023 compliance).</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailPreviewPane;