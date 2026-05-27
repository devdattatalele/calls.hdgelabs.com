import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";
import { supabase } from "@/lib/supabase";
import { AuthShell } from "@/components/AuthShell";
import { Field } from "@/pages/SignInPage";
import { Button } from "@/components/ui/button";

export function OnboardPage() {
  const { user } = useAuth();
  const company = useMyCompany(user?.id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [size, setSize] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (company.isLoading) return null;
  if (company.data) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("companies").insert({
        owner_user_id: user.id,
        name,
        role: role || null,
        size: size || null,
        website: website || null,
        industry: industry || null,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["company"] });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Onboarding failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      pitch={{
        title: "One last step before your dashboard.",
        subtitle:
          "These details show up inside the HDGEcalls Android app and on your B2B partner API responses.",
      }}
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Tell us about your company</h1>
        <p className="text-sm text-muted-foreground">
          You can change any of this later in Settings.
        </p>
      </div>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <Field id="name" label="Company name" value={name} onChange={setName} required />
        <Field id="role" label="Your role" value={role} onChange={setRole} placeholder="Founder, Operations…" />
        <Field id="size" label="Team size" value={size} onChange={setSize} placeholder="1–10, 11–50, …" />
        <Field id="website" label="Website" type="url" value={website} onChange={setWebsite} placeholder="https://" />
        <Field id="industry" label="Industry" value={industry} onChange={setIndustry} />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </form>
    </AuthShell>
  );
}
