/**
 * Enhanced Kanban Board Integration
 * 
 * Add this code to your existing KanbanBoard.js file
 */

// ========== IMPORTS TO ADD ==========
import EmergentOfferEditor from '@/components/EmergentOfferEditor';
import RejectionWorkflow from '@/components/RejectionWorkflow';
import OnboardingRollbackModal from '@/components/OnboardingRollbackModal';
import { CandidateCard } from '@/components/CandidateCard';

// ========== STATE TO ADD ==========
const [showOfferEditor, setShowOfferEditor] = useState(false);
const [candidateForOffer, setCandidateForOffer] = useState(null);
const [showRejectionModal, setShowRejectionModal] = useState(false);
const [candidateForRejection, setCandidateForRejection] = useState(null);
const [showRollbackModal, setShowRollbackModal] = useState(false);
const [candidateForRollback, setCandidateForRollback] = useState(null);
const [offerStatuses, setOfferStatuses] = useState({});

// ========== FETCH OFFER STATUSES ==========
const fetchOfferStatuses = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API}/offer-letters`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Create a map of candidate_id to offer status
    const statusMap = {};
    response.data.forEach(offer => {
      statusMap[offer.candidate_id] = offer;
    });
    setOfferStatuses(statusMap);
  } catch (error) {
    console.error('Error fetching offer statuses:', error);
  }
};

// ========== CALL IN useEffect ==========
useEffect(() => {
  if (selectedJob) {
    fetchCandidates();
    fetchOfferStatuses();
  }
}, [selectedJob]);

// ========== ENHANCED STAGE CHANGE HANDLER ==========
const handleStageChange = async (candidateId, newStage, fromStage) => {
  const candidate = candidates.find(c => c.id === candidateId);
  const job = jobs.find(j => j.id === selectedJob);

  // 1. HR Round → Offer: Launch Offer Editor
  if (fromStage === 'hr_round' && newStage === 'offer') {
    setCandidateForOffer(candidate);
    setShowOfferEditor(true);
    return; // Don't update stage yet, wait for offer to be sent
  }

  // 2. Offer → Onboarding: Check if offer was accepted
  if (fromStage === 'offer' && newStage === 'onboarding') {
    const offerStatus = offerStatuses[candidateId];
    
    if (!offerStatus) {
      toast.error('No offer letter found for this candidate');
      return;
    }
    
    if (offerStatus.status !== 'accepted') {
      toast.error('Candidate must accept offer before moving to onboarding');
      return;
    }

    // Show onboarding confirmation modal
    setCandidateToOnboard(candidate);
    setShowOnboardingModal(true);
    return;
  }

  // 3. Onboarding → Offer: Rollback with confirmation
  if (fromStage === 'onboarding' && newStage === 'offer') {
    setCandidateForRollback(candidate);
    setShowRollbackModal(true);
    return;
  }

  // 4. Any stage → Declined: Show rejection workflow
  if (newStage === 'declined') {
    setCandidateForRejection(candidate);
    setShowRejectionModal(true);
    return;
  }

  // 5. For other stage changes, update directly
  try {
    const token = localStorage.getItem('token');
    await axios.put(`${API}/candidates/${candidateId}/stage`, 
      { stage: newStage },
      { headers: { Authorization: `Bearer ${token}` }}
    );
    toast.success('Candidate stage updated!');
    fetchCandidates();
    fetchOfferStatuses();
  } catch (error) {
    toast.error('Failed to update stage');
  }
};

// ========== DRAG AND DROP HANDLERS ==========
const handleDragStart = (e, candidate) => {
  e.dataTransfer.setData('candidateId', candidate.id);
  e.dataTransfer.setData('fromStage', candidate.stage);
};

const handleDragOver = (e) => {
  e.preventDefault();
};

const handleDrop = async (e, toStage) => {
  e.preventDefault();
  const candidateId = e.dataTransfer.getData('candidateId');
  const fromStage = e.dataTransfer.getData('fromStage');
  
  if (fromStage === toStage) return;
  
  await handleStageChange(candidateId, toStage, fromStage);
};

// ========== ROLLBACK SUCCESS HANDLER ==========
const handleRollbackSuccess = () => {
  setShowRollbackModal(false);
  setCandidateForRollback(null);
  fetchCandidates();
  fetchOfferStatuses();
  toast.success('Candidate rolled back to Offer stage successfully!');
};

// ========== OFFER SUCCESS HANDLER ==========
const handleOfferSuccess = () => {
  setShowOfferEditor(false);
  setCandidateForOffer(null);
  fetchCandidates();
  fetchOfferStatuses();
  toast.success('Offer sent successfully! Candidate moved to Offer stage.');
};

// ========== REJECTION SUCCESS HANDLER ==========
const handleRejectionSuccess = () => {
  setShowRejectionModal(false);
  setCandidateForRejection(null);
  fetchCandidates();
  toast.success('Rejection processed successfully!');
};

// ========== DECLINED SIDEBAR HANDLER ==========
const handleDeclineFromSidebar = (candidateId) => {
  const candidate = candidates.find(c => c.id === candidateId);
  if (candidate) {
    setCandidateForRejection(candidate);
    setShowRejectionModal(true);
  }
};

// ========== RENDER STAGE COLUMN ==========
const renderStageColumn = (stage) => {
  const stageCandidates = getCandidatesByStage(stage.id);
  
  return (
    <div
      key={stage.id}
      className={`${stage.color} rounded-lg p-4 min-h-[600px]`}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, stage.id)}
    >
      <div className=\"flex items-center justify-between mb-4\">
        <h3 className=\"font-semibold text-gray-800\">{stage.label}</h3>
        <span className=\"px-2 py-1 bg-white rounded-full text-xs font-medium text-gray-600\">
          {stageCandidates.length}
        </span>
      </div>

      <div className=\"space-y-3\">
        {stageCandidates.map(candidate => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            onDragStart={handleDragStart}
            onDecline={handleDeclineCandidate}
            onViewProfile={() => navigate(`/candidate/${candidate.id}`)}
            offerStatus={stage.id === 'offer' ? offerStatuses[candidate.id] : null}
          />
        ))}

        {stageCandidates.length === 0 && (
          <div className=\"text-center text-gray-400 py-8\">
            <p className=\"text-sm\">Drop candidates here</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== MODALS TO ADD TO RENDER ==========
{/* Emergent Offer Editor Modal */}
{showOfferEditor && candidateForOffer && (
  <EmergentOfferEditor
    isOpen={showOfferEditor}
    onClose={() => {
      setShowOfferEditor(false);
      setCandidateForOffer(null);
    }}
    candidate={candidateForOffer}
    job={jobs.find(j => j.id === selectedJob)}
    onSuccess={handleOfferSuccess}
  />
)}

{/* Rejection Workflow Modal */}
{showRejectionModal && candidateForRejection && (
  <RejectionWorkflow
    isOpen={showRejectionModal}
    onClose={() => {
      setShowRejectionModal(false);
      setCandidateForRejection(null);
    }}
    candidate={candidateForRejection}
    onSuccess={handleRejectionSuccess}
  />
)}

// ========== DECLINED SIDEBAR ENHANCEMENT ==========
<DeclinedSidebar
  isOpen={showDeclinedSidebar}
  onClose={() => setShowDeclinedSidebar(false)}
  candidates={getDeclinedCandidates()}
  onReject={handleDeclineFromSidebar}  // This will trigger RejectionWorkflow
  onRestore={async (candidateId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/candidates/${candidateId}/stage`, 
        { stage: 'sourced' },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success('Candidate restored to Sourced stage');
      fetchCandidates();
    } catch (error) {
      toast.error('Failed to restore candidate');
    }
  }}
/>

// ========== EXAMPLE WORKFLOW EXPLANATION ==========
/*

WORKFLOW SUMMARY:

1. HR Round → Offer
   - User drags candidate from "HR Round" to "Offer"
   - handleStageChange intercepts this
   - EmergentOfferEditor modal opens
   - Recruiter fills salary details
   - Clicks "Send Offer"
   - Offer email sent, candidate moved to Offer stage
   - Offer status badge appears: "Offer Sent - Pending Signature"

2. Offer Stage Management
   - Candidate card shows offer status badge
   - Status options: Pending, Sent, Accepted, Rejected, Expired
   - Badge is clickable to view candidate profile

3. Offer → Onboarding
   - User tries to drag candidate from "Offer" to "Onboarding"
   - handleStageChange checks if offer is accepted
   - If not accepted: Shows error message
   - If accepted: Shows onboarding confirmation modal
   - On confirmation: Candidate moved to Onboarding

4. Any Stage → Declined
   - User drags candidate to declined sidebar OR
   - Clicks decline button on candidate card
   - RejectionWorkflow modal opens
   - Recruiter selects rejection reason
   - Previews rejection email with DPDP notice
   - Clicks "Confirm & Send Rejection"
   - Email sent, data purged (if selected)
   - Candidate removed from board

5. Statutory Compliance Check
   - When candidate is in "Offer" or "Onboarding" stage
   - Green checkmark appears if "Ready for Emergent"
   - Missing statutory data flagged

*/

// ========== STATE MANAGEMENT FLOW ==========
/*

STATE TRANSITIONS:

sourced → screened → technical → hr_round → offer → onboarding
                                                ↓
                                            declined (with purge)

OFFER LIFECYCLE:

1. offer_draft (in EmergentOfferEditor)
2. offer_sent (email sent, waiting for signature)
3. offer_pending (candidate viewed)
4. offer_accepted (candidate signed)
5. offer_rejected (candidate declined)
6. offer_expired (past deadline)

VALIDATION GATES:

- HR Round → Offer: Must complete offer drafting
- Offer → Onboarding: Must have accepted offer
- Any → Declined: Must confirm rejection with DPDP notice

*/

export {
  handleStageChange,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleOfferSuccess,
  handleRejectionSuccess,
  renderStageColumn
};
