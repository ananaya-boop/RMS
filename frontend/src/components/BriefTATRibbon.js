import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, AlertCircle, CheckCircle, TrendingUp, Users, ChevronRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * BriefTATRibbon - Stage-wise efficiency display under Kanban board
 * Shows average TAT for each stage with color-coded bottleneck indicators
 */
const BriefTATRibbon = ({ selectedJobId, onStageClick }) => {
  const [tatData, setTatData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);

  // Stage configuration with benchmarks (in days)
  const stages = [
    {
      id: 'screening',
      label: 'SCR',
      fullName: 'Screening',
      description: 'Application to first contact',
      benchmark: 2,
      icon: '📋',
      color: 'blue'
    },
    {
      id: 'round_1',
      label: 'R1',
      fullName: 'Technical Round 1',
      description: 'First technical assessment',
      benchmark: 3,
      icon: '💻',
      color: 'purple'
    },
    {
      id: 'round_2',
      label: 'R2',
      fullName: 'Technical Round 2',
      description: 'Second technical assessment',
      benchmark: 3,
      icon: '⚙️',
      color: 'indigo'
    },
    {
      id: 'round_3',
      label: 'R3',
      fullName: 'Technical Round 3',
      description: 'Final technical round',
      benchmark: 2,
      icon: '🎯',
      color: 'violet'
    },
    {
      id: 'hr_round',
      label: 'HR',
      fullName: 'HR Round',
      description: 'Culture & salary discussion',
      benchmark: 2,
      icon: '👥',
      color: 'cyan'
    },
    {
      id: 'offer',
      label: 'OFR',
      fullName: 'Offer',
      description: 'Offer sent to candidate response',
      benchmark: 3,
      icon: '📧',
      color: 'emerald'
    }
  ];

  useEffect(() => {
    fetchStageTAT();
  }, [selectedJobId]);

  const fetchStageTAT = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = selectedJobId
        ? `${API}/analytics/tat/stage-wise/job/${selectedJobId}`
        : `${API}/analytics/tat/stage-wise/overview`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTatData(response.data);
    } catch (error) {
      console.error('Failed to fetch stage TAT:', error);
      setTatData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStageStatus = (actualDays, benchmarkDays) => {
    if (!actualDays || actualDays === 0) return 'no-data';
    if (actualDays <= benchmarkDays) return 'on-track';
    if (actualDays <= benchmarkDays * 1.5) return 'at-risk';
    return 'bottleneck';
  };

  const getStatusConfig = (status) => {
    const configs = {
      'on-track': {
        bg: 'bg-green-50',
        border: 'border-green-500',
        text: 'text-green-700',
        badge: 'bg-green-100 text-green-700',
        icon: CheckCircle,
        label: '✓'
      },
      'at-risk': {
        bg: 'bg-amber-50',
        border: 'border-amber-500',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-700',
        icon: AlertCircle,
        label: '⚠'
      },
      'bottleneck': {
        bg: 'bg-red-50',
        border: 'border-red-500',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700',
        icon: AlertCircle,
        label: '🔴'
      },
      'no-data': {
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        text: 'text-slate-500',
        badge: 'bg-slate-100 text-slate-500',
        icon: null,
        label: '—'
      }
    };
    return configs[status] || configs['no-data'];
  };

  const handleStageClick = (stage) => {
    setSelectedStage(stage);
    setShowCandidatesModal(true);
    if (onStageClick) {
      onStageClick(stage);
    }
  };

  const getTotalTAT = () => {
    if (!tatData || !tatData.stage_metrics) return 0;
    return stages.reduce((total, stage) => {
      const metric = tatData.stage_metrics[stage.id];
      return total + (metric?.avg_days || 0);
    }, 0);
  };

  const getBottleneckCount = () => {
    if (!tatData || !tatData.stage_metrics) return 0;
    return stages.filter(stage => {
      const metric = tatData.stage_metrics[stage.id];
      if (!metric) return false;
      const status = getStageStatus(metric.avg_days, stage.benchmark);
      return status === 'bottleneck' || status === 'at-risk';
    }).length;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <div className="animate-pulse flex space-x-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="flex-1 space-y-2">
            <div className="h-16 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalTAT = getTotalTAT();
  const bottleneckCount = getBottleneckCount();
  const totalCandidates = tatData?.total_candidates || 0;

  return (
    <>
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Stage-Wise Efficiency (Brief TAT)
              </h3>
              <p className="text-sm text-slate-600">
                {selectedJobId ? 'Filtered by selected role' : 'All roles'} • 
                Click any stage to see candidates
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total TAT</p>
              <p className="text-2xl font-bold text-slate-900">
                {totalTAT.toFixed(1)}<span className="text-sm text-slate-600 ml-1">days</span>
              </p>
            </div>
            {bottleneckCount > 0 && (
              <div className="text-right">
                <p className="text-xs text-amber-600 uppercase tracking-wide">Bottlenecks</p>
                <p className="text-2xl font-bold text-amber-600">
                  {bottleneckCount}<span className="text-sm text-amber-600 ml-1">stages</span>
                </p>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Candidates</p>
              <p className="text-2xl font-bold text-slate-900">{totalCandidates}</p>
            </div>
          </div>
        </div>

        {/* Stage Timeline Ribbon */}
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-slate-200 rounded-full" 
               style={{ marginLeft: '40px', marginRight: '40px' }}>
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min((totalTAT / 21) * 100, 100)}%` }}
            />
          </div>

          {/* Stage Pills */}
          <div className="flex items-start justify-between relative z-10">
            {stages.map((stage, index) => {
              const metric = tatData?.stage_metrics?.[stage.id];
              const avgDays = metric?.avg_days || 0;
              const candidateCount = metric?.candidate_count || 0;
              const status = getStageStatus(avgDays, stage.benchmark);
              const config = getStatusConfig(status);
              const StatusIcon = config.icon;

              return (
                <div key={stage.id} className="flex flex-col items-center" style={{ width: '140px' }}>
                  {/* Stage Pill */}
                  <button
                    onClick={() => candidateCount > 0 && handleStageClick(stage)}
                    disabled={candidateCount === 0}
                    className={`
                      relative w-full px-4 py-3 rounded-xl border-2 transition-all duration-300
                      ${config.bg} ${config.border}
                      ${candidateCount > 0 ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : 'cursor-not-allowed opacity-60'}
                      group
                    `}
                  >
                    {/* Stage Icon & Label */}
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-2xl">{stage.icon}</span>
                      <span className={`text-sm font-bold ${config.text}`}>
                        {stage.label}
                      </span>
                    </div>

                    {/* TAT Display */}
                    <div className="text-center">
                      {avgDays > 0 ? (
                        <>
                          <div className="flex items-center justify-center space-x-1">
                            <span className={`text-xl font-bold ${config.text}`}>
                              {avgDays.toFixed(1)}
                            </span>
                            <span className="text-xs text-slate-500">d</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            vs {stage.benchmark}d target
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-slate-400">No data</span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className={`mt-2 px-2 py-1 rounded-full text-xs font-medium ${config.badge} flex items-center justify-center space-x-1`}>
                      {StatusIcon && <StatusIcon className="w-3 h-3" />}
                      <span>
                        {status === 'on-track' && 'On Track'}
                        {status === 'at-risk' && 'At Risk'}
                        {status === 'bottleneck' && 'Bottleneck'}
                        {status === 'no-data' && 'No Data'}
                      </span>
                    </div>

                    {/* Candidate Count */}
                    {candidateCount > 0 && (
                      <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                        {candidateCount}
                      </div>
                    )}

                    {/* Hover Tooltip */}
                    {candidateCount > 0 && (
                      <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs rounded-lg p-2 whitespace-nowrap pointer-events-none z-20">
                        <div className="font-semibold">{stage.fullName}</div>
                        <div className="text-slate-300">{stage.description}</div>
                        <div className="mt-1 text-indigo-300">
                          Click to view {candidateCount} {candidateCount === 1 ? 'candidate' : 'candidates'}
                        </div>
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
                      </div>
                    )}
                  </button>

                  {/* Arrow */}
                  {index < stages.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-400 absolute" style={{ top: '32px', left: '145px' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Benchmark Legend */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-6 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-slate-600">On Track (≤ benchmark)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-slate-600">At Risk (≤ 1.5x benchmark)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-slate-600">Bottleneck (> 1.5x benchmark)</span>
            </div>
          </div>

          {bottleneckCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-800">
                {bottleneckCount} stage{bottleneckCount !== 1 ? 's' : ''} need attention
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Candidates in Stage Modal */}
      {showCandidatesModal && selectedStage && (
        <CandidatesInStageModal
          stage={selectedStage}
          jobId={selectedJobId}
          onClose={() => {
            setShowCandidatesModal(false);
            setSelectedStage(null);
          }}
        />
      )}
    </>
  );
};

/**
 * Modal to show candidates currently in a specific stage
 */
const CandidatesInStageModal = ({ stage, jobId, onClose }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidatesInStage();
  }, [stage, jobId]);

  const fetchCandidatesInStage = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = jobId
        ? `${API}/candidates/by-stage/${stage.id}?job_id=${jobId}`
        : `${API}/candidates/by-stage/${stage.id}`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCandidates(response.data.candidates || []);
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 flex items-center space-x-2">
                <span className="text-2xl">{stage.icon}</span>
                <span>Candidates in {stage.fullName}</span>
              </h3>
              <p className="text-sm text-slate-500 mt-1">{stage.description}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : candidates.length > 0 ? (
              <div className="space-y-3">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold text-slate-900">{candidate.name}</h4>
                          {candidate.time_in_stage_days > stage.benchmark && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              Overdue by {(candidate.time_in_stage_days - stage.benchmark).toFixed(1)}d
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{candidate.job_title}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                          <span>📧 {candidate.email}</span>
                          <span>📱 {candidate.phone}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-700">
                          {candidate.time_in_stage_days.toFixed(1)} days
                        </div>
                        <div className="text-xs text-slate-500">in this stage</div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex space-x-2">
                      <button className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors">
                        View Profile
                      </button>
                      <button className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors">
                        View Snapshot
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No candidates currently in this stage</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BriefTATRibbon;
