import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { AuthLayout, Field } from "@/pages/SignInPage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Reset password</CardTitle>
          <CardDescription>We'll email you a recovery link.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-muted-foreground">
              If an account exists for that address, a reset link is on the way.
            </p>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <Field
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                required
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending…" : "Send recovery email"}
              </Button>
            </form>
          )}
          <div className="mt-4 text-center text-sm">
            <Link to="/signin" className="text-muted-foreground hover:text-foreground">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
