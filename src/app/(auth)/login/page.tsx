import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/features/LoginForm";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Sign in — ${brand.productName}`,
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
