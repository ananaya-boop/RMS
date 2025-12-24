import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Sidebar from '@/components/Sidebar';
import { toast } from 'sonner';
import { Plus, Briefcase } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function JobsManagement({ user, onLogout }) {
  const [jobs, setJobs] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newJob, setNewJob] = useState({
    title: '',
    department: '',
    location: '',
    description: '',
    requirements: ''
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/jobs`, {
        ...newJob,
        requirements: newJob.requirements.split('\n').filter(r => r.trim())
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Job created successfully!');
      fetchJobs();
      setShowCreate(false);
      setNewJob({ title: '', department: '', location: '', description: '', requirements: '' });
    } catch (error) {
      toast.error('Failed to create job');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} onLogout={onLogout} activePage="jobs" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Job Requisitions
              </h1>
              <p className="text-slate-600 mt-2">Manage active job openings</p>
            </div>
            <Button 
              data-testid="create-job-btn"
              onClick={() => setShowCreate(true)}
              className="bg-[#1e1b4b] hover:bg-[#312e81]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Job
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading jobs...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map(job => (
                <Card key={job.id} data-testid={`job-card-${job.id}`} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Briefcase className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">{job.department}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="px-2 py-1 bg-slate-100 rounded">{job.location}</span>
                      <span className={`px-2 py-1 rounded ${
                        job.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        job.status === 'closed' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-3">{job.description}</p>
                    {job.requirements && job.requirements.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Requirements:</p>
                        <ul className="text-xs text-slate-700 space-y-1">
                          {job.requirements.slice(0, 3).map((req, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-indigo-600">•</span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {jobs.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-600">
                  No jobs yet. Create your first job requisition!
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Job Requisition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                data-testid="job-title-input"
                placeholder="Senior Software Engineer"
                value={newJob.title}
                onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  data-testid="job-department-input"
                  placeholder="Engineering"
                  value={newJob.department}
                  onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  data-testid="job-location-input"
                  placeholder="Bangalore, India"
                  value={newJob.location}
                  onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                data-testid="job-description-input"
                placeholder="Job description..."
                value={newJob.description}
                onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="requirements">Requirements (one per line)</Label>
              <Textarea
                id="requirements"
                data-testid="job-requirements-input"
                placeholder="5+ years of experience\nPython expertise\nFastAPI knowledge"
                value={newJob.requirements}
                onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
              />
            </div>
            <Button 
              data-testid="submit-job-btn"
              onClick={handleCreateJob}
              className="w-full bg-[#1e1b4b] hover:bg-[#312e81]"
            >
              Create Job
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
