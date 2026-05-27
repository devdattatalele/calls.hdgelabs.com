import { Link } from "react-router-dom";
import { SetupSteps, HelpContacts, QuickActions } from "@/components/SetupSteps";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Marketing-side blurb shown above the setup steps. */
  pitch?: { title: string; subtitle: string };
}

export function AuthShell({ children, pitch }: Props) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,560px)_1fr] bg-background">
      {/* LEFT — form */}
      <div className="flex min-h-svh flex-col px-6 py-8 md:px-10">
        <Link to="/signin" className="flex items-center gap-2.5">
          <img
            src="/hdge-icon.jpg"
            alt="HDGE"
            className="h-9 w-9 rounded-md object-cover ring-1 ring-border"
          />
          <span className="text-base font-semibold tracking-tight">HDGE Calls</span>
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <div className="text-xs text-muted-foreground">
          Need help?{" "}
          <Link to="/help" className="underline underline-offset-4 hover:text-foreground">
            View setup guide
          </Link>{" "}
          ·{" "}
          <a className="underline underline-offset-4 hover:text-foreground" href="mailto:hi@hdgelabs.com">
            hi@hdgelabs.com
          </a>
        </div>
      </div>

      {/* RIGHT — setup steps */}
      <aside className="relative hidden border-l bg-muted/30 px-10 py-12 lg:flex lg:flex-col lg:overflow-y-auto">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold leading-tight tracking-tight">
            {pitch?.title ?? "Capture every customer call your team makes."}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {pitch?.subtitle ??
              "HDGEcalls installs on Android, auto-syncs recordings + ratings to this dashboard, and gives you a metered REST API to share data with partners."}
          </p>

          <div className="mt-8">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Set it up
            </div>
            <SetupSteps />
          </div>

          <div className="mt-8 space-y-3">
            <QuickActions />
            <HelpContacts />
          </div>
        </div>
      </aside>
    </div>
  );
}
