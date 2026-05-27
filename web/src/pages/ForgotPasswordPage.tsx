import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Field } from "@/pages/SignInPage";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/signin`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="text-sm text-muted-foreground">We'll email you a recovery link.</p>
      </div>

      {sent ? (
        <p className="mt-6 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
          If an account exists for that address, a reset link is on the way.
        </p>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Field id="email" label="Email" type="email" value={email} onChange={setEmail} required />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending…" : "Send recovery email"}
          </Button>
        </form>
      )}

      <p className="mt-5 text-center text-sm">
        <Link to="/signin" className="text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
