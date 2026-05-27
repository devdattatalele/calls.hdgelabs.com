import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SetupSteps, QuickActions } from "@/components/SetupSteps";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const APK_URL =
  import.meta.env.VITE_APK_URL ?? "https://hdgelabs.com/downloads/hdgecalls.apk";

export function HelpPage() {
  const { user } = useAuth();
  const isSignedIn = !!user;

  return (
    <div className="bg-background min-h-svh">
      {isSignedIn ? (
        <PageHeader
          title="Help & setup guide"
          description="Everything you need to get HDGE Calls running for your team."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Link>
            </Button>
          }
        />
      ) : (
        <header className="border-b">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
            <Link to="/signin" className="flex items-center gap-2.5">
              <img
                src="/hdge-icon.jpg"
                alt="HDGE"
                className="h-9 w-9 rounded-md object-cover ring-1 ring-border"
              />
              <span className="text-base font-semibold tracking-tight">HDGE Calls</span>
            </Link>
            <div className="flex gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/signin">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Create account</Link>
              </Button>
            </div>
          </div>
        </header>
      )}

      <div className="mx-auto grid max-w-4xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        {/* Steps */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Get started in 5 steps</CardTitle>
            </CardHeader>
            <CardContent>
              <SetupSteps />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>FAQs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <FaqItem
                q="Where do I download the Android app?"
                a={
                  <>
                    The APK is here:{" "}
                    <a
                      href={APK_URL}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Download <ExternalLink className="h-3 w-3" />
                    </a>
                    . You'll need to allow installation from unknown sources on the
                    phone the first time.
                  </>
                }
              />
              <FaqItem
                q="Do team members need to sign up themselves?"
                a={
                  <>
                    No. You add them from the <Link to="/team" className="text-primary hover:underline">Team page</Link>{" "}
                    by setting their email + password. Share those credentials privately —
                    that's what they'll use inside the app. They cannot self-register.
                  </>
                }
              />
              <FaqItem
                q="Can I use the same Android phone for two team members?"
                a="No — one Android phone = one team member. The app pairs to a single account permanently. Re-installing won't unpair it."
              />
              <FaqItem
                q="Do recordings count toward my monthly minutes?"
                a={
                  <>
                    Yes. Your plan's monthly minutes limit is enforced by total recorded
                    duration. See your usage on the{" "}
                    <Link to="/settings/billing" className="text-primary hover:underline">
                      Billing page
                    </Link>
                    .
                  </>
                }
              />
              <FaqItem
                q="How does the rating / confidence appear?"
                a={
                  <>
                    The Android app prompts each team member after a call to rate it 1-10
                    and pick a purchase confidence 1-10. We bucket those as{" "}
                    <b>Sure</b> (7-10), <b>Mid</b> (4-6), and <b>Not sure</b> (1-3).
                    Review them under{" "}
                    <Link to="/reports" className="text-primary hover:underline">Reports</Link>
                    {" "}or export as CSV.
                  </>
                }
              />
              <FaqItem
                q="How do I share recordings with a partner via API?"
                a={
                  <>
                    Mint an API key in{" "}
                    <Link to="/settings/api-keys" className="text-primary hover:underline">
                      Settings → API keys
                    </Link>
                    , hand it to your partner, and they hit
                    {" "}<code className="text-xs bg-muted px-1.5 py-0.5 rounded">GET https://api.calls.hdgelabs.com/v1/calls</code>
                    {" "}with a Bearer header. They're rate-limited and metered per minute.
                  </>
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickActions />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-primary" />
                Contact us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">Stuck on setup or have a feature request? Drop us a line.</p>
              <a
                href="mailto:hi@hdgelabs.com"
                className="block rounded-md border bg-background px-3 py-2 font-medium hover:bg-accent"
              >
                hi@hdgelabs.com
              </a>
              <a
                href="mailto:devdatta@hdgelabs.com"
                className="block rounded-md border bg-background px-3 py-2 font-medium hover:bg-accent"
              >
                devdatta@hdgelabs.com
              </a>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details className="group rounded-md border bg-background p-3 [&[open]>summary]:text-foreground">
      <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground hover:text-foreground">
        {q}
      </summary>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</div>
    </details>
  );
}
