export type UserRole = 'user' | 'caregiver' | 'admin' | 'healthcare_provider';
export type Permission = 
  | 'read_own_data'
  | 'write_own_data'
  | 'read_caregiver_data'
  | 'write_caregiver_data'
  | 'read_all_data'
  | 'write_all_data'
  | 'export_reports'
  | 'manage_users'
  | 'view_audit_logs'
  | 'manage_consent'
  | 'delete_data'
  | 'access_admin_panel';

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  requires2FA: boolean;
  dataScope: 'own' | 'caregiver' | 'all';
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  user: {
    role: 'user',
    permissions: [
      'read_own_data',
      'write_own_data',
      'export_reports'
    ],
    requires2FA: false,
    dataScope: 'own'
  },
  caregiver: {
    role: 'caregiver',
    permissions: [
      'read_own_data',
      'write_own_data',
      'read_caregiver_data',
      'write_caregiver_data',
      'export_reports',
      'manage_consent'
    ],
    requires2FA: true,
    dataScope: 'caregiver'
  },
  healthcare_provider: {
    role: 'healthcare_provider',
    permissions: [
      'read_own_data',
      'write_own_data',
      'read_caregiver_data',
      'write_caregiver_data',
      'export_reports',
      'view_audit_logs'
    ],
    requires2FA: true,
    dataScope: 'caregiver'
  },
  admin: {
    role: 'admin',
    permissions: [
      'read_own_data',
      'write_own_data',
      'read_all_data',
      'write_all_data',
      'export_reports',
      'manage_users',
      'view_audit_logs',
      'manage_consent',
      'delete_data',
      'access_admin_panel'
    ],
    requires2FA: true,
    dataScope: 'all'
  }
};

export class RBACManager {
  private static instance: RBACManager;

  private constructor() {}

  public static getInstance(): RBACManager {
    if (!RBACManager.instance) {
      RBACManager.instance = new RBACManager();
    }
    return RBACManager.instance;
  }

  public hasPermission(userRole: UserRole, requiredPermission: Permission): boolean {
    const roleConfig = ROLE_PERMISSIONS[userRole];
    if (!roleConfig) {
      console.warn(`⚠️ Unknown role: ${userRole}`);
      return false;
    }
    return roleConfig.permissions.includes(requiredPermission);
  }

  public requiresTwoFactor(userRole: UserRole): boolean {
    const roleConfig = ROLE_PERMISSIONS[userRole];
    return roleConfig?.requires2FA || false;
  }

  public getDataScope(userRole: UserRole): 'own' | 'caregiver' | 'all' {
    const roleConfig = ROLE_PERMISSIONS[userRole];
    return roleConfig?.dataScope || 'own';
  }

  public canAccessData(userRole: UserRole, targetUserId: string, currentUserId: string): boolean {
    const dataScope = this.getDataScope(userRole);
    
    switch (dataScope) {
      case 'own':
        return targetUserId === currentUserId;
      case 'caregiver':
        // Check if current user is caregiver for target user
        return targetUserId === currentUserId || this.isCaregiverFor(currentUserId, targetUserId);
      case 'all':
        return true;
      default:
        return false;
    }
  }

  private isCaregiverFor(caregiverId: string, patientId: string): boolean {
    // This would check the caregiver-patient relationship in the database
    // For now, return false - implement actual database check
    return false;
  }

  public validateAction(userRole: UserRole, action: string, resourceId?: string): {
    allowed: boolean;
    reason?: string;
  } {
    // Map actions to permissions
    const actionPermissionMap: Record<string, Permission> = {
      'view_symptom_log': 'read_own_data',
      'create_symptom_log': 'write_own_data',
      'edit_symptom_log': 'write_own_data',
      'delete_symptom_log': 'delete_data',
      'export_pdf': 'export_reports',
      'view_timeline': 'read_own_data',
      'view_audit_logs': 'view_audit_logs',
      'manage_users': 'manage_users',
      'access_admin': 'access_admin_panel'
    };

    const requiredPermission = actionPermissionMap[action];
    if (!requiredPermission) {
      return { allowed: false, reason: 'Unknown action' };
    }

    const hasPermission = this.hasPermission(userRole, requiredPermission);
    return {
      allowed: hasPermission,
      reason: hasPermission ? undefined : `Role ${userRole} lacks permission: ${requiredPermission}`
    };
  }
}

export const rbacManager = RBACManager.getInstance();

// Helper functions for common permission checks
export const canViewSymptomLog = (userRole: UserRole): boolean => {
  return rbacManager.hasPermission(userRole, 'read_own_data');
};

export const canCreateSymptomLog = (userRole: UserRole): boolean => {
  return rbacManager.hasPermission(userRole, 'write_own_data');
};

export const canExportReports = (userRole: UserRole): boolean => {
  return rbacManager.hasPermission(userRole, 'export_reports');
};

export const canAccessAdminPanel = (userRole: UserRole): boolean => {
  return rbacManager.hasPermission(userRole, 'access_admin_panel');
};

export const canViewAuditLogs = (userRole: UserRole): boolean => {
  return rbacManager.hasPermission(userRole, 'view_audit_logs');
};
