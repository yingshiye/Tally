import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/features/ResetPasswordForm";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Set new password — ${brand.productName}`,
};

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Set a new password
        </h1>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
