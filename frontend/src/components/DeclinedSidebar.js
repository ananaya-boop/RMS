import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { X, AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DeclinedSidebar({ declinedCandidates, onClose, onRefresh }) {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleCandidateClick = (candidate) => {
    setSelectedCandidate(candidate);
    setShowConfirmModal(true);
  };

  const handleRejectAndPurge = async () => {
    if (!selectedCandidate) return;
    
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/candidates/${selectedCandidate.id}/reject-and-purge`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      toast.success('Candidate rejected, data purged, and notification email sent');
      setShowConfirmModal(false);
      setSelectedCandidate(null);
      onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject candidate');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestoreToSourced = async () => {
    if (!selectedCandidate) return;
    
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/candidates/${selectedCandidate.id}/restore-to-sourced`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      toast.success('Candidate restored to Sourced pipeline');
      setShowConfirmModal(false);
      setSelectedCandidate(null);
      onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to restore candidate');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div 
        data-testid="declined-sidebar"
        className="fixed right-0 top-0 h-full w-80 bg-white border-l-4 border-l-rose-600 shadow-2xl z-50 flex flex-col"
      >
        <div className="p-4 border-b bg-rose-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-rose-900">Declined Candidates</h3>
            <p className="text-xs text-rose-600">Pending Final Rejection</p>
          </div>
          <button 
            data-testid="close-declined-sidebar"
            onClick={onClose}
            className="p-1 hover:bg-rose-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-rose-700" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {declinedCandidates.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No declined candidates</p>
            </div>
          ) : (
            declinedCandidates.map((candidate) => (
              <Card 
                key={candidate.id}
                data-testid={`declined-candidate-${candidate.id}`}
                className="cursor-pointer hover:shadow-md transition-shadow border-rose-200 bg-rose-50/50"
                onClick={() => handleCandidateClick(candidate)}
              >
                <CardContent className="p-3">
                  <h4 className="font-medium text-slate-900 mb-1">{candidate.name}</h4>
                  <p className="text-xs text-slate-600 mb-2">{candidate.email}</p>
                  <div className="flex items-center gap-1 text-xs text-rose-700">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Click to take action</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="p-4 border-t bg-slate-50">
          <p className="text-xs text-slate-600 mb-2">
            <strong>{declinedCandidates.length}</strong> candidate{declinedCandidates.length !== 1 ? 's' : ''} awaiting final action
          </p>
          <p className="text-xs text-slate-500">
            Click on a candidate to either reject & purge or restore to pipeline
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Final Rejection Confirmation
            </DialogTitle>
          </DialogHeader>
          
          {selectedCandidate && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-900">{selectedCandidate.name}</p>
                <p className="text-sm text-slate-600">{selectedCandidate.email}</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h4 className="font-semibold text-amber-900 mb-2 text-sm">What happens when you reject?</h4>
                <ul className="text-xs text-amber-800 space-y-1">
                  <li>✓ All candidate data will be permanently deleted</li>
                  <li>✓ Resume and personal information will be purged</li>
                  <li>✓ Automated rejection email will be sent</li>
                  <li>✓ Audit log will be created for compliance</li>
                </ul>
              </div>

              <DialogFooter className="flex-col sm:flex-col gap-2">
                <Button
                  data-testid="confirm-reject-purge-btn"
                  onClick={handleRejectAndPurge}
                  disabled={processing}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {processing ? 'Processing...' : 'Yes, Reject & Purge Data'}
                </Button>
                
                <Button
                  data-testid="restore-to-sourced-btn"
                  onClick={handleRestoreToSourced}
                  disabled={processing}
                  variant="outline"
                  className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {processing ? 'Processing...' : 'Move Back to Sourced Pipeline'}
                </Button>

                <Button
                  data-testid="cancel-action-btn"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={processing}
                  variant="ghost"
                  className="w-full"
                >
                  Cancel
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
