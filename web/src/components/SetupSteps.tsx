import { Download, ExternalLink, Mail, PhoneCall, UserPlus } from "lucide-react";

const APK_URL =
  import.meta.env.VITE_APK_URL ?? "/app/HDGEcalls-latest.apk";

const STEPS: {
  title: string;
  body: string;
  cta?: { href: string; label: string; external?: boolean };
}[] = [
  {
    title: "Download the HDGEcalls Android app",
    body:
      "Install on every phone you want to capture calls from. Only Android is supported today.",
    cta: { href: APK_URL, label: "Download APK", external: true },
  },
  {
    title: "Create your workspace here",
    body:
      "Sign up on calls.hdgelabs.com, fill in your company details, and you'll land in the dashboard.",
    cta: { href: "/signup", label: "Sign up" },
  },
  {
    title: "Add a team member in the Team page",
    body:
      "Each team member is one phone. You set their email + password — share them privately.",
    cta: { href: "/team", label: "Open Team" },
  },
  {
    title: "Sign in to the APK with those credentials",
    body:
      "The phone logs in once, then auto-syncs every call (and recording) to this dashboard.",
  },
  {
    title: "Review calls, ratings, and analytics",
    body:
      "Filter by team member, export CSV, share a recording link, and watch your numbers in Reports.",
    cta: { href: "/dashboard", label: "Go to dashboard" },
  },
];

export function SetupSteps({ compact = false }: { compact?: boolean }) {
  return (
    <ol className={compact ? "space-y-4" : "space-y-5"}>
      {STEPS.map((s, i) => (
        <li key={i} className="flex gap-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium leading-tight">{s.title}</div>
            <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
              {s.body}
            </p>
            {s.cta && (
              <a
                href={s.cta.href}
                target={s.cta.external ? "_blank" : undefined}
                rel={s.cta.external ? "noreferrer noopener" : undefined}
                className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {s.cta.label}
                {s.cta.external ? (
                  <ExternalLink className="h-3.5 w-3.5" />
                ) : (
                  <PhoneCall className="h-3.5 w-3.5" />
                )}
              </a>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function HelpContacts() {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Mail className="h-4 w-4 text-primary" />
        Need help getting set up?
      </div>
      <div className="text-sm text-muted-foreground space-y-1">
        <a className="block hover:text-foreground" href="mailto:hi@hdgelabs.com">
          hi@hdgelabs.com
        </a>
        <a className="block hover:text-foreground" href="mailto:devdatta@hdgelabs.com">
          devdatta@hdgelabs.com
        </a>
      </div>
    </div>
  );
}

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <a
        href={APK_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="flex items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 font-medium text-primary hover:bg-primary/15"
      >
        <Download className="h-4 w-4" />
        Download APK
      </a>
      <a
        href="/signup"
        className="flex items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 font-medium hover:bg-accent"
      >
        <UserPlus className="h-4 w-4" />
        Create account
      </a>
    </div>
  );
}
