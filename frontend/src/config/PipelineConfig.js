/**
 * Enhanced Pipeline Configuration
 * Multi-round interview system with conditional routing
 */

// ============= UPDATED STAGES CONSTANT =============

const STAGES = [
  { 
    id: 'sourced', 
    label: 'Sourced', 
    color: 'bg-blue-100 border-blue-200',
    description: 'Initial candidate pool'
  },
  { 
    id: 'screening', 
    label: 'Screening', 
    color: 'bg-purple-100 border-purple-200',
    description: 'Resume & phone screening',
    hasScorecard: true,
    evaluationCriteria: [
      'Communication skills',
      'Resume quality',
      'Experience relevance',
      'Availability',
      'Salary expectations'
    ]
  },
  { 
    id: 'round_1_technical', 
    label: 'Round 1 (Technical)', 
    color: 'bg-amber-100 border-amber-200',
    description: 'Core technical competencies',
    hasScorecard: true,
    hasRecommendation: true, // Can recommend for Round 3
    evaluationCriteria: [
      'Technical knowledge',
      'Problem-solving approach',
      'Coding skills',
      'System design understanding',
      'Communication of technical concepts'
    ]
  },
  { 
    id: 'round_2_recommended', 
    label: 'Round 2 (Intermediate)', 
    color: 'bg-indigo-100 border-indigo-200',
    description: 'Specialized intermediary assessment',
    hasScorecard: true,
    evaluationCriteria: [
      'Domain expertise',
      'Project experience',
      'Team collaboration',
      'Learning agility',
      'Cultural alignment'
    ]
  },
  { 
    id: 'round_3_final', 
    label: 'Round 3 (Final)', 
    color: 'bg-violet-100 border-violet-200',
    description: 'Final technical/managerial round',
    hasScorecard: true,
    evaluationCriteria: [
      'Leadership potential',
      'Strategic thinking',
      'Advanced technical depth',
      'Business acumen',
      'Long-term fit'
    ]
  },
  { 
    id: 'hr_round', 
    label: 'HR Round', 
    color: 'bg-cyan-100 border-cyan-200',
    description: 'HR discussion & negotiation',
    hasScorecard: true,
    evaluationCriteria: [
      'Motivation & interest',
      'Career aspirations',
      'Compensation expectations',
      'Notice period',
      'References'
    ]
  },
  { 
    id: 'offer', 
    label: 'Offer', 
    color: 'bg-emerald-100 border-emerald-200',
    description: 'Offer sent & pending acceptance'
  },
  { 
    id: 'onboarding', 
    label: 'Onboarding', 
    color: 'bg-green-100 border-green-200',
    description: 'Accepted & onboarding in progress'
  },
];

// ============= ROUTING LOGIC =============

/**
 * Determine next stage based on current stage and scorecard outcome
 */
const determineNextStage = (currentStage, scorecardData, departmentRules = {}) => {
  const { recommendation, overallScore } = scorecardData;
  
  // Round 1 with High Recommendation → Skip to Round 3
  if (currentStage === 'round_1_technical' && recommendation === 'highly_recommended') {
    return 'round_3_final';
  }
  
  // Round 1 with Pass → Round 2
  if (currentStage === 'round_1_technical' && overallScore >= 70) {
    return 'round_2_recommended';
  }
  
  // Round 1 with Fail → Declined
  if (currentStage === 'round_1_technical' && overallScore < 70) {
    return 'declined';
  }
  
  // Round 2 with Pass → Round 3 (unless dept rules say HR)
  if (currentStage === 'round_2_recommended' && overallScore >= 70) {
    return departmentRules.skipRound3 ? 'hr_round' : 'round_3_final';
  }
  
  // Round 2 with Fail → Declined
  if (currentStage === 'round_2_recommended' && overallScore < 70) {
    return 'declined';
  }
  
  // Round 3 with Pass → HR Round
  if (currentStage === 'round_3_final' && overallScore >= 70) {
    return 'hr_round';
  }
  
  // Round 3 with Fail → Declined
  if (currentStage === 'round_3_final' && overallScore < 70) {
    return 'declined';
  }
  
  // Screening with Pass → Round 1
  if (currentStage === 'screening' && overallScore >= 60) {
    return 'round_1_technical';
  }
  
  // Screening with Fail → Declined
  if (currentStage === 'screening' && overallScore < 60) {
    return 'declined';
  }
  
  // HR Round with Pass → Offer
  if (currentStage === 'hr_round' && overallScore >= 70) {
    return 'offer';
  }
  
  // HR Round with Fail → Declined
  if (currentStage === 'hr_round' && overallScore < 70) {
    return 'declined';
  }
  
  // Default: return null (manual movement)
  return null;
};

// ============= FLOW DIAGRAM =============

/*

CONDITIONAL ROUTING FLOW:

sourced → screening
            ↓
       (score >= 60?)
            ↓
    round_1_technical
            ↓
      ┌─────┴─────┐
      ↓           ↓
 [Recommended] [Standard Pass]
      ↓           ↓
 round_3_final  round_2_recommended
      ↓           ↓
      ↓    (Dept rules check)
      ↓           ↓
      ↓      round_3_final
      ↓           ↓
      └─────┬─────┘
            ↓
        hr_round
            ↓
         offer ⟷ onboarding
            
Any failed round → declined (with DPDP purge)

RECOMMENDATION TRIGGER:
- Round 1 scorecard has "Highly Recommended" toggle
- If enabled: Bypass Round 2, go straight to Round 3
- If disabled: Follow standard flow (Round 2)
- Round 3 interviewer sees "Recommended candidate" flag
- Round history shows why they were fast-tracked

*/

export { STAGES, determineNextStage };
