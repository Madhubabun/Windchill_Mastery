"use client";

import type { Block } from "@wm/core";
import { AnimationBlock, DiagramBlock } from "./Visuals";
import { CalloutBlock, ComparisonBlock, ExampleBlock, ExerciseBlock, SummaryBlock, TextBlock, VideoBlock, WalkthroughBlock } from "./Content";
import { FlashcardsBlock, QuizBlock, ScenarioBlock, SimulationBlock } from "./Interactive";

export const BLOCK_LABEL: Record<Block["type"], string> = {
  text: "Read",
  callout: "Tip",
  diagram: "Diagram",
  animation: "Animation",
  walkthrough: "Do it in Windchill",
  simulation: "Simulation",
  comparison: "Comparison",
  example: "Real example",
  quiz: "Quiz",
  flashcards: "Flashcards",
  scenario: "Scenario",
  exercise: "Practice",
  video: "Video",
  summary: "Summary",
};

export function blockTitle(b: Block): string {
  if ("title" in b && b.title) return b.title;
  if (b.type === "callout") return { "pro-tip": "Pro tip", pitfall: "Common pitfall", "why-it-matters": "Why it matters", note: "Note", terms: "Key terms", "version-note": "Version note" }[b.variant];
  return BLOCK_LABEL[b.type];
}

export function BlockView({ block, lessonKey, index, passMark, onQuizPassed }: { block: Block; lessonKey: string; index: number; passMark?: number; onQuizPassed?: () => void }) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} />;
    case "callout":
      return <CalloutBlock block={block} />;
    case "diagram":
      return <DiagramBlock block={block} />;
    case "animation":
      return <AnimationBlock block={block} />;
    case "walkthrough":
      return <WalkthroughBlock block={block} />;
    case "simulation":
      return <SimulationBlock block={block} lessonKey={lessonKey} blockIndex={index} />;
    case "comparison":
      return <ComparisonBlock block={block} />;
    case "example":
      return <ExampleBlock block={block} />;
    case "quiz":
      return <QuizBlock block={block} lessonKey={lessonKey} passMark={passMark} onPassed={onQuizPassed} />;
    case "flashcards":
      return <FlashcardsBlock block={block} lessonKey={lessonKey} blockIndex={index} />;
    case "scenario":
      return <ScenarioBlock block={block} lessonKey={lessonKey} blockIndex={index} />;
    case "exercise":
      return <ExerciseBlock block={block} />;
    case "video":
      return <VideoBlock block={block} />;
    case "summary":
      return <SummaryBlock block={block} />;
  }
}
