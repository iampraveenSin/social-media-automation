import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "Update password",
};

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
      <UpdatePasswordForm />
    </div>
  );
}
