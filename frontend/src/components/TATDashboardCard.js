import React from 'react';
import { Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * TATDashboardCard - Displays Turn Around Time analytics
 * Shows average TAT metrics with bifurcated breakdown by stage
 */
const TATDashboardCard = ({ jobId, tatData, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="h-20 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!tatData || tatData.total_candidates === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Time to Hire (TAT)</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No completed hires yet</p>
            <p className="text-xs text-slate-400 mt-1">TAT metrics will appear once candidates complete the pipeline</p>
          </div>
        </div>
      </div>
    );
  }

  const {
    avg_total_tat_days,
    avg_screening_tat_days,
    avg_technical_tat_days,
    avg_hr_tat_days,
    avg_offer_tat_days,
    min_total_tat_days,
    max_total_tat_days,
    total_candidates,
    candidates_exceeded,
    target_tat_days = 21,
    is_on_track
  } = tatData;

  const getTATStatus = (actual, target) => {
    if (actual <= target) return 'on-track';
    if (actual <= target * 1.2) return 'at-risk';
    return 'exceeded';
  };

  const status = getTATStatus(avg_total_tat_days, target_tat_days);

  const statusConfig = {
    'on-track': {
      color: 'green',
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      label: 'On Track'
    },
    'at-risk': {
      color: 'amber',
      icon: AlertCircle,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      label: 'At Risk'
    },
    'exceeded': {
      color: 'red',
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      label: 'Exceeded'
    }
  };

  const StatusIcon = statusConfig[status].icon;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Time to Hire (TAT)</h3>
          </div>
          <span className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-full">
            {total_candidates} {total_candidates === 1 ? 'hire' : 'hires'}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Average Total TAT - Prominent Display */}
        <div className={`relative rounded-lg p-6 border-2 ${statusConfig[status].borderColor} ${statusConfig[status].bgColor}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Average Total TAT</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold text-slate-900">
                  {avg_total_tat_days}
                </span>
                <span className="text-xl text-slate-600">days</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-sm text-slate-500">Target: {target_tat_days} days</span>
                <span className={`flex items-center space-x-1 text-sm font-medium ${statusConfig[status].textColor}`}>
                  <StatusIcon className="w-4 h-4" />
                  <span>{statusConfig[status].label}</span>
                </span>
              </div>
            </div>
            
            <div className="text-right">
              {status === 'on-track' ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <TrendingDown className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {Math.round((1 - avg_total_tat_days / target_tat_days) * 100)}% faster
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-600">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {Math.round((avg_total_tat_days / target_tat_days - 1) * 100)}% slower
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bifurcated TAT Breakdown */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">TAT Breakdown by Stage</h4>
          <div className="space-y-3">
            {/* Screening TAT */}
            <TATStageBar
              label="Screening"
              days={avg_screening_tat_days}
              threshold={2}
              color="blue"
            />

            {/* Technical TAT */}
            <TATStageBar
              label="Technical Rounds"
              days={avg_technical_tat_days}
              threshold={8}
              color="purple"
            />

            {/* HR TAT */}
            <TATStageBar
              label="HR Round"
              days={avg_hr_tat_days}
              threshold={2}
              color="cyan"
            />

            {/* Offer TAT */}
            <TATStageBar
              label="Offer"
              days={avg_offer_tat_days}
              threshold={3}
              color="emerald"
            />
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
          <div>
            <p className="text-xs text-slate-500 mb-1">Fastest Hire</p>
            <p className="text-lg font-semibold text-green-600">{min_total_tat_days}d</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Slowest Hire</p>
            <p className="text-lg font-semibold text-amber-600">{max_total_tat_days}d</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Exceeded Threshold</p>
            <p className="text-lg font-semibold text-red-600">
              {candidates_exceeded} / {total_candidates}
            </p>
          </div>
        </div>

        {/* Alert for exceeded candidates */}
        {candidates_exceeded > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">{candidates_exceeded} {candidates_exceeded === 1 ? 'candidate' : 'candidates'} exceeded standard TAT</p>
              <p className="text-xs mt-1">Review candidates in bottleneck stages to improve hiring speed</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * TATStageBar - Progress bar showing TAT for a specific stage
 */
const TATStageBar = ({ label, days, threshold, color }) => {
  const percentage = Math.min((days / threshold) * 100, 100);
  const exceeded = days > threshold;

  const colorClasses = {
    blue: exceeded ? 'bg-red-500' : 'bg-blue-500',
    purple: exceeded ? 'bg-red-500' : 'bg-purple-500',
    cyan: exceeded ? 'bg-red-500' : 'bg-cyan-500',
    emerald: exceeded ? 'bg-red-500' : 'bg-emerald-500'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className={`text-sm font-mono font-semibold ${exceeded ? 'text-red-600' : 'text-slate-600'}`}>
          {days}d / {threshold}d {exceeded && '⚠️'}
        </span>
      </div>
      <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
        {exceeded && (
          <div
            className="absolute top-0 h-full bg-red-500 opacity-30 animate-pulse"
            style={{ width: '100%' }}
          />
        )}
      </div>
    </div>
  );
};

export default TATDashboardCard;
