# Data Protection Impact Assessment (DPIA)
## Sympli Health - NHS Pilot

### 1. Executive Summary
**Project:** Sympli Health Memory Platform - NHS Pilot  
**Date:** August 2025  
**Data Controller:** Sympli MED Ltd.  
**Data Processor:** Sympli Health Platform  

### 2. Data Processing Activities

#### 2.1 Data Categories
- **Personal Data:** Name, email, date of birth
- **Special Category Data:** Health data, symptom descriptions, medical history
- **Technical Data:** IP addresses, device information, usage logs

#### 2.2 Processing Purposes
1. **Symptom Logging:** User-generated health data for personal tracking
2. **AI Analysis:** Pattern recognition and symptom summarization
3. **Report Generation:** GP-ready reports for medical appointments
4. **Timeline Viewing:** Historical symptom tracking and analysis

#### 2.3 Legal Basis
- **Article 6(1)(a):** Consent for personal data processing
- **Article 9(2)(a):** Explicit consent for health data processing
- **Article 9(2)(h):** Healthcare provision (with appropriate safeguards)

### 3. Data Storage & Security

#### 3.1 Storage Locations
- **Primary:** Supabase (EU-based, GDPR compliant)
- **Backup:** Encrypted backups in EU data centers
- **Local:** Temporary browser storage (localStorage) for session management

#### 3.2 Encryption
- **At Rest:** AES-256 encryption for all stored data
- **In Transit:** TLS 1.3 for all communications
- **End-to-End:** Client-side encryption for sensitive health data

#### 3.3 Access Controls
- **Role-based Access:** User, Caregiver, Admin roles
- **Two-Factor Authentication:** Required for caregiver/admin accounts
- **Session Management:** Secure token-based authentication

### 4. Data Retention & Deletion

#### 4.1 Retention Periods
- **Active User Data:** Until account deletion request
- **Inactive Accounts:** 2 years, then anonymization
- **Audit Logs:** 7 years for compliance
- **Backup Data:** 30 days, then secure deletion

#### 4.2 Deletion Process
1. **Immediate:** Mark for deletion, remove from active queries
2. **30 Days:** Complete data deletion from all systems
3. **Confirmation:** Deletion certificate provided to user

### 5. Risk Assessment

#### 5.1 Identified Risks
- **Data Breach:** Unauthorized access to health data
- **Data Loss:** Accidental deletion or corruption
- **Compliance Violation:** GDPR or NHS requirements not met

#### 5.2 Mitigation Measures
- **Encryption:** All data encrypted at rest and in transit
- **Access Controls:** Strict role-based permissions
- **Audit Logging:** Complete audit trail for all actions
- **Regular Testing:** Penetration testing and security assessments

### 6. NHS DSPT Alignment

#### 6.1 Data Security Standards
- **1.1:** Personal confidential data is handled and stored securely
- **1.2:** Personal confidential data is processed securely
- **1.3:** Personal confidential data is transmitted securely
- **1.4:** Personal confidential data is disposed of securely

#### 6.2 Staff Security
- **2.1:** Staff are aware of their responsibilities
- **2.2:** Staff are provided with appropriate training
- **2.3:** Staff are provided with appropriate policies and procedures

### 7. Compliance Monitoring

#### 7.1 Regular Assessments
- **Monthly:** Security posture review
- **Quarterly:** Compliance audit
- **Annually:** Full DPIA review and update

#### 7.2 Incident Response
- **24 Hours:** Initial assessment and containment
- **72 Hours:** Detailed investigation and reporting
- **7 Days:** Remediation and lessons learned

---

**Document Version:** 1.0  
**Last Updated:** August 2025  
**Next Review:** September 2025
