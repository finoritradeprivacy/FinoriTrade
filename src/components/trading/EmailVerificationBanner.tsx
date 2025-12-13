import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, Check } from "lucide-react";
import { toast } from "sonner";

const EmailVerificationBanner = () => {
  const { user, isEmailVerified, isAdmin, resendVerificationEmail } = useAuth();
  const [sending, setSending] = useState(false);

  // Don't show banner if user is verified, is admin, or not logged in
  if (!user || isEmailVerified || isAdmin) {
    return null;
  }

  const handleResend = async () => {
    setSending(true);
    const { error } = await resendVerificationEmail();
    setSending(false);

    if (error) {
      toast.error(error.message || "Failed to send verification email");
    } else {
      toast.success("Verification email sent! Check your inbox.");
    }
  };

  return (
    <div className="bg-warning/20 border border-warning/50 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-warning">Email Verification Required</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Please verify your email address to enable trading. Check your inbox for the verification link.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleResend}
              disabled={sending}
              className="border-warning/50 text-warning hover:bg-warning/10"
            >
              <Mail className="w-4 h-4 mr-2" />
              {sending ? "Sending..." : "Resend Email"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Sent to: {user.email}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;
