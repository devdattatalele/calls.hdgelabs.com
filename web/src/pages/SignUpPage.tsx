import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Field } from "@/pages/SignInPage";

export function SignUpPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/onboard" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("Check your email to confirm your account.");
      return;
    }
    navigate("/onboard", { replace: true });
  }

  async function signUpWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/onboard` },
    });
    if (error) toast.error(error.message);
  }

  return (
    <AuthShell
      pitch={{
        title: "Create your HDGE Calls workspace in a minute.",
        subtitle:
          "Sign up, add your team, install the app on their phones, and watch every customer call land in one dashboard.",
      }}
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="text-sm text-muted-foreground">
          You'll fill in company details on the next step.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <Button type="button" variant="outline" className="w-full" onClick={signUpWithGoogle}>
          <GoogleMark />
          Continue with Google
        </Button>
        <div className="relative my-4 flex items-center">
          <div className="flex-1 border-t" />
          <span className="px-2 text-xs uppercase tracking-wider text-muted-foreground">
            or with email
          </span>
          <div className="flex-1 border-t" />
        </div>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <Field
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
        />
        <Field
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/signin" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.2-1.5 3.6-5.5 3.6-3.3 0-6-2.7-6-6.1S8.7 5.5 12 5.5c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3 14.6 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.9 0 9.4-4.8 9.4-7.3 0-.5-.1-.9-.1-1.3H12z"
      />
    </svg>
  );
}
