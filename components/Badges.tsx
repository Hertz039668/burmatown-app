import { Badge } from "./ui/badge";
import { Store } from "lucide-react";
import { colors } from "../lib/helpers";

export type AccountType = "business" | "student" | "general";

export function TypeBadge({ type }: { type: AccountType }) {
  if (type === "business")
    return (
      <Badge style={{ background: colors.black, color: colors.gold }} className="gap-1">
        <Store className="h-3 w-3" /> Business
      </Badge>
    );
  if (type === "student")
    return (
      <Badge variant="outline" className="gap-1" style={{ borderColor: colors.gold, color: colors.black }}>
        Student
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1" style={{ borderColor: colors.smoke, color: colors.black }}>
      General User
    </Badge>
  );
}
