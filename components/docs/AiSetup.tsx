import type { ReactNode } from "react";
import AiPromptTabs from "./AiPromptTabs";
import { Body, Callout, DataTable, List, Section } from "./DocsPrimitives";
import { AGENTS } from "./prompt-kit";

/** "The prompt": every SDK's prompt in tabs, starting on this page's stack. */
export function PromptSection({ platformId, base, intro }: { platformId: string; base: string; intro: ReactNode }) {
  return <Section id="prompt" title="The prompt">
    <Body>{intro}</Body>
    <AiPromptTabs initial={platformId} base={base} maxHeight={520} />
  </Section>;
}

/** "How to use it": where each agent takes the prompt, then the steps. */
export function HowToUseSection({ steps }: { steps: ReactNode[] }) {
  return <Section id="how" title="How to use it">
    <DataTable code={false} headers={["Agent", "Where to paste it"]} rows={AGENTS} />
    <List ordered items={steps} />
  </Section>;
}

/** The whole AI agent setup page, for stacks without stack-specific diff notes. */
export function AiSetupGuide({ platformId, base, intro, steps, manual, secret }: { platformId: string; base: string; intro: ReactNode; steps: ReactNode[]; manual: ReactNode[]; secret: ReactNode }) {
  return <>
    <PromptSection platformId={platformId} base={base} intro={intro} />
    <HowToUseSection steps={steps} />
    <Section id="manual" title="What you do by hand">
      <List items={manual} />
      <Callout tone="danger" title="Never give the agent your secrets">{secret}</Callout>
    </Section>
  </>;
}
