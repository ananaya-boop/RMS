import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, ChevronDown, ChevronUp, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * CandidateTATBreakdown - Detailed TAT breakdown for individual candidate
 * Shows exact time spent in each stage with heat map indicators
 */
const CandidateTATBreakdown = ({ candidate, isExpanded, onToggle }) => {
  const [tatData, setTatData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isExpanded && !tatData) {
      fetchCandidateTAT();
    }
  }, [isExpanded]);

  const fetchCandidateTAT = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/analytics/tat/candidate/${candidate.id}/detailed`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTatData(response.data);
    } catch (error) {
      console.error('Failed to fetch candidate TAT:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stagnancy Heat Map Logic
  const getStagnancyStatus = (hours) => {
    if (hours === 0) return 'no-data';
    if (hours <= 24) return 'fresh';      // Green
    if (hours <= 48) return 'attention';  // Amber
    return 'critical';                    // Red
  };

  const getHeatMapConfig = (status) => {
    const configs = {
      'fresh': {
        bg: 'bg-green-50',
        border: 'border-green-500',
        text: 'text-green-700',
        badge: 'bg-green-100 text-green-700',
        dot: 'bg-green-500',
        label: '✓ Fresh',
        icon: CheckCircle
      },
      'attention': {
        bg: 'bg-amber-50',
        border: 'border-amber-500',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-700',
        dot: 'bg-amber-500',
        label: '⚠ Needs Attention',
        icon: AlertCircle
      },
      'critical': {
        bg: 'bg-red-50',
        border: 'border-red-500',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700',
        dot: 'bg-red-500 animate-pulse',
        label: '🔴 Critical',
        icon: AlertCircle
      },
      'no-data': {
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        text: 'text-slate-500',
        badge: 'bg-slate-100 text-slate-500',
        dot: 'bg-slate-300',
        label: '— N/A',
        icon: null
      }
    };
    return configs[status] || configs['no-data'];
  };

  const formatDuration = (hours) => {
    if (!hours || hours === 0) return '—';
    
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    const minutes = Math.floor((hours % 1) * 60);

    if (days > 0) {
      return `${days}d ${remainingHours}h`;
    } else if (remainingHours > 0) {
      return `${remainingHours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Current stage stagnancy for card display
  const currentStageHours = tatData?.current_stage_duration_hours || 0;
  const currentStageStatus = getStagnancyStatus(currentStageHours);
  const currentConfig = getHeatMapConfig(currentStageStatus);

  return (
    <div className="mt-2">
      {/* TAT Icon Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`
          w-full flex items-center justify-between px-3 py-2 rounded-lg border-2 transition-all
          ${isExpanded ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-indigo-300'}
        `}
      >
        <div className="flex items-center space-x-2">
          <div className={`relative ${currentConfig.dot} w-2 h-2 rounded-full`}></div>
          <Clock className={`w-4 h-4 ${currentConfig.text}`} />
          <span className={`text-xs font-medium ${currentConfig.text}`}>
            {formatDuration(currentStageHours)} in current stage
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Expanded TAT Breakdown */}
      {isExpanded && (
        <div className="mt-3 border-2 border-indigo-200 rounded-lg p-4 bg-gradient-to-br from-white to-indigo-50">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-xs text-slate-500 mt-2">Loading TAT data...</p>
            </div>
          ) : tatData ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-200">
                <h4 className="text-sm font-bold text-slate-900">TAT Breakdown</h4>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total TAT</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {tatData.total_tat_days?.toFixed(1) || 0}d
                  </p>
                </div>
              </div>

              {/* Stage Timeline */}
              <div className="space-y-3">
                {tatData.stage_breakdown?.map((stage, index) => {
                  const stageHours = stage.duration_hours || 0;
                  const status = getStagnancyStatus(stageHours);
                  const config = getHeatMapConfig(status);
                  const StatusIcon = config.icon;

                  return (
                    <div key={index} className={`relative rounded-lg border-2 ${config.border} ${config.bg} p-3 transition-all`}>
                      {/* Stage Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className={`${config.dot} w-2 h-2 rounded-full flex-shrink-0`}></div>
                            <span className="text-sm font-semibold text-slate-900">
                              {stage.stage_name}
                            </span>
                            {StatusIcon && <StatusIcon className={`w-3 h-3 ${config.text}`} />}
                          </div>
                          
                          {/* Timestamps */}
                          <div className="ml-4 space-y-0.5">
                            <div className="flex items-center space-x-2 text-xs text-slate-600">
                              <span className="font-medium">Entry:</span>
                              <span>{new Date(stage.entry_time).toLocaleString()}</span>
                            </div>
                            {stage.exit_time && (
                              <div className="flex items-center space-x-2 text-xs text-slate-600">
                                <span className="font-medium">Exit:</span>
                                <span>{new Date(stage.exit_time).toLocaleString()}</span>
                              </div>
                            )}
                            {!stage.exit_time && (
                              <div className="flex items-center space-x-2 text-xs text-amber-600">
                                <span className="font-medium">Status:</span>
                                <span className="animate-pulse">⏱ Currently in this stage</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Duration */}
                        <div className="text-right">
                          <div className={`text-lg font-bold ${config.text}`}>
                            {formatDuration(stageHours)}
                          </div>
                          <div className={`text-xs px-2 py-0.5 rounded-full mt-1 ${config.badge}`}>
                            {config.label}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${status === 'critical' ? 'bg-red-500' : status === 'attention' ? 'bg-amber-500' : 'bg-green-500'} transition-all`}
                          style={{ width: `${Math.min((stageHours / 48) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Stats */}
              <div className="mt-4 pt-4 border-t border-indigo-200 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Stages Completed</p>
                  <p className="text-lg font-bold text-slate-900">
                    {tatData.stages_completed || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Avg per Stage</p>
                  <p className="text-lg font-bold text-slate-900">
                    {tatData.average_stage_days?.toFixed(1) || 0}d
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <div className={`text-xs px-2 py-1 rounded-full ${currentConfig.badge} font-semibold`}>
                    {tatData.exceeded_benchmarks?.length > 0 ? '⚠ Delayed' : '✓ On Track'}
                  </div>
                </div>
              </div>

              {/* Benchmarks Exceeded Alert */}
              {tatData.exceeded_benchmarks?.length > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold">Exceeded Benchmarks:</p>
                    <p className="mt-1">{tatData.exceeded_benchmarks.join(', ')}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-sm text-slate-500">
              No TAT data available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * CandidateTATHeatIndicator - Small heat map dot for quick visual feedback
 * Shows on candidate card without expansion
 */
export const CandidateTATHeatIndicator = ({ hours, size = 'sm' }) => {
  const getStagnancyStatus = (hours) => {
    if (hours === 0) return 'no-data';
    if (hours <= 24) return 'fresh';
    if (hours <= 48) return 'attention';
    return 'critical';
  };

  const status = getStagnancyStatus(hours);
  
  const colors = {
    'fresh': 'bg-green-500',
    'attention': 'bg-amber-500',
    'critical': 'bg-red-500 animate-pulse',
    'no-data': 'bg-slate-300'
  };

  const sizes = {
    'sm': 'w-2 h-2',
    'md': 'w-3 h-3',
    'lg': 'w-4 h-4'
  };

  return (
    <div 
      className={`${sizes[size]} ${colors[status]} rounded-full flex-shrink-0`}
      title={`${hours.toFixed(1)} hours in current stage`}
    />
  );
};

/**
 * ViewByCandidateToggle - Toggle to switch between stage view and candidate view
 * Integrates into Brief TAT Ribbon
 */
export const ViewByCandidateToggle = ({ isOn, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm
        ${isOn 
          ? 'bg-indigo-600 border-indigo-600 text-white' 
          : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400'}
      `}
    >
      <div className={`relative w-10 h-5 rounded-full transition-colors ${isOn ? 'bg-indigo-800' : 'bg-slate-300'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <span>View by Candidate</span>
    </button>
  );
};

/**
 * CandidateRowView - Individual candidate row showing time in each stage
 * Used when "View by Candidate" toggle is ON
 */
export const CandidateRowView = ({ candidate, stages }) => {
  const [tatData, setTatData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidateStageTimes();
  }, [candidate.id]);

  const fetchCandidateStageTimes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/analytics/tat/candidate/${candidate.id}/by-stage`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTatData(response.data);
    } catch (error) {
      console.error('Failed to fetch stage times:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageTime = (stageId) => {
    if (!tatData || !tatData.stage_times) return null;
    return tatData.stage_times[stageId];
  };

  const formatTime = (hours) => {
    if (!hours || hours === 0) return '—';
    const days = Math.floor(hours / 24);
    const hrs = Math.floor(hours % 24);
    if (days > 0) return `${days}d ${hrs}h`;
    return `${hrs}h`;
  };

  const getStagnancyColor = (hours) => {
    if (!hours) return 'bg-slate-100';
    if (hours <= 24) return 'bg-green-100';
    if (hours <= 48) return 'bg-amber-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-8 gap-2 p-3 bg-slate-50 rounded-lg animate-pulse">
        <div className="h-8 bg-slate-200 rounded col-span-2"></div>
        {stages.map((_, i) => (
          <div key={i} className="h-8 bg-slate-200 rounded"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-8 gap-2 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-all">
      {/* Candidate Info */}
      <div className="col-span-2 flex items-center space-x-3">
        <CandidateTATHeatIndicator hours={tatData?.current_stage_hours || 0} size="md" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{candidate.name}</p>
          <p className="text-xs text-slate-500 truncate">{candidate.job_title}</p>
        </div>
      </div>

      {/* Stage Times */}
      {stages.map((stage) => {
        const stageTime = getStageTime(stage.id);
        const hours = stageTime?.hours || 0;
        const bgColor = getStagnancyColor(hours);

        return (
          <div
            key={stage.id}
            className={`flex flex-col items-center justify-center p-2 rounded-lg ${bgColor} transition-all`}
          >
            <p className="text-xs font-semibold text-slate-700">
              {formatTime(hours)}
            </p>
            <p className="text-xs text-slate-500">{stage.label}</p>
          </div>
        );
      })}
    </div>
  );
};

export default CandidateTATBreakdown;
