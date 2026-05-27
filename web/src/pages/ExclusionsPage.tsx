import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";
import {
  useAddExclusion,
  useExclusions,
  useRemoveExclusion,
} from "@/lib/queries/exclusions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ExclusionsPage() {
  const { user } = useAuth();
  const company = useMyCompany(user?.id);
  const list = useExclusions(company.data?.id);
  const add = useAddExclusion(company.data?.id);
  const remove = useRemoveExclusion(company.data?.id);

  const [number, setNumber] = useState("");
  const [reason, setReason] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await add.mutateAsync({ phone_number: number, reason });
      setNumber("");
      setReason("");
      toast.success("Number excluded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <PageHeader
        title="Exclusions"
        description="Phone numbers to leave out of analytics (e.g. your own team's internal numbers)."
      />
      <div className="grid gap-4 p-8 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">&nbsp;</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data?.map((e) => (
                  <TableRow key={e.phone_number}>
                    <TableCell className="font-medium">{e.phone_number}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove.mutate(e.phone_number)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!list.isLoading && !list.data?.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No exclusions yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <form className="space-y-3" onSubmit={submit}>
              <div>
                <label className="text-sm font-medium">Phone number</label>
                <Input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="+91 90000 00000"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reason (optional)</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. internal IT line"
                />
              </div>
              <Button type="submit" className="w-full" disabled={add.isPending}>
                <Plus className="h-4 w-4" />
                {add.isPending ? "Adding…" : "Add exclusion"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
