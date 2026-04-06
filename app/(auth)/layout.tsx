import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 lg:flex-row lg:bg-white">
      <div className="flex min-h-dvh flex-1 flex-col justify-center px-4 py-10 sm:px-8 lg:min-h-0 lg:w-[min(100%,28rem)] lg:flex-none lg:shrink-0 lg:px-10 xl:px-14">
        {children}
      </div>
      <div className="hidden lg:flex lg:min-h-dvh lg:flex-1 lg:shrink">
        <AuthHeroPanel />
      </div>
    </div>
  );
}
