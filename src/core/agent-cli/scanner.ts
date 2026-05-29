/**
 * Agent CLI Scanner — discovers installed AI agent CLI tools on the system
 *
 * Strategy:
 *  1. Scan `which` / `where` for each known executable (PATH-based)
 *  2. Check well-known install directories
 *  3. Verify executables work by running --version check
 *  4. Cache results
 */
import { invoke } from '@tauri-apps/api/core';
import { exists } from '@tauri-apps/plugin-fs';
import { homeDir } from '@tauri-apps/api/path';
import type { AgentCLIInstance, CLIDiscoveryMethod, CLIStatus } from './types';
import { AGENT_CLI_CATALOG } from './types';
import { isWindows } from '../../utils/platform';

interface CommandOutput {
  stdout: string;
  stderr: string;
  code: number;
}

/** Run a shell command via Tauri backend */
async function runCommand(command: string, options?: {
  cwd?: string;
  timeout?: number;
}): Promise<CommandOutput> {
  return invoke<CommandOutput>('run_shell_command', {
    command,
    cwd: options?.cwd ?? null,
    timeout: options?.timeout ?? 15_000,
    background: false,
    sandboxEnabled: false,
    networkIsolation: false,
  });
}

// ─── Which/Where commands ────────────────────────────────────────────

async function which(executable: string): Promise<string | null> {
  try {
    const cmd = isWindows()
      ? `where ${executable} 2>nul`
      : `which ${executable} 2>/dev/null`;
    const output = await runCommand(cmd);
    if (output.code === 0 && output.stdout.trim()) {
      return output.stdout.trim().split('\n')[0].trim();
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Version check ──────────────────────────────────────────────────

async function getVersion(
  resolvedPath: string,
  versionFlags: string[],
): Promise<string | null> {
  try {
    const args = versionFlags.length > 0 ? versionFlags : ['--version'];
    const cmd = `${quoteArg(resolvedPath)} ${args.join(' ')}`;
    const output = await runCommand(cmd, { timeout: 10_000 });
    if (output.code === 0 && output.stdout.trim()) {
      const lines = output.stdout.trim().split('\n');
      return lines[0].trim();
    }
    // Sometimes version goes to stderr
    if (output.stderr.trim()) {
      const match = output.stderr.match(/(\d+\.\d+\.\d+)/);
      if (match) return match[1];
      return output.stderr.trim().split('\n')[0].trim();
    }
    return null;
  } catch {
    return null;
  }
}

/** Minimal quoting for shell safety */
function quoteArg(arg: string): string {
  return arg.includes(' ') ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

// ─── Expanded paths ─────────────────────────────────────────────────

async function expandPath(pattern: string): Promise<string[]> {
  const home = await homeDir();
  const expanded = pattern.replace('~', home);

  if (pattern.includes('*')) {
    const currentUser = expanded.replace(
      '*',
      home.split(/[/\\]/).filter(Boolean).pop() || '',
    );
    return [currentUser];
  }
  return [expanded];
}

// ─── File existence check ───────────────────────────────────────────

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return await exists(filePath);
  } catch {
    return false;
  }
}

// ─── Main scanner ───────────────────────────────────────────────────

export async function scanAgentCLIs(): Promise<AgentCLIInstance[]> {
  const now = Date.now();
  const results: AgentCLIInstance[] = [];

  const scanPromises = AGENT_CLI_CATALOG.map(async (def) => {
    const checkedPaths: string[] = [];
    let resolvedPath: string | null = null;
    let discoveryMethod: CLIDiscoveryMethod = 'path';
    let status: CLIStatus = 'unavailable';
    let version: string | null = null;
    let error: string | null = null;

    // Step 1: Try 'which' / 'where' command
    const pathFromWhich = await which(def.executable);
    if (pathFromWhich) {
      resolvedPath = pathFromWhich;
      discoveryMethod = 'which';
      checkedPaths.push(`which: ${pathFromWhich}`);
    }

    // Step 2: Check known directories
    if (!resolvedPath) {
      for (const knownPath of def.knownPaths) {
        const expandedPaths = await expandPath(knownPath);
        for (const expandedPath of expandedPaths) {
          checkedPaths.push(`check: ${expandedPath}`);
          if (await fileExists(expandedPath)) {
            resolvedPath = expandedPath;
            discoveryMethod = 'path';
            break;
          }
        }
        if (resolvedPath) break;
      }
    }

    // Step 3: Verify the executable works
    if (resolvedPath) {
      version = await getVersion(resolvedPath, def.versionFlags);
      if (version) {
        status = 'available';
      } else {
        status = 'unavailable';
        error = 'Version check failed (CLI may be broken or requires first-time setup)';
        resolvedPath = null;
      }
    }

    results.push({
      name: def.name,
      label: def.label,
      description: def.description,
      avatar: def.avatar,
      executable: def.executable,
      resolvedPath,
      discoveryMethod,
      status,
      version,
      checkedPaths,
      error,
      lastChecked: now,
      promptTemplate: def.promptTemplate,
      defaultArgs: def.defaultArgs,
    });
  });

  await Promise.all(scanPromises);

  results.sort((a, b) => {
    if (a.status === 'available' && b.status !== 'available') return -1;
    if (a.status !== 'available' && b.status === 'available') return 1;
    return a.label.localeCompare(b.label);
  });

  return results;
}

export async function checkAgentCLI(name: string): Promise<AgentCLIInstance | null> {
  const def = AGENT_CLI_CATALOG.find((d) => d.name === name);
  if (!def) return null;

  const all = await scanAgentCLIs();
  return all.find((i) => i.name === name) ?? null;
}
