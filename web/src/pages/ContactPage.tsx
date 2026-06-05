import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CUSTOM_PLAN_EMAIL = "admin@hdgelabs.com";

/**
 * Custom-plan inquiry page. Linked from the Billing page's "Custom" card.
 *
 * Pricing is intentionally NOT negotiated here — Custom is just "tell us how
 * many minutes and users you need, we'll bill you at the same per-minute /
 * per-user rate as Starter and Growth." The page exists because Polar
 * checkout doesn't carry an off-menu line item; the admin sets the plan
 * limits manually after the email exchange.
 */
export function ContactPage() {
  const subject = encodeURIComponent("Custom plan — HDGEcalls");
  const body = encodeURIComponent(
    [
      "Hi HDGElabs team,",
      "",
      "We'd like to set up a Custom plan. Our requirements:",
      "",
      "- Number of phone users / recruiters:",
      "- Number of devices:",
      "- Estimated minutes per month:",
      "- Company name:",
      "- Best contact for billing follow-up:",
      "",
      "Happy to confirm we're OK with the standard per-minute / per-user rate.",
    ].join("\n"),
  );
  const mailto = `mailto:${CUSTOM_PLAN_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <>
      <PageHeader
        title="Custom plan"
        description="Pick your number of minutes and users — billed at the same rate as Starter and Growth."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/settings/billing">
              <ArrowLeft className="h-4 w-4" /> Back to billing
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 p-8 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>How Custom works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Custom is for teams that need more minutes or users than Growth
              covers, but want the same predictable pricing. Send us your
              numbers and we'll bill you at the standard rate — no separate
              negotiation, no overage surprises.
            </p>
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Same rate as Starter / Growth
              </div>
              <ul className="list-disc space-y-1 pl-5">
                <li>Per-minute pricing for recording + transcription</li>
                <li>Per-user pricing for phone seats</li>
                <li>All Growth features included (REST API, signed URLs, CSV export)</li>
              </ul>
            </div>
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                What we need from you
              </div>
              <ul className="list-disc space-y-1 pl-5">
                <li>Number of phone users / recruiters</li>
                <li>Number of devices</li>
                <li>Expected monthly minutes</li>
                <li>Company name & a contact for billing</li>
              </ul>
            </div>
            <p className="text-muted-foreground">
              Once we have your numbers, we'll set up the plan limits on your
              account and send an invoice. Usually same business day.
            </p>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Contact admin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Button asChild className="w-full">
              <a href={mailto}>
                <Mail className="h-4 w-4" />
                Email admin@hdgelabs.com
              </a>
            </Button>
            <div className="text-xs text-muted-foreground">
              Pre-filled template helps us reply faster.
            </div>

            <div className="border-t pt-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Email
              </div>
              <a
                href={`mailto:${CUSTOM_PLAN_EMAIL}`}
                className="font-medium hover:underline"
              >
                {CUSTOM_PLAN_EMAIL}
              </a>
            </div>
            <div className="border-t pt-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Response
              </div>
              <div>Same business day</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
