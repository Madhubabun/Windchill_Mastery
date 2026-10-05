import {
  BookOpen, Rocket, Layers, GitPullRequestArrow, ShieldCheck, Server, ArrowLeftRight, Sparkles, Boxes,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  rocket: Rocket,
  layers: Layers,
  change: GitPullRequestArrow,
  shield: ShieldCheck,
  server: Server,
  migrate: ArrowLeftRight,
  sparkles: Sparkles,
  boxes: Boxes,
};

export function ModuleIcon({ name, className }: { name: string; className?: string }) {
  const I = ICONS[name] ?? BookOpen;
  return <I className={className} aria-hidden />;
}
