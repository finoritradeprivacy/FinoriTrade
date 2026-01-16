import { useEffect } from "react";
import { securityService } from "@/services/security";

export const SecurityProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // 1. Force HTTPS
    // Only redirect if not on localhost and protocol is http
    if (
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1" &&
      window.location.protocol === "http:"
    ) {
      window.location.href = window.location.href.replace("http:", "https:");
    }

    // 2. Global Error Handler for security-relevant errors
    const handleError = (event: ErrorEvent) => {
      // Filter for potential security issues (very basic heuristic)
      if (
        event.message.includes("SecurityError") ||
        event.message.includes("AccessDenied") ||
        event.message.includes("Forbidden")
      ) {
        securityService.log({
          type: "client_error",
          severity: "medium",
          details: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        });
      }
    };

    // 3. CSP Violation Listener (if browser supports SecurityPolicyViolationEvent)
    const handleCSPViolation = (event: SecurityPolicyViolationEvent) => {
      securityService.log({
        type: "csp_violation",
        severity: "medium",
        details: {
          blockedURI: event.blockedURI,
          violatedDirective: event.violatedDirective,
          originalPolicy: event.originalPolicy,
        },
      });
    };

    window.addEventListener("error", handleError);
    document.addEventListener("securitypolicyviolation", handleCSPViolation as any);

    return () => {
      window.removeEventListener("error", handleError);
      document.removeEventListener("securitypolicyviolation", handleCSPViolation as any);
    };
  }, []);

  return <>{children}</>;
};
