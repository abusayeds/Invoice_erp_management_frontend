/**
 * File: src/pages/auth/VerifyOTP.tsx
 * OTP Verification page - Enter 6-digit code
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { OTPInput } from "../../components/auth/OTPInput";
import { ArrowLeft } from "lucide-react";

export const VerifyOTP: React.FC = () => {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);

  const handleOTPComplete = async (otp: string) => {
    setIsVerifying(true);
    // Simulate API call
    console.log("Verifying OTP:", otp);
    setTimeout(() => {
      setIsVerifying(false);
      navigate("/auth/set-password");
    }, 1500);
  };

  const handleResend = () => {
    console.log("Resending OTP...");
  };

  return (
    <AuthLayout
      title="Enter your OTP"
      subtitle="We've sent a code to your email"
    >
      <div className="space-y-6">
        <OTPInput onComplete={handleOTPComplete} />

        {isVerifying && (
          <p className="text-center text-sm text-gray-600">Verifying code...</p>
        )}

        <button
          type="button"
          onClick={handleResend}
          className="w-full text-sm text-gray-600 hover:text-gray-900 py-2"
        >
          Didn't receive code?{" "}
          <span className="text-blue-600 font-medium">Resend</span>
        </button>

        <div className="text-center">
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};
