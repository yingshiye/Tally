import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/features/ForgotPasswordForm";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Reset password — ${brand.productName}`,
};

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Forgot your password?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
