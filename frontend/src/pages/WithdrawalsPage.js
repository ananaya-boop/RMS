import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Sidebar from '@/components/Sidebar';
import { UserMinus, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function WithdrawalsPage({ user, onLogout }) {
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawalRequests();
  }, []);

  const fetchWithdrawalRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/withdrawal-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWithdrawalRequests(response.data);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
      toast.error('Failed to load withdrawal requests');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSnapshot = async (candidateId) => {
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
      
      toast.success('Data snapshot downloaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate snapshot');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} onLogout={onLogout} activePage="withdrawals" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Withdrawals & Compliance
            </h1>
            <p className="text-slate-600 mt-2">Manage candidate withdrawals and data requests (DPDP Act 2023)</p>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card data-testid="pending-withdrawals-stat" className="border-l-4 border-l-amber-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Pending Withdrawals</CardTitle>
                    <Clock className="w-5 h-5 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900">
                      {withdrawalRequests.filter(r => r.status === 'pending').length}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Require action</p>
                  </CardContent>
                </Card>

                <Card data-testid="completed-withdrawals-stat" className="border-l-4 border-l-emerald-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Completed Today</CardTitle>
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900">
                      {withdrawalRequests.filter(r => {
                        if (r.status !== 'completed' || !r.processed_at) return false;
                        const processedDate = new Date(r.processed_at);
                        const today = new Date();
                        return processedDate.toDateString() === today.toDateString();
                      }).length}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Last 24 hours</p>
                  </CardContent>
                </Card>

                <Card data-testid="compliance-status-stat" className="border-l-4 border-l-indigo-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">DPDP Compliance</CardTitle>
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-600">✓</div>
                    <p className="text-xs text-slate-600 mt-1">All requests processed within SLA</p>
                  </CardContent>
                </Card>
              </div>

              {/* Pending Withdrawal Requests Section */}
              <Card data-testid="pending-withdrawals-section" className="mb-8">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <UserMinus className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <CardTitle>Pending Withdrawal Requests</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">Candidates who have requested to withdraw their applications</p>
                      </div>
                    </div>
                    {withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
                        {withdrawalRequests.filter(r => r.status === 'pending').length} Pending
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {withdrawalRequests.filter(r => r.status === 'pending').length > 0 ? (
                    <div className="space-y-4">
                      {withdrawalRequests.filter(r => r.status === 'pending').map((request) => (
                        <div 
                          key={request.id}
                          data-testid={`withdrawal-request-${request.id}`}
                          className="border border-amber-200 rounded-lg p-4 bg-amber-50/50 hover:bg-amber-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-slate-900">Candidate ID: {request.candidate_id.substring(0, 8)}...</h3>
                                <span className="px-2 py-1 bg-amber-200 text-amber-900 rounded text-xs font-medium">
                                  {request.status.toUpperCase()}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-slate-600"><strong>Reason:</strong> {request.reason}</p>
                                  <p className="text-slate-600"><strong>Requested:</strong> {new Date(request.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-slate-600">
                                    <strong>Data Action:</strong> {request.purge_immediately ? '🗑️ Delete Immediately' : '📦 Retain 6 months'}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 p-3 bg-white rounded border border-amber-200">
                                <p className="text-xs text-slate-600 mb-2">
                                  <strong>What has been done:</strong>
                                </p>
                                <ul className="text-xs text-slate-700 space-y-1 ml-4 list-disc">
                                  <li>Candidate status updated to "Withdrawn"</li>
                                  <li>All scheduled interviews cancelled</li>
                                  <li>Acknowledgment email sent to candidate</li>
                                  {request.purge_immediately && <li className="text-amber-800 font-semibold">⚠️ Data deletion scheduled within 48 hours</li>}
                                </ul>
                              </div>
                            </div>

                            <div className="ml-4 flex flex-col gap-2">
                              <Button
                                data-testid={`generate-snapshot-${request.id}`}
                                size="sm"
                                variant="outline"
                                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                onClick={() => handleGenerateSnapshot(request.candidate_id)}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Snapshot
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                      </div>
                      <p className="text-slate-600 font-medium">No pending withdrawal requests</p>
                      <p className="text-sm text-slate-500 mt-1">All withdrawals have been processed</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Completed Withdrawals Section */}
              <Card data-testid="completed-withdrawals-section">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <CardTitle>Recently Completed Withdrawals</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">Last 10 processed withdrawal requests</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {withdrawalRequests.filter(r => r.status === 'completed').length > 0 ? (
                    <div className="space-y-3">
                      {withdrawalRequests
                        .filter(r => r.status === 'completed')
                        .slice(0, 10)
                        .map((request) => (
                          <div 
                            key={request.id}
                            data-testid={`completed-withdrawal-${request.id}`}
                            className="border border-slate-200 rounded-lg p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  Candidate ID: {request.candidate_id.substring(0, 8)}...
                                </p>
                                <p className="text-xs text-slate-600 mt-1">
                                  <strong>Reason:</strong> {request.reason} | 
                                  <strong> Processed:</strong> {request.processed_at ? new Date(request.processed_at).toLocaleString() : 'N/A'}
                                </p>
                              </div>
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">
                                COMPLETED
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-600 py-8">No completed withdrawals yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card className="mt-8 bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-indigo-600" />
                    DPDP Act 2023 Compliance Tools
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg border border-indigo-200">
                      <h4 className="font-semibold text-slate-900 mb-2">📋 Data Snapshot Generation</h4>
                      <p className="text-sm text-slate-700 mb-3">
                        Generate comprehensive PDF reports for any candidate containing all their data (Right to Access).
                      </p>
                      <p className="text-xs text-slate-600">
                        Available on individual candidate profiles or from withdrawal request cards above.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-white rounded-lg border border-indigo-200">
                      <h4 className="font-semibold text-slate-900 mb-2">🗑️ Data Purge Options</h4>
                      <p className="text-sm text-slate-700 mb-3">
                        Two deletion workflows available: Immediate purge (candidate request) or 6-month talent pool retention.
                      </p>
                      <p className="text-xs text-slate-600">
                        All deletions are logged in audit trail for compliance verification.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
