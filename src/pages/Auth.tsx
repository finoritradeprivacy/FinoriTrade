
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TrendingUp, Shield, Zap, Eye, EyeOff, Check, X } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function Auth() {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register State
  const [registerNickname, setRegisterNickname] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Verification State
  const [verificationStep, setVerificationStep] = useState(false);
  const [otp, setOtp] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) throw error;
      toast.success("Successfully logged in!");
      navigate("/trade");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to login";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!loginEmail) {
      toast.error("Please fill in your email first");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await resetPassword(loginEmail);
      if (error) throw error;
      toast.success("Password reset email sent. Check your inbox.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send reset email";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail || !registerPassword || !registerNickname || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (registerPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!checkPasswordStrength(registerPassword)) {
      toast.error("Password does not meet requirements");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          action: 'send',
          email: registerEmail,
          nickname: registerNickname,
          password: registerPassword
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setVerificationStep(true);
      toast.success("Verification code sent! Please check your email.");
    } catch (error) {
      console.error("Registration error:", error);
      const message = error instanceof Error ? error.message : "Failed to register";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-verification-email", {
        body: {
          action: "verify",
          email: registerEmail,
          code: otp,
          password: registerPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Email verified successfully! Logging in...");
      
      // Auto login after verification
      const { error: loginError } = await signIn(registerEmail, registerPassword);
      if (loginError) throw loginError;
      
      navigate("/trade");
    } catch (error) {
      console.error("Verification error:", error);
      const message = error instanceof Error ? error.message : "Failed to verify email";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Password Strength Logic
  const checkPasswordStrength = (pass: string) => {
    return pass.length >= 8 && /[a-z]/.test(pass) && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[!@#$%^&*]/.test(pass);
  };

  const passwordRequirements = [
    { label: "8+ characters", valid: registerPassword.length >= 8 },
    { label: "Lowercase (a-z)", valid: /[a-z]/.test(registerPassword) },
    { label: "Uppercase (A-Z)", valid: /[A-Z]/.test(registerPassword) },
    { label: "Number (0-9)", valid: /[0-9]/.test(registerPassword) },
    { label: "Symbol (!@#$...)", valid: /[!@#$%^&*]/.test(registerPassword) },
  ];

  const passwordStrengthLabel = () => {
    const validCount = passwordRequirements.filter(r => r.valid).length;
    if (validCount <= 2) return { text: "Weak", color: "bg-red-500", width: "33%" };
    if (validCount <= 4) return { text: "Medium", color: "bg-yellow-500", width: "66%" };
    return { text: "Strong", color: "bg-green-500", width: "100%" };
  };

  const strength = passwordStrengthLabel();

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left Side - Features */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black -z-10"></div>
        
        <div>
          <h1 className="text-4xl font-bold text-primary mb-2">FinoriTrade</h1>
          <p className="text-xl text-gray-400 mb-12">Master trading without financial risk</p>

          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="p-3 rounded-lg bg-purple-900/20 h-fit">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Realistic Market Simulation</h3>
                <p className="text-gray-400">Experience real trading dynamics with order books, liquidity, and market events</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="p-3 rounded-lg bg-purple-900/20 h-fit">
                <Shield className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Risk-Free Learning</h3>
                <p className="text-gray-400">Start with $100,000 USDT virtual money and learn without consequences</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="p-3 rounded-lg bg-purple-900/20 h-fit">
                <Zap className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Real-Time Trading</h3>
                <p className="text-gray-400">Execute market and limit orders with instant feedback and analytics</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500 space-y-4">
                <p>By using this platform, I agree to <a href="https://docs.google.com/document/d/1pDJrRq4CcQAN18keSsrTexdAhXDmeNv14ohOg4wjy8E/edit?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">this document</a></p>
                <div className="flex gap-4">
                  <Link to="/about" className="hover:text-gray-300">About Us</Link>
                  <Link to="/faq" className="hover:text-gray-300">FAQ</Link>
                  <Link to="/contacts" className="hover:text-gray-300">Contacts</Link>
                </div>
              </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-xl border border-gray-800 bg-gray-950/50 backdrop-blur-sm shadow-xl">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-900">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input 
                    id="login-email" 
                    type="email" 
                    placeholder="your@email.com" 
                    className="bg-gray-900 border-gray-800"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="login-password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      className="bg-gray-900 border-gray-800 pr-10"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-gray-400 hover:text-white underline-offset-2 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={isLoading}>
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              {verificationStep ? (
                <form onSubmit={handleVerify} className="space-y-6 py-4">
                  <div className="space-y-2 text-center">
                    <h3 className="text-lg font-medium text-white">Check Your Email</h3>
                    <p className="text-sm text-gray-400">
                      We've sent a verification code to <span className="text-purple-400">{registerEmail}</span>
                    </p>
                  </div>
                  
                  <div className="flex justify-center py-4">
                    <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="bg-gray-900 border-gray-800 text-white" />
                        <InputOTPSlot index={1} className="bg-gray-900 border-gray-800 text-white" />
                        <InputOTPSlot index={2} className="bg-gray-900 border-gray-800 text-white" />
                        <InputOTPSlot index={3} className="bg-gray-900 border-gray-800 text-white" />
                        <InputOTPSlot index={4} className="bg-gray-900 border-gray-800 text-white" />
                        <InputOTPSlot index={5} className="bg-gray-900 border-gray-800 text-white" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Verify & Sign In"}
                  </Button>
                  
                  <div className="text-center">
                    <button 
                      type="button" 
                      onClick={() => setVerificationStep(false)}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Back to Registration
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Nickname</Label>
                    <Input 
                      id="nickname" 
                      placeholder="TradingPro" 
                      className="bg-gray-900 border-gray-800"
                      value={registerNickname}
                      onChange={(e) => setRegisterNickname(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input 
                      id="register-email" 
                      type="email" 
                      placeholder="your@email.com" 
                      className="bg-gray-900 border-gray-800"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Input 
                        id="register-password" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        className="bg-gray-900 border-gray-800 pr-10"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                      />
                       <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Meter */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Password strength:</span>
                      <span className={strength.text === "Strong" ? "text-green-500" : strength.text === "Medium" ? "text-yellow-500" : "text-red-500"}>
                        {strength.text}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${strength.color}`} 
                        style={{ width: strength.width }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-gray-400">
                    <p className="mb-2">Password must contain:</p>
                    <div className="grid grid-cols-2 gap-1">
                      {passwordRequirements.map((req, index) => (
                        <div key={index} className={`flex items-center gap-1 ${req.valid ? "text-green-500" : "text-gray-500"}`}>
                          {req.valid ? <Check size={12} /> : <X size={12} />}
                          <span>{req.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input 
                        id="confirm-password" 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        className="bg-gray-900 border-gray-800 pr-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Sign Up"}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
