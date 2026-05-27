import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/pages/SignInPage";

export function CompanySettingsPage() {
  const { user } = useAuth();
  const company = useMyCompany(user?.id);
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [size, setSize] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (!company.data) return;
    setName(company.data.name);
    setRole(company.data.role ?? "");
    setSize(company.data.size ?? "");
    setWebsite(company.data.website ?? "");
    setIndustry(company.data.industry ?? "");
  }, [company.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!company.data) return;
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({
        name,
        role: role || null,
        size: size || null,
        website: website || null,
        industry: industry || null,
      })
      .eq("id", company.data.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    queryClient.invalidateQueries({ queryKey: ["company"] });
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !company.data) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${company.data.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("company-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("company-assets").getPublicUrl(path);
      const cacheBusted = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: upErr2 } = await supabase
        .from("companies")
        .update({ logo_url: cacheBusted })
        .eq("id", company.data.id);
      if (upErr2) throw upErr2;
      toast.success("Logo updated");
      queryClient.invalidateQueries({ queryKey: ["company"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <>
      <PageHeader title="Company" description="Shown to your team inside the HDGEcalls app." />
      <div className="grid gap-4 p-8 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={save}>
              <Field id="name" label="Company name" value={name} onChange={setName} required />
              <Field id="role" label="Your role" value={role} onChange={setRole} />
              <Field id="size" label="Team size" value={size} onChange={setSize} />
              <Field id="website" label="Website" type="url" value={website} onChange={setWebsite} />
              <Field id="industry" label="Industry" value={industry} onChange={setIndustry} />
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {company.data?.logo_url ? (
              <img
                src={company.data.logo_url}
                alt="logo"
                className="h-24 w-24 rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-md border bg-muted text-2xl font-bold text-muted-foreground">
                {name[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadLogo}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? "Uploading…" : "Upload new logo"}
            </Button>
            <p className="text-xs text-muted-foreground">
              PNG or JPG, square works best. Shown in the Android app header.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
