"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, GitBranch, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState("");
  const router = useRouter();

  function handleCredentials(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signIn("credentials", {
        email: fd.get("email") as string,
        name: fd.get("name") as string,
        redirect: false,
      });
      if (res?.error) {
        setError("Failed to create account");
      } else {
        router.push("/onboarding");
      }
    });
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white">
            <div className="rounded-xl bg-white/20 p-2 backdrop-blur-sm">
              <Zap className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold">TaskRouting</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Start routing tasks to<br />agents in under 5 minutes
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            Create your workspace, register agents, and let AI handle the orchestration.
          </p>
          <div className="flex items-center gap-6 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>AI-native routing</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>MCP-first</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Full audit trail</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-white/40 text-sm">
          &copy; 2026 TaskRouting. All rights reserved.
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="rounded-xl gradient-primary p-2">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">TaskRouting</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Create your account</h2>
            <p className="text-muted-foreground mt-1">Get started with TaskRouting</p>
          </div>

          {/* GitHub OAuth */}
          <Button
            variant="outline"
            className="w-full gap-2 h-11"
            onClick={() => signIn("github", { callbackUrl: "/onboarding" })}
          >
            <GitBranch className="h-4 w-4" />
            Continue with GitHub
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          {/* Credentials form */}
          <form onSubmit={handleCredentials} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" type="email" placeholder="you@company.com" required />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input name="name" placeholder="Your name" required />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full gap-2 h-11" disabled={isPending}>
              {isPending ? "Creating account..." : "Create Account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
