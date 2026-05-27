import { useState } from "react";
import { format } from "date-fns";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";
import {
  useApiKeys,
  useMintApiKey,
  useRevokeApiKey,
} from "@/lib/queries/api-keys";
import { ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/pages/SignInPage";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function ApiKeysPage() {
  const { user } = useAuth();
  const company = useMyCompany(user?.id);
  const keys = useApiKeys(company.data?.id);
  const mint = useMintApiKey();
  const revoke = useRevokeApiKey();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rateLimit, setRateLimit] = useState("60");
  const [minutesCap, setMinutesCap] = useState("1000");
  const [justMinted, setJustMinted] = useState<string | null>(null);

  async function onMint(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await mint.mutateAsync({
        name,
        rate_limit_per_min: Number(rateLimit) || 60,
        monthly_minutes_limit: Number(minutesCap) || 1000,
      });
      setJustMinted(res.key);
      setName("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Mint failed");
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this key? Anyone using it will get 401 errors.")) return;
    try {
      await revoke.mutateAsync(id);
      toast.success("Revoked");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Revoke failed");
    }
  }

  return (
    <>
      <PageHeader
        title="API keys"
        description="Hand out to partners who'll pull your calls + transcripts via the REST API."
        action={
          <Button onClick={() => { setJustMinted(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New key
          </Button>
        }
      />

      <div className="p-8">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Rate / min</TableHead>
                  <TableHead>Minutes cap</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">&nbsp;</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.data?.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {k.prefix}…
                    </TableCell>
                    <TableCell>{k.rate_limit_per_min}</TableCell>
                    <TableCell>{k.monthly_minutes_limit}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {k.last_used_at
                        ? format(new Date(k.last_used_at), "MMM d, HH:mm")
                        : "never"}
                    </TableCell>
                    <TableCell>
                      {k.revoked_at ? (
                        <Badge variant="destructive">Revoked</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!k.revoked_at && (
                        <Button variant="ghost" size="sm" onClick={() => handleRevoke(k.id)}>
                          <Trash2 className="h-4 w-4" />
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!keys.isLoading && !keys.data?.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No keys yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setJustMinted(null); }}>
        <DialogContent>
          {justMinted ? (
            <>
              <DialogHeader>
                <DialogTitle>Copy your key now</DialogTitle>
                <DialogDescription>
                  This is the only time you'll see the full secret. Store it somewhere safe.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs break-all">
                {justMinted}
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(justMinted);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-4 w-4" /> Copy
                </Button>
                <DialogClose asChild>
                  <Button variant="outline">Done</Button>
                </DialogClose>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>
                  Use a descriptive name (e.g. partner company).
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-3" onSubmit={onMint}>
                <Field id="k-name" label="Name" value={name} onChange={setName} required />
                <Field id="k-rate" label="Rate limit (req/min)" type="number" value={rateLimit} onChange={setRateLimit} />
                <Field id="k-min" label="Monthly minutes cap" type="number" value={minutesCap} onChange={setMinutesCap} />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={mint.isPending}>
                    {mint.isPending ? "Minting…" : "Mint key"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
