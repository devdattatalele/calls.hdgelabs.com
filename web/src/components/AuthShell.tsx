import { Link } from "react-router-dom";
import { Download, Mail, UserPlus } from "lucide-react";
import { SetupSteps } from "@/components/SetupSteps";
import type { ReactNode } from "react";

const APK_URL =
  import.meta.env.VITE_APK_URL ??
  "https://github.com/devdattatalele/HDGEcalls-releases/releases/latest/download/HDGEcalls-latest.apk";

interface Props {
  children: ReactNode;
  pitch?: { title: string; subtitle: string };
}

export function AuthShell({ children, pitch }: Props) {
  return (
    <div className="grid h-screen overflow-hidden bg-background lg:grid-cols-[minmax(0,540px)_1fr]">
      {/* LEFT — form column (own scroll) */}
      <div className="flex h-screen min-h-0 flex-col overflow-y-auto px-6 py-8 md:px-10">
        <Link to="/signin" className="flex items-center gap-2.5">
          <img
            src="/hdge-icon.jpg"
            alt="HDGElabs"
            className="h-9 w-9 rounded-md object-cover ring-1 ring-border"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">HDGElabs</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/80">
              HDGEcalls
            </div>
          </div>
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <div className="text-xs text-muted-foreground">
          Need help?{" "}
          <Link to="/help" className="underline underline-offset-4 hover:text-foreground">
            Setup guide
          </Link>
        </div>
      </div>

      {/* RIGHT — split into steps (centered) and action card (right edge, centered) */}
      <aside className="relative hidden h-screen min-h-0 overflow-y-auto border-l bg-card/30 lg:block">
        <div className="mx-auto flex h-full max-w-3xl items-center px-8 py-10">
          <div className="grid w-full gap-10 lg:grid-cols-[1fr_240px] lg:items-center">
            {/* Steps */}
            <div>
              <h2 className="text-2xl font-bold leading-tight tracking-tight">
                {pitch?.title ?? "Capture every customer call your team makes."}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {pitch?.subtitle ??
                  "HDGEcalls auto-syncs Android call recordings + ratings to this dashboard, with a metered REST API to share data with partners."}
              </p>

              <div className="mt-7">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Set it up
                </div>
                <SetupSteps />
              </div>
            </div>

            {/* Right-side floating action card, vertically centered */}
            <div className="space-y-3">
              <a
                href={APK_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
              >
                <Download className="h-4 w-4" />
                Download APK
              </a>
              <Link
                to="/signup"
                className="flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                <UserPlus className="h-4 w-4" />
                Create account
              </Link>

              <div className="rounded-md border bg-background p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-primary" />
                  Need help getting set up?
                </div>
                <div className="space-y-1 text-sm">
                  <a
                    className="block text-muted-foreground hover:text-foreground"
                    href="mailto:hi@hdgelabs.com"
                  >
                    hi@hdgelabs.com
                  </a>
                  <a
                    className="block text-muted-foreground hover:text-foreground"
                    href="mailto:devdatta@hdgelabs.com"
                  >
                    devdatta@hdgelabs.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
