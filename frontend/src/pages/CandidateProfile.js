import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Sidebar from '@/components/Sidebar';
import ScheduleInterviewSidebar from '@/components/ScheduleInterviewSidebar';
import WithdrawalSidebar from '@/components/WithdrawalSidebar';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, Download, Trash2, Star, Calendar as CalendarIcon, FileText, UserMinus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CandidateProfile({ user, onLogout }) {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [scorecards, setScorecards] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [showScorecard, setShowScorecard] = useState(false);
  const [showPOSH, setShowPOSH] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scorecard, setScorecard] = useState({
    round_name: '',
    rating: 3,
    feedback: '',
    recommendation: 'hire',
    interviewer_name: user.name,
    interviewer_email: user.email
  });
  const [poshReport, setPoshReport] = useState({
    incident_type: '',
    description: ''
  });

  useEffect(() => {
    fetchCandidate();
    fetchScorecards();
    fetchSchedules();
  }, [candidateId]);

  const fetchCandidate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/candidates/${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCandidate(response.data);
    } catch (error) {
      console.error('Error fetching candidate:', error);
      toast.error('Failed to load candidate');
    } finally {
      setLoading(false);
    }
  };

  const fetchScorecards = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/scorecards?candidate_id=${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScorecards(response.data);
    } catch (error) {
      console.error('Error fetching scorecards:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/schedules?candidate_id=${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedules(response.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const handleSubmitScorecard = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/scorecards`, {
        ...scorecard,
        candidate_id: candidateId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Scorecard submitted!');
      fetchScorecards();
      setShowScorecard(false);
    } catch (error) {
      toast.error('Failed to submit scorecard');
    }
  };

  const handleSubmitPOSH = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/posh-reports`, {
        ...poshReport,
        candidate_id: candidateId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('POSH report submitted');
      setShowPOSH(false);
      setPoshReport({ incident_type: '', description: '' });
    } catch (error) {
      toast.error('Failed to submit report');
    }
  };

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/candidates/${candidateId}/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `candidate_${candidateId}_data.json`;
      link.click();
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handlePurge = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this candidate data? This action cannot be undone.')) {
      return;
    }
    if (!window.confirm('Final confirmation: This will permanently erase all data for this candidate. Proceed?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/candidates/${candidateId}/purge`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Candidate data purged successfully');
      navigate('/kanban');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to purge data');
    }
  };

  const handleGenerateSnapshot = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/candidates/${candidateId}/generate-snapshot`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Convert base64 to blob and download
      const byteCharacters = atob(response.data.pdf_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.data.filename;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Data snapshot generated and downloaded');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate snapshot');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar user={user} onLogout={onLogout} activePage="kanban" />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading candidate profile...</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar user={user} onLogout={onLogout} activePage="kanban" />
        <div className="flex-1 flex items-center justify-center">
          <p>Candidate not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} onLogout={onLogout} activePage="kanban" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <Button 
            data-testid="back-btn"
            onClick={() => navigate('/kanban')}
            variant="ghost"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Kanban
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Profile Section */}
            <div className="lg:col-span-8 space-y-6">
              <Card data-testid="candidate-details-card">
                <CardHeader>
                  <CardTitle className="text-3xl" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {candidate.name}
                  </CardTitle>
                  <div className="flex gap-2 mt-2">
                    <span className="px-3 py-1 text-sm bg-indigo-100 text-indigo-800 rounded-full">
                      {candidate.stage.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-600">Email</Label>
                    <p className="text-slate-900">{candidate.email}</p>
                  </div>
                  {candidate.phone && (
                    <div>
                      <Label className="text-slate-600">Phone</Label>
                      <p className="text-slate-900">{candidate.phone}</p>
                    </div>
                  )}
                  {candidate.experience_years && (
                    <div>
                      <Label className="text-slate-600">Experience</Label>
                      <p className="text-slate-900">{candidate.experience_years} years</p>
                    </div>
                  )}
                  {candidate.skills.length > 0 && (
                    <div>
                      <Label className="text-slate-600">Skills</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {candidate.skills.map((skill, idx) => (
                          <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-800 text-sm rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {candidate.resume_text && (
                <Card data-testid="resume-preview-card">
                  <CardHeader>
                    <CardTitle>Resume Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono">
                        {candidate.resume_text}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card data-testid="scorecards-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Interview Scorecards</CardTitle>
                  <Button 
                    data-testid="add-scorecard-btn"
                    onClick={() => setShowScorecard(true)}
                    size="sm"
                    className="bg-[#1e1b4b] hover:bg-[#312e81]"
                  >
                    Add Scorecard
                  </Button>
                </CardHeader>
                <CardContent>
                  {scorecards.length > 0 ? (
                    <div className="space-y-4">
                      {scorecards.map((sc) => (
                        <div key={sc.id} data-testid={`scorecard-${sc.id}`} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-slate-900">{sc.round_name}</h4>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < sc.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{sc.feedback}</p>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{sc.interviewer_name}</span>
                            <span className={`px-2 py-1 rounded ${
                              sc.recommendation === 'strong_hire' ? 'bg-green-100 text-green-800' :
                              sc.recommendation === 'hire' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {sc.recommendation.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">No scorecards yet</p>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="interview-schedule-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Interview Schedule</CardTitle>
                  <Button 
                    data-testid="schedule-interview-btn"
                    onClick={() => setShowSchedule(true)}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Schedule Interview
                  </Button>
                </CardHeader>
                <CardContent>
                  {schedules.length > 0 ? (
                    <div className="space-y-3">
                      {schedules.map((schedule) => (
                        <div key={schedule.id} data-testid={`schedule-${schedule.id}`} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-slate-900">{schedule.interview_type}</h4>
                            <span className={`text-xs px-2 py-1 rounded ${
                              schedule.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              schedule.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {schedule.status}
                            </span>
                          </div>
                          <div className="text-sm space-y-1">
                            <p className="text-slate-600">
                              <strong>Date:</strong> {new Date(schedule.start_time).toLocaleString()}
                            </p>
                            <p className="text-slate-600">
                              <strong>Duration:</strong> {schedule.duration_minutes} minutes
                            </p>
                            <p className="text-slate-600">
                              <strong>Interviewer:</strong> {schedule.interviewer_name}
                            </p>
                            {schedule.meeting_url && (
                              <a 
                                href={schedule.meeting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 text-sm underline inline-block mt-1"
                              >
                                Join Meeting →
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">No interviews scheduled yet</p>
                  )}
                </CardContent>
              </Card>

              {candidate.stage_history && candidate.stage_history.length > 0 && (
                <Card data-testid="timeline-card">
                  <CardHeader>
                    <CardTitle>Stage Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {candidate.stage_history.map((history, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{history.stage.replace('_', ' ').toUpperCase()}</p>
                            <p className="text-xs text-slate-600">{new Date(history.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Compliance Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <Card data-testid="compliance-card">
                <CardHeader>
                  <CardTitle>Compliance & Privacy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {candidate.consent_log && (
                    <div className="bg-emerald-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-emerald-900 mb-1">Consent Logged</p>
                      <p className="text-xs text-emerald-700">
                        Method: {candidate.consent_log.method}
                      </p>
                      <p className="text-xs text-emerald-700">
                        Date: {new Date(candidate.consent_log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  )}

                  <Button
                    data-testid="export-data-btn"
                    onClick={handleExportData}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data (DPDP)
                  </Button>

                  <Button
                    data-testid="posh-report-btn"
                    onClick={() => setShowPOSH(true)}
                    variant="outline"
                    className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    POSH Report
                  </Button>

                  <Button
                    data-testid="withdraw-candidate-btn"
                    onClick={() => setShowWithdrawal(true)}
                    variant="outline"
                    className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Withdraw Candidate
                  </Button>

                  {(user.role === 'admin' || user.role === 'dpo') && (
                    <Button
                      data-testid="generate-snapshot-btn"
                      onClick={handleGenerateSnapshot}
                      variant="outline"
                      className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Data Snapshot
                    </Button>
                  )}

                  {(user.role === 'admin' || user.role === 'dpo') && (
                    <Button
                      data-testid="purge-data-btn"
                      onClick={handlePurge}
                      variant="destructive"
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Purge Data
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Scorecard Dialog */}
      <Dialog open={showScorecard} onOpenChange={setShowScorecard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Interview Scorecard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="round_name">Round Name</Label>
              <Input
                id="round_name"
                data-testid="scorecard-round-input"
                placeholder="Technical Round, HR Round, etc."
                value={scorecard.round_name}
                onChange={(e) => setScorecard({ ...scorecard, round_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="rating">Rating (1-5)</Label>
              <Input
                id="rating"
                data-testid="scorecard-rating-input"
                type="number"
                min="1"
                max="5"
                value={scorecard.rating}
                onChange={(e) => setScorecard({ ...scorecard, rating: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                data-testid="scorecard-feedback-input"
                value={scorecard.feedback}
                onChange={(e) => setScorecard({ ...scorecard, feedback: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="recommendation">Recommendation</Label>
              <select
                id="recommendation"
                data-testid="scorecard-recommendation-select"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={scorecard.recommendation}
                onChange={(e) => setScorecard({ ...scorecard, recommendation: e.target.value })}
              >
                <option value="strong_hire">Strong Hire</option>
                <option value="hire">Hire</option>
                <option value="no_hire">No Hire</option>
              </select>
            </div>
            <Button 
              data-testid="submit-scorecard-btn"
              onClick={handleSubmitScorecard}
              className="w-full bg-[#1e1b4b] hover:bg-[#312e81]"
            >
              Submit Scorecard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* POSH Report Dialog */}
      <Dialog open={showPOSH} onOpenChange={setShowPOSH}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>POSH & Ethics Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="incident_type">Incident Type</Label>
              <Input
                id="incident_type"
                data-testid="posh-incident-type-input"
                placeholder="e.g., Inappropriate behavior"
                value={poshReport.incident_type}
                onChange={(e) => setPoshReport({ ...poshReport, incident_type: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                data-testid="posh-description-input"
                value={poshReport.description}
                onChange={(e) => setPoshReport({ ...poshReport, description: e.target.value })}
              />
            </div>
            <Button 
              data-testid="submit-posh-btn"
              onClick={handleSubmitPOSH}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              Submit Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {showSchedule && candidate && (
        <ScheduleInterviewSidebar
          candidate={candidate}
          jobId={candidate.job_id}
          onClose={() => setShowSchedule(false)}
          onScheduled={() => {
            fetchSchedules();
            toast.success('Interview scheduled successfully');
          }}
        />
      )}

      {showWithdrawal && candidate && (
        <WithdrawalSidebar
          candidate={candidate}
          onClose={() => setShowWithdrawal(false)}
          onWithdrawn={() => {
            fetchCandidate();
            toast.success('Candidate withdrawal processed');
          }}
        />
      )}
    </div>
  );
}
