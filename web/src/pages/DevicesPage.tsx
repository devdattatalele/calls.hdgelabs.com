import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";
import { useDevices } from "@/lib/queries/devices";
import { useTeam } from "@/lib/queries/team";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DevicesPage() {
  const { user } = useAuth();
  const company = useMyCompany(user?.id);
  const devices = useDevices(company.data?.id);
  const team = useTeam(company.data?.id);

  const memberLabel = (uid: string) =>
    team.data?.find((m) => m.user_id === uid)?.label ??
    team.data?.find((m) => m.user_id === uid)?.invited_email ??
    uid.slice(0, 8);

  return (
    <>
      <PageHeader title="Devices" description="Every Android phone that has synced to your company." />
      <div className="p-8">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Android ID</TableHead>
                  <TableHead>Last synced</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.data?.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      {d.label ?? "Unnamed device"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {memberLabel(d.user_id)}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {d.android_id}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.last_synced_at
                        ? format(new Date(d.last_synced_at), "MMM d, HH:mm")
                        : "never"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(d.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
                {!devices.isLoading && !devices.data?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No devices yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
