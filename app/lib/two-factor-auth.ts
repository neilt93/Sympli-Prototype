import { createClient } from '@supabase/supabase-js';
import { auditLogger } from './audit-logger';

// Check if Supabase environment variables are available
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only create Supabase client if environment variables are available
let supabaseService: any = null;
if (supabaseUrl && supabaseServiceKey) {
  supabaseService = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn('⚠️ Supabase environment variables not configured. 2FA will use fallback mode.');
}

export interface TwoFactorSetup {
  userId: string;
  secret: string;
  backupCodes: string[];
  isEnabled: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

export interface TwoFactorVerification {
  userId: string;
  code: string;
  method: 'totp' | 'backup_code';
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class TwoFactorAuth {
  private static instance: TwoFactorAuth;

  private constructor() {}

  public static getInstance(): TwoFactorAuth {
    if (!TwoFactorAuth.instance) {
      TwoFactorAuth.instance = new TwoFactorAuth();
    }
    return TwoFactorAuth.instance;
  }

  // Generate a new TOTP secret for setup
  public generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  // Generate backup codes
  public generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  // Setup 2FA for a user
  public async setupTwoFactor(userId: string): Promise<{
    secret: string;
    backupCodes: string[];
    qrCodeUrl: string;
  }> {
    try {
      const secret = this.generateSecret();
      const backupCodes = this.generateBackupCodes();
      
      // Store setup in database if available
      if (supabaseService) {
        const { error } = await supabaseService
          .from('two_factor_setup')
          .insert([{
            user_id: userId,
            secret,
            backup_codes: backupCodes,
            is_enabled: false,
            created_at: new Date().toISOString()
          }]);

        if (error) {
          throw new Error(`Failed to setup 2FA: ${error.message}`);
        }
      } else {
        console.warn('⚠️ Supabase not available. 2FA setup stored locally only.');
      }

      // Generate QR code URL for authenticator apps
      const qrCodeUrl = this.generateQRCodeUrl(userId, secret);

      // Log the setup attempt
      await auditLogger.logAuthentication(userId, '2fa_setup', {
        timestamp: new Date().toISOString(),
        method: 'setup'
      });

      return {
        secret,
        backupCodes,
        qrCodeUrl
      };
    } catch (error) {
      console.error('❌ 2FA setup failed:', error);
      throw error;
    }
  }

  // Enable 2FA after verification
  public async enableTwoFactor(userId: string, verificationCode: string): Promise<boolean> {
    try {
      // Verify the code first
      const isValid = await this.verifyCode(userId, verificationCode);
      
      if (!isValid) {
        return false;
      }

      // Enable 2FA in database
      const { error } = await supabaseService
        .from('two_factor_setup')
        .update({ is_enabled: true })
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to enable 2FA: ${error.message}`);
      }

      // Log the enablement
      await auditLogger.logAuthentication(userId, '2fa_enabled', {
        timestamp: new Date().toISOString(),
        method: 'enable'
      });

      return true;
    } catch (error) {
      console.error('❌ 2FA enable failed:', error);
      return false;
    }
  }

  // Verify a TOTP code
  public async verifyCode(userId: string, code: string): Promise<boolean> {
    try {
      // Get user's 2FA setup
      const { data: setup, error } = await supabaseService
        .from('two_factor_setup')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !setup) {
        console.warn(`⚠️ No 2FA setup found for user: ${userId}`);
        return false;
      }

      // Check if it's a backup code
      if (setup.backup_codes.includes(code)) {
        // Remove used backup code
        const updatedBackupCodes = setup.backup_codes.filter(c => c !== code);
        await supabaseService
          .from('two_factor_setup')
          .update({ backup_codes: updatedBackupCodes })
          .eq('user_id', userId);

        // Log backup code usage
        await auditLogger.logAuthentication(userId, '2fa_backup_used', {
          timestamp: new Date().toISOString(),
          method: 'backup_code'
        });

        return true;
      }

      // Verify TOTP code (simplified - in production, use a proper TOTP library)
      const isValidTOTP = this.verifyTOTP(setup.secret, code);
      
      if (isValidTOTP) {
        // Log successful verification
        await auditLogger.logAuthentication(userId, '2fa_verified', {
          timestamp: new Date().toISOString(),
          method: 'totp'
        });
      }

      return isValidTOTP;
    } catch (error) {
      console.error('❌ 2FA verification failed:', error);
      return false;
    }
  }

  // Simplified TOTP verification (replace with proper library in production)
  private verifyTOTP(secret: string, code: string): boolean {
    // This is a simplified implementation
    // In production, use a proper TOTP library like 'otplib'
    const timestamp = Math.floor(Date.now() / 30000); // 30-second window
    const expectedCode = this.generateTOTP(secret, timestamp);
    
    // Check current and adjacent time windows
    return (
      code === expectedCode ||
      code === this.generateTOTP(secret, timestamp - 1) ||
      code === this.generateTOTP(secret, timestamp + 1)
    );
  }

  // Simplified TOTP generation (replace with proper library in production)
  private generateTOTP(secret: string, timestamp: number): string {
    // This is a placeholder - use proper TOTP library
    const hash = this.simpleHash(secret + timestamp.toString());
    const code = (parseInt(hash, 16) % 1000000).toString().padStart(6, '0');
    return code;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Generate QR code URL for authenticator apps
  private generateQRCodeUrl(userId: string, secret: string): string {
    const issuer = 'Sympli';
    const account = userId;
    const algorithm = 'SHA1';
    const digits = 6;
    const period = 30;
    
    const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=${algorithm}&digits=${digits}&period=${period}`;
    
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
  }

  // Check if 2FA is required for a user role
  public async isTwoFactorRequired(userId: string): Promise<boolean> {
    try {
      // Get user's role
      const { data: user, error } = await supabaseService
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return false;
      }

      // Check if 2FA is enabled for this user
      const { data: setup } = await supabaseService
        .from('two_factor_setup')
        .select('is_enabled')
        .eq('user_id', userId)
        .single();

      // Require 2FA for caregiver, healthcare_provider, and admin roles
      const requires2FA = ['caregiver', 'healthcare_provider', 'admin'].includes(user.role);
      
      return requires2FA && setup?.is_enabled === true;
    } catch (error) {
      console.error('❌ Failed to check 2FA requirement:', error);
      return false;
    }
  }

  // Disable 2FA for a user
  public async disableTwoFactor(userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseService
        .from('two_factor_setup')
        .update({ is_enabled: false })
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to disable 2FA: ${error.message}`);
      }

      // Log the disablement
      await auditLogger.logAuthentication(userId, '2fa_disabled', {
        timestamp: new Date().toISOString(),
        method: 'disable'
      });

      return true;
    } catch (error) {
      console.error('❌ 2FA disable failed:', error);
      return false;
    }
  }
}

export const twoFactorAuth = TwoFactorAuth.getInstance();
