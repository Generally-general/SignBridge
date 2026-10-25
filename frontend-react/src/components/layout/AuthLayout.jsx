import React from "react";
import { Logo } from "../ui/Logo";

const AuthLayout = ({ title, children }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo variant="full" height={120} alt="" className="mx-auto" />
          <h1 className="sr-only">SignBridge</h1>
          <p className="text-text-secondary text-sm mt-2">
            Real-time Sign Language Video Calling
          </p>
        </div>

        <div className="bg-surface border border-border rounded-card p-6 shadow-sm">
          {title && (
            <h2 className="text-[16px] font-semibold text-text-primary mb-6">
              {title}
            </h2>
          )}
          {children}
        </div>

        <p className="text-center text-text-muted text-[12px] mt-6">
          Secure video calling for the Deaf community
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;
