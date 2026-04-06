import { redirect } from "next/navigation";
import { authHref, sanitizeNextParam } from "@/lib/auth/safe-next";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

/** Keeps `/signup` URLs working; unified UI lives on `/login?mode=signup`. */
export default async function SignupRedirectPage({ searchParams }: Props) {
  const { next } = await searchParams;
  redirect(
    authHref("/login", {
      mode: "signup",
      next: sanitizeNextParam(next),
    }),
  );
}
