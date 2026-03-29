import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50/50 via-white to-violet-50/30">
      <SignIn />
    </div>
  );
}
