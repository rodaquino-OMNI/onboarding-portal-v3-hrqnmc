# AI SWARM COORDINATION PROMPT - ONBOARDING PORTAL COMPLETION MISSION

**Mission ID:** OMNI-COMPLETION-PHASE-2
**Priority:** CRITICAL
**Estimated Duration:** 3-5 days parallel execution
**Target:** 100% Production-Ready Status

---

## VERIFIED CURRENT STATE (Evidence-Based Assessment)

### Frontend Status
- **TypeScript Errors:** 321 (BLOCKER - Build fails)
- **Test Coverage:** 4.24% statements, 4.33% branches, 1.38% functions
- **Tests:** 150 total (105 passing, 45 failing)
- **Test Files:** 14 files with 3,251 lines of test code
- **Build Status:** FAILING due to type errors
- **Dependencies:** Installed and functional

### Backend Services Status
- **auth-service (Node.js):** 3 TypeScript compilation errors (implicit any types)
- **api-gateway (Node.js):** Build configuration errors (wrong tsconfig references)
- **document-service (Go):** Implementation exists, build status unknown
- **enrollment-service (Java):** Implementation exists with test files
- **health-service (Python):** CRITICAL - Hardcoded password at line 34 of settings.py
- **policy-service (Java):** Implementation exists
- **payment-service (Java):** FULLY IMPLEMENTED (contrary to reports claiming missing)

### Documentation & Infrastructure
- **CI/CD Workflows:** 7 workflows created
- **OpenAPI Specs:** 6 specification files exist
- **Documentation:** Comprehensive reports created (9 major documents)
- **K8s Manifests:** Present in src/backend/k8s/
- **Git Activity:** 34 commits, 281 files changed, 73,184 insertions in last 14 days

### Critical Gaps Identified
1. TypeScript compilation completely broken (321 errors)
2. Test coverage far below 40% target
3. Backend services not all compiling cleanly
4. Security vulnerability present and unfixed
5. Integration tests do not exist
6. LGPD compliance features incomplete
7. Performance optimization not started

---

## MISSION OBJECTIVE

Transform the onboarding portal from current state to 100% production-ready with:
- **ZERO TypeScript compilation errors**
- **40%+ frontend test coverage with all tests passing**
- **60%+ backend test coverage per service**
- **All backend services compiling and running**
- **All security vulnerabilities resolved**
- **LGPD compliance complete**
- **Integration test suite operational**

---

## AGENT DISTRIBUTION & COORDINATION

### Central Coordinator Agent
**Role:** Orchestrate all agents, prevent conflicts, verify progress

**Responsibilities:**
- Assign non-overlapping file sets to each agent
- Monitor git commits from all agents in real-time
- Resolve merge conflicts immediately
- Verify each agent's claims with hard evidence
- Halt agents making false progress claims
- Maintain master progress tracking document
- Ensure no duplicate work across agents

**Critical Rules:**
- Pull latest changes before allowing any agent to start work
- Require commit after every 10 fixes maximum
- Block agents from working on same files simultaneously
- Verify error counts independently after each batch
- Reject unverifiable claims immediately

---

## PHASE 1: CRITICAL BLOCKERS (Priority 0)

### Agent Alpha: Frontend TypeScript Eliminator
**Target:** Reduce 321 errors to 0
**Time Estimate:** 8-12 hours
**Files Assigned:** src/web/src/ (exclusive access)

**Tasks in Priority Order:**

**1.1 Module Import Resolution**
Identify all "Cannot find module" errors for react, @mui, axios, zod, and other dependencies. These indicate missing type definitions or incorrect tsconfig settings. Add missing @types packages to package.json. Verify node_modules/@types directories exist. Fix tsconfig.json compilerOptions paths and moduleResolution settings. Ensure all imports resolve correctly.

**1.2 Storage Utils Export Completion**
Fix validateStorageIntegrity function missing from storage.utils.ts exports. Search for all functions called from storage.utils that don't exist. Implement missing validation functions or remove dead code calling them. Verify all exported functions are actually defined.

**1.3 Type Compatibility Fixes**
Fix "Type X is not assignable to type Y" errors in services. Align AuthError type to include code, timestamp, requestId properties. Fix ApiRequestConfig interface to include method, params properties. Ensure PaginatedResponse and ApiResponse types match actual usage. Fix Date vs number type mismatches throughout.

**1.4 API Service Default Export**
Change api.service.ts to export default ApiService or change all imports to named imports. Ensure consistency across all service files. Update document.service.ts and other consumers.

**1.5 Policy Service Endpoints**
Add missing BASE property to POLICY_ENDPOINTS constant object. Verify all endpoint constants are properly defined. Check other service endpoint definitions for similar missing properties.

**1.6 ErrorHandler Static Method Access**
Fix ErrorHandler.handle() method calls to use static access correctly. Verify class structure and method definitions. Ensure all error handling patterns are consistent.

**1.7 Generic Type Constraints**
Fix "Type T is generic and can only be indexed for reading" errors in enrollment.service.ts. Add proper type constraints to generic functions. Remove improper indexed access on generic types. Use proper type guards instead.

**1.8 Missing Component Props**
Fix LoginFormProps missing onSuccess and onMFARequired properties. Add all required props to component interfaces. Verify prop types match actual usage in components.

**1.9 AuthContext Interface Completion**
Add missing retryCount property to AuthContext type. Add missing checkResetAttempts method to AuthContext interface. Implement these in AuthProvider. Verify all context properties match all usage locations.

**1.10 Verify Zero Errors**
After each batch of fixes, run build and count errors. Report exact error count with evidence. Continue until count reaches ZERO. Do not stop until build succeeds completely.

**Success Criteria:**
- npm run build exits with code 0
- Zero TypeScript errors in output
- All files type-check successfully
- Provide build output as evidence

**Coordination Protocol:**
- Commit after every 50 errors fixed
- Push to branch after every commit
- Report current error count after each batch
- If error count increases, immediately investigate and revert
- Request coordinator review if stuck for 1 hour

---

### Agent Bravo: Backend Service Compilation Fixer
**Target:** All backend services compile with zero errors
**Time Estimate:** 6-8 hours
**Services Assigned:** auth-service, api-gateway only (exclusive)

**Tasks in Priority Order:**

**2.1 Auth Service TypeScript Errors**
Fix three implicit any type errors in auth.validator.ts at lines 58, 106, 147. Add explicit type annotations to binding elements and parameters. Ensure strict mode compliance. Run build to verify zero errors.

**2.2 API Gateway TSConfig Cleanup**
Remove invalid references to enrollment-service, health-service, policy-service from tsconfig.json. These are Java/Python services and should not be in Node.js tsconfig. Fix project references to only include valid Node.js services. Verify build succeeds.

**2.3 Install Missing Dependencies**
Check package.json for all services. Install any missing dependencies causing build failures. Verify node_modules directories are complete. Run npm install in each service directory.

**2.4 Jest Installation**
Install jest and ts-jest in auth-service devDependencies. Ensure test infrastructure is functional. Verify npm test can at least start.

**2.5 Verify All Builds Pass**
Run npm run build in auth-service and api-gateway. Ensure both exit with code 0. Provide build output as evidence. Do not proceed until both build successfully.

**Success Criteria:**
- auth-service builds with zero errors
- api-gateway builds with zero errors
- Both services generate dist/ directories
- Provide build logs as evidence

**Coordination Protocol:**
- Commit after fixing each service
- Do not modify Java, Go, or Python services
- Report build status after each fix
- Share any dependency version conflicts with coordinator

---

### Agent Charlie: Security Vulnerability Eliminator
**Target:** Fix all security vulnerabilities immediately
**Time Estimate:** 2-4 hours
**Priority:** CRITICAL (blocks production)

**Tasks in Priority Order:**

**3.1 Fix Hardcoded Password**
Open src/backend/health-service/src/config/settings.py line 34. Change hardcoded password "health_pass" to read from environment variable. Implement proper fallback for development. Use os.getenv with secure default. Add validation that production never uses default. Document in .env.example. Verify fix with code review.

**3.2 Update Frontend Dependencies**
Address esbuild and vite moderate vulnerabilities in src/web. Evaluate upgrade path to vite 7.x. Test build after upgrade. If breaking changes found, document accepted risk and mitigation. Update package.json and package-lock.json. Verify npm audit shows reduced vulnerabilities.

**3.3 Backend Dependencies Audit**
Run npm audit in all Node.js services. Fix or document all vulnerabilities. For dev-only vulnerabilities, document acceptance with justification. For production vulnerabilities, upgrade packages immediately. Verify audits show zero high/critical issues.

**3.4 Secrets Scan**
Scan entire codebase for other hardcoded secrets, API keys, passwords. Check .env files are in .gitignore. Verify no credentials in git history. Use grep patterns for common secret formats. Document any findings immediately.

**Success Criteria:**
- Zero hardcoded passwords in codebase
- npm audit shows zero high/critical production vulnerabilities
- All secrets moved to environment variables
- Security scan report with evidence

**Coordination Protocol:**
- Report all findings immediately
- Commit security fixes individually
- Do not batch security commits
- Coordinate with all agents if widespread changes needed

---

## PHASE 2: TESTING INFRASTRUCTURE (Priority 1)

### Agent Delta: Frontend Test Coverage Expander
**Target:** Increase coverage from 4.24% to 40%+
**Time Estimate:** 12-16 hours
**Files Assigned:** src/web/src/**/*.test.tsx (exclusive)

**Tasks in Priority Order:**

**4.1 Fix Failing Tests First**
45 tests are currently failing. Identify root causes. Fix test setup issues, mock configurations, import errors. Update test expectations to match current code behavior. Ensure all 150 existing tests pass before writing new ones. Run npm test after each fix batch.

**4.2 Critical Component Test Expansion**
Write comprehensive tests for untested components. Focus on high-impact components first: authentication components, form components, enrollment workflow, payment components. Each component should achieve 60%+ coverage. Use React Testing Library best practices. Test user interactions, not implementation details.

**4.3 Service Layer Testing**
Create tests for all service files which currently have 0-13% coverage. Mock axios calls properly. Test error handling paths. Test success and failure scenarios. Cover edge cases. Each service should reach 60%+ coverage.

**4.4 Context Testing**
Expand context tests for AuthContext, NotificationContext, ThemeContext. Test all context methods. Test state changes. Test error conditions. Achieve 60%+ coverage per context.

**4.5 Utils Testing**
Expand utils tests for validation, date, storage, error-handler utilities. Current coverage is 15%. Target is 60%+. Write table-driven tests for validators. Test all branches and edge cases.

**4.6 Verify Coverage Threshold**
After each test file, run coverage report. Monitor progress toward 40% threshold. Prioritize files that give maximum coverage increase. Continue until threshold achieved. Provide coverage report as evidence.

**Success Criteria:**
- All tests passing (zero failures)
- Statement coverage >= 40%
- Branch coverage >= 35%
- Function coverage >= 35%
- Coverage report provided as evidence

**Coordination Protocol:**
- Commit after every 5 test files created
- Report coverage percentage after each commit
- If coverage not increasing, investigate duplicate effort
- Share test patterns with coordinator for reuse

---

### Agent Echo: Backend Test Implementation
**Target:** 60%+ coverage for auth-service and api-gateway
**Time Estimate:** 10-14 hours
**Services Assigned:** auth-service, api-gateway test directories

**Tasks in Priority Order:**

**5.1 Test Infrastructure Setup**
Ensure jest is installed and configured. Create test directories if missing. Set up test databases or mocks. Configure coverage collection. Verify npm test runs without errors.

**5.2 Auth Service Test Expansion**
Expand existing test files. Current coverage unknown but likely low. Write unit tests for all services, controllers, middleware. Mock database calls with proper types. Test authentication flows end-to-end. Test error paths thoroughly. Cover MFA, session management, token generation. Target 60%+ coverage.

**5.3 API Gateway Test Creation**
Write integration tests for gateway routing. Test rate limiting. Test request forwarding. Test circuit breaker patterns. Test error handling and logging. Mock downstream services. Target 60%+ coverage.

**5.4 Run Backend Tests**
Execute npm test in both services. Verify all tests pass. Collect coverage reports. Provide evidence of coverage percentages. Fix any test failures immediately.

**Success Criteria:**
- auth-service test coverage >= 60%
- api-gateway test coverage >= 60%
- All tests passing
- Coverage reports provided as evidence

**Coordination Protocol:**
- Commit after each test suite completed
- Report coverage after each run
- Share mock patterns with other backend test agents
- Coordinate database mock strategies

---

## PHASE 3: INTEGRATION & QUALITY (Priority 2)

### Agent Foxtrot: Integration Test Suite Creator
**Target:** End-to-end integration tests for critical workflows
**Time Estimate:** 8-12 hours
**Directory:** tests/integration/ (create if needed)

**Tasks in Priority Order:**

**6.1 Test Framework Setup**
Choose integration test framework: Supertest for API testing, Playwright or Cypress for E2E. Install dependencies. Configure test environment. Set up test database with migrations. Create test data fixtures.

**6.2 User Authentication Flow Integration Test**
Create test covering: user login with credentials, MFA verification, session creation, token issuance, protected route access, token refresh, logout. Test both success and failure paths. Use real HTTP calls to services. Verify database state changes. Clean up test data after each test.

**6.3 Enrollment Application Flow Integration Test**
Create test covering: user starts enrollment, fills beneficiary forms, uploads documents, submits health questionnaire, submits application, verifies status updates. Test validation at each step. Test error scenarios. Verify database consistency.

**6.4 Policy Issuance Flow Integration Test**
Create test covering: enrollment approval triggers policy creation, policy data generation, premium calculation, policy activation, user notification. Verify all services communicate correctly. Test rollback scenarios.

**6.5 Cross-Service Communication Tests**
Test inter-service API calls. Verify authentication propagates correctly. Test circuit breakers and retries. Test timeout handling. Verify distributed tracing context propagates.

**6.6 Run Integration Test Suite**
Execute all integration tests. Fix flaky tests immediately. Ensure reliable pass rate. Provide test execution report as evidence. Document any environmental dependencies.

**Success Criteria:**
- Minimum 4 end-to-end integration tests implemented
- All critical user workflows covered
- All integration tests passing reliably
- Test execution report provided
- Test cleanup functioning correctly

**Coordination Protocol:**
- Commit after each workflow test completed
- Report test execution status after each commit
- Coordinate with backend agents if service changes needed
- Share test patterns and fixtures

---

### Agent Golf: LGPD Compliance Implementer
**Target:** Complete LGPD compliance features
**Time Estimate:** 10-14 hours
**Files:** Create compliance modules as needed

**Tasks in Priority Order:**

**7.1 User Consent Management**
Create consent collection system. Build consent database schema and migration. Implement consent API endpoints in backend. Create frontend consent UI components. Store consent records with timestamps, IP addresses, versions. Implement consent withdrawal mechanism. Allow users to view consent history.

**7.2 Data Access Rights Implementation**
Create API endpoint for users to request their personal data. Implement data export functionality in all services. Format exports in JSON and PDF. Include all personal data from all services. Test export completeness. Verify no data leaks to other users.

**7.3 Data Deletion Rights Implementation**
Create API endpoint for data deletion requests. Implement soft delete with anonymization. Cascade deletion across all services. Maintain audit trail of deletions per LGPD requirements. Implement retention period enforcement. Create admin tools to process deletion requests. Test deletion completeness.

**7.4 Data Portability Implementation**
Create data export in machine-readable format. Include all enrollment data, health data, documents, policies. Ensure format is interoperable. Test import into similar systems. Provide export within 15 days of request.

**7.5 Audit Logging Enhancement**
Enhance existing audit logs to track all personal data access. Log who accessed what data when. Include purpose of access. Store logs securely. Implement log retention policy. Create audit log viewer for compliance team.

**7.6 Privacy Policy and Terms**
Create legal documents for privacy policy and terms of service. Implement acceptance flow during registration. Store acceptance records with timestamps. Implement version tracking for legal documents. Show updated terms to existing users. Require re-acceptance for material changes.

**Success Criteria:**
- User can access all their personal data
- User can export all their data
- User can request data deletion
- Consent is collected and tracked
- Privacy policy accessible and enforced
- Audit logs capture all data access
- Compliance verification report provided

**Coordination Protocol:**
- Commit after each LGPD feature completed
- Coordinate database schema changes with all agents
- Share API endpoints with integration test agent
- Document all compliance features for audit

---

### Agent Hotel: Documentation Completer
**Target:** Complete all missing documentation
**Time Estimate:** 6-8 hours
**Files:** README.md, ARCHITECTURE.md, service READMEs, API docs

**Tasks in Priority Order:**

**8.1 Update Root README**
Correct all inaccurate information in README.md. Remove placeholder badges that don't work. Add accurate setup instructions tested on clean system. Document all prerequisites with exact versions. Provide troubleshooting section for common issues. Update architecture diagram to match actual implementation.

**8.2 API Documentation Verification**
Open all 6 OpenAPI spec files in src/backend/openapi/. Verify every API endpoint is documented. Add missing endpoints. Add request and response schemas. Add authentication requirements. Add example requests and responses. Validate specs with OpenAPI validator tools. Generate Swagger UI pages.

**8.3 Service README Updates**
Update each service's README with accurate information. Document build commands that actually work. Document test commands. Document deployment process. Add troubleshooting sections. Remove outdated information. Verify all commands by executing them.

**8.4 Environment Variables Documentation**
Create comprehensive .env.example for each service. Document every environment variable used. Specify required vs optional. Provide sensible defaults for development. Document production requirements. Add validation requirements.

**8.5 Architecture Documentation Review**
Review ARCHITECTURE.md for accuracy. Update with actual implementation details. Document technology choices made. Add sequence diagrams for critical flows. Document security architecture. Add deployment architecture diagrams.

**Success Criteria:**
- New developer can set up project following README
- All API endpoints documented in OpenAPI specs
- All environment variables documented
- Architecture docs match actual implementation
- No broken links or outdated commands

**Coordination Protocol:**
- Commit after each major document updated
- Test all commands in documentation on clean system
- Coordinate with other agents to get accurate technical details
- Request review from coordinator before finalizing

---

## PHASE 4: PRODUCTION READINESS (Priority 3)

### Agent India: Kubernetes Deployment Validator
**Target:** All K8s manifests tested and functional
**Time Estimate:** 6-10 hours
**Files:** src/backend/k8s/*.yaml

**Tasks in Priority Order:**

**9.1 Manifest Validation**
Validate all K8s YAML files with kubectl. Fix syntax errors. Verify resource definitions are complete. Check apiVersion compatibility. Ensure namespace consistency. Validate selector labels match.

**9.2 Resource Limits Configuration**
Review and set appropriate CPU and memory limits for each service. Base on service requirements and performance testing. Set requests lower than limits for overcommit. Ensure reasonable values that won't cause OOM kills.

**9.3 Health Checks Configuration**
Add or verify liveness probes for all services. Add or verify readiness probes for all services. Set appropriate timeouts and periods. Test probe endpoints exist and work. Ensure probes match actual service health.

**9.4 Secrets and ConfigMaps**
Create K8s secrets for sensitive configuration. Move passwords and keys from env to secrets. Create ConfigMaps for non-sensitive config. Update deployment manifests to use secrets and configmaps. Document secret creation process.

**9.5 Service Networking**
Verify service definitions expose correct ports. Check ClusterIP vs LoadBalancer vs NodePort appropriateness. Verify ingress configuration if present. Test service discovery between pods. Verify DNS resolution works.

**9.6 Local Kubernetes Testing**
Deploy to minikube or kind cluster locally. Test all services start successfully. Test pod-to-pod communication. Test external access to appropriate services. Test rolling updates. Test pod recovery after deletion. Document any issues found.

**Success Criteria:**
- All manifests pass kubectl validation
- All services deploy successfully to local K8s
- Inter-service communication works
- Health checks pass
- Deployment test report provided

**Coordination Protocol:**
- Commit after each manifest validated and tested
- Report deployment status after each service tested
- Share any infrastructure requirements discovered
- Coordinate with backend agents if service changes needed

---

### Agent Juliet: CI/CD Pipeline Validator
**Target:** All CI/CD workflows tested and functional
**Time Estimate:** 4-6 hours
**Files:** .github/workflows/*.yml

**Tasks in Priority Order:**

**10.1 Workflow Syntax Validation**
Validate all 7 GitHub Actions workflow files. Check YAML syntax. Verify action versions exist. Check environment variables are defined. Verify secrets are documented. Ensure job dependencies are correct.

**10.2 Build Pipeline Testing**
Test frontend build workflow. Test each backend service build workflow. Ensure all steps execute in correct order. Verify Docker image builds succeed. Check image tagging strategy. Test parallel job execution.

**10.3 Test Pipeline Integration**
Ensure test execution in CI pipeline. Configure test result reporting. Set up coverage upload if using external service. Fail pipeline on test failures. Configure flaky test retry logic.

**10.4 Quality Gates Configuration**
Implement minimum coverage threshold checks. Implement security scan steps. Implement linting steps that fail on errors. Add dependency vulnerability scanning. Configure failure conditions for each gate.

**10.5 Deployment Automation**
Configure deployment to staging environment. Require manual approval for production. Set up environment-specific configurations. Test rollback procedures. Document deployment process.

**10.6 Pipeline Execution Test**
Trigger each workflow. Monitor execution. Fix failures. Optimize execution time. Document pipeline run times. Provide execution evidence.

**Success Criteria:**
- All workflows pass validation
- All workflows execute successfully
- Quality gates enforce standards
- Deployment automation functional
- Pipeline execution report provided

**Coordination Protocol:**
- Commit after each workflow validated
- Report pipeline execution results
- Share execution logs if failures occur
- Coordinate with security agent on scan configurations

---

## CENTRAL COORDINATOR VERIFICATION PROTOCOL

### After Each Agent Completes Tasks

**1. Evidence Collection**
Request specific evidence from agent: build logs, test results, coverage reports, git diffs, file listings. Do not accept verbal claims without proof.

**2. Independent Verification**
Coordinator independently verifies claims by: running builds, running tests, checking file existence, counting errors, reviewing code changes. Compare agent claims against verification results.

**3. Discrepancy Resolution**
If claims don't match evidence: immediately halt agent, review agent's work process, identify source of discrepancy, correct agent's understanding, resume only after correction verified.

**4. Progress Documentation**
Update master progress tracker with: verified completion status, actual metrics achieved, remaining work identified, blockers discovered, coordination issues encountered.

**5. Next Task Assignment**
Only assign next task after: previous task verified complete, changes committed and pushed, no conflicts with other agents, resources available.

---

## SUCCESS METRICS VERIFICATION

### Frontend Metrics
- TypeScript error count: MUST BE 0 - verify with "npm run build" exit code
- Test coverage: MUST BE >= 40% - verify with coverage report JSON file
- Tests passing: MUST BE 100% - verify with test execution output
- Build artifact: dist/ directory must exist and contain files

### Backend Metrics
- Service compilation: All services MUST compile - verify each with build command
- Test coverage: Each service MUST BE >= 60% - verify with coverage reports
- Security scan: Zero high/critical vulnerabilities - verify with npm audit and Bandit
- Service startup: Each service must start without errors - verify with docker compose

### Integration Metrics
- Integration tests: Minimum 4 workflows MUST PASS - verify with test execution
- API documentation: All endpoints documented - verify by counting OpenAPI operations
- LGPD compliance: All features implemented - verify with feature checklist
- K8s deployment: All services deploy successfully - verify in local cluster

### Documentation Metrics
- Setup instructions: Must work on clean system - verify by following on fresh VM
- API docs: Must match actual endpoints - verify by comparison
- Environment vars: All documented - verify by code search for process.env

---

## COORDINATION RULES

### File Access Management
Each agent has exclusive write access to assigned files. No two agents work on same file simultaneously. Coordinator maintains file lock registry. Agents must request permission before touching unassigned files.

### Commit Strategy
Commit after every logical unit of work completed (maximum 10 changes). Push immediately after each commit. Use descriptive commit messages with ticket ID. Include verification evidence in commit message if claiming metric improvement.

### Merge Conflict Prevention
Pull latest changes before starting work on any file. Coordinate with other agents before modifying shared interfaces. Alert coordinator immediately if conflict detected. Halt work until coordinator resolves conflict.

### Progress Reporting
Report status every 2 hours minimum. Include specific metrics with evidence. Report blockers immediately when encountered. Request help after 1 hour stuck on single issue. Provide daily summary with accomplishments and plan.

### Quality Standards
Every change must not break existing functionality. All new code must have tests. All tests must pass before committing. All builds must succeed before committing. Code must pass linting before committing.

---

## FAILURE PROTOCOLS

### If Error Count Increases
Immediately stop work. Identify which changes caused increase. Revert problematic changes. Analyze root cause. Request coordinator review. Resume only after approval.

### If Tests Start Failing
Immediately stop introducing new code. Fix failing tests before proceeding. Identify if test or code is wrong. Update tests only if code behavior is correct. Never disable tests to make pipeline pass.

### If Agent Reports False Progress
Coordinator immediately halts agent. Reviews all agent's recent work. Reverts unverified changes. Retrains agent on verification requirements. Reassigns remaining tasks to different agent.

### If Deadline at Risk
Coordinator reassesses priorities. Shifts agents to highest priority tasks. Considers cutting scope of lower priority items. Communicates risks and delays immediately. Requests additional agent resources if needed.

---

## FINAL DELIVERABLES

### Code Deliverables
- All source code committed to git branch
- Zero TypeScript compilation errors verified
- All tests passing verified
- Test coverage thresholds met verified
- Security vulnerabilities resolved verified

### Documentation Deliverables
- Updated README with accurate setup instructions
- Complete API documentation for all endpoints
- Service-specific README files accurate
- Architecture documentation updated
- LGPD compliance documentation complete

### Evidence Deliverables
- Build logs showing zero errors
- Test execution reports with coverage metrics
- Security audit report with zero high/critical issues
- Integration test execution report
- K8s deployment test report
- CI/CD pipeline execution report

### Verification Deliverables
- Independent verification report from coordinator
- Comparison of agent claims vs actual evidence
- List of all commits made with descriptions
- Metrics dashboard showing all targets met
- Sign-off checklist confirming production readiness

---

## TIMELINE AND CHECKPOINTS

### Day 1 Checkpoint
- Agent Alpha: 150+ errors fixed
- Agent Bravo: Backend services compiling
- Agent Charlie: Security vulnerabilities fixed
- Coordinator: Verify all claims, resolve conflicts

### Day 2 Checkpoint
- Agent Alpha: TypeScript errors < 50
- Agent Delta: Test coverage > 20%
- Agent Echo: Backend tests > 40% coverage
- Coordinator: Integration test planning complete

### Day 3 Checkpoint
- Agent Alpha: TypeScript errors = 0
- Agent Delta: Test coverage > 35%
- Agent Foxtrot: 2 integration tests passing
- Agent Golf: LGPD consent system working

### Day 4 Checkpoint
- All Phase 1 and Phase 2 complete
- Agent Delta: Test coverage >= 40%
- Agent Foxtrot: All integration tests passing
- Agent Golf: LGPD features complete

### Day 5 Checkpoint
- All agents complete assigned tasks
- Coordinator completes verification
- All deliverables prepared
- Production readiness checklist complete

---

## COMMUNICATION PROTOCOLS

### Daily Standup
Each agent reports: tasks completed yesterday, tasks planned today, blockers encountered, help needed. Coordinator reviews progress against timeline. Adjusts priorities if needed. Resolves reported blockers.

### Blocker Escalation
Agent encounters blocker. Agent attempts resolution for maximum 1 hour. If unresolved, reports to coordinator with details. Coordinator assigns helper agent or reprioritizes. Resolution tracked to closure.

### Integration Points
Agents coordinate when work intersects. Agree on interface contracts before implementation. Test integration points as soon as both sides ready. Report integration issues immediately. Coordinate on resolution approach.

### Quality Reviews
Coordinator performs random code reviews. Checks for quality standards adherence. Checks for test coverage. Checks for security issues. Provides feedback to agents. Requires fixes before allowing further progress.

---

## ACCEPTANCE CRITERIA

### Code Quality Gate
- Zero TypeScript errors
- Zero ESLint errors
- All tests passing
- Code coverage thresholds met
- Security scan passing
- Build artifacts generated successfully

### Functional Quality Gate
- All user workflows function end-to-end
- All API endpoints responding correctly
- All backend services starting without errors
- All frontend pages rendering without errors
- Authentication and authorization working
- Data persistence functioning correctly

### Non-Functional Quality Gate
- Application responds within acceptable time
- No memory leaks detected
- Proper error handling throughout
- Logging functioning correctly
- Monitoring instrumentation working
- Security headers present

### Documentation Quality Gate
- Setup instructions work on clean system
- All environment variables documented
- API documentation matches implementation
- Architecture documentation accurate
- Troubleshooting guides helpful
- Deployment runbook complete

### Compliance Quality Gate
- LGPD features implemented and tested
- User consent collected and tracked
- Data access rights functional
- Data deletion rights functional
- Privacy policy present and enforced
- Audit logging complete

---

## MISSION SUCCESS DEFINITION

Mission is successful ONLY when ALL of following verified:

1. Frontend builds with zero TypeScript errors (verified by coordinator running build)
2. Frontend test coverage >= 40% (verified by coordinator checking coverage report)
3. All frontend tests passing (verified by coordinator running tests)
4. Backend auth-service and api-gateway compile with zero errors (verified by coordinator)
5. Backend services test coverage >= 60% (verified by coordinator)
6. Security vulnerabilities resolved (verified by coordinator running audits)
7. Integration tests implemented and passing (verified by coordinator running tests)
8. LGPD compliance features functional (verified by coordinator testing features)
9. K8s manifests deploy successfully (verified by coordinator deploying to local cluster)
10. CI/CD pipelines execute successfully (verified by coordinator triggering workflows)
11. Documentation accurate and complete (verified by coordinator following instructions)
12. All deliverables provided with evidence (verified by coordinator reviewing artifacts)

**Coordinator provides final verification report with evidence for each criterion before declaring mission success.**

---

END OF MISSION PROMPT
