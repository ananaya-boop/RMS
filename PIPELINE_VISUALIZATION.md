# Multi-Round Pipeline Visualization

## 📊 NEW PIPELINE STRUCTURE WITH CONDITIONAL ROUTING

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RECRUITMENT PIPELINE                             │
│                    (8 Stages with Auto-Routing)                          │
└─────────────────────────────────────────────────────────────────────────┘


    ┌──────────┐
    │ SOURCED  │  Initial candidate pool
    └────┬─────┘
         │ Manual move
         ↓
    ┌──────────┐
    │SCREENING │  Resume & Phone Review
    └────┬─────┘  Pass: 60%+
         │
         ├─── PASS (60%+) ──→ AUTO-MOVE
         │
         └─── FAIL (<60%) ──→ DECLINED (with DPDP purge)
         │
         ↓
    ┌──────────────────┐
    │ ROUND 1          │  Deep Technical Assessment
    │ (TECHNICAL)      │  Pass: 70%+
    └────┬─────────────┘  🏆 Has RECOMMENDATION TOGGLE
         │
         ├─── HIGHLY RECOMMENDED ──→ ⚡ FAST-TRACK ──┐
         │                                            │
         ├─── PASS (70%+) ──→ AUTO-MOVE              │
         │                         ↓                  │
         └─── FAIL (<70%) ──→ DECLINED               │
                                 ↓                    │
                         ┌──────────────┐            │
                         │ ROUND 2      │            │
                         │(INTERMEDIATE)│            │
                         └────┬─────────┘            │
                              │ Pass: 70%+           │
                              │                      │
         ┌────────────────────┼──────────────────────┘
         │                    │
         │    ├─── PASS (70%+) ──→ AUTO-MOVE
         │    │
         │    └─── FAIL (<70%) ──→ DECLINED
         │                    ↓
         │            ┌──────────────┐
         └───────────→│ ROUND 3      │  Final Technical/Managerial
                      │ (FINAL)      │  Pass: 70%+
                      └────┬─────────┘  🔍 Sees Round History
                           │
                           ├─── PASS (70%+) ──→ AUTO-MOVE
                           │
                           └─── FAIL (<70%) ──→ DECLINED
                           │
                           ↓
                      ┌──────────┐
                      │ HR ROUND │  HR Discussion & Negotiation
                      └────┬─────┘  Pass: 70%+
                           │
                           ├─── PASS (70%+) ──→ TRIGGER OFFER EDITOR (Manual)
                           │
                           └─── FAIL (<70%) ──→ DECLINED
                           │
                           ↓
                      ┌──────────┐
                      │  OFFER   │  Offer Sent - Pending Signature
                      └────┬─────┘  Status: Sent/Accepted/Rejected
                           │
                           ├─── ACCEPTED ──→ AUTO-MOVE
                           │
                           ├─── REJECTED ──→ Stay in Offer (flagged)
                           │
                           └─── Can ROLLBACK ←──┐
                           │                     │
                           ↓                     │
                      ┌──────────┐              │
                      │ONBOARDING│  Onboarding in Progress
                      └────┬─────┘  ⚙️ Ready for Emergent Export
                           │                     │
                           └─────────────────────┘


═══════════════════════════════════════════════════════════════════════════

## 🎯 KEY FEATURES

### 1️⃣ RECOMMENDATION TOGGLE (Round 1 Only)
┌────────────────────────────────────────────────────────┐
│  ⚙️ INTERVIEWER DECISION AT ROUND 1                    │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ○ Standard Flow                                       │
│     → Proceed to Round 2 (Intermediate)               │
│                                                         │
│  ● Highly Recommended 🏆                               │
│     → Skip Round 2, Fast-track to Round 3 (Final)     │
│                                                         │
└────────────────────────────────────────────────────────┘

### 2️⃣ AUTO-ROUTING RULES
┌─────────────┬──────────────┬─────────────────────┐
│   Stage     │  Threshold   │   Auto-Destination  │
├─────────────┼──────────────┼─────────────────────┤
│ Screening   │   60%+       │   Round 1           │
│ Round 1     │   70%+       │   Round 2           │
│ Round 1     │ Recommended  │   Round 3 (Skip R2) │
│ Round 2     │   70%+       │   Round 3           │
│ Round 3     │   70%+       │   HR Round          │
│ Any Stage   │   < Pass     │   DECLINED          │
└─────────────┴──────────────┴─────────────────────┘

### 3️⃣ ROUND HISTORY TRACKING
┌────────────────────────────────────────────────────────┐
│  📜 VISIBLE TO NEXT INTERVIEWER                        │
├────────────────────────────────────────────────────────┤
│  ✓ Screening: 85/100 (Passed)                         │
│  ✓ Round 1: 92/100 🏆 HIGHLY RECOMMENDED              │
│  ✗ Round 2: SKIPPED (Fast-tracked)                    │
│  → Round 3: CURRENT STAGE                             │
│                                                         │
│  Interviewer Notes from Round 1:                      │
│  "Exceptional problem solver with strong system       │
│   design skills. Highly recommend for senior role."   │
└────────────────────────────────────────────────────────┘

### 4️⃣ STAGE-SPECIFIC EVALUATION CRITERIA
┌─────────────────┬──────────────────────────────────────┐
│   SCREENING     │ • Communication skills                │
│                 │ • Resume quality                      │
│                 │ • Experience relevance                │
├─────────────────┼──────────────────────────────────────┤
│   ROUND 1       │ • Technical knowledge                 │
│   (Technical)   │ • Problem-solving                     │
│                 │ • Coding skills                       │
│                 │ • System design                       │
├─────────────────┼──────────────────────────────────────┤
│   ROUND 2       │ • Domain expertise                    │
│ (Intermediate)  │ • Project experience                  │
│                 │ • Team collaboration                  │
├─────────────────┼──────────────────────────────────────┤
│   ROUND 3       │ • Leadership potential                │
│   (Final)       │ • Strategic thinking                  │
│                 │ • Advanced technical depth            │
├─────────────────┼──────────────────────────────────────┤
│   HR ROUND      │ • Motivation & interest               │
│                 │ • Career aspirations                  │
│                 │ • Compensation expectations           │
└─────────────────┴──────────────────────────────────────┘

### 5️⃣ SCORECARD INTERFACE
┌────────────────────────────────────────────────────────┐
│  Interview Scorecard - Round 1 (Technical)            │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Technical Knowledge                                   │
│  [1][2][3][4][5][6][7][8][9][10]                      │
│   Poor ←──────────────────→ Excellent                 │
│                                                         │
│  Problem-Solving Approach                             │
│  [1][2][3][4][5][6][7][8][9][10]                      │
│                                                         │
│  ... (all criteria) ...                               │
│                                                         │
│  ┌──────────────────────────────────────────┐         │
│  │  Overall Score: 85/100                   │         │
│  │  ⭐ Exceptional Performance               │         │
│  └──────────────────────────────────────────┘         │
│                                                         │
│  ⚠️ FAST-TRACK RECOMMENDATION                         │
│  ○ Standard Flow → Round 2                            │
│  ● Highly Recommended → Round 3 (Skip R2) 🏆         │
│                                                         │
│  Detailed Feedback:                                   │
│  [Text area for notes...]                             │
│                                                         │
│  [Cancel]              [Submit Scorecard]             │
└────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════

## 🎨 KANBAN BOARD VIEW

┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ SOURCED │SCREENING│ ROUND 1 │ ROUND 2 │ ROUND 3 │   HR    │  OFFER  │ONBOARD  │
│    1    │    1    │    1    │    0    │    1    │    1    │    0    │    0    │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│         │         │         │         │         │         │         │         │
│ [Card1] │ [Card2] │ [Card3] │   ---   │ [Card4] │ [Card5] │   ---   │   ---   │
│         │         │  🏆      │         │  🏆     │         │         │         │
│         │         │Recommend │         │Fast-    │         │         │         │
│         │         │  Ready   │         │Tracked  │         │         │         │
│         │         │         │         │         │         │         │         │
│         │         │[Submit  │         │[Submit  │         │         │         │
│         │         │Scorecard│         │Scorecard│         │         │         │
│         │         │ Button] │         │ Button] │         │         │         │
│         │         │         │         │         │         │         │         │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘

                              DECLINED SIDEBAR →
                            ┌─────────────────┐
                            │   Declined (2)  │
                            ├─────────────────┤
                            │ [Failed Card1]  │
                            │ [Rejected Card2]│
                            │                 │
                            │ [Process DPDP   │
                            │  Data Purge]    │
                            └─────────────────┘

═══════════════════════════════════════════════════════════════════════════

## 📈 WORKFLOW EXAMPLES

### Example 1: STANDARD FLOW
Candidate A: Average performer
┌─────────────────────────────────────────────────────────┐
│ Sourced → Screening (75%) → Round 1 (72%)              │
│           ↓                    ↓                        │
│        AUTO-MOVE         AUTO-MOVE (Standard)          │
│                               ↓                         │
│           Round 2 (78%) → Round 3 (75%) → HR (80%)    │
│                ↓              ↓              ↓          │
│           AUTO-MOVE      AUTO-MOVE       OFFER EDITOR  │
│                                               ↓         │
│                                          Offer → Onboard│
└─────────────────────────────────────────────────────────┘
Total Rounds: 6 interviews | Timeline: ~2-3 weeks

### Example 2: FAST-TRACK (HIGHLY RECOMMENDED)
Candidate B: Exceptional talent
┌─────────────────────────────────────────────────────────┐
│ Sourced → Screening (88%) → Round 1 (95%) 🏆          │
│           ↓                    ↓                        │
│        AUTO-MOVE         HIGHLY RECOMMENDED            │
│                               ↓                         │
│                          SKIP Round 2                   │
│                               ↓                         │
│           Round 3 (90%) → HR (85%) → Offer → Onboard  │
│                ↓              ↓                         │
│           AUTO-MOVE      OFFER EDITOR                  │
└─────────────────────────────────────────────────────────┘
Total Rounds: 5 interviews | Timeline: ~1-2 weeks | ⚡ FASTER

### Example 3: FAILED ROUND
Candidate C: Did not meet standards
┌─────────────────────────────────────────────────────────┐
│ Sourced → Screening (72%) → Round 1 (55%)              │
│           ↓                    ↓                        │
│        AUTO-MOVE          FAILED (<70%)                │
│                               ↓                         │
│                          DECLINED                       │
│                               ↓                         │
│                    Rejection Email + DPDP Purge       │
└─────────────────────────────────────────────────────────┘
Total Rounds: 3 interviews | Outcome: Rejected

═══════════════════════════════════════════════════════════════════════════

## 🔧 TECHNICAL IMPLEMENTATION

### Components Created:
✓ PipelineConfig.js - Stage definitions & routing logic
✓ InterviewScorecardModal.js - Scorecard with recommendation toggle
✓ Backend API - POST /api/scorecards (auto-routing)
✓ Backend API - GET /api/scorecards/history/{id}

### Integration Points:
✓ KanbanBoard.js - Uses STAGES constant
✓ CandidateCard.js - Shows stage & "Submit Scorecard" button
✓ RejectionWorkflow.js - Triggered on failed rounds
✓ EmergentOfferEditor.js - Triggered after HR pass

═══════════════════════════════════════════════════════════════════════════

This visualization shows the complete multi-round pipeline with:
• Conditional routing based on scores
• Recommendation toggle for exceptional candidates
• Auto-movement between stages
• Stage-specific evaluation criteria
• Round history tracking
• Integration with existing workflows
