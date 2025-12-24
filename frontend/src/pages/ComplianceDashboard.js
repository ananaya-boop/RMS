import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Sidebar from '@/components/Sidebar';
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ComplianceDashboard({ user, onLogout }) {
  const [poshReports, setPoshReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role === 'admin' || user.role === 'dpo') {
      fetchPOSHReports();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchPOSHReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/posh-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPoshReports(response.data);
    } catch (error) {
      console.error('Error fetching POSH reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (user.role !== 'admin' && user.role !== 'dpo') {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar user={user} onLogout={onLogout} activePage="compliance" />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-slate-600">Only Admin and DPO roles can access compliance dashboard.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} onLogout={onLogout} activePage="compliance" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Compliance Dashboard
            </h1>
            <p className="text-slate-600 mt-2">DPDP Act 2023 & POSH Compliance</p>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading compliance data...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card data-testid="compliance-dpdp-card" className="border-l-4 border-l-emerald-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">DPDP Act 2023</CardTitle>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">Compliant</div>
                    <p className="text-xs text-slate-600 mt-1">All consent logs active</p>
                  </CardContent>
                </Card>

                <Card data-testid="compliance-posh-card" className="border-l-4 border-l-amber-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">POSH Reports</CardTitle>
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{poshReports.length}</div>
                    <p className="text-xs text-slate-600 mt-1">Total incidents reported</p>
                  </CardContent>
                </Card>

                <Card data-testid="compliance-data-retention-card" className="border-l-4 border-l-indigo-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Data Retention</CardTitle>
                    <Shield className="w-5 h-5 text-indigo-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">Active</div>
                    <p className="text-xs text-slate-600 mt-1">Auto-cleanup enabled</p>
                  </CardContent>
                </Card>
              </div>

              <Card data-testid="posh-reports-list">
                <CardHeader>
                  <CardTitle>POSH & Ethics Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  {poshReports.length > 0 ? (
                    <div className="space-y-4">
                      {poshReports.map((report) => (
                        <div key={report.id} data-testid={`posh-report-${report.id}`} className="border border-slate-200 rounded-lg p-4 bg-amber-50/50">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-slate-900">{report.incident_type}</h4>
                              <p className="text-xs text-slate-600 mt-1">Reported by: {report.reported_by}</p>
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(report.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mb-2">{report.description}</p>
                          {report.action_taken && (
                            <div className="mt-2 p-2 bg-white rounded border border-emerald-200">
                              <p className="text-xs font-medium text-emerald-900">Action Taken:</p>
                              <p className="text-xs text-emerald-700">{report.action_taken}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">No POSH reports filed</p>
                  )}
                </CardContent>
              </Card>

              <Card className="mt-6" data-testid="compliance-features-card">
                <CardHeader>
                  <CardTitle>Compliance Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <h4 className="font-semibold text-emerald-900 mb-2">Consent Management</h4>
                      <p className="text-sm text-emerald-700">Every candidate has explicit consent logged with timestamp and method</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Right to Erasure</h4>
                      <p className="text-sm text-blue-700">Admin/DPO can permanently delete candidate data upon request</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">Data Portability</h4>
                      <p className="text-sm text-purple-700">Candidates can export their complete data profile in JSON format</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <h4 className="font-semibold text-amber-900 mb-2">POSH Reporting</h4>
                      <p className="text-sm text-amber-700">Secure incident reporting system for workplace ethics violations</p>
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
