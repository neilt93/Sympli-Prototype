import { auditLogger } from './audit-logger';

export interface SecurityViolation {
  type: 'injection' | 'authentication' | 'sensitive_data' | 'xxe' | 'access_control' | 'misconfiguration' | 'xss' | 'insecure_deserialization' | 'vulnerable_components' | 'insufficient_logging';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
}

export class SecurityComplianceManager {
  private static instance: SecurityComplianceManager;
  private violations: SecurityViolation[] = [];

  private constructor() {}

  public static getInstance(): SecurityComplianceManager {
    if (!SecurityComplianceManager.instance) {
      SecurityComplianceManager.instance = new SecurityComplianceManager();
    }
    return SecurityComplianceManager.instance;
  }

  // A01:2021 - Broken Access Control
  public validateAccessControl(userId: string, resourceId: string, action: string, userRole: string): boolean {
    // Implement proper access control validation
    const allowedActions = this.getAllowedActions(userRole);
    
    if (!allowedActions.includes(action)) {
      this.recordViolation('access_control', 'high', 
        `Unauthorized access attempt: ${action} on resource ${resourceId}`, 
        userId, { action, resourceId, userRole });
      return false;
    }
    
    return true;
  }

  // A02:2021 - Cryptographic Failures
  public validateEncryption(data: any, context: string): boolean {
    // Check if sensitive data is properly encrypted
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'nhs_number'];
    const hasSensitiveData = sensitiveFields.some(field => 
      JSON.stringify(data).toLowerCase().includes(field)
    );

    if (hasSensitiveData && !this.isEncrypted(data)) {
      this.recordViolation('sensitive_data', 'critical',
        `Sensitive data not encrypted in ${context}`,
        undefined, { context, dataType: typeof data });
      return false;
    }

    return true;
  }

  // A03:2021 - Injection
  public validateInput(input: string, type: 'sql' | 'nosql' | 'command' | 'ldap'): boolean {
    const injectionPatterns = {
      sql: /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
      nosql: /(\$where|\$ne|\$gt|\$lt|\$regex)/i,
      command: /[;&|`$(){}[\]]/,
      ldap: /[()&|!*]/g
    };

    const pattern = injectionPatterns[type];
    if (pattern.test(input)) {
      this.recordViolation('injection', 'critical',
        `Potential ${type.toUpperCase()} injection detected`,
        undefined, { input: input.substring(0, 100), type });
      return false;
    }

    return true;
  }

  // A04:2021 - Insecure Design
  public validateDesignPattern(pattern: string, context: string): boolean {
    const insecurePatterns = [
      'direct_object_reference',
      'mass_assignment',
      'insecure_direct_object_reference'
    ];

    if (insecurePatterns.includes(pattern)) {
      this.recordViolation('access_control', 'high',
        `Insecure design pattern detected: ${pattern}`,
        undefined, { pattern, context });
      return false;
    }

    return true;
  }

  // A05:2021 - Security Misconfiguration
  public validateConfiguration(config: Record<string, any>): boolean {
    const requiredSecureSettings = {
      'https_only': true,
      'secure_cookies': true,
      'cors_enabled': true,
      'rate_limiting': true,
      'input_validation': true
    };

    for (const [setting, required] of Object.entries(requiredSecureSettings)) {
      if (required && !config[setting]) {
        this.recordViolation('misconfiguration', 'medium',
          `Security misconfiguration: ${setting} not enabled`,
          undefined, { setting, config });
        return false;
      }
    }

    return true;
  }

  // A06:2021 - Vulnerable and Outdated Components
  public validateDependencies(dependencies: Record<string, string>): boolean {
    const knownVulnerableVersions = {
      'express': '<4.17.0',
      'lodash': '<4.17.21',
      'moment': '<2.29.4'
    };

    for (const [dep, version] of Object.entries(dependencies)) {
      if (knownVulnerableVersions[dep] && this.isVulnerableVersion(version, knownVulnerableVersions[dep])) {
        this.recordViolation('vulnerable_components', 'high',
          `Vulnerable dependency detected: ${dep}@${version}`,
          undefined, { dependency: dep, version });
        return false;
      }
    }

    return true;
  }

  // A07:2021 - Identification and Authentication Failures
  public validateAuthentication(credentials: any, context: string): boolean {
    // Check for weak passwords
    if (credentials.password && this.isWeakPassword(credentials.password)) {
      this.recordViolation('authentication', 'medium',
        `Weak password detected in ${context}`,
        credentials.userId, { context, passwordStrength: 'weak' });
      return false;
    }

    // Check for brute force attempts
    if (this.isBruteForceAttempt(credentials.userId || credentials.email)) {
      this.recordViolation('authentication', 'high',
        `Brute force attempt detected in ${context}`,
        credentials.userId, { context, attemptType: 'brute_force' });
      return false;
    }

    return true;
  }

  // A08:2021 - Software and Data Integrity Failures
  public validateIntegrity(data: any, signature?: string): boolean {
    if (!this.verifyDataIntegrity(data, signature)) {
      this.recordViolation('sensitive_data', 'high',
        'Data integrity check failed',
        undefined, { dataType: typeof data });
      return false;
    }

    return true;
  }

  // A09:2021 - Security Logging and Monitoring Failures
  public validateLogging(action: string, userId?: string): boolean {
    // Ensure all security-relevant actions are logged
    const securityActions = [
      'login', 'logout', 'password_change', 'role_change',
      'data_access', 'data_modification', 'export', 'delete'
    ];

    if (securityActions.includes(action)) {
      // This should trigger audit logging
      auditLogger.logAction(userId || 'system', action, 'user_profile', {
        security_check: true,
        timestamp: new Date().toISOString()
      });
    }

    return true;
  }

  // A10:2021 - Server-Side Request Forgery (SSRF)
  public validateURL(url: string): boolean {
    const dangerousProtocols = ['file://', 'ftp://', 'gopher://', 'dict://'];
    const internalIPs = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;

    if (dangerousProtocols.some(protocol => url.startsWith(protocol))) {
      this.recordViolation('injection', 'critical',
        'Dangerous protocol detected in URL',
        undefined, { url, protocol: url.split('://')[0] });
      return false;
    }

    if (internalIPs.test(url)) {
      this.recordViolation('access_control', 'high',
        'Internal IP address access attempt',
        undefined, { url });
      return false;
    }

    return true;
  }

  // Record security violations
  private recordViolation(
    type: SecurityViolation['type'],
    severity: SecurityViolation['severity'],
    description: string,
    userId?: string,
    details: Record<string, any> = {}
  ): void {
    const violation: SecurityViolation = {
      type,
      severity,
      description,
      timestamp: new Date(),
      userId,
      details
    };

    this.violations.push(violation);
    
    // Log to audit system
    auditLogger.logAction(userId || 'system', 'security_violation', 'user_profile', {
      violation_type: type,
      severity,
      description,
      details
    });

    console.warn(`🚨 Security violation (${severity}): ${description}`);
  }

  // Helper methods
  private getAllowedActions(userRole: string): string[] {
    const roleActions: Record<string, string[]> = {
      'user': ['read_own', 'write_own'],
      'caregiver': ['read_own', 'write_own', 'read_caregiver', 'write_caregiver'],
      'admin': ['read_all', 'write_all', 'delete', 'manage_users']
    };
    return roleActions[userRole] || [];
  }

  private isEncrypted(data: any): boolean {
    // Simplified check - in production, implement proper encryption validation
    return typeof data === 'string' && data.startsWith('encrypted_');
  }

  private isVulnerableVersion(version: string, vulnerableRange: string): boolean {
    // Simplified version comparison - use proper semver library in production
    const versionNum = parseInt(version.replace(/[^\d]/g, ''));
    const rangeNum = parseInt(vulnerableRange.replace(/[^\d]/g, ''));
    return versionNum < rangeNum;
  }

  private isWeakPassword(password: string): boolean {
    const weakPatterns = [
      /^.{1,7}$/, // Too short
      /^[a-zA-Z]+$/, // Only letters
      /^[0-9]+$/, // Only numbers
      /^(.)\1+$/, // Repeated characters
      /^(password|123456|qwerty|admin|user)$/i // Common passwords
    ];

    return weakPatterns.some(pattern => pattern.test(password));
  }

  private isBruteForceAttempt(identifier: string): boolean {
    // Simplified check - implement proper rate limiting in production
    const recentAttempts = this.violations.filter(v => 
      v.type === 'authentication' && 
      v.details.identifier === identifier &&
      v.timestamp > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
    );

    return recentAttempts.length > 5;
  }

  private verifyDataIntegrity(data: any, signature?: string): boolean {
    // Simplified check - implement proper cryptographic verification in production
    return signature ? signature.length > 0 : true;
  }

  // Get security violations
  public getViolations(): SecurityViolation[] {
    return [...this.violations];
  }

  // Get violations by severity
  public getViolationsBySeverity(severity: SecurityViolation['severity']): SecurityViolation[] {
    return this.violations.filter(v => v.severity === severity);
  }

  // Clear violations (for testing)
  public clearViolations(): void {
    this.violations = [];
  }

  // Generate security report
  public generateSecurityReport(): {
    totalViolations: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    recommendations: string[];
  } {
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};

    this.violations.forEach(violation => {
      bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + 1;
      byType[violation.type] = (byType[violation.type] || 0) + 1;
    });

    const recommendations = this.generateRecommendations();

    return {
      totalViolations: this.violations.length,
      bySeverity,
      byType,
      recommendations
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const criticalCount = this.getViolationsBySeverity('critical').length;
    const highCount = this.getViolationsBySeverity('high').length;

    if (criticalCount > 0) {
      recommendations.push('🔴 CRITICAL: Immediate action required for security vulnerabilities');
    }
    if (highCount > 0) {
      recommendations.push('🟠 HIGH: Address high-severity vulnerabilities within 24 hours');
    }
    if (this.violations.length > 10) {
      recommendations.push('⚠️ Consider implementing additional security controls');
    }

    return recommendations;
  }
}

export const securityCompliance = SecurityComplianceManager.getInstance();
