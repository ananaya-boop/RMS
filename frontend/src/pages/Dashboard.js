import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Sidebar from '@/components/Sidebar';
import { Users, Briefcase, TrendingUp, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

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
                  <CardHeader>
                    <CardTitle>Pipeline Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats?.stage_distribution || {}).map(([stage, count]) => (
                        <div key={stage} className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{stage.replace('_', ' ')}</span>
                          <span className="text-sm font-mono text-slate-700">{count}</span>
                        </div>
                      ))}
                    </div>
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
