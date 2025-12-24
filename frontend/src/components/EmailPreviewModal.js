import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Eye, Send, X } from 'lucide-react';

export default function EmailPreviewModal({ 
  isOpen, 
  onClose, 
  onConfirmSend,
  emailType, // 'rejection', 'onboarding', 'interview', 'withdrawal'
  defaultData,
  candidate,
  loading = false
}) {
  const [emailData, setEmailData] = useState({
    subject: '',
    body: '',
    customFields: {}
  });

  useEffect(() => {
    if (defaultData) {
      setEmailData(defaultData);
    }
  }, [defaultData]);

  // Generate preview HTML based on email type
  const generatePreview = () => {
    switch (emailType) {
      case 'rejection':
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #1e1b4b; color: white; padding: 20px; text-center: center; }
                .content { padding: 30px; background-color: #f8fafc; }
                .dpdp-notice { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>${emailData.subject || 'Application Status Update'}</h2>
                </div>
                <div class="content">
                  <p>Dear ${candidate?.name || '[Candidate Name]'},</p>
                  <div style="white-space: pre-wrap;">${emailData.body || '[Email body will appear here...]'}</div>
                  <div class="dpdp-notice">
                    <h4 style="margin-top: 0; color: #92400e;">📋 DPDP Act 2023 Privacy Notice</h4>
                    <p style="font-size: 14px; color: #78350f;">
                      As per your request and in compliance with the Digital Personal Data Protection Act 2023, 
                      all your personal information has been permanently deleted from our recruitment system. 
                      This includes your resume, contact details, interview feedback, and all associated records.
                    </p>
                    <p style="font-size: 12px; color: #78350f; margin-bottom: 0;">
                      <strong>Right to Erasure Fulfilled:</strong> Your data has been purged as per Section 12 of DPDP Act 2023.
                    </p>
                  </div>
                  <p>Thank you for your time and consideration.</p>
                  <p>Best regards,<br/>The Recruitment Team</p>
                </div>
                <div class="footer">
                  <p>This is an automated message. Your privacy rights have been honored.</p>
                </div>
              </div>
            </body>
          </html>
        `;

      case 'onboarding':
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background-color: #f8fafc; }
                .highlight { background-color: #eef2ff; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #f1f5f9; border-radius: 0 0 10px 10px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">🎉 ${emailData.subject || 'Congratulations!'}</h1>
                </div>
                <div class="content">
                  <p>Dear <strong>${candidate?.name || '[Candidate Name]'},</strong></p>
                  <div style="white-space: pre-wrap;">${emailData.body || '[Email body will appear here...]'}</div>
                  <div class="highlight">
                    <h3 style="margin-top: 0;">Your Appointment Details</h3>
                    <p><strong>Position:</strong> ${emailData.customFields?.designation || '[Designation]'}</p>
                    <p><strong>Joining Date:</strong> ${emailData.customFields?.joining_date || '[Date]'}</p>
                    <p><strong>Location:</strong> ${emailData.customFields?.work_location || '[Location]'}</p>
                    <p><strong>Reporting to:</strong> ${emailData.customFields?.reporting_manager || '[Manager]'}</p>
                  </div>
                  <p><strong>📎 Attachment:</strong> Appointment_Letter.pdf</p>
                  <p>Best regards,<br/>Human Resources Team</p>
                </div>
                <div class="footer">
                  <p>This is an automated message. Please do not reply directly to this email.</p>
                </div>
              </div>
            </body>
          </html>
        `;

      default:
        return `<div style="padding: 20px;">Preview will appear here...</div>`;
    }
  };

  const handleSend = () => {
    onConfirmSend(emailData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] w-[1400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Edit & Preview - {emailType?.charAt(0).toUpperCase() + emailType?.slice(1)} Email
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 h-[70vh]">
          {/* Left Pane - Editor */}
          <div className="border-r pr-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              ✏️ Edit Email Content
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  id="subject"
                  data-testid="email-subject-input"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  placeholder="Enter email subject..."
                />
              </div>

              <div>
                <Label htmlFor="body">Email Body *</Label>
                <Textarea
                  id="body"
                  data-testid="email-body-textarea"
                  value={emailData.body}
                  onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                  placeholder="Enter email body content..."
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Tip: Use line breaks for paragraphs. The preview will show how it looks.
                </p>
              </div>

              {/* Type-specific fields */}
              {emailType === 'rejection' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2">⚠️ DPDP Act Notice</h4>
                  <p className="text-sm text-amber-800">
                    The DPDP Act 2023 privacy notice will be automatically included in the email, 
                    informing the candidate about data deletion.
                  </p>
                </div>
              )}

              {emailType === 'onboarding' && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-900 mb-2">📎 PDF Attachment</h4>
                  <p className="text-sm text-indigo-800">
                    The appointment letter PDF will be automatically generated and attached based on the 
                    details you provided in the previous form.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane - Live Preview */}
          <div className="overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              👁️ Live Preview
            </h3>

            <div className="border-2 border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-sm">
                <strong>To:</strong> {candidate?.email || 'candidate@example.com'}
              </div>
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-sm">
                <strong>Subject:</strong> {emailData.subject || '(No subject)'}
              </div>
              <div 
                className="bg-white p-4"
                dangerouslySetInnerHTML={{ __html: generatePreview() }}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-slate-600">
            <strong>Recipient:</strong> {candidate?.name} ({candidate?.email})
          </div>
          <div className="flex gap-2">
            <Button
              data-testid="cancel-preview-btn"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              data-testid="confirm-send-email-btn"
              onClick={handleSend}
              disabled={loading || !emailData.subject || !emailData.body}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Sending...' : 'Confirm & Send Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
