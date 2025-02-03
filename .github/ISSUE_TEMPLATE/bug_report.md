---
name: Bug Report
about: Report a system issue or defect for tracking and resolution
title: "[BUG] "
labels: bug
assignees: ''
---

> ⚠️ **LGPD/Data Privacy Warning**: Do not include any personal, health, or sensitive data in this report. Ensure all logs and traces are properly sanitized before submission.

## Bug Description
### Title
<!-- Provide a clear and concise bug title -->

### Description
<!-- Provide a detailed description of the bug (minimum 100 characters) -->

### Severity
<!-- Select the appropriate severity level -->
- [ ] Critical - System Unavailable (Immediate Response Required)
- [ ] High - Major Feature Broken (Response within 1 hour)
- [ ] Medium - Feature Partially Working (Response within 4 hours)
- [ ] Low - Minor Issue (Response within 24 hours)

### Security Incident
<!-- This field is required -->
- [ ] This is a potential security incident
- [ ] This is not a security incident

## Environment
### Deployment Information
- Environment:
  - [ ] Production - Brazil South
  - [ ] Production - Brazil Southeast
  - [ ] Staging
  - [ ] Development

- Affected Service:
  - [ ] Web Portal
  - [ ] API Gateway
  - [ ] Auth Service
  - [ ] Document Service
  - [ ] Enrollment Service
  - [ ] Health Service
  - [ ] Policy Service
  - [ ] Multiple Services

- Deployment Version/Tag: <!-- Required -->

### Browser Information
<!-- If applicable -->
- Browser Type and Version:

## Reproduction Steps
### Prerequisites
<!-- List any required setup or conditions -->

### Steps to Reproduce
<!-- Provide numbered steps (minimum 2 steps required) -->
1. 
2. 

### Expected Behavior
<!-- What should happen -->

### Actual Behavior
<!-- What actually happens -->

### Reproducibility
- [ ] Always
- [ ] Intermittent
- [ ] One-time occurrence

## Impact Assessment
### User Impact
- Affected User Groups:
  - [ ] All Users
  - [ ] Brokers
  - [ ] HR Personnel
  - [ ] Beneficiaries
  - [ ] Parents/Guardians
  - [ ] Underwriting Team
  - [ ] Administrators

### Data Impact
<!-- Select all that apply -->
- [ ] Personal Data Affected (LGPD Sensitive)
- [ ] Health Data Affected (LGPD Special Category)
- [ ] Payment Data Affected
- [ ] No Sensitive Data Affected

### Business Impact
<!-- Describe impact on business operations and SLAs -->

### Transaction Impact
Number of affected transactions (if known): 

## Technical Details
### Error Messages
<!-- Include relevant error messages (sanitized of sensitive data) -->

### Stack Trace
<!-- Include sanitized stack trace if available -->

### Related Commits
<!-- List any recent changes that might be related -->

### Monitoring Information
<!-- Include related monitoring or security alerts -->

### Metrics Impact
- [ ] Response Time Degradation
- [ ] Increased Error Rate
- [ ] Resource Utilization Spike
- [ ] Security Alert Triggered

---
<!-- Internal Use -->
- [ ] LGPD compliance verified
- [ ] Security review required
- [ ] SLA timer started