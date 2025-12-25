import React, { useState } from 'react';
import axios from 'axios';
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * OfferStatusBadge - Display offer status with appropriate styling
 */
const OfferStatusBadge = ({ status, onClick }) => {
  const statusConfig = {
    'pending': {
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      label: 'Pending Signature'
    },
    'sent': {
      icon: Clock,
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      label: 'Offer Sent'
    },
    'accepted': {
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800 border-green-300',
      label: 'Accepted'
    },
    'rejected': {
      icon: XCircle,
      color: 'bg-red-100 text-red-800 border-red-300',
      label: 'Rejected'
    },
    'expired': {
      icon: AlertTriangle,
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      label: 'Expired'
    }
  };

  const config = statusConfig[status] || statusConfig['sent'];
  const Icon = config.icon;

  return (
    <div 
      className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${config.color} cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={onClick}
    >
      <Icon size={12} />
      <span>{config.label}</span>
    </div>
  );
};

/**
 * CandidateCard - Enhanced with offer status
 */
const CandidateCard = ({ 
  candidate, 
  onDragStart, 
  onDecline, 
  onViewProfile,
  offerStatus 
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, candidate)}
      className=\"bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow\"
    >
      <div className=\"flex items-start justify-between mb-2\">
        <div className=\"flex-1\">
          <h4 className=\"font-semibold text-gray-900\">{candidate.name}</h4>
          <p className=\"text-sm text-gray-600\">{candidate.email}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDecline(candidate.id);
          }}
          className=\"text-gray-400 hover:text-red-600 transition-colors\"
        >
          <XCircle size={18} />
        </button>
      </div>

      {candidate.skills && candidate.skills.length > 0 && (
        <div className=\"flex flex-wrap gap-1 mt-2\">
          {candidate.skills.slice(0, 3).map((skill, idx) => (
            <span
              key={idx}
              className=\"px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded\"
            >
              {skill}
            </span>
          ))}
          {candidate.skills.length > 3 && (
            <span className=\"px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded\">
              +{candidate.skills.length - 3} more
            </span>
          )}
        </div>
      )}

      {candidate.experience_years && (
        <p className=\"text-xs text-gray-500 mt-2\">
          {candidate.experience_years} years experience
        </p>
      )}

      {/* Offer Status Badge */}
      {offerStatus && (
        <div className=\"mt-3 pt-3 border-t border-gray-100\">
          <OfferStatusBadge 
            status={offerStatus.status}
            onClick={() => onViewProfile?.(candidate.id)}
          />
        </div>
      )}

      {/* Emergent Readiness Indicator */}
      {candidate.emergent_ready && (
        <div className=\"mt-2 flex items-center space-x-1 text-xs text-green-600\">
          <CheckCircle size={12} />
          <span>Ready for Emergent</span>
        </div>
      )}
    </div>
  );
};

export { OfferStatusBadge, CandidateCard };
