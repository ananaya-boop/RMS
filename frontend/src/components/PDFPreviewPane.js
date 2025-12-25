import React from 'react';
import { FileText, Download } from 'lucide-react';

/**
 * PDFPreviewPane - Displays PDF preview
 */
const PDFPreviewPane = ({ previewData }) => {
  if (!previewData || !previewData.pdf_preview) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p>Fill in the form to generate PDF preview</p>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = previewData.pdf_preview;
    link.download = previewData.pdf_filename || 'document.pdf';
    link.click();
  };

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
        <div className="flex">
          <span className="text-sm font-medium text-gray-500 w-20">Attachment:</span>
          <span className="text-sm text-gray-900 flex items-center space-x-2">
            <FileText size={14} />
            <span>{previewData.pdf_filename}</span>
          </span>
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <Download size={16} />
        <span>Download PDF Preview</span>
      </button>

      {/* PDF Preview */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-600">PDF PREVIEW</span>
        </div>
        <div className="bg-gray-100">
          <iframe
            src={previewData.pdf_preview}
            className="w-full h-[600px] border-0"
            title="PDF Preview"
          />
        </div>
      </div>

      {/* Email Content Preview (if provided) */}
      {previewData.html_preview && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
            <span className="text-xs font-medium text-gray-600">EMAIL CONTENT</span>
          </div>
          <div 
            className="p-4 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: previewData.html_preview }}
          />
        </div>
      )}
    </div>
  );
};

export default PDFPreviewPane;