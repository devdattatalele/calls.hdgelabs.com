import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  KeyRound,
  Mic,
  Smartphone,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const APK_URL =
  import.meta.env.VITE_APK_URL ?? "/downloads/HDGEcalls-0.2.0.apk";

const STEPS = [
  {
    icon: Download,
    title: "Get the Android app",
    body: "Download the latest APK and install on every phone you want to capture calls from.",
    action: { href: APK_URL, label: "Download HDGEcalls v0.2.0", external: true },
  },
  {
    icon: UserPlus,
    title: "Create your workspace",
    body: "Sign up on calls.hdgelabs.com, fill in your company details on the next step.",
    action: { href: "/signup", label: "Sign up" },
  },
  {
    icon: Users,
    title: "Add a team member",
    body: "From Team → Add member, set their email + password. One member = one phone.",
    action: { href: "/team", label: "Open Team page" },
  },
  {
    icon: Smartphone,
    title: "Sign the phone in to the app",
    body: "Open HDGEcalls on the team member's phone, sign in with those credentials, grant call+mic permissions. That's it.",
  },
  {
    icon: Mic,
    title: "Watch the calls flow in",
    body: "Each call recording, rating, and confidence note shows up here within seconds.",
    action: { href: "/dashboard", label: "Open dashboard" },
  },
  {
    icon: KeyRound,
    title: "(Optional) Hand out API keys",
    body: "Reselling? Mint a per-partner key, rate-limited and metered per minute.",
    action: { href: "/settings/api-keys", label: "Manage keys" },
  },
];

export function HelpPage() {
  const { user } = useAuth();
  const isSignedIn = !!user;

  return (
    <div className="min-h-svh bg-background">
      {isSignedIn ? (
        <PageHeader
          title="Help & setup"
          description="Everything you need to get HDGEcalls running for your team."
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
        <header className="border-b bg-card/40">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to="/signin" className="flex items-center gap-2.5">
              <img
                src="/hdge-icon.jpg"
                alt="HDGElabs"
                className="h-9 w-9 rounded-md object-cover ring-1 ring-border"
              />
              <div className="leading-tight">
                <div className="text-sm font-semibold">HDGElabs</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary/80">
                  HDGEcalls
                </div>
              </div>
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

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Big hero CTA */}
        <Card className="overflow-hidden">
          <CardContent className="grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Step 0 · Install the Android app
              </div>
              <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight">
                HDGEcalls v0.2.0
              </h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Side-load this APK on each team member's phone. After signing in once
                with their dashboard-issued credentials, every call auto-syncs here.
              </p>
            </div>
            <a
              href={APK_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              Download APK
            </a>
          </CardContent>
        </Card>

        {/* Steps grid */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Set it up in 5 minutes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One-time onboarding. Each step links directly to the right page.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <Card key={i} className="group transition-colors hover:bg-accent/40">
                  <CardContent className="flex gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Step {i + 1}
                        </span>
                      </div>
                      <div className="mt-0.5 font-medium leading-tight">{s.title}</div>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {s.body}
                      </p>
                      {s.action && (
                        <a
                          href={s.action.href}
                          target={s.action.external ? "_blank" : undefined}
                          rel={s.action.external ? "noreferrer noopener" : undefined}
                          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          {s.action.label}
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator className="my-12" />

        {/* Contact + tips, side by side */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Support
              </div>
              <div className="mt-2 text-base font-semibold">
                We respond within a business day.
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Email us — we read every message.
              </p>
              <div className="mt-4 space-y-2">
                <a
                  className="block rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                  href="mailto:hi@hdgelabs.com"
                >
                  hi@hdgelabs.com
                </a>
                <a
                  className="block rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                  href="mailto:devdatta@hdgelabs.com"
                >
                  devdatta@hdgelabs.com
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Good to know
              </div>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <Tip>
                  Each Android phone pairs to <b>one</b> team member.
                  Re-installing the app keeps the same pairing.
                </Tip>
                <Tip>
                  Team members <b>cannot self-register</b>. Only you, the workspace
                  owner, can create accounts from the Team page.
                </Tip>
                <Tip>
                  Plan limits enforce monthly recorded <b>minutes</b>, not call count.
                  See your usage on the Billing page.
                </Tip>
                <Tip>
                  Recordings are private. Sharing happens only through short-lived
                  signed URLs minted on demand or through your API keys.
                </Tip>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-primary" />
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
