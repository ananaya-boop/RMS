import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Calendar, Clock, Users, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const INTERVIEW_TYPES = [
  'Screening',
  'Technical',
  'HR Round',
  'Final'
];

const DURATIONS = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' }
];

export default function ScheduleInterviewSidebar({ candidate, jobId, onClose, onScheduled }) {
  const [interviewers, setInterviewers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    interview_type: 'Technical',
    start_time: '',
    duration_minutes: 60,
    interviewer_user_id: '',
    meeting_url: '',
    include_resume: true,
    include_scorecard_link: true
  });
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInterviewers();
    
    // Set default datetime to 1 hour from now
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0, 0, 0);
    const defaultTime = now.toISOString().slice(0, 16);
    setFormData(prev => ({ ...prev, start_time: defaultTime }));
  }, []);

  const fetchInterviewers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/users/interviewers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInterviewers(response.data);
    } catch (error) {
      console.error('Error fetching interviewers:', error);
      toast.error('Failed to load interviewers');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.interview_type) {
      newErrors.interview_type = 'Interview type is required';
    }
    
    if (!formData.start_time) {
      newErrors.start_time = 'Date and time are required';
    } else {
      const selectedDate = new Date(formData.start_time);
      const now = new Date();
      if (selectedDate < now) {
        newErrors.start_time = 'Cannot schedule interviews in the past';
      }
    }
    
    if (!formData.interviewer_user_id) {
      newErrors.interviewer_user_id = 'Please select an interviewer';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateLink = () => {
    // Placeholder for Zoom/Teams API integration
    const meetingId = Math.random().toString(36).substring(7);
    const generatedLink = `https://meet.example.com/${meetingId}`;
    setFormData({ ...formData, meeting_url: generatedLink });
    toast.info('Meeting link generated (demo)');
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Convert local time to UTC ISO string
      const startTimeUTC = new Date(formData.start_time).toISOString();
      
      await axios.post(`${API}/schedules`, {
        candidate_id: candidate.id,
        job_id: jobId,
        interviewer_user_id: formData.interviewer_user_id,
        interview_type: formData.interview_type,
        start_time: startTimeUTC,
        duration_minutes: formData.duration_minutes,
        meeting_url: formData.meeting_url || null,
        include_resume: formData.include_resume,
        include_scorecard_link: formData.include_scorecard_link
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Interview scheduled and confirmation email sent to candidate');
      onScheduled();
      onClose();
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error(error.response.data.detail);
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to schedule interview');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredInterviewers = interviewers.filter(interviewer =>
    interviewer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interviewer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedInterviewer = interviewers.find(i => i.id === formData.interviewer_user_id);

  return (
    <div 
      data-testid="schedule-interview-sidebar"
      className="fixed right-0 top-0 h-full w-96 bg-white border-l-4 border-l-indigo-600 shadow-2xl z-50 flex flex-col"
    >
      <div className="p-4 border-b bg-indigo-50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-indigo-900">Schedule Interview</h3>
          <p className="text-xs text-indigo-600">{candidate.name}</p>
        </div>
        <button 
          data-testid="close-schedule-sidebar"
          onClick={onClose}
          className="p-1 hover:bg-indigo-100 rounded transition-colors"
        >
          <X className="w-5 h-5 text-indigo-700" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Interview Type */}
        <div>
          <Label htmlFor="interview_type" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Interview Type *
          </Label>
          <select
            id="interview_type"
            data-testid="interview-type-select"
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1"
            value={formData.interview_type}
            onChange={(e) => setFormData({ ...formData, interview_type: e.target.value })}
          >
            {INTERVIEW_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {errors.interview_type && (
            <p className="text-xs text-red-600 mt-1">{errors.interview_type}</p>
          )}
        </div>

        {/* Date & Time */}
        <div>
          <Label htmlFor="start_time" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Date & Time *
          </Label>
          <Input
            id="start_time"
            data-testid="start-time-input"
            type="datetime-local"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            className="mt-1"
          />
          {errors.start_time && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.start_time}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-1">Local time will be converted to UTC</p>
        </div>

        {/* Duration */}
        <div>
          <Label htmlFor="duration_minutes" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Duration
          </Label>
          <select
            id="duration_minutes"
            data-testid="duration-select"
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
          >
            {DURATIONS.map(duration => (
              <option key={duration.value} value={duration.value}>{duration.label}</option>
            ))}
          </select>
        </div>

        {/* Interviewer */}
        <div>
          <Label htmlFor="interviewer_search" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Interviewer *
          </Label>
          <Input
            id="interviewer_search"
            data-testid="interviewer-search-input"
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1"
          />
          
          {searchTerm && (
            <div className="mt-2 border border-slate-200 rounded-md max-h-48 overflow-y-auto">
              {filteredInterviewers.length > 0 ? (
                filteredInterviewers.map(interviewer => (
                  <div
                    key={interviewer.id}
                    data-testid={`interviewer-option-${interviewer.id}`}
                    className={`p-2 hover:bg-slate-50 cursor-pointer border-b last:border-b-0 ${
                      formData.interviewer_user_id === interviewer.id ? 'bg-indigo-50' : ''
                    }`}
                    onClick={() => {
                      setFormData({ ...formData, interviewer_user_id: interviewer.id });
                      setSearchTerm('');
                    }}
                  >
                    <p className="text-sm font-medium text-slate-900">{interviewer.name}</p>
                    <p className="text-xs text-slate-600">{interviewer.email}</p>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded mt-1 inline-block">
                      {interviewer.role}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600 p-3">No interviewers found</p>
              )}
            </div>
          )}
          
          {selectedInterviewer && !searchTerm && (
            <div className="mt-2 p-3 bg-indigo-50 rounded-md border border-indigo-200">
              <p className="text-sm font-medium text-indigo-900">{selectedInterviewer.name}</p>
              <p className="text-xs text-indigo-700">{selectedInterviewer.email}</p>
            </div>
          )}
          
          {errors.interviewer_user_id && (
            <p className="text-xs text-red-600 mt-1">{errors.interviewer_user_id}</p>
          )}
        </div>

        {/* Meeting Link */}
        <div>
          <Label htmlFor="meeting_url" className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Meeting Link
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="meeting_url"
              data-testid="meeting-url-input"
              type="url"
              placeholder="https://zoom.us/j/..."
              value={formData.meeting_url}
              onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
            />
            <Button
              data-testid="generate-link-btn"
              type="button"
              onClick={handleGenerateLink}
              variant="outline"
              size="sm"
            >
              Generate
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-1">Optional: Add manually or generate a demo link</p>
        </div>

        {/* Interviewer Kit */}
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <Label className="text-sm font-medium">Interviewer Kit</Label>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include_resume"
              data-testid="include-resume-checkbox"
              checked={formData.include_resume}
              onCheckedChange={(checked) => setFormData({ ...formData, include_resume: checked })}
            />
            <label
              htmlFor="include_resume"
              className="text-sm text-slate-700 cursor-pointer"
            >
              Attach candidate's resume to calendar invite
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include_scorecard_link"
              data-testid="include-scorecard-checkbox"
              checked={formData.include_scorecard_link}
              onCheckedChange={(checked) => setFormData({ ...formData, include_scorecard_link: checked })}
            />
            <label
              htmlFor="include_scorecard_link"
              className="text-sm text-slate-700 cursor-pointer"
            >
              Include scorecard link for feedback
            </label>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">What happens next?</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>✓ System checks for interviewer availability</li>
            <li>✓ Confirmation email sent to candidate</li>
            <li>✓ Calendar event details shared</li>
            <li>✓ Interview added to dashboard</li>
          </ul>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-slate-50 space-y-2">
        <Button
          data-testid="schedule-interview-btn"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {loading ? 'Scheduling...' : 'Schedule Interview'}
        </Button>
        <Button
          data-testid="cancel-schedule-btn"
          onClick={onClose}
          disabled={loading}
          variant="ghost"
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
