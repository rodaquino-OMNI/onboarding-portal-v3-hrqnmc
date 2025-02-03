```
WHY – Vision & Purpose

1. Purpose & Users
	•	Primary Problem Solved
	•	Manual onboarding of new beneficiaries to a pre-paid health plan is time-consuming, prone to errors, and requires the secure collection of sensitive health information.
	•	Fragmented data storage and lack of streamlined access to patient data in the EMR slow down healthcare services and hinder integrated data analysis.
	•	Target Users
	•	Brokers (Corretores): Register prospective clients (individuals, families, corporate groups) but cannot fill out health questionnaires.
	•	HR Personnel (Corporate Clients): Manage bulk enrollments for employee groups, but cannot complete or view health questionnaires.
	•	Individual Beneficiaries: Create personal accounts (if not broker-backed), fill their own health questionnaire in a secure, private workflow.
	•	Parents/Guardians: Allowed to complete the health questionnaire only for minors under 18 years old.
	•	Underwriting & Triagem Team: Reviews questionnaire data for coverage aggravations and waiting periods.
	•	Administrators: Oversees plan configurations, user roles, compliance, and data integrations.
	•	Value Proposition
	•	A web portal that automates enrollment, ensuring secure storage of all documents and data in a robust database, while also integrating with AUSTA’s Datalake and EMR for unified healthcare data management.
	•	Seamless experience: From plan selection and risk assessment (via AI triage) to final policy issuance and data availability in AUSTA’s healthcare ecosystem (SuperApp, EMR, and analytics platforms).

WHAT – Core Requirements

2. Functional Requirements

2.1 Core Features
	1.	User Onboarding & Role Separation
	•	Brokers/HR add demographic data for new beneficiaries but cannot fill or view their health questionnaire.
	•	Individual Beneficiaries can self-register if no broker is involved.
	•	Parents/Guardians may fill the health questionnaire only for minors.
	2.	Dynamic Health Questionnaire (AI-Powered)
	•	A separate workflow, accessible by the beneficiary or guardian, integrating with multiple LLMs (via API).
	•	Adapts questions based on each response, flags inconsistencies, and calculates a preliminary risk score.
	•	Generates health data to inform coverage aggravations, waiting periods.
	3.	Pre-Paid Plan Selection & Pricing
	•	Age-bracket-based monthly fees for each plan type (no individual premium variation within the same bracket).
	•	Automatic suggestion of carências and possible coverage aggravations.
	4.	Coverage Aggravation Rules
	•	Underwriters can apply partial coverage, extended waiting periods, or exclusions based on AI triage results.
	•	Stored in the final policy documentation and beneficiary record.
	5.	Secure Document & Data Storage
	•	Complete storage database for all documents (ID, proof of address, medical records) and enrollment data.
	•	OCR for automated data extraction from uploaded files.
	•	Strict encryption at rest and role-based access to sensitive healthcare info.
	6.	AUSTA Datalake & EMR Integration
	•	On approval, relevant beneficiary info and health questionnaire data feed into AUSTA’s Datalake, enabling advanced analytics and population health insights.
	•	Certain structured medical info (e.g., preexisting conditions) sync with AUSTA’s EMR to streamline care coordination and telemedicine.
	•	Comply with LGPD and other privacy regulations when sharing data across systems.
	7.	Payment & Policy Issuance
	•	Integrated with payment gateways for first-month fee and subsequent billing cycles.
	•	Digital policy generation, waiting period tracking, and immediate membership card issuance.
	8.	Integration with AUSTA SuperApp
	•	Final policy data (coverage, waiting periods, membership card) syncs to the SuperApp for telemedicine, appointment scheduling, and other digital health services.

2.2 Key User Capabilities
	•	Brokers
	•	Initiate new applications (demographic data, plan type) and track statuses.
	•	Access analytics (funnel drop-offs, conversion rates).
	•	Use advanced search to locate applications by coverage aggravation, plan type, or underwriting status.
	•	HR Personnel (Corporate)
	•	Bulk enrollment for employees (CSV/Excel upload).
	•	Monitor application progress and overall acceptance rates.
	•	Cannot view or fill personal health questionnaires.
	•	Individual Beneficiaries
	•	Self-register if no broker is present.
	•	Complete the health questionnaire in a secure, private session.
	•	Optionally upload personal medical documentation if requested.
	•	Parents/Guardians
	•	Allowed to fill out the health questionnaire only for children under 18.
	•	Must confirm they are the legal guardian.
	•	Underwriting & Triagem
	•	See AI-driven health questionnaire summaries, risk scores.
	•	Approve or adjust coverage aggravations, waiting periods.
	•	Finalize policies for issuance.
	•	Administrators
	•	Configure plan brackets, coverage aggravation rules, waiting period durations.
	•	Manage user roles, perform system audits, enforce LGPD compliance.
	•	Oversee integration with AUSTA’s Datalake and EMR.

HOW – Planning & Implementation

3. Technical Foundation

Required Stack Components
	1.	Frontend
	•	All interfaces in Portuguese (Brazil) for brokers, HR, beneficiaries, underwriting, and admin.
	•	SPA framework (React/Angular/Vue) with role-based routing (separating data entry from health questionnaire flows).
	2.	Backend
	•	RESTful or GraphQL API for plan selection, enrollment data, coverage aggravation logic, and bridging to AUSTA’s Datalake/EMR.
	•	Containerized (Docker/Kubernetes) for scalability.
	3.	Storage & Data Layer
	•	Complete storage database housing beneficiary data, policy details, coverage aggravations, waiting periods, and all uploaded documents.
	•	Secure integration with AUSTA’s Datalake:
	•	Automatic data flow after underwriting approval for advanced analytics and population health insights.
	•	Connection to AUSTA’s EMR:
	•	Relevant medical data stored in the EMR to ensure continuity of care across appointments, telemedicine, etc.
	•	Full encryption at rest (AES-256 or equivalent), backup policies, and audit logs.
	4.	AI/LLM Engine
	•	Dynamically selects from multiple LLM providers via an API.
	•	AI triage module for the health questionnaire workflow.
	5.	Analytics Module
	•	Tracks funnel drop-offs, broker performance, coverage aggravation frequency, corporate enrollment progress.
	•	Aggregates data for Administrators to evaluate product uptake and operational bottlenecks.
	6.	Integration with Payment Gateway
	•	Accepts PIX, boleto, credit, or debit cards.
	•	Automated renewal reminders and invoice generation.

System Requirements
	•	Performance
	•	Manage bulk enrollments from large corporate clients efficiently.
	•	Process new applications (excluding questionnaire time) generally within 10 minutes.
	•	Security
	•	LGPD compliance (explicit consent, right to be forgotten, secure data handling).
	•	Multi-factor authentication for underwriting/admin roles.
	•	Regular vulnerability assessments and penetration tests.
	•	Scalability & Reliability
	•	Microservices or container-based approach for horizontal scaling.
	•	99.9% availability for onboarding services.

4. User Experience

Primary User Flows
	1.	Broker/HR Registration & Login
	•	Entry: Create an account, admin approves or verifies.
	•	Steps: Provide business credentials → Get portal access.
	•	Success: Brokers/HR can add basic beneficiary data but cannot fill or view the health questionnaire.
	2.	Beneficiary Health Questionnaire (Separate Workflow)
	•	Entry: Beneficiary receives a secure link via email/SMS, or logs into their portal account.
	•	Steps:
	1.	Confirm identity (or guardian status if <18).
	2.	Complete the AI-driven triage.
	3.	Upload health documents if prompted.
	4.	E-sign confirmation of questionnaire accuracy.
	•	Success: System generates a risk score, references coverage aggravation rules, and awaits underwriting approval.
	3.	Corporate Bulk Enrollment
	•	Entry: HR user uploads employee data (CSV/Excel).
	•	Steps:
	1.	Each employee receives a personal link or login to fill their own health questionnaire.
	2.	HR monitors who has or hasn’t completed the questionnaire but never sees health details.
	•	Success: All completed questionnaires pass to underwriting; coverage aggravations are applied if necessary.
	4.	Underwriting & Triagem
	•	Entry: Underwriting queue in the portal.
	•	Steps:
	1.	Review risk score, declared conditions, coverage aggravations suggested.
	2.	Approve or modify waiting periods, partial coverage.
	3.	Send final approval.
	•	Success: Policy is generated; data syncs with AUSTA’s Datalake/EMR for continuity of care.
	5.	Policy Issuance & Payment
	•	Entry: Payment link or direct debit after underwriting approval.
	•	Steps:
	1.	User pays initial premium.
	2.	System issues digital policy documents and membership card.
	3.	Final data sync to AUSTA SuperApp, Datalake, EMR.
	•	Success: Beneficiary has an active policy, displayed in the SuperApp with coverage details and waiting periods.
All users interfaces should be in Brazilian Portuguese 

5. Business Requirements

Access Control
	•	User Types
	•	Brokers/HR: Enter demographic data, track enrollment. No access to health questionnaire.
	•	Beneficiaries: Self-enroll or fill personal health info. Parents/guardians do so for minors.
	•	Underwriting: Read health details, apply coverage aggravations.
	•	Administrators: Configure plans, manage roles, maintain AUSTA integration.
	•	Authentication & Authorization
	•	Multi-factor for underwriting and admin.
	•	Strict logs of who accessed or modified sensitive data.

Business Rules
	1.	Fixed Pricing by Age Bracket
	•	No individual premium variations except bracket transitions (e.g., 34 -> 35 years old).
	2.	Coverage Aggravations & Waiting Periods
	•	Tied to the data from the health questionnaire.
	•	Documented in final policy.
	3.	LGPD Compliance & Data Privacy
	•	Explicit consent for data usage.
	•	Secure data flows to Datalake/EMR with user rights preserved.
	4.	Integration with AUSTA Ecosystem
	•	Mandatory push to Datalake for advanced analytics, plus relevant fields to EMR for clinical usage.
	•	Final policy data to the SuperApp.

6. Implementation Priorities

High Priority (Must Have)
	•	Complete Storage Database with secure handling of all docs/data
	•	Integration with AUSTA’s Datalake (for advanced analytics) and EMR (for continuity of care)
	•	Dynamic AI Triage for health questionnaires (multi-LLM)
	•	Strict role separation (brokers/HR vs. beneficiary) for questionnaire completion
	•	Coverage aggravation rules for flagged conditions
	•	Age-bracket-based plan pricing
	•	Payment integration and final policy issuance
	•	AUSTA SuperApp data sync

Medium Priority (Should Have)
	•	Automated notifications reminding beneficiaries/parents to complete the questionnaire
	•	Bulk corporate enrollment dashboard with partial or full completion analytics
	•	Advanced search and filtering for underwriting
	•	Document versioning for ID/medical records updates

Lower Priority (Nice to Have)
	•	White-labeled front-end for large brokers/corporate partners
	•	Enhanced telemedicine or digital therapy integration within the portal (beyond the SuperApp)
	•	Predictive analytics (machine learning) on risk or usage patterns

Final Notes
	1.	All Front-End UIs – including data entry (broker/HR) portals, beneficiary questionnaires, underwriting panels – must be created in Portuguese (Brazil).
	2.	The health questionnaire is strictly private to the beneficiary (or guardian for minors), ensuring compliance with LGPD and reinforcing personal data privacy.
	3.	Integration with AUSTA Datalake and EMR ensures that medical records and plan data feed seamlessly into a broader ecosystem, enabling unified analytics (Datalake) and continuity of care (EMR).
	4.	This solution caters to individual or corporate enrollments, with robust AI-driven triage, fixed pricing by age bracket, and coverage aggravations/waiting periods for disclosed pre-existing conditions.

This final prompt provides a unified system specification for a pre-paid health plan onboarding portal that:
	•	Separates data entry from health screening,
	•	Stores all documents/data in a secure database,
	•	Integrates with AUSTA’s Datalake and EMR, and
	•	Delivers a seamless end-to-end flow, from broker/HR or self-enrollment to policy issuance and AUSTA SuperApp activation.
```