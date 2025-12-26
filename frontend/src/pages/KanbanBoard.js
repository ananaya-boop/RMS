import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Sidebar from '@/components/Sidebar';
import DeclinedSidebar from '@/components/DeclinedSidebar';
import OfferConfirmationModal from '@/components/OfferConfirmationModal';
import EmergentOfferModal from '@/components/EmergentOfferModal';
import BriefTATRibbon from '@/components/BriefTATRibbon';
import { toast } from 'sonner';
import { Plus, XCircle, Upload } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Multi-round pipeline with conditional routing
const STAGES = [
  { 
    id: 'sourced', 
    label: 'Sourced', 
    color: 'bg-blue-100 border-blue-200',
    description: 'Initial candidate pool'
  },
  { 
    id: 'screening', 
    label: 'Screening', 
    color: 'bg-purple-100 border-purple-200',
    description: 'Resume & phone screening',
    hasScorecard: true,
    threshold: 60
  },
  { 
    id: 'round_1_technical', 
    label: 'Round 1 (Technical)', 
    color: 'bg-amber-100 border-amber-200',
    description: 'Core technical competencies',
    hasScorecard: true,
    hasRecommendation: true,
    threshold: 70
  },
  { 
    id: 'round_2_recommended', 
    label: 'Round 2 (Intermediate)', 
    color: 'bg-indigo-100 border-indigo-200',
    description: 'Specialized intermediary assessment',
    hasScorecard: true,
    threshold: 70
  },
  { 
    id: 'round_3_final', 
    label: 'Round 3 (Final)', 
    color: 'bg-violet-100 border-violet-200',
    description: 'Final technical/managerial round',
    hasScorecard: true,
    threshold: 70
  },
  { 
    id: 'hr_round', 
    label: 'HR Round', 
    color: 'bg-cyan-100 border-cyan-200',
    description: 'HR discussion & negotiation',
    hasScorecard: true,
    threshold: 70
  },
  { 
    id: 'offer', 
    label: 'Offer', 
    color: 'bg-emerald-100 border-emerald-200',
    description: 'Offer sent & pending acceptance'
  },
  { 
    id: 'onboarding', 
    label: 'Onboarding', 
    color: 'bg-green-100 border-green-200',
    description: 'Accepted & onboarding in progress'
  },
];

export default function KanbanBoard({ user, onLogout }) {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [showDeclinedSidebar, setShowDeclinedSidebar] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    skills: '',
    experience_years: 0
  });
  
  // Emergent Offer Modal states
  const [showEmergentOfferModal, setShowEmergentOfferModal] = useState(false);
  const [pendingOfferCandidate, setPendingOfferCandidate] = useState(null);
  const [pendingOfferStage, setPendingOfferStage] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchCandidates();
    }
  }, [selectedJob]);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(response.data);
      if (response.data.length > 0) {
        setSelectedJob(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchCandidates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/candidates?job_id=${selectedJob}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCandidates(response.data);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  const handleUploadResume = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      toast.error('Only PDF and DOCX files are supported');
      return;
    }

    setUploading(true);
    setResumeFile(file);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/candidates/upload-resume?job_id=${selectedJob}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      // Auto-fill form with parsed data
      const parsed = response.data.parsed_data;
      setParsedData(parsed);
      setNewCandidate({
        name: parsed.name || '',
        email: parsed.email || '',
        phone: parsed.phone || '',
        skills: parsed.skills ? parsed.skills.join(', ') : '',
        experience_years: 0
      });
      
      toast.success('Resume parsed successfully! Review and edit the details below.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to parse resume');
      setResumeFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleAddCandidate = async () => {
    // If resume was uploaded, the candidate was already created during upload
    if (parsedData) {
      toast.success('Candidate from resume already added!');
      fetchCandidates();
      handleCloseAddDialog();
      return;
    }

    // Manual candidate creation
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/candidates`, {
        ...newCandidate,
        job_id: selectedJob,
        skills: newCandidate.skills.split(',').map(s => s.trim()).filter(Boolean)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Candidate added successfully!');
      fetchCandidates();
      handleCloseAddDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add candidate');
    }
  };

  const handleCloseAddDialog = () => {
    setShowAddCandidate(false);
    setResumeFile(null);
    setParsedData(null);
    setNewCandidate({ name: '', email: '', phone: '', skills: '', experience_years: 0 });
  };

  const handleStageChange = async (candidateId, newStage) => {
    // Find the candidate being moved
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) {
      toast.error('Candidate not found');
      return;
    }
    
    const currentStage = candidate.stage || candidate.current_stage;
    
    // EMERGENT COMPLIANCE: Intercept HR Round → Offer transition
    // Mandatory offer modal with statutory data collection
    if (currentStage === 'hr_round' && newStage === 'offer') {
      // Find the job for this candidate
      const job = jobs.find(j => j.id === candidate.job_id);
      
      // Store the pending transition and show EmergentOfferModal
      setPendingOfferCandidate(candidate);
      setPendingOfferStage(newStage);
      setShowEmergentOfferModal(true);
      
      // Don't proceed with stage change yet - modal will handle it
      toast.info('Please complete the offer details before proceeding');
      return;
    }
    
    // For all other stages, update directly
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/candidates/${candidateId}/stage`, 
        { stage: newStage },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success('Candidate stage updated!');
      fetchCandidates();
    } catch (error) {
      toast.error('Failed to update stage');
    }
  };
  
  const handleEmergentOfferSuccess = async () => {
    // Offer was successfully created, now update the stage
    if (pendingOfferCandidate && pendingOfferStage) {
      try {
        const token = localStorage.getItem('token');
        await axios.put(`${API}/candidates/${pendingOfferCandidate.id}/stage`, 
          { stage: pendingOfferStage },
          { headers: { Authorization: `Bearer ${token}` }}
        );
        toast.success('Offer letter sent and candidate moved to Offer stage!');
        
        // Reset pending states
        setPendingOfferCandidate(null);
        setPendingOfferStage(null);
        
        // Refresh candidates
        fetchCandidates();
      } catch (error) {
        toast.error('Failed to update candidate stage');
      }
    }
  };
  
  const handleEmergentOfferClose = () => {
    // User cancelled the offer modal
    setShowEmergentOfferModal(false);
    setPendingOfferCandidate(null);
    setPendingOfferStage(null);
    toast.info('Offer creation cancelled. Candidate remains in HR Round.');
  };

  const getCandidatesByStage = (stage) => {
    return candidates.filter(c => (c.stage || c.current_stage) === stage);
  };

  const getDeclinedCandidates = () => {
    return candidates.filter(c => (c.stage || c.current_stage) === 'declined');
  };

  const handleDeclineCandidate = async (candidateId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/candidates/${candidateId}/stage`, 
        { stage: 'declined' },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success('Candidate moved to Declined sidebar');
      fetchCandidates();
    } catch (error) {
      toast.error('Failed to decline candidate');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} onLogout={onLogout} activePage="kanban" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Candidate Pipeline
              </h1>
              <p className="text-slate-600 mt-2">Drag and drop candidates across stages</p>
            </div>
            <div className="flex gap-3">
              <select
                data-testid="job-select"
                value={selectedJob || ''}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg bg-white"
              >
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
              <Button 
                data-testid="add-candidate-btn"
                onClick={() => setShowAddCandidate(true)}
                className="bg-[#1e1b4b] hover:bg-[#312e81]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Candidate
              </Button>
              <Button 
                data-testid="view-declined-btn"
                onClick={() => setShowDeclinedSidebar(true)}
                variant="outline"
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Declined ({getDeclinedCandidates().length})
              </Button>
            </div>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
            {STAGES.map(stage => (
              <div 
                key={stage.id} 
                data-testid={`stage-column-${stage.id}`}
                className="min-w-[320px] bg-slate-50/50 rounded-xl border border-slate-200/60 p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="font-semibold text-slate-900">{stage.label}</h3>
                  <span className="text-xs font-mono text-slate-500">
                    {getCandidatesByStage(stage.id).length}
                  </span>
                </div>
                
                <div className="space-y-3 min-h-[400px]">
                  {getCandidatesByStage(stage.id).map(candidate => (
                    <Card 
                      key={candidate.id}
                      data-testid={`candidate-card-${candidate.id}`}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/candidate/${candidate.id}`)}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-slate-900 mb-1">{candidate.name}</h4>
                        <p className="text-xs text-slate-600 mb-2">{candidate.email}</p>
                        {candidate.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills.slice(0, 3).map((skill, idx) => (
                              <span key={idx} className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex gap-2">
                          {stage.id !== 'sourced' && (
                            <button
                              data-testid={`move-back-${candidate.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentIdx = STAGES.findIndex(s => s.id === stage.id);
                                if (currentIdx > 0) {
                                  handleStageChange(candidate.id, STAGES[currentIdx - 1].id);
                                }
                              }}
                              className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded transition-colors"
                            >
                              ← Back
                            </button>
                          )}
                          {stage.id !== 'onboarding' && (
                            <button
                              data-testid={`move-forward-${candidate.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentIdx = STAGES.findIndex(s => s.id === stage.id);
                                if (currentIdx < STAGES.length - 1) {
                                  handleStageChange(candidate.id, STAGES[currentIdx + 1].id);
                                }
                              }}
                              className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                            >
                              Forward →
                            </button>
                          )}
                          <button
                            data-testid={`decline-${candidate.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeclineCandidate(candidate.id);
                            }}
                            className="text-xs px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors ml-auto"
                          >
                            ✕ Decline
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDeclinedSidebar && (
        <DeclinedSidebar 
          declinedCandidates={getDeclinedCandidates()}
          onClose={() => setShowDeclinedSidebar(false)}
          onRefresh={fetchCandidates}
        />
      )}

      <Dialog open={showAddCandidate} onOpenChange={handleCloseAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Candidate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Resume Upload Section */}
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-base font-semibold text-indigo-900">Option 1: Upload Resume</Label>
                  <p className="text-xs text-indigo-700 mt-1">Upload a PDF or DOCX file to auto-fill candidate details</p>
                </div>
                <Upload className="w-5 h-5 text-indigo-600" />
              </div>
              
              <Input
                id="resume-file"
                data-testid="resume-file-input"
                type="file"
                accept=".pdf,.docx"
                onChange={handleUploadResume}
                disabled={uploading || parsedData}
                className="cursor-pointer"
              />
              
              {uploading && (
                <p className="text-sm text-indigo-600 mt-2 flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Parsing resume...
                </p>
              )}
              
              {parsedData && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded">
                  <p className="text-sm font-medium text-emerald-900 mb-1">✓ Resume parsed successfully!</p>
                  <p className="text-xs text-emerald-700">Candidate has been created. Review details below or close to finish.</p>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or enter manually</span>
              </div>
            </div>

            {/* Manual Entry Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  data-testid="candidate-name-input"
                  value={newCandidate.name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  disabled={parsedData}
                  placeholder={parsedData ? "Auto-filled from resume" : "Enter candidate name"}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  data-testid="candidate-email-input"
                  type="email"
                  value={newCandidate.email}
                  onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                  disabled={parsedData}
                  placeholder={parsedData ? "Auto-filled from resume" : "candidate@example.com"}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  data-testid="candidate-phone-input"
                  value={newCandidate.phone}
                  onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                  disabled={parsedData}
                  placeholder={parsedData ? "Auto-filled from resume" : "+91 9876543210"}
                />
              </div>
              <div>
                <Label htmlFor="skills">Skills (comma separated)</Label>
                <Input
                  id="skills"
                  data-testid="candidate-skills-input"
                  placeholder={parsedData ? "Auto-filled from resume" : "Python, React, MongoDB"}
                  value={newCandidate.skills}
                  onChange={(e) => setNewCandidate({ ...newCandidate, skills: e.target.value })}
                  disabled={parsedData}
                />
              </div>
              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  data-testid="candidate-experience-input"
                  type="number"
                  value={newCandidate.experience_years}
                  onChange={(e) => setNewCandidate({ ...newCandidate, experience_years: parseInt(e.target.value) || 0 })}
                  disabled={parsedData}
                />
              </div>
            </div>

            {parsedData ? (
              <Button 
                data-testid="close-after-upload-btn"
                onClick={handleCloseAddDialog}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Done - Candidate Added
              </Button>
            ) : (
              <Button 
                data-testid="submit-candidate-btn"
                onClick={handleAddCandidate}
                className="w-full bg-[#1e1b4b] hover:bg-[#312e81]"
                disabled={!newCandidate.name || !newCandidate.email}
              >
                Add Candidate Manually
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Emergent Offer Modal - Triggered on HR → Offer transition */}
      {showEmergentOfferModal && pendingOfferCandidate && (
        <EmergentOfferModal
          isOpen={showEmergentOfferModal}
          onClose={handleEmergentOfferClose}
          candidate={pendingOfferCandidate}
          job={jobs.find(j => j.id === pendingOfferCandidate.job_id)}
          onSuccess={handleEmergentOfferSuccess}
        />
      )}
    </div>
  );
}
