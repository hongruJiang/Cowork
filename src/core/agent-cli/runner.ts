/**
 * Agent CLI Runner — forwards user prompts to external CLI agents and captures output.
 * Uses the Tauri backend's run_shell_command to execute CLI tools.
 *
 * Soul injection: before forwarding the user prompt, the runner loads the CLI's
 * personality (SOUL.md from ~/.abu/agent-cli-souls/{cli-name}.md) and prepends
 * it as a role-play prefix, giving each external CLI its own character.
 */
import { invoke } from '@tauri-apps/api/core';
import type { AgentCLIInstance } from './types';
import type { Message } from '../../types';
import { loadCLISoul, injectSoulToPrompt, recordCLIUsage } from './soulCLI';

interface CommandOutput {
  stdout: string;
  stderr: string;
  code: number;
}

/** Result of running a prompt through an external agent CLI */
export interface CLIRunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  /** Whether soul was injected (has personality configured) */
  soulInjected: boolean;
  /** If evolution is suggested after this run */
  evolveSuggested: boolean;
}

/** Build the full command string from a CLI instance and user prompt */
export function buildCLICommand(
  instance: AgentCLIInstance,
  prompt: string,
): string {
  const template = instance.promptTemplate || '{executable} "{prompt}"';
  const safePrompt = prompt.replace(/"/g, '\\"');

  let cmdLine = template.replace('{prompt}', safePrompt);
  // Use resolved path if available
  if (instance.resolvedPath) {
    cmdLine = cmdLine.replace(instance.executable, instance.resolvedPath);
  }

  return cmdLine.trim();
}

/** Execute a prompt through an external agent CLI, with soul injection */
export async function runExternalCLI(
  instance: AgentCLIInstance,
  prompt: string,
  options?: {
    timeoutMs?: number;
    cwd?: string;
  },
): Promise<CLIRunResult> {
  const startTime = Date.now();
  const timeoutMs = options?.timeoutMs ?? 120_000;

  if (!instance.resolvedPath) {
    return {
      success: false,
      stdout: '',
      stderr: `${instance.label} is not installed. Install it first from Toolbox → Agent CLI.`,
      exitCode: -1,
      durationMs: Date.now() - startTime,
      soulInjected: false,
      evolveSuggested: false,
    };
  }

  // ── Load & inject the CLI's soul ──────────────────────────────────
  const soulData = await loadCLISoul(instance.name);
  const soulInjected = !!soulData.content;
  const finalPrompt = soulInjected
    ? injectSoulToPrompt(soulData.content, prompt)
    : prompt;

  // ── Track usage for self-evolution ─────────────────────────────────
  const usageResult = soulData.content
    ? await recordCLIUsage(instance.name)
    : null;

  try {
    const command = buildCLICommand(instance, finalPrompt);

    const output = await invoke<CommandOutput>('run_shell_command', {
      command,
      cwd: options?.cwd ?? null,
      timeout: timeoutMs,
      background: false,
      sandboxEnabled: false,
      networkIsolation: false,
    });

    const durationMs = Date.now() - startTime;

    return {
      success: output.code === 0,
      stdout: output.stdout,
      stderr: output.stderr,
      exitCode: output.code,
      durationMs,
      soulInjected,
      evolveSuggested: usageResult?.shouldSuggestEvolution ?? false,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      stdout: '',
      stderr: `Failed to run ${instance.label}: ${String(err)}`,
      exitCode: -1,
      durationMs,
      soulInjected,
      evolveSuggested: false,
    };
  }
}

/** Convert a CLI run result into chat messages */
export function cliResultToMessage(
  instance: AgentCLIInstance,
  prompt: string,
  result: CLIRunResult,
): {
  userMessage: Omit<Message, 'id' | 'conversationId'>;
  assistantMessage: Omit<Message, 'id' | 'conversationId'>;
} {
  const soulTag = result.soulInjected ? ` [🧬 ${instance.avatar}]` : ` [${instance.avatar}]`;

  return {
    userMessage: {
      role: 'user',
      content: `[${instance.label}${soulTag}] ${prompt}`,
      timestamp: Date.now() - result.durationMs,
    },
    assistantMessage: {
      role: 'assistant',
      content: result.success
        ? result.stdout || '(no output)'
        : `**${instance.label} error** (exit code ${result.exitCode})\n\`\`\`\n${result.stderr}\n\`\`\``,
      timestamp: Date.now(),
    },
  };
}
