import StatusBadge from "./StatusBadge";
import { truthLabel, truthVariant } from "../../lib/mcTruth";

export default function TruthBadge({ source = "unavailable", className, dot = false, children }) {
  const label = children ?? truthLabel(source);
  return (
    <StatusBadge variant={truthVariant(source)} className={className} dot={dot}>
      {label}
    </StatusBadge>
  );
}
