import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Star, ThumbsUp, Award, AlertCircle, History } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * InterviewScorecardModal - Multi-round scorecard with recommendation toggle
 */
const InterviewScorecardModal = ({ 
  isOpen, 
  onClose, 
  candidate, 
  currentStage,
  stageConfig,
  onSubmit 
}) => {
  const [scores, setScores] = useState({});
  const [overallRating, setOverallRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [recommendation, setRecommendation] = useState('standard'); // standard, highly_recommended
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roundHistory, setRoundHistory] = useState([]);

  useEffect(() => {
    if (isOpen && candidate) {
      fetchRoundHistory();
      initializeScores();
    }
  }, [isOpen, candidate]);

  const initializeScores = () => {
    if (stageConfig?.evaluationCriteria) {
      const initialScores = {};
      stageConfig.evaluationCriteria.forEach(criteria => {
        initialScores[criteria] = 0;
      });
      setScores(initialScores);
    }
  };

  const fetchRoundHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${BACKEND_URL}/api/scorecards/history/${candidate.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoundHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch round history:', error);
    }
  };

  const updateScore = (criteria, value) => {
    setScores({
      ...scores,
      [criteria]: value
    });
  };

  // Auto-calculate overall rating
  useEffect(() => {
    const scoreValues = Object.values(scores);
    if (scoreValues.length > 0) {
      const avg = scoreValues.reduce((sum, val) => sum + val, 0) / scoreValues.length;
      setOverallRating(Math.round(avg));
    }
  }, [scores]);

  const handleSubmit = async () => {
    // Validate all criteria scored
    const unscored = Object.values(scores).filter(s => s === 0);
    if (unscored.length > 0) {
      alert('Please rate all evaluation criteria');
      return;
    }

    if (!notes.trim()) {
      alert('Please add feedback notes');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const scorecardData = {
        candidate_id: candidate.id,
        stage: currentStage,
        scores: scores,
        overall_score: overallRating,
        notes: notes,
        recommendation: stageConfig.hasRecommendation ? recommendation : 'standard',
        interviewed_at: new Date().toISOString()
      };

      const response = await axios.post(
        `${BACKEND_URL}/api/scorecards`,
        scorecardData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(`Scorecard submitted! ${response.data.auto_moved ? `Candidate automatically moved to ${response.data.next_stage}` : ''}`);
        onSubmit?.(scorecardData);
        onClose();
      }
    } catch (error) {
      console.error('Failed to submit scorecard:', error);
      alert('Failed to submit scorecard: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
            <div>
              <h2 className="text-xl font-semibold">Interview Scorecard</h2>
              <p className="text-sm text-indigo-100 mt-1">{stageConfig?.label}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Candidate Info */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Candidate</h3>
                <p className="text-base font-medium text-gray-900">{candidate?.name}</p>
                <p className="text-sm text-gray-600">{candidate?.email}</p>
                {candidate?.experience_years && (
                  <p className="text-sm text-gray-600 mt-1">{candidate.experience_years} years experience</p>
                )}
              </div>

              {/* Round History - Show if exists */}
              {roundHistory.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <History size={18} className="text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-900">Previous Round History</h3>
                  </div>
                  {roundHistory.map((round, idx) => (
                    <div key={idx} className="mb-3 last:mb-0 pb-3 last:pb-0 border-b last:border-0 border-blue-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-blue-900">{round.stage_label}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-blue-700">{round.overall_score}/100</span>
                          {round.recommendation === 'highly_recommended' && (
                            <Award size={16} className="text-yellow-500" title="Highly Recommended" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-blue-700 line-clamp-2">{round.notes}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        By {round.interviewer_name} on {new Date(round.interviewed_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Evaluation Criteria */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Evaluation Criteria</h3>
                <div className="space-y-4">
                  {stageConfig?.evaluationCriteria?.map((criteria, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3">{criteria}</label>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                          <button
                            key={rating}
                            onClick={() => updateScore(criteria, rating * 10)}
                            className={`flex-1 py-2 text-sm font-medium rounded transition-all ${
                              scores[criteria] === rating * 10
                                ? 'bg-indigo-600 text-white shadow-md scale-105'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>Poor</span>
                        <span>Excellent</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Rating Display */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Overall Score</h3>
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated from criteria ratings</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-indigo-600">{overallRating}</div>
                    <div className="text-sm text-gray-600">/100</div>
                  </div>
                </div>
                
                {/* Score interpretation */}
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <div className="flex items-center space-x-2">
                    {overallRating >= 80 && <Star className="text-yellow-500" size={20} />}
                    <span className={`text-sm font-medium ${
                      overallRating >= 80 ? 'text-green-700' :
                      overallRating >= 70 ? 'text-blue-700' :
                      overallRating >= 60 ? 'text-yellow-700' :
                      'text-red-700'
                    }`}>
                      {overallRating >= 80 ? 'Exceptional Performance' :
                       overallRating >= 70 ? 'Strong Performance' :
                       overallRating >= 60 ? 'Satisfactory Performance' :
                       'Below Expectations'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendation Toggle (Only for Round 1) */}
              {stageConfig?.hasRecommendation && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-5">
                  <div className="flex items-start space-x-3 mb-4">
                    <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-yellow-900 mb-2">Fast-Track Recommendation</h3>
                      <p className="text-sm text-yellow-800 mb-4">
                        For exceptional candidates, you can recommend them to skip Round 2 and proceed directly to Round 3 (Final).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 p-4 bg-white border-2 rounded-lg cursor-pointer transition-all hover:border-yellow-400 ${
                      recommendation === 'standard' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
                    }">
                      <input
                        type="radio"
                        name="recommendation"
                        value="standard"
                        checked={recommendation === 'standard'}
                        onChange={(e) => setRecommendation(e.target.value)}
                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">Standard Flow</span>
                        <p className="text-xs text-gray-600">Proceed to Round 2 (Intermediate)</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 p-4 bg-white border-2 rounded-lg cursor-pointer transition-all hover:border-green-400 ${
                      recommendation === 'highly_recommended' ? 'border-green-400 bg-green-50' : 'border-gray-200'
                    }">
                      <input
                        type="radio"
                        name="recommendation"
                        value="highly_recommended"
                        checked={recommendation === 'highly_recommended'}
                        onChange={(e) => setRecommendation(e.target.value)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Award size={16} className="text-green-600" />
                          <span className="text-sm font-medium text-gray-900">Highly Recommended</span>
                        </div>
                        <p className="text-xs text-gray-600">Skip to Round 3 (Final) directly</p>
                      </div>
                    </label>
                  </div>

                  {recommendation === 'highly_recommended' && (
                    <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded text-xs text-green-800">
                      ✓ Candidate will be fast-tracked to Round 3. This will be visible in their round history.
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Feedback *
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Provide detailed feedback about the candidate's performance, strengths, areas of improvement, and overall impression..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This feedback will be visible to future interviewers and saved for Emergent export
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {overallRating >= 70 ? (
                  <span className="text-green-600 font-medium">✓ Candidate meets passing criteria</span>
                ) : (
                  <span className="text-red-600 font-medium">✗ Score below threshold (70)</span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || Object.values(scores).some(s => s === 0) || !notes.trim()}
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Scorecard</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewScorecardModal;
