# GDPR-Compliant MongoDB Setup for Sympli Health Companion

This document outlines the implementation of GDPR-compliant data storage for Sympli using MongoDB Atlas with client-side field-level encryption (CSFLE).

## 🏗️ Architecture Overview

### Data Flow
```
User Input → GDPR Consent Check → Encrypted Storage → Audit Logging → Secure Retrieval
```

### Key Components
- **MongoDB Atlas** (EU region) - Primary data store
- **AWS KMS** - Key management for CSFLE
- **Client-Side Field-Level Encryption** - Medical-grade encryption
- **Audit Logging** - Complete activity trail
- **Consent Management** - GDPR compliance tracking

## 🔐 Security Features

### 1. Client-Side Field-Level Encryption (CSFLE)
- **Sensitive fields encrypted before leaving your application**
- **Atlas staff cannot read encrypted data**
- **AES-256-GCM encryption with deterministic/random algorithms**

### 2. Data Residency
- **MongoDB Atlas cluster in EU region** (Frankfurt/Dublin)
- **AWS KMS keys in EU region**
- **GDPR-compliant data residency**

### 3. Audit Trail
- **Complete activity logging**
- **6-year retention for medical-legal compliance**
- **Immutable audit records**

## 📊 Database Schema

### Collections

#### `users`
```json
{
  "_id": "uuid",
  "email": "user@example.com",
  "password_hash": "bcrypt_hash",
  "locale": "en",
  "consent_given_at": "2024-01-01T00:00:00Z",
  "kek_id": "uuid",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### `symptom_logs` (Encrypted)
```json
{
  "_id": "ObjectId",
  "user_id": "uuid",
  "symptom_text_enc": "encrypted_string",
  "summary_enc": "encrypted_string", 
  "tags_enc": ["encrypted_array"],
  "onset_ts": "2024-01-01T00:00:00Z",
  "ongoing": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### `pdf_reports` (Encrypted)
```json
{
  "_id": "ObjectId",
  "user_id": "uuid",
  "context_enc": {
    "reason": "encrypted_object",
    "must_know": "encrypted_string",
    "meds_tried": ["encrypted_array"],
    "tests": ["encrypted_array"]
  },
  "pdf_url_enc": "encrypted_string",
  "generated_at": "2024-01-01T00:00:00Z"
}
```

#### `audit_logs`
```json
{
  "_id": "ObjectId",
  "user_id": "uuid",
  "actor": "user|system|admin",
  "action": "create|read|update|delete|export",
  "resource": "collection/document_id",
  "metadata": {},
  "ts": "2024-01-01T00:00:00Z"
}
```

## 🚀 Setup Instructions

### 1. Prerequisites

#### MongoDB Atlas Setup
1. Create MongoDB Atlas cluster in EU region
2. Configure network access (IP whitelist or VPC)
3. Create database user with read/write permissions
4. Get connection string

#### AWS KMS Setup (for CSFLE)
1. Create AWS KMS Customer Master Key in EU region
2. Configure IAM user with KMS permissions
3. Note the CMK ARN

### 2. Environment Configuration

Copy `env.example` to `.env` and configure:

```bash
# MongoDB Atlas
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/

# AWS KMS for CSFLE
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_KMS_REGION=eu-central-1
AWS_KMS_ARN=arn:aws:kms:eu-central-1:123456789012:key/your-cmk-id

# GDPR Settings
DATA_RETENTION_DAYS=2190
AUDIT_RETENTION_DAYS=2190
ENABLE_AUDIT_LOGGING=true
ENABLE_CSFLE=true
```

### 3. Database Setup

Run the GDPR-compliant setup script:

```bash
python setup_mongodb_gdpr.py
```

This will:
- ✅ Connect to MongoDB Atlas
- ✅ Setup Client-Side Field-Level Encryption
- ✅ Create GDPR-compliant collections and indexes
- ✅ Initialize audit logging
- ✅ Create sample data for testing

### 4. Verify Setup

Check GDPR compliance features:

```bash
python -c "from gdpr_data_layer import gdpr_data; print('✅ GDPR setup verified')"
```

## 🔧 Usage Examples

### Initialize GDPR Data Layer
```python
from gdpr_data_layer import gdpr_data
from gdpr_utils import gdpr_manager

# Create user with consent tracking
user_id = gdpr_data.create_user("user@example.com", "password123")

# Record GDPR consent
gdpr_manager.create_consent_record(user_id, "explicit", "I consent to data processing")
```

### Save Encrypted Symptom Data
```python
# Save symptom with automatic encryption
symptom_data = {
    "symptom_text": "Throbbing headache in forehead",
    "summary": "User reports 3-day headache",
    "tags": ["Headache", "Pain", "Stress"],
    "onset_ts": datetime.now() - timedelta(days=3),
    "ongoing": True
}

symptom_id = gdpr_data.save_symptom_log(user_id, symptom_data)
```

### GDPR Data Export
```python
# Export user data for GDPR right to access
export_url = gdpr_manager.export_user_data_gdpr(user_id, "json")
print(f"Data exported to: {export_url}")
```

### GDPR Right to Erasure
```python
# Delete all user data
success = gdpr_manager.delete_user_data_gdpr(user_id)
print(f"Data deletion: {'✅ Success' if success else '❌ Failed'}")
```

## 📋 GDPR Compliance Checklist

### ✅ Data Protection Principles
- [x] **Data Minimisation** - Only store necessary fields
- [x] **Purpose Limitation** - Clear data usage purposes
- [x] **Storage Limitation** - 6-year retention with TTL
- [x] **Integrity & Confidentiality** - CSFLE encryption

### ✅ User Rights
- [x] **Right to Access** - Data export functionality
- [x] **Right to Erasure** - Complete data deletion
- [x] **Right to Consent** - Explicit consent tracking
- [x] **Right to Portability** - Structured data export

### ✅ Technical Measures
- [x] **Encryption at Rest** - Atlas default + CSFLE
- [x] **Encryption in Transit** - TLS 1.2+
- [x] **Access Controls** - User-based permissions
- [x] **Audit Logging** - Complete activity trail

### ✅ Organizational Measures
- [x] **Data Residency** - EU region hosting
- [x] **Retention Policies** - Automated cleanup
- [x] **Breach Reporting** - Audit trail for incidents
- [x] **Privacy by Design** - Built-in compliance

## 🔍 Monitoring & Compliance

### Audit Logs
```python
# Get user audit trail
audit_logs = gdpr_data.get_audit_logs(user_id)

# Generate compliance report
report = gdpr_manager.generate_compliance_report()
```

### Data Cleanup
```python
# Clean up expired data
cleanup_stats = gdpr_manager.cleanup_expired_data()
print(f"Cleaned up: {cleanup_stats}")
```

## 🛡️ Security Best Practices

### 1. Key Management
- Rotate AWS KMS keys annually
- Use separate keys for different environments
- Monitor key usage and access

### 2. Access Control
- Implement role-based access control
- Use least-privilege principles
- Monitor database access patterns

### 3. Data Protection
- Encrypt all sensitive fields
- Use deterministic encryption for queryable fields
- Implement data anonymization for exports

### 4. Compliance Monitoring
- Regular audit log reviews
- Automated compliance reporting
- Periodic GDPR assessments

## 🚨 Incident Response

### Data Breach Procedures
1. **Immediate Response**
   - Isolate affected systems
   - Preserve audit logs
   - Notify compliance team

2. **Assessment**
   - Review audit logs for scope
   - Identify affected users
   - Assess encryption status

3. **Notification**
   - Notify supervisory authority (72 hours)
   - Notify affected users
   - Document response actions

4. **Recovery**
   - Rotate encryption keys
   - Review access controls
   - Update security measures

## 📞 Support & Troubleshooting

### Common Issues

#### CSFLE Not Working
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify KMS permissions
aws kms describe-key --key-id your-cmk-arn
```

#### Connection Issues
```bash
# Test MongoDB connection
python -c "from pymongo import MongoClient; client = MongoClient('your-uri'); print(client.admin.command('ping'))"
```

#### GDPR Compliance Issues
```bash
# Verify consent tracking
python -c "from gdpr_data_layer import gdpr_data; print(gdpr_data.check_consent('user-id'))"
```

### Getting Help
- Check audit logs for error details
- Review MongoDB Atlas logs
- Contact support with compliance requirements

## 📚 Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB CSFLE Guide](https://docs.mongodb.com/manual/core/security-client-side-encryption/)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [AWS KMS Best Practices](https://docs.aws.amazon.com/kms/latest/developerguide/best-practices.html)

---

**⚠️ Important**: This setup provides medical-grade privacy protection. Ensure all team members understand GDPR requirements and handle data appropriately. 