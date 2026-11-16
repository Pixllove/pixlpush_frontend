// Small helpers every stack's AI prompt is written with, so the prompts share one format.

export const fence = (lang: string, body: string) => "```" + lang + "\n" + body + "\n```";

export const list = (commands: Record<string, string>) => Object.entries(commands).map(([name, cmd]) => `- ${name}: \`${cmd}\``).join("\n");

/** How to use any prompt, the same for every agent. */
export const AGENTS: [string, string][] = [
  ["Claude Code", "Run claude in the project root and paste it, or save it as CLAUDE.md."],
  ["Codex (CLI, IDE or cloud)", "Paste it into the session, or save it as AGENTS.md in the repo root."],
  ["Cursor", "Agent mode in chat, or save it under .cursor/rules/."],
  ["GitHub Copilot", "Copilot Chat in agent mode, or .github/copilot-instructions.md."],
  ["Gemini CLI", "Paste it into the session, or save it as GEMINI.md."],
  ["Windsurf / Cline / others", "Paste it into the agent chat with file editing enabled."],
];
