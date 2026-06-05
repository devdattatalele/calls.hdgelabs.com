import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  tagline: string;
  price_usd: number;
  max_team_members: number;
  max_devices: number;
  monthly_minutes_limit: number;
  featured: boolean;
  can_purchase: boolean;
  contact_only?: boolean;
}

interface BillingSummary {
  plan: string;
  subscription_status: string;
  minutes_used_this_month: number;
  monthly_minutes_limit: number;
  max_team_members: number;
  max_devices: number;
  active_members: number;
  active_devices: number;
  polar_customer_id?: string | null;
  current_period_end?: string | null;
}

export function BillingPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const plans = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: () => api.get("/v1/billing/plans"),
  });
  const summary = useQuery<BillingSummary>({
    queryKey: ["billing-summary"],
    queryFn: () => api.get("/v1/billing/summary"),
  });
  const [busy, setBusy] = useState<string | null>(null);

  // If we just returned from a mock checkout, confirm the plan.
  useEffect(() => {
    const sid = params.get("session_id");
    const plan = params.get("plan");
    const mock = params.get("mock");
    if (sid && plan && mock === "1") {
      api
        .post("/v1/billing/mock/confirm", { session_id: sid, plan })
        .then(() => {
          toast.success(`Upgraded to ${plan}`);
          qc.invalidateQueries({ queryKey: ["billing-summary"] });
          qc.invalidateQueries({ queryKey: ["company"] });
        })
        .catch((e) => toast.error(e.message ?? "Could not confirm"))
        .finally(() => {
          params.delete("session_id");
          params.delete("plan");
          params.delete("mock");
          setParams(params, { replace: true });
        });
    }
  }, [params, setParams, qc]);

  async function upgrade(planId: string) {
    setBusy(planId);
    try {
      const res = await api.post<{ checkout_url: string; mock?: boolean }>(
        "/v1/billing/checkout",
        { plan: planId },
      );
      window.location.href = res.checkout_url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Checkout failed");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    try {
      const res = await api.post<{ url: string }>("/v1/billing/portal");
      window.open(res.url, "_blank");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Portal failed");
    }
  }

  const cur = summary.data;
  const usedPct = cur && cur.monthly_minutes_limit
    ? Math.min(100, Math.round((cur.minutes_used_this_month / cur.monthly_minutes_limit) * 100))
    : 0;

  return (
    <>
      <PageHeader
        title="Billing"
        description="Pay per user + per minute. Upgrade or cancel at any time."
      />
      <div className="space-y-6 p-8">
        {/* Current plan + usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Current plan
              <Badge variant="outline" className="capitalize">
                {cur?.plan ?? "free"}
              </Badge>
              {cur?.subscription_status && cur.subscription_status !== "free" && (
                <Badge variant="success" className="capitalize">
                  {cur.subscription_status}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <UsageStat
              label="Minutes used"
              value={(cur?.minutes_used_this_month ?? 0).toFixed(1)}
              limit={cur?.monthly_minutes_limit ?? 0}
              pct={usedPct}
            />
            <UsageStat
              label="Team members"
              value={String(cur?.active_members ?? 0)}
              limit={cur?.max_team_members ?? 0}
            />
            <UsageStat
              label="Devices"
              value={String(cur?.active_devices ?? 0)}
              limit={cur?.max_devices ?? 0}
            />
            {cur?.polar_customer_id && (
              <div className="md:col-span-3">
                <Separator className="mb-3" />
                <Button variant="outline" size="sm" onClick={openPortal}>
                  <ExternalLink className="h-4 w-4" />
                  Manage subscription on Polar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.data?.map((p) => {
            const active = p.id === cur?.plan;
            return (
              <Card
                key={p.id}
                className={cn(
                  "relative overflow-hidden",
                  p.featured && "border-primary/40 ring-1 ring-primary/30",
                )}
              >
                {p.featured && (
                  <div className="absolute right-3 top-3">
                    <Badge variant="default" className="gap-1">
                      <Sparkles className="h-3 w-3" /> Popular
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{p.tagline}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    {p.contact_only ? (
                      <>
                        <span className="text-3xl font-semibold">Custom</span>
                        <span className="text-sm text-muted-foreground">
                          {" "}
                          pricing
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-semibold">
                          ${p.price_usd}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {" "}
                          / month
                        </span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {p.contact_only ? (
                      <>
                        <Bullet>
                          Pick your number of phone users and devices
                        </Bullet>
                        <Bullet>
                          Pick your monthly minutes — typically{" "}
                          <b>{p.monthly_minutes_limit.toLocaleString()}+</b>
                        </Bullet>
                        <Bullet>
                          <b>Same per-minute / per-user rate</b> as Starter & Growth
                        </Bullet>
                        <Bullet>
                          Everything in Growth (REST API, signed URLs, exports)
                        </Bullet>
                      </>
                    ) : (
                      <>
                        <Bullet>
                          Up to <b>{p.max_team_members}</b> phone user
                          {p.max_team_members === 1 ? "" : "s"}
                        </Bullet>
                        <Bullet>
                          Up to <b>{p.max_devices}</b> device
                          {p.max_devices === 1 ? "" : "s"}
                        </Bullet>
                        <Bullet>
                          <b>{p.monthly_minutes_limit.toLocaleString()}</b>{" "}
                          minutes / month
                        </Bullet>
                        <Bullet>REST API + per-call signed URLs</Bullet>
                      </>
                    )}
                  </ul>
                  {active ? (
                    <Button variant="outline" disabled className="w-full">
                      Current plan
                    </Button>
                  ) : p.contact_only ? (
                    <Button asChild className="w-full" variant="default">
                      <Link to="/contact">
                        <MessageSquare className="h-4 w-4" />
                        Contact us
                      </Link>
                    </Button>
                  ) : p.price_usd === 0 ? (
                    <Button variant="outline" disabled className="w-full">
                      Default tier
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={p.featured ? "default" : "outline"}
                      disabled={!p.can_purchase || busy === p.id}
                      onClick={() => upgrade(p.id)}
                    >
                      {busy === p.id ? "Redirecting…" : `Upgrade to ${p.name}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Running 10,000+ minutes a month or need bespoke features?{" "}
          <Link to="/contact" className="underline">
            Talk to us
          </Link>{" "}
          about a custom plan.
        </p>
      </div>
    </>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}

function UsageStat({
  label,
  value,
  limit,
  pct,
}: {
  label: string;
  value: string;
  limit: number;
  pct?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        <span className="text-sm text-muted-foreground">/ {limit.toLocaleString()}</span>
      </div>
      {pct !== undefined && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all",
              pct > 90
                ? "bg-destructive"
                : pct > 75
                  ? "bg-amber-500"
                  : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
