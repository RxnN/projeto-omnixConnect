import * as Sentry from "@sentry/nextjs";

export type SecurityEvent =
  | "admin_access_denied"
  | "admin_mfa_send_limited"
  | "admin_mfa_verify_limited"
  | "admin_mfa_invalid"
  | "login_email_limited"
  | "login_ip_limited"
  | "request_origin_rejected";

export function countSecurityEvent(event: SecurityEvent) {
  Sentry.metrics.count(`security.${event}`, 1);
}

export function alertSecurityEvent(event: SecurityEvent) {
  countSecurityEvent(event);
  Sentry.captureMessage(`security.${event}`, {
    level: "warning",
    tags: { category: "security", security_event: event },
  });
}
