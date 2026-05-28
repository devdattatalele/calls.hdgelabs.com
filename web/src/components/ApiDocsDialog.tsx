import { useState } from "react";
import { BookOpen, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://api.calls.hdgelabs.com";

interface Snippet {
  title: string;
  desc: string;
  code: string;
}

const SNIPPETS: Snippet[] = [
  {
    title: "Authentication",
    desc: "Pass your key as a Bearer token on every request. Keep it secret — it can read all your calls.",
    code: `export HDGE_KEY="hdg_xxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

curl ${BASE}/v1/profile \\
  -H "Authorization: Bearer $HDGE_KEY"`,
  },
  {
    title: "List calls",
    desc: "Newest first. Filter by date, direction, team member, number, and more. Paginate with the returned next_cursor.",
    code: `curl "${BASE}/v1/calls?limit=50&direction=outgoing&has_recording=true" \\
  -H "Authorization: Bearer $HDGE_KEY"

# next page
curl "${BASE}/v1/calls?limit=50&cursor=<next_cursor>" \\
  -H "Authorization: Bearer $HDGE_KEY"`,
  },
  {
    title: "Filter by date range & team member",
    desc: "from / to take ISO-8601 timestamps. team_member_id is the phone user's id (see /v1/devices).",
    code: `curl "${BASE}/v1/calls?from=2026-05-01T00:00:00Z&to=2026-05-31T23:59:59Z&team_member_id=<member_id>" \\
  -H "Authorization: Bearer $HDGE_KEY"`,
  },
  {
    title: "Single call + transcript",
    desc: "Fetch one call's full detail, then its transcript text and timed segments.",
    code: `curl ${BASE}/v1/calls/<call_id> \\
  -H "Authorization: Bearer $HDGE_KEY"

curl ${BASE}/v1/calls/<call_id>/transcript \\
  -H "Authorization: Bearer $HDGE_KEY"`,
  },
  {
    title: "Download a recording",
    desc: "Returns a 302 redirect to a short-lived signed URL. -L follows it. This meters minutes against your monthly quota.",
    code: `curl -L ${BASE}/v1/calls/<call_id>/recording \\
  -H "Authorization: Bearer $HDGE_KEY" \\
  -o recording.m4a`,
  },
  {
    title: "Export everything to CSV",
    desc: "Streams an Excel-ready CSV of all calls (ratings, confidence, durations). Accepts the same filters as /v1/calls.",
    code: `curl "${BASE}/v1/calls.csv?from=2026-05-01T00:00:00Z" \\
  -H "Authorization: Bearer $HDGE_KEY" \\
  -o hdgecalls.csv`,
  },
  {
    title: "Devices & usage",
    desc: "List the phones syncing into your workspace, and check this key's month-to-date request + minute usage.",
    code: `curl ${BASE}/v1/devices \\
  -H "Authorization: Bearer $HDGE_KEY"

curl ${BASE}/v1/usage \\
  -H "Authorization: Bearer $HDGE_KEY"`,
  },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 pr-12 font-mono text-xs leading-relaxed scrollbar-thin">
        {code}
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-1.5 top-1.5 h-7 px-2"
        onClick={copy}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

export function ApiDocsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BookOpen className="h-4 w-4" /> API docs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>Using the API with curl</DialogTitle>
          <DialogDescription>
            Base URL <code className="font-mono text-xs">{BASE}</code> · responses are JSON ·
            rate-limited per minute · recordings are metered against your monthly minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {SNIPPETS.map((s) => (
            <section key={s.title} className="space-y-2">
              <div>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <CodeBlock code={s.code} />
            </section>
          ))}

          <p className="text-xs text-muted-foreground">
            Errors: <span className="font-mono">401</span> bad/revoked key ·{" "}
            <span className="font-mono">429</span> rate limit (check{" "}
            <span className="font-mono">Retry-After</span>) ·{" "}
            <span className="font-mono">402</span> monthly minutes exhausted.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
