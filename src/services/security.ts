import { supabase } from "@/integrations/supabase/client";

export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
  type: string;
  severity: SecurityEventSeverity;
  details?: Record<string, unknown>;
}

class SecurityService {
  /**
   * Logs a security event to Supabase.
   * If the user is not authenticated, it attempts to log anyway (depends on RLS).
   * Note: RLS currently requires authentication for insertion to prevent spam.
   * For critical unauthenticated events, we might need an Edge Function.
   */
  async log(event: SecurityEvent) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        event_type: event.type,
        severity: event.severity,
        details: event.details || {},
        user_id: user?.id || null,
        user_agent: navigator.userAgent,
        // IP address is better handled by Edge Functions / Database triggers, 
        // as client-side IP is not reliable or accessible easily.
      };

      if (user) {
        const { error } = await supabase
          .from('security_logs')
          .insert(payload);
          
        if (error) {
            console.error('Failed to log security event:', error);
        }
      } else {
        // For unauthenticated users, we currently just log to console
        // or could call an open Edge Function if implemented.
        console.warn('Security event (unauthenticated):', event);
      }
    } catch (err) {
      console.error('Error in security logging:', err);
    }
  }

  /**
   * Reports a CSP violation.
   * Browser sends this automatically if 'report-uri' is set, 
   * but we can also catch some manually or expose a handler.
   */
  async reportCSPViolation(violation: unknown) {
    await this.log({
      type: 'csp_violation',
      severity: 'medium',
      details: typeof violation === 'object' ? (violation as Record<string, unknown>) : { violation }
    });
  }
}

export const securityService = new SecurityService();
