import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Sidebar from '@/components/Sidebar';
import JobRoleFilter from '@/components/JobRoleFilter';
import { Users, Briefcase, TrendingUp, Clock, Filter, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedJobId !== null) {
      fetchFilteredStats(selectedJobId);
    } else {
      fetchStats();
    }
  }, [selectedJobId]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch both stats and jobs in parallel
      const [statsResponse, jobsResponse] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/jobs`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setStats(statsResponse.data);
      setJobs(jobsResponse.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredStats = async (jobId) => {
    setFilterLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/dashboard/stats/by-job/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching filtered stats:', error);
    } finally {
      setFilterLoading(false);
    }
  };

  const handleJobSelect = (jobId) => {
    setSelectedJobId(jobId);
  };

  const getSelectedJobTitle = () => {
    if (!selectedJobId) return null;
    const job = jobs.find(j => j.id === selectedJobId);
    return job?.title || '';
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} onLogout={onLogout} activePage="dashboard" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Control Room
            </h1>
            <p className="text-slate-600 mt-2">Welcome back, {user.name}</p>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading dashboard...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card data-testid="stat-card-jobs" className="col-span-1 border-l-4 border-l-indigo-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Active Jobs</CardTitle>
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900">{stats?.total_jobs || 0}</div>
                  </CardContent>
                </Card>

                <Card data-testid="stat-card-candidates" className="col-span-1 border-l-4 border-l-emerald-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Total Candidates</CardTitle>
                    <Users className="w-5 h-5 text-emerald-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900">{stats?.total_candidates || 0}</div>
                  </CardContent>
                </Card>

                <Card data-testid="stat-card-pipeline" className="col-span-1 border-l-4 border-l-amber-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">In Pipeline</CardTitle>
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900">
                      {(stats?.stage_distribution?.screened || 0) + 
                       (stats?.stage_distribution?.technical || 0) + 
                       (stats?.stage_distribution?.hr_round || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="stat-card-offers" className="col-span-1 border-l-4 border-l-rose-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Offers Extended</CardTitle>
                    <Clock className="w-5 h-5 text-rose-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900">{stats?.stage_distribution?.offer || 0}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card data-testid="stage-distribution-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                      <CardTitle className="text-lg font-semibold">Pipeline Distribution</CardTitle>
                      {selectedJobId && (
                        <p className="text-xs text-slate-500 mt-1">
                          Filtered by: <span className="font-medium text-indigo-600">{getSelectedJobTitle()}</span>
                        </p>
                      )}
                    </div>
                    
                    {/* Job Role Filter - Top Right */}
                    <JobRoleFilter
                      jobs={jobs}
                      selectedJob={selectedJobId}
                      onJobSelect={handleJobSelect}
                      className="ml-auto"
                    />
                  </CardHeader>
                  
                  <CardContent>
                    {filterLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      </div>
                    ) : (
                      <>
                        {/* Stage Distribution List */}
                        <div className="space-y-3">
                          {/* New Leads / Null */}
                          <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-medium text-slate-700">New Leads / Sourced</span>
                            </div>
                            <span className="text-sm font-mono font-semibold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                              {stats?.stage_distribution?.sourced || 0}
                            </span>
                          </div>

                          {/* Screening */}
                          <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-sm font-medium text-slate-700">Screening</span>
                            </div>
                            <span className="text-sm font-mono font-semibold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                              {stats?.stage_distribution?.screening || 0}
                            </span>
                          </div>

                          {/* Technical Rounds */}
                          <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                              <span className="text-sm font-medium text-slate-700">Technical Rounds</span>
                            </div>
                            <span className="text-sm font-mono font-semibold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                              {(stats?.stage_distribution?.round_1_technical || 0) + 
                               (stats?.stage_distribution?.round_2_recommended || 0) + 
                               (stats?.stage_distribution?.round_3_final || 0) +
                               (stats?.stage_distribution?.technical || 0)}
                            </span>
                          </div>

                          {/* HR Round */}
                          <div className="flex items-center justify-between py-2 px-3 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors border border-cyan-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-cyan-600 rounded-full"></div>
                              <span className="text-sm font-semibold text-cyan-900">HR Round</span>
                            </div>
                            <span className="text-sm font-mono font-bold text-cyan-900 bg-white px-2.5 py-1 rounded-md border border-cyan-300">
                              {stats?.stage_distribution?.hr_round || 0}
                            </span>
                          </div>

                          {/* Offer */}
                          <div className="flex items-center justify-between py-2 px-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                              <span className="text-sm font-semibold text-emerald-900">Offer Stage</span>
                            </div>
                            <span className="text-sm font-mono font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-md border border-emerald-300">
                              {stats?.stage_distribution?.offer || 0}
                            </span>
                          </div>

                          {/* Onboarding */}
                          <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                              <span className="text-sm font-semibold text-green-900">Onboarding</span>
                            </div>
                            <span className="text-sm font-mono font-bold text-green-900 bg-white px-2.5 py-1 rounded-md border border-green-300">
                              {stats?.stage_distribution?.onboarding || 0}
                            </span>
                          </div>

                          {/* Declined - Show only if count > 0 */}
                          {(stats?.stage_distribution?.declined || 0) > 0 && (
                            <div className="flex items-center justify-between py-2 px-3 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors border border-rose-200">
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-rose-600 rounded-full"></div>
                                <span className="text-sm font-medium text-rose-900">Declined</span>
                              </div>
                              <span className="text-sm font-mono font-semibold text-rose-900 bg-white px-2.5 py-1 rounded-md border border-rose-300">
                                {stats?.stage_distribution?.declined || 0}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Zero State Message */}
                        {stats?.total_candidates === 0 && (
                          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-amber-900">No candidates found</p>
                              <p className="text-xs text-amber-700 mt-1">
                                {selectedJobId 
                                  ? 'No candidates are currently in the pipeline for this role.'
                                  : 'Start by adding candidates to see pipeline distribution.'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Quick Actions for HR Round & Offer */}
                        {((stats?.stage_distribution?.hr_round || 0) > 0 || (stats?.stage_distribution?.offer || 0) > 0) && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="text-xs font-medium text-slate-600 mb-2">Quick Actions:</p>
                            <div className="flex gap-2">
                              {(stats?.stage_distribution?.hr_round || 0) > 0 && (
                                <button
                                  onClick={() => navigate('/kanban')}
                                  className="text-xs px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-md hover:bg-cyan-200 transition-colors font-medium"
                                >
                                  Review HR Candidates
                                </button>
                              )}
                              {(stats?.stage_distribution?.offer || 0) > 0 && (
                                <button
                                  onClick={() => navigate('/kanban')}
                                  className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors font-medium"
                                >
                                  Manage Offers
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card data-testid="recent-candidates-card">
                  <CardHeader>
                    <CardTitle>Recent Candidates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats?.recent_candidates?.length > 0 ? (
                        stats.recent_candidates.map((candidate) => (
                          <div 
                            key={candidate.id} 
                            data-testid={`candidate-item-${candidate.id}`}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            onClick={() => navigate(`/candidate/${candidate.id}`)}
                          >
                            <div>
                              <p className="font-medium text-slate-900">{candidate.name}</p>
                              <p className="text-xs text-slate-600">{candidate.email}</p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-800">
                              {candidate.stage}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-600">No recent candidates</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 flex gap-4">
                <Button 
                  data-testid="view-kanban-btn"
                  onClick={() => navigate('/kanban')}
                  className="bg-[#1e1b4b] hover:bg-[#312e81]"
                >
                  View Kanban Board
                </Button>
                <Button 
                  data-testid="manage-jobs-btn"
                  onClick={() => navigate('/jobs')}
                  variant="outline"
                >
                  Manage Jobs
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
