import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageSquare, Phone } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CONTACT_EMAIL = "hello@hdgelabs.com";

/**
 * Custom-plan inquiry page. Linked from the Billing page's "Custom" card and
 * from the "running 10,000+ minutes?" footer. Pricing and feature scope are
 * negotiated 1:1 — this page is intentionally light: it tells the prospect
 * what we cover under custom, then hands them an email to start the thread.
 */
export function ContactPage() {
  const subject = encodeURIComponent("Custom plan inquiry — HDGEcalls");
  const body = encodeURIComponent(
    [
      "Hi HDGElabs team,",
      "",
      "We'd like to discuss a custom plan. Some context:",
      "",
      "- Team size (recruiters / phone users):",
      "- Estimated minutes per month:",
      "- Languages on calls (Hindi / Marathi / English / other):",
      "- Anything specific we need (diarization, custom integrations, SLA, on-prem):",
      "",
      "Best contact for a follow-up:",
    ].join("\n"),
  );
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <>
      <PageHeader
        title="Talk to us about a custom plan"
        description="Built for teams running 10,000+ minutes a month — pricing and features discussed 1:1."
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
            <CardTitle>What "Custom" covers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Pricing
              </div>
              <p>
                Per-minute or flat-monthly, sized to your call volume. Sales
                calls at ~10,000 minutes / month typically land near the same
                rate as the standard plans, with overage handled as part of
                the contract.
              </p>
            </div>
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Features negotiable
              </div>
              <ul className="list-disc space-y-1 pl-5">
                <li>Recording retention and storage region</li>
                <li>Speaker diarization (Agent vs Candidate / Customer)</li>
                <li>
                  Per-call language override (Hindi / Marathi / English mix)
                </li>
                <li>
                  Webhook destinations, structured JSON exports, CRM
                  integrations
                </li>
                <li>SLA & dedicated support</li>
                <li>On-prem or VPC-isolated deployment (case by case)</li>
              </ul>
            </div>
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                What we'll ask you
              </div>
              <ul className="list-disc space-y-1 pl-5">
                <li>Team size and how the call workflow runs today</li>
                <li>Expected monthly minutes (and peak)</li>
                <li>Languages on your calls</li>
                <li>Any compliance / data-residency requirement</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Get in touch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Button asChild className="w-full">
              <a href={mailto}>
                <Mail className="h-4 w-4" />
                Email us with your requirements
              </a>
            </Button>
            <div className="text-xs text-muted-foreground">
              Pre-filled template helps us reply faster.
            </div>

            <div className="border-t pt-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Email
              </div>
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium hover:underline">
                {CONTACT_EMAIL}
              </a>
            </div>
            <div className="border-t pt-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Response time
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Same business day
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
