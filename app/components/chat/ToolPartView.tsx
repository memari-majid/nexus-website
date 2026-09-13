import type { ChatToolPart } from "@/lib/chat-ui";
import { BriefCard } from "./BriefCard";
import { DeliveryBlock } from "./DeliveryBlock";
import type { ToolPartContext } from "./primitives";
import { ReadinessCard } from "./ReadinessCard";
import { RecommendationCard } from "./RecommendationCard";

/**
 * Routes a tool part to its card. Pure dispatch, no hooks: every card that
 * needs state is its own component, so `react-hooks/rules-of-hooks` stays
 * happy under the switch.
 */
export function ToolPartView({ part, tools }: { part: ChatToolPart; tools: ToolPartContext }) {
  switch (part.type) {
    case "tool-recommendWorkshop":
      return <RecommendationCard part={part} />;
    case "tool-draftConsultingBrief":
      return <BriefCard part={part} />;
    case "tool-assessReadiness":
      return <ReadinessCard part={part} />;
    case "tool-handOffToMajid":
    case "tool-emailBriefToVisitor":
    case "tool-emailWorkshopInfo":
      return <DeliveryBlock part={part} tools={tools} />;
    default:
      return null;
  }
}
