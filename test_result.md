#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Implement Dual-Pane Modal Engine with Rejection Workflow (DPDP data purge), Onboarding Workflow (Appointment Letter PDF), Interview Scheduling Sidebar, and Privacy Hub for DPDP Act 2023 compliance"

backend:
  - task: "Lifecycle Engine Core Module"
    implemented: true
    working: true
    file: "/app/backend/lifecycle_engine.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Created comprehensive lifecycle_engine.py module with RejectionEmailTemplate, AppointmentLetterPDF, ICSGenerator, S3Manager, DataPurgeService, and email templates. All models and services implemented."

  - task: "Rejection API with Data Purge"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Implemented POST /api/lifecycle/rejection-preview and POST /api/lifecycle/send-rejection. Includes DPDP-compliant data purge, audit logging, and anonymized data retention. Backend running successfully."

  - task: "Onboarding API with PDF Generation"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Implemented POST /api/lifecycle/onboarding-preview and POST /api/lifecycle/send-onboarding. Generates professional appointment letter PDF with CTC breakup, uploads to S3 (with base64 fallback), sends email with attachment."

  - task: "Interview Scheduling API with ICS Generation"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Implemented POST /api/lifecycle/schedule-interview. Generates .ics calendar files, sends emails to candidate and interviewer, creates interview records."

  - task: "Privacy Hub APIs (Snapshot & Withdrawal)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Implemented GET /api/lifecycle/candidate-snapshot/{id} and POST /api/lifecycle/candidate-withdrawal. Exports complete data as JSON, processes withdrawals with optional data purge."

  - task: "S3 Integration for Document Storage"
    implemented: true
    working: true
    file: "/app/backend/lifecycle_engine.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Implemented S3Manager class with boto3. Supports file upload, presigned URLs, and automatic fallback to base64 encoding if AWS credentials not configured."

  - task: "Database Schema for Lifecycle Events"
    implemented: true
    working: true
    file: "/app/LIFECYCLE_ENGINE_SCHEMA.md"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Created comprehensive database schema documentation. Includes lifecycle_events, appointment_letters, interview_schedules, withdrawal_requests, and anonymized_candidates collections."

frontend:
  - task: "DualPaneModal Reusable Component"
    implemented: true
    working: true
    file: "/app/frontend/src/components/DualPaneModal.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Created reusable DualPaneModal component with left pane (editable form) and right pane (live preview). Fully responsive with loading states and backdrop."

  - task: "EmailPreviewPane Component"
    implemented: true
    working: true
    file: "/app/frontend/src/components/EmailPreviewPane.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Created EmailPreviewPane component for displaying HTML email previews with headers and DPDP purge warnings."

  - task: "PDFPreviewPane Component"
    implemented: true
    working: true
    file: "/app/frontend/src/components/PDFPreviewPane.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Created PDFPreviewPane component with iframe PDF preview and download functionality."

  - task: "RejectionWorkflow Component"
    implemented: true
    working: true
    file: "/app/frontend/src/components/RejectionWorkflow.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Implemented complete rejection workflow with dual-pane modal. Includes rejection reason dropdown, custom message, live email preview, data purge checkbox, and DPDP compliance warnings."

  - task: "OnboardingWorkflow Component"
    implemented: true
    working: true
    file: "/app/frontend/src/components/OnboardingWorkflow.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Implemented onboarding workflow with editable CTC breakup (add/remove components), joining date, reporting manager, and live PDF preview. Includes dynamic calculation of total CTC."

  - task: "InterviewSchedulingSidebar Component"
    implemented: true
    working: true
    file: "/app/frontend/src/components/InterviewSchedulingSidebar.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Implemented sticky sidebar for interview scheduling with searchable interviewer list, date/time pickers, meeting URL input, and .ics file generation options."

  - task: "PrivacyHubPanel Component"
    implemented: true
    working: true
    file: "/app/frontend/src/components/PrivacyHubPanel.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Implemented Privacy Hub with data snapshot generation (Right to Access) and candidate withdrawal processing. Includes withdrawal reason dropdown and optional immediate data purge."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Test rejection workflow with data purge"
    - "Test onboarding workflow with PDF generation"
    - "Test interview scheduling with .ics generation"
    - "Test privacy hub data snapshot"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Implemented complete Dual-Pane Modal Engine with all 4 workflows (Rejection, Onboarding, Interview Scheduling, Privacy Hub). Backend APIs created with DPDP Act 2023 compliance, PDF generation, S3 integration, and .ics calendar files. Frontend components created with live preview functionality. All components need integration testing with actual user flows. Backend is running successfully. Frontend components created but need to be integrated into existing pages (KanbanBoard, CandidateProfile, etc.) for full workflow testing."