/**
 * Agent CLI Types — External CLI-based AI agents
 * These are third-party CLI tools that users may have installed (aider, claude, gh copilot, etc.)
 * Abu can discover them and let users switch between Abu's built-in agent and these external CLIs.
 */

/** How the CLI was discovered (resolved full path, found via PATH, or detected via well-known dirs) */
export type CLIDiscoveryMethod = 'path' | 'which' | 'manual';

/** The state of the CLI executable */
export type CLIStatus = 'available' | 'unavailable' | 'pending';

/** Well-known agent CLI definitions that Abu can auto-detect */
export interface AgentCLIDefinition {
  /** Unique identifier for this agent CLI */
  name: string;
  /** Display label */
  label: string;
  /** Short description in user-facing language */
  description: string;
  /** CLI executable name (e.g., 'claude', 'aider') */
  executable: string;
  /** Common install paths to check */
  knownPaths: string[];
  /** How to verify the CLI works (flags for version check) */
  versionFlags: string[];
  /** How to pass a prompt to the CLI. {prompt} will be replaced with user input. */
  promptTemplate: string;
  /** Icon/emoji for UI */
  avatar: string;
  /** Additional arguments to pass to the CLI */
  defaultArgs: string[];
}

/** Runtime information about a discovered agent CLI */
export interface AgentCLIInstance {
  name: string;
  label: string;
  description: string;
  avatar: string;
  executable: string;
  /** Full path to the executable if resolved */
  resolvedPath: string | null;
  /** How the CLI was discovered */
  discoveryMethod: CLIDiscoveryMethod;
  /** Whether the CLI is available and functional */
  status: CLIStatus;
  /** Version string (e.g., '1.2.3') */
  version: string | null;
  /** Paths that were checked during discovery */
  checkedPaths: string[];
  /** The last error encountered when trying to use this CLI */
  error: string | null;
  /** Timestamp of last discovery check */
  lastChecked: number | null;
  /** How to pass a prompt to the CLI */
  promptTemplate: string;
  /** Additional default arguments */
  defaultArgs: string[];
}

/** Well-known agent CLI catalog */
export const AGENT_CLI_CATALOG: AgentCLIDefinition[] = [
  {
    name: 'aider',
    label: 'Aider',
    description: 'AI pair programming in your terminal',
    executable: 'aider',
    knownPaths: [
      '/usr/local/bin/aider',
      '/opt/homebrew/bin/aider',
      '~/.local/bin/aider',
      'C:\\Users\\*\\AppData\\Local\\Programs\\aider',
      'C:\\Users\\*\\AppData\\Roaming\\npm\\aider.cmd',
    ],
    versionFlags: ['--version'],
    promptTemplate: 'aider --message "{prompt}" --no-auto-commits',
    avatar: '🐍',
    defaultArgs: ['--no-auto-commits'],
  },
  {
    name: 'claude-cli',
    label: 'Claude CLI',
    description: "Anthropic's official Claude Code CLI",
    executable: 'claude',
    knownPaths: [
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      '~/.local/bin/claude',
      'C:\\Users\\*\\AppData\\Roaming\\npm\\claude.cmd',
    ],
    versionFlags: ['--version'],
    promptTemplate: 'claude -p "{prompt}"',
    avatar: '🧠',
    defaultArgs: ['-p'],
  },
  {
    name: 'gh-copilot',
    label: 'GitHub Copilot CLI',
    description: 'GitHub Copilot in the terminal',
    executable: 'gh',
    knownPaths: [
      '/usr/local/bin/gh',
      '/opt/homebrew/bin/gh',
      'C:\\Program Files\\GitHub CLI\\gh.exe',
      'C:\\Users\\*\\AppData\\Local\\GitHubCLI\\gh.exe',
    ],
    versionFlags: ['copilot', '--version'],
    promptTemplate: 'gh copilot suggest "{prompt}"',
    avatar: '🤖',
    defaultArgs: ['copilot', 'suggest'],
  },
  {
    name: 'codex-cli',
    label: 'OpenAI Codex CLI',
    description: 'OpenAI Codex in the terminal',
    executable: 'codex',
    knownPaths: [
      '/usr/local/bin/codex',
      '/opt/homebrew/bin/codex',
      '~/.local/bin/codex',
      'C:\\Users\\*\\AppData\\Roaming\\npm\\codex.cmd',
    ],
    versionFlags: ['--version'],
    promptTemplate: 'codex exec "{prompt}"',
    avatar: '⚡',
    defaultArgs: ['exec'],
  },
  {
    name: 'cursor-cli',
    label: 'Cursor CLI',
    description: 'Cursor editor CLI tools',
    executable: 'cursor',
    knownPaths: [
      '/usr/local/bin/cursor',
      '/opt/homebrew/bin/cursor',
      'C:\\Users\\*\\AppData\\Local\\Programs\\cursor\\Cursor.exe',
    ],
    versionFlags: ['--version'],
    promptTemplate: 'cursor --run "{prompt}"',
    avatar: '🖱️',
    defaultArgs: [],
  },
  {
    name: 'warp-ai',
    label: 'Warp AI',
    description: 'Warp terminal AI assistant',
    executable: 'warp-cli',
    knownPaths: [
      '/usr/local/bin/warp-cli',
      '/opt/homebrew/bin/warp-cli',
      '/Applications/Warp.app/Contents/MacOS/warp-cli',
      'C:\\Program Files\\Warp\\warp-cli.exe',
    ],
    versionFlags: ['--version'],
    promptTemplate: 'warp-cli ai ask "{prompt}"',
    avatar: '🌀',
    defaultArgs: ['ai', 'ask'],
  },
  {
    name: 'tabby',
    label: 'Tabby CLI',
    description: 'Tabby AI coding assistant',
    executable: 'tabby',
    knownPaths: [
      '/usr/local/bin/tabby',
      '/opt/homebrew/bin/tabby',
      '~/.local/bin/tabby',
      'C:\\Users\\*\\AppData\\Roaming\\npm\\tabby.cmd',
    ],
    versionFlags: ['--version'],
    promptTemplate: 'tabby ask "{prompt}"',
    avatar: '🐱',
    defaultArgs: ['ask'],
  },
];
