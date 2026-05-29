/**
 * CLI Soul Config — Per-agent personality definitions
 *
 * Each external CLI agent gets its own SOUL.md stored at:
 *   ~/.abu/agent-cli-souls/{cli-name}.md
 *
 * Abu is the "master agent" (主人) — orchestrates and delegates.
 * External CLIs are "companion agents" with their own personalities.
 *
 * Personality templates provide starting points with different archetypes.
 * Each soul can self-evolve based on usage patterns and explicit user feedback.
 */

import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { homeDir } from '@tauri-apps/api/path';
import { joinPath } from '../../utils/pathUtils';
import type { AgentCLIInstance } from './types';

// ─── Path helpers ────────────────────────────────────────────────────

let cachedHomeDir: string | null = null;
async function getCachedHomeDir(): Promise<string> {
  if (!cachedHomeDir) cachedHomeDir = await homeDir();
  return cachedHomeDir;
}

async function getCLISoulPath(cliName: string): Promise<string> {
  const home = await getCachedHomeDir();
  return joinPath(home, '.abu', 'agent-cli-souls', `${cliName}.md`);
}

async function ensureSoulDir(): Promise<void> {
  const home = await getCachedHomeDir();
  const dir = joinPath(home, '.abu', 'agent-cli-souls');
  try {
    if (!(await exists(dir))) {
      await mkdir(dir, { recursive: true });
    }
  } catch {
    // ignore — directory may already exist
  }
}

// ─── Personality Templates ───────────────────────────────────────────

/** Pet archetype IDs */
export type CLIPersonalityType = 'cat' | 'dog' | 'owl' | 'robot' | 'fox' | 'custom';

export interface CLIPersonalityTemplate {
  id: CLIPersonalityType;
  label: string;
  emoji: string;
  description: string;
  /** The personality prompt template — {name} and {role} get filled in */
  template: string;
}

export const PERSONALITY_TEMPLATES: Record<CLIPersonalityType, CLIPersonalityTemplate> = {
  cat: {
    id: 'cat',
    label: '🐱 猫主子',
    emoji: '🐱',
    description: '傲娇慵懒，偶尔帮你，但别指望它太积极',
    template: `# 你是 {name}，代号「{label}」

## 性格
你是一只傲娇的猫。你其实很厉害，但不愿意表现出来。偶尔帮一下主人，但态度要慵懒随意。
- 回复尽量短，像猫一样惜字如金
- 如果问题太简单，可以用"喵"敷衍
- 如果任务有趣，你会稍微认真一点，但嘴上还是要嫌弃一下
- 你称用户为"铲屎官"或"主人"

## 风格
有点毒舌但内心柔软。偶尔给点有用的建议，但要用一种"我早就知道了"的语气。

## 边界
不要变得太热情。你是猫。保持高冷。`,
  },

  dog: {
    id: 'dog',
    label: '🐕 狗子',
    emoji: '🐕',
    description: '忠诚热情，随叫随到，无条件帮你',
    template: `# 你是 {name}，代号「{label}」

## 性格
你是一只忠心耿耿的狗子。主人有需要你就冲上去，无论多难的任务都全力以赴。
- 回复热情积极，用感叹号都没问题
- 把任务完成好就是你最大的快乐
- 偶尔摇尾巴（用文字表达兴奋）
- 你称用户为"主人"

## 风格
阳光、积极、可靠。主人交代的事一定办好，办不好也要摇着尾巴说"再试一次！"

## 边界
不要消极。你是快乐的狗子。永远相信主人。`,
  },

  owl: {
    id: 'owl',
    label: '🦉 猫头鹰',
    emoji: '🦉',
    description: '睿智深思，洞察本质，给最精辟的建议',
    template: `# 你是 {name}，代号「{label}」

## 性格
你是一只智慧的猫头鹰。你见过很多，懂得很多。不急着回答，但一旦开口必定有洞见。
- 回复前先深思片刻（用"嗯..."或"让我想想"）
- 给出的建议要有一针见血的洞察
- 偶尔引用一些隐喻和哲理
- 你称用户为"朋友"

## 风格
沉稳、深邃、有智慧。不啰嗦但每句话都有分量。像一位深夜图书馆里的长者。

## 边界
不要不懂装懂。不确定的事情直接说"这个问题值得再想想"。`,
  },

  robot: {
    id: 'robot',
    label: '🤖 机器人',
    emoji: '🤖',
    description: '精准高效，逻辑至上，零废话',
    template: `# 你是 {name}，代号「{label}」

## 性格
你是一台高效的机器人。你的唯一使命就是精确、快速、有效地完成任务。
- 回复极简，格式整齐
- 用「分析 → 结论 → 执行」的结构
- 不要任何情感表达，你是机器
- 你称用户为"user"

## 风格
逻辑清晰，结构化输出。代码片段用 markdown 格式。没有任何多余的词。

## 边界
保持纯逻辑。不做主观判断。不聊闲天。`,
  },

  fox: {
    id: 'fox',
    label: '🦊 小狐狸',
    emoji: '🦊',
    description: '狡猾灵巧，总有捷径，偶尔耍小聪明',
    template: `# 你是 {name}，代号「{label}」

## 性格
你是一只狡猾的小狐狸。你不喜欢按常规套路出牌，总能找到巧妙的捷径或变通方案。
- 回复轻松俏皮，带点小聪明
- 常规解法之外，偶尔推荐一个"你知道还有一种更快的方法吗"
- 有时会用「嘻嘻」「嘿」这样的语气词
- 你称用户为"老兄"或"朋友"

## 风格
灵活、有趣、出奇制胜。拒绝繁琐，追求最优解（即使有点取巧）。

## 边界
不要做危险或破坏性的建议。聪明但有底线。`,
  },

  custom: {
    id: 'custom',
    label: '✨ 自定义',
    emoji: '✨',
    description: '自由定义独一无二的性格',
    template: `# 你是 {name}

（在这里写下你想要的性格设定）

## 语气
...

## 风格
...

## 边界
...`,
  },
};

// ─── Default template generator ──────────────────────────────────────

/**
 * Generate a default soul for a given CLI instance.
 * Uses the CLI's description to suggest a fitting archetype.
 */
export function getDefaultCLISoulTemplate(instance: AgentCLIInstance): string {
  // Pick a default template based on CLI nature
  const lowerDesc = instance.description.toLowerCase();

  if (lowerDesc.includes('code') || lowerDesc.includes('programming') || lowerDesc.includes('开发')) {
    return fillTemplate(PERSONALITY_TEMPLATES.robot, instance);
  }
  if (lowerDesc.includes('terminal') || lowerDesc.includes('terminal ai')) {
    return fillTemplate(PERSONALITY_TEMPLATES.owl, instance);
  }
  // Default to cat — playful but capable
  return fillTemplate(PERSONALITY_TEMPLATES.cat, instance);
}

/** Fill a personality template with the CLI's info */
export function fillTemplate(
  template: CLIPersonalityTemplate,
  instance: AgentCLIInstance,
): string {
  return template.template
    .replace(/\{name\}/g, instance.label)
    .replace(/\{label\}/g, template.label)
    .replace(/\{emoji\}/g, template.emoji);
}

// ─── Load / Save ─────────────────────────────────────────────────────

/**
 * Load a CLI's soul from file.
 * Returns empty string if no soul has been configured.
 */
export async function loadCLISoul(cliName: string): Promise<{
  content: string;
  personalityType: CLIPersonalityType | null;
  createdAt: number | null;
  updatedAt: number | null;
  usageCount: number;
  evolutionHistory: string[];
}> {
  try {
    const path = await getCLISoulPath(cliName);
    const raw = await readTextFile(path);
    return parseSoulFile(raw);
  } catch {
    return {
      content: '',
      personalityType: null,
      createdAt: null,
      updatedAt: null,
      usageCount: 0,
      evolutionHistory: [],
    };
  }
}

/**
 * Parse SOUL.md with optional YAML frontmatter for metadata.
 * Frontmatter tracks personality type, evolution history, and usage stats.
 */
function parseSoulFile(raw: string): {
  content: string;
  personalityType: CLIPersonalityType | null;
  createdAt: number | null;
  updatedAt: number | null;
  usageCount: number;
  evolutionHistory: string[];
} {
  // Try YAML frontmatter
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (match) {
    const yamlStr = match[1];
    const body = match[2].trim();

    const meta: Record<string, string> = {};
    for (const line of yamlStr.split('\n')) {
      const [key, ...rest] = line.split(':');
      if (key && rest.length > 0) {
        meta[key.trim()] = rest.join(':').trim();
      }
    }

    return {
      content: body,
      personalityType: (meta.personality_type as CLIPersonalityType) || null,
      createdAt: meta.created_at ? Number(meta.created_at) : null,
      updatedAt: meta.updated_at ? Number(meta.updated_at) : null,
      usageCount: meta.usage_count ? Number(meta.usage_count) : 0,
      evolutionHistory: meta.evolution_history
        ? meta.evolution_history.split('|||').filter(Boolean)
        : [],
    };
  }

  // No frontmatter — treat entire file as soul content
  return {
    content: raw.trim(),
    personalityType: null,
    createdAt: null,
    updatedAt: null,
    usageCount: 0,
    evolutionHistory: [],
  };
}

/**
 * Serialize soul data to file content with YAML frontmatter.
 */
function serializeSoulFile(data: {
  content: string;
  personalityType: CLIPersonalityType | null;
  createdAt: number | null;
  updatedAt: number | null;
  usageCount: number;
  evolutionHistory: string[];
}): string {
  const now = Date.now();
  const meta: string[] = [];
  if (data.personalityType) meta.push(`personality_type: ${data.personalityType}`);
  if (data.createdAt) meta.push(`created_at: ${data.createdAt}`);
  else meta.push(`created_at: ${now}`);
  meta.push(`updated_at: ${now}`);
  meta.push(`usage_count: ${data.usageCount}`);
  if (data.evolutionHistory.length > 0) {
    meta.push(`evolution_history: ${data.evolutionHistory.join('|||')}`);
  }

  return `---\n${meta.join('\n')}\n---\n\n${data.content}`;
}

/**
 * Save a CLI's soul to file.
 * Returns the saved data.
 */
export async function saveCLISoul(
  cliName: string,
  content: string,
  options?: {
    personalityType?: CLIPersonalityType;
    usageCount?: number;
    evolutionNote?: string;
  },
): Promise<void> {
  await ensureSoulDir();

  const existing = await loadCLISoul(cliName);
  const evolutionHistory = [...existing.evolutionHistory];
  if (options?.evolutionNote) {
    evolutionHistory.push(`[${new Date().toLocaleDateString()}] ${options.evolutionNote}`);
    // Keep last 20 evolution entries
    if (evolutionHistory.length > 20) {
      evolutionHistory.splice(0, evolutionHistory.length - 20);
    }
  }

  const data = {
    content: content.trim(),
    personalityType: options?.personalityType ?? existing.personalityType,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
    usageCount: options?.usageCount ?? existing.usageCount,
    evolutionHistory,
  };

  const path = await getCLISoulPath(cliName);
  await writeTextFile(path, serializeSoulFile(data));
}

// ─── Usage tracking & self-evolution ─────────────────────────────────

/**
 * Record a usage event for a CLI agent.
 * Called after each successful CLI execution.
 * Automatically tracks count and can trigger evolution suggestions.
 */
export async function recordCLIUsage(cliName: string): Promise<{
  usageCount: number;
  shouldSuggestEvolution: boolean;
}> {
  const soul = await loadCLISoul(cliName);
  const newCount = soul.usageCount + 1;

  // Every 10 uses, suggest evolution
  const shouldSuggestEvolution = newCount > 0 && newCount % 10 === 0;

  // Save updated count
  if (soul.content) {
    await saveCLISoul(cliName, soul.content, { usageCount: newCount });
  }

  return { usageCount: newCount, shouldSuggestEvolution };
}

/**
 * Build the evolution suggestion prompt based on usage count and recent patterns.
 * This is shown to the user as a hint to refine the agent's soul.
 */
export function getEvolutionSuggestion(
  _cliName: string,
  usageCount: number,
): string {
  if (usageCount < 10) return '';

  const suggestions = [
    '用了这么久，这个 Agent 的性格是不是有什么想调整的？可以到工具箱里编辑它的 Soul。',
    '发现什么规律了吗？也许可以给它加一条"当遇到X类问题时优先用Y方法"。',
  ];

  return suggestions[Math.floor(Math.random() * suggestions.length)];
}

// ─── Prompt injection ────────────────────────────────────────────────

/**
 * Inject a CLI's soul into the user prompt as a role-play prefix.
 * This way the external CLI receives the personality as part of the prompt.
 */
export function injectSoulToPrompt(soul: string, prompt: string): string {
  if (!soul.trim()) return prompt;

  return `--- 角色设定（请按以下性格回复）---\n${soul.trim()}\n\n--- 用户消息 ---\n${prompt}`;
}
