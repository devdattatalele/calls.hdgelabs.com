import { useState } from "react";
import { format } from "date-fns";
import { KeyRound, Plus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";
import {
  useCreateMember,
  useDeactivateMember,
  useResetMemberPassword,
  useTeam,
} from "@/lib/queries/team";
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

export function TeamPage() {
  const { user } = useAuth();
  const company = useMyCompany(user?.id);
  const team = useTeam(company.data?.id);
  const createMember = useCreateMember();
  const deactivate = useDeactivateMember();
  const resetPw = useResetMemberPassword();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [label, setLabel] = useState("");

  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPwInput, setResetPwInput] = useState("");

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMember.mutateAsync({ email, password, label: label || undefined });
      toast.success(`${email} added`);
      setOpen(false);
      setEmail("");
      setPassword("");
      setLabel("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add member");
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    try {
      await resetPw.mutateAsync({ user_id: resetTarget, password: resetPwInput });
      toast.success("Password updated");
      setResetTarget(null);
      setResetPwInput("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Reset failed");
    }
  }

  async function handleDeactivate(uid: string) {
    if (!confirm("Deactivate this team member? Their app will lose access.")) return;
    try {
      await deactivate.mutateAsync(uid);
      toast.success("Member deactivated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Deactivate failed");
    }
  }

  return (
    <>
      <PageHeader
        title="Team"
        description="People with the HDGEcalls Android app installed on their phone."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add team member
          </Button>
        }
      />
      <div className="p-8">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.data?.map((m) => (
                  <TableRow key={m.user_id}>
                    <TableCell className="font-medium">{m.invited_email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.label ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(m.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {m.deactivated_at ? (
                        <Badge variant="destructive">Deactivated</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResetTarget(m.user_id)}
                      >
                        <KeyRound className="h-4 w-4" />
                        Reset password
                      </Button>
                      {!m.deactivated_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(m.user_id)}
                        >
                          <UserMinus className="h-4 w-4" />
                          Deactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!team.isLoading && !team.data?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No team members yet. Click "Add team member" to issue app credentials.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>
              These credentials are what the team member will use to sign into the
              HDGEcalls Android app. Share them securely.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={addMember}>
            <Field id="m-email" label="Email" type="email" value={email} onChange={setEmail} required />
            <Field id="m-pw" label="Initial password" type="text" value={password} onChange={setPassword} required placeholder="Min 8 characters" />
            <Field id="m-label" label="Label (optional)" value={label} onChange={setLabel} placeholder="Field rep — Mumbai" />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createMember.isPending}>
                {createMember.isPending ? "Adding…" : "Add member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              The team member will need to sign in to the app again with this new password.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submitReset}>
            <Field id="r-pw" label="New password" type="text" value={resetPwInput} onChange={setResetPwInput} required />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={resetPw.isPending}>
                {resetPw.isPending ? "Saving…" : "Update password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
