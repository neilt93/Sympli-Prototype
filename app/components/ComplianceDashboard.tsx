'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { auditLogger } from '../lib/audit-logger';
import { securityCompliance } from '../lib/security-compliance';
import { dataRetentionManager } from '../lib/data-retention';
import { rbacManager } from '../lib/rbac';

interface ComplianceStats {
  totalAuditLogs: number;
  securityViolations: number;
  dataRetentionActions: number;
  activeUsers: number;
  complianceScore: number;
}

interface SecurityViolation {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  resolved: boolean;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  timestamp: string;
  details: any;
}

export default function ComplianceDashboard() {
  const [stats, setStats] = useState<ComplianceStats>({
    totalAuditLogs: 0,
    securityViolations: 0,
    dataRetentionActions: 0,
    activeUsers: 0,
    complianceScore: 0
  });
  const [violations, setViolations] = useState<SecurityViolation[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'audit' | 'retention'>('overview');

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      
      // Load security violations
      const securityReport = securityCompliance.generateSecurityReport();
      
      // Load audit logs (simulated - in production, fetch from API)
      const mockAuditLogs = [
        {
          id: '1',
          user_id: 'user1',
          action: 'login',
          resource_type: 'authentication',
          timestamp: new Date().toISOString(),
          details: { ip_address: '192.168.1.1' }
        },
        {
          id: '2',
          user_id: 'user2',
          action: 'create',
          resource_type: 'symptom_log',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          details: { symptom_type: 'headache' }
        }
      ];

      // Calculate compliance score
      const complianceScore = calculateComplianceScore(securityReport);

      setStats({
        totalAuditLogs: mockAuditLogs.length,
        securityViolations: securityReport.totalViolations,
        dataRetentionActions: 0, // Would be fetched from data retention manager
        activeUsers: 5, // Would be fetched from user management
        complianceScore
      });

      setViolations([]); // No violations property in securityReport
      setRecentAuditLogs(mockAuditLogs);
      
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateComplianceScore = (securityReport: any): number => {
    const totalChecks = 100; // Base score
    const violationPenalty = securityReport.totalViolations * 5;
    const criticalPenalty = (securityReport.bySeverity?.critical || 0) * 20;
    
    return Math.max(0, totalChecks - violationPenalty - criticalPenalty);
  };

  const getComplianceStatus = (score: number) => {
    if (score >= 90) return { status: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 75) return { status: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 60) return { status: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'Poor', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const executeDataRetention = async () => {
    try {
      const result = await dataRetentionManager.executeRetentionPolicy();
      alert(`Data retention policy executed. ${result.summary ? Object.values(result.summary).reduce((a: any, b: any) => a + b, 0) : 0} records processed.`);
      loadComplianceData();
    } catch (error) {
      alert('Failed to execute data retention policy');
    }
  };

  const resolveViolation = async (violationId: string) => {
    // In production, this would update the violation status
    setViolations(prev => prev.map(v => 
      v.id === violationId ? { ...v, resolved: true } : v
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const complianceStatus = getComplianceStatus(stats.complianceScore);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Compliance Dashboard</h1>
        <p className="text-gray-600">Monitor security, audit logs, and compliance status</p>
      </div>

      {/* Compliance Score */}
      <div className="mb-8">
        <div className={`p-6 rounded-lg ${complianceStatus.bg} border`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Overall Compliance Score</h2>
              <p className="text-gray-600">Based on security violations and audit findings</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${complianceStatus.color}`}>
                {stats.complianceScore}%
              </div>
              <div className={`text-lg font-medium ${complianceStatus.color}`}>
                {complianceStatus.status}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'security', label: 'Security', icon: '🔒' },
            { id: 'audit', label: 'Audit Logs', icon: '📝' },
            { id: 'retention', label: 'Data Retention', icon: '🗄️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Audit Logs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAuditLogs}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <span className="text-2xl">🚨</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Security Violations</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.securityViolations}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <span className="text-2xl">🗄️</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Data Retention Actions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.dataRetentionActions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Security Violations</h3>
              <button
                onClick={loadComplianceData}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Refresh
              </button>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {violations.map(violation => (
                      <tr key={violation.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {violation.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            violation.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            violation.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            violation.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {violation.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {violation.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(violation.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            violation.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {violation.resolved ? 'Resolved' : 'Open'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {!violation.resolved && (
                            <button
                              onClick={() => resolveViolation(violation.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Recent Audit Logs</h3>
              <button
                onClick={loadComplianceData}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Refresh
              </button>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resource
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentAuditLogs.map(log => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {log.user_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.resource_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <pre className="text-xs bg-gray-100 p-2 rounded">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'retention' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Data Retention Management</h3>
              <button
                onClick={executeDataRetention}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Execute Retention Policy
              </button>
            </div>

            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Retention Policies</h4>
              <div className="space-y-4">
                {[
                  { type: 'User Profiles', period: '2 years', action: 'Anonymize' },
                  { type: 'Symptom Logs', period: '7 years', action: 'Archive' },
                  { type: 'Audit Logs', period: '7 years', action: 'Delete' },
                  { type: 'Consent Records', period: '7 years', action: 'Archive' },
                  { type: 'Backup Data', period: '30 days', action: 'Delete' }
                ].map(policy => (
                  <div key={policy.type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="font-medium text-gray-900">{policy.type}</h5>
                      <p className="text-sm text-gray-600">Retention period: {policy.period}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {policy.action}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
