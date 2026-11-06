import type { Metadata } from "next";
import { SignupForm } from "@/components/features/SignupForm";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Create account — ${brand.productName}`,
};

export default function SignupPage() {
  return (
    <div className="w-full max-w-sm">
      <SignupForm />
    </div>
  );
}
