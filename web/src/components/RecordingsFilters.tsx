import { useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import type { CompanyMemberRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface RecordingsFilterState {
  memberUserId?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
  phone?: string;
}

interface Props {
  team: CompanyMemberRow[];
  value: RecordingsFilterState;
  onApply: (next: RecordingsFilterState) => void;
}

const ALL = "__all__";

export function RecordingsFilters({ team, value, onApply }: Props) {
  const [draft, setDraft] = useState<RecordingsFilterState>(value);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto_auto] md:items-end">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Team member
        </Label>
        <Select
          value={draft.memberUserId ?? ALL}
          onValueChange={(v) =>
            setDraft((d) => ({ ...d, memberUserId: v === ALL ? undefined : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All members</SelectItem>
            {team.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.label ?? m.invited_email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Start date
        </Label>
        <Input
          type="date"
          value={draft.from ?? ""}
          onChange={(e) =>
            setDraft((d) => ({ ...d, from: e.target.value || undefined }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          End date
        </Label>
        <Input
          type="date"
          value={draft.to ?? ""}
          onChange={(e) =>
            setDraft((d) => ({ ...d, to: e.target.value || undefined }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Phone number
        </Label>
        <Input
          placeholder="Search by number"
          value={draft.phone ?? ""}
          onChange={(e) =>
            setDraft((d) => ({ ...d, phone: e.target.value || undefined }))
          }
          className="w-44"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={() => onApply(draft)}>
          <Search className="h-4 w-4" />
          Apply
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setDraft({});
            onApply({});
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
