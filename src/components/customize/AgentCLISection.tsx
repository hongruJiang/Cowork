/**
 * AgentCLISection — Toolbox panel for managing external AI Agent CLIs.
 *
 * Shows discovered CLIs with their status (available/unavailable), version info,
 * and allows rescanning. Available CLIs have a "Soul" action that opens a
 * personality editor with template picker, usage tracking, and evolution history.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAgentCLIStore } from '@/stores/agentCLIStore';
import { Terminal, Check, X, RefreshCw, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentCLIInstance } from '@/core/agent-cli/types';
import { PERSONALITY_TEMPLATES } from '@/core/agent-cli/soulCLI';
import type { CLIPersonalityType } from '@/core/agent-cli/soulCLI';
import CLISoulEditor from './CLISoulEditor';

function CLIStatusIcon({ status }: { status: AgentCLIInstance['status'] }) {
  if (status === 'available') {
    return <Check className="h-3.5 w-3.5 text-green-500" />;
  }
  if (status === 'unavailable') {
    return <X className="h-3.5 w-3.5 text-[var(--abu-text-muted)]" />;
  }
  return <RefreshCw className="h-3.5 w-3.5 text-[var(--abu-text-muted)] animate-spin" />;
}

function CLICard({
  cli,
  isSelected,
  onClick,
  onEditSoul,
  soulCache,
}: {
  cli: AgentCLIInstance;
  isSelected: boolean;
  onClick: () => void;
  onEditSoul?: () => void;
  soulCache?: { content: string; personalityType: CLIPersonalityType | null; usageCount: number };
}) {
  const [showDetails, setShowDetails] = useState(false);
  const isAvailable = cli.status === 'available';
  const personality = soulCache?.personalityType;

  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      isSelected
        ? 'border-[var(--abu-clay)]/50 bg-[var(--abu-clay-bg)]'
        : isAvailable
          ? 'border-[var(--abu-border)] bg-[var(--abu-bg-base)] hover:border-[var(--abu-border)]'
          : 'border-[var(--abu-border)] opacity-60 bg-[var(--abu-bg-muted)]',
    )}>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {/* Avatar: personality emoji if soul is set */}
        <span className="text-xl leading-none shrink-0 select-none">
          {personality ? PERSONALITY_TEMPLATES[personality]?.emoji : cli.avatar}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[var(--abu-text-primary)] truncate">
              {cli.label}
            </span>
            <CLIStatusIcon status={cli.status} />
            {isAvailable && cli.version && (
              <span className="text-[10px] text-[var(--abu-text-muted)]">v{cli.version}</span>
            )}
            {personality && (
              <span className="text-[10px] px-1 py-px rounded-full bg-[var(--abu-clay-bg)] text-[var(--abu-clay)]">
                {PERSONALITY_TEMPLATES[personality].label.slice(0, 2)}
              </span>
            )}
            {soulCache?.content && !personality && (
              <Sparkles className="h-3 w-3 text-[var(--abu-clay)]/60" />
            )}
          </div>
          <p className="text-[11px] text-[var(--abu-text-tertiary)] mt-0.5 leading-snug line-clamp-1">
            {cli.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isAvailable && onEditSoul && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditSoul();
              }}
              className="p-1 rounded hover:bg-[var(--abu-bg-hover)] text-[var(--abu-text-muted)] hover:text-[var(--abu-clay)] transition-colors"
              title="编辑性格"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="p-1 rounded hover:bg-[var(--abu-bg-hover)] text-[var(--abu-text-muted)] hover:text-[var(--abu-text-primary)] transition-colors"
            title="显示详情"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>
      </button>

      {/* Expanded details */}
      {showDetails && (
        <div className="border-t border-[var(--abu-border)] px-4 py-3 space-y-2 text-[12px]">
          <div className="flex items-start gap-2">
            <span className="text-[var(--abu-text-muted)] shrink-0">执行文件:</span>
            <code className="text-[var(--abu-text-primary)] font-mono break-all">
              {cli.resolvedPath ?? cli.executable}
            </code>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--abu-text-muted)] shrink-0">发现方式:</span>
            <span className="text-[var(--abu-text-secondary)]">
              {cli.discoveryMethod === 'which' ? 'PATH 搜索 (which/where)' :
               cli.discoveryMethod === 'path' ? '已知目录扫描' : '手动添加'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--abu-text-muted)] shrink-0">命令模板:</span>
            <code className="text-[var(--abu-text-primary)] font-mono text-[11px] break-all">
              {cli.promptTemplate}
            </code>
          </div>
          {soulCache?.content && (
            <div className="flex items-start gap-2">
              <span className="text-[var(--abu-text-muted)] shrink-0">性格:</span>
              <span className="text-[var(--abu-text-secondary)]">
                {personality ? PERSONALITY_TEMPLATES[personality].label : '已自定义'}
                {soulCache.usageCount > 0 && ` · 使用 ${soulCache.usageCount} 次`}
              </span>
            </div>
          )}
          {cli.error && (
            <div className="flex items-start gap-2">
              <span className="text-[var(--abu-text-muted)] shrink-0">错误:</span>
              <span className="text-red-500">{cli.error}</span>
            </div>
          )}
          {cli.lastChecked && (
            <div className="flex items-start gap-2">
              <span className="text-[var(--abu-text-muted)] shrink-0">最后扫描:</span>
              <span className="text-[var(--abu-text-secondary)]">
                {new Date(cli.lastChecked).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentCLISection() {
  const { clis, isScanning, scanError, scan, soulCache } = useAgentCLIStore();

  // Which CLI is currently selected for soul editing
  const [editingSoulCLI, setEditingSoulCLI] = useState<AgentCLIInstance | null>(null);

  // Auto-scan on mount
  useEffect(() => {
    if (clis.length === 0 && !isScanning) {
      scan();
    }
  }, [clis.length, isScanning, scan]);

  const availableCLIs = useMemo(() => clis.filter((c) => c.status === 'available'), [clis]);
  const unavailableCLIs = useMemo(() => clis.filter((c) => c.status !== 'available'), [clis]);

  // If soul editor is open, show split view
  if (editingSoulCLI) {
    return (
      <div className="h-full flex">
        {/* Left: CLI list */}
        <div className="w-[320px] shrink-0 border-r border-[var(--abu-border)] flex flex-col h-full overflow-hidden">
          <div className="shrink-0 px-4 py-4 border-b border-[var(--abu-border)] flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[var(--abu-text-primary)]">外部 Agent CLI</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {availableCLIs.map((cli) => (
              <CLICard
                key={cli.name}
                cli={cli}
                isSelected={cli.name === editingSoulCLI.name}
                onClick={() => setEditingSoulCLI(cli)}
                onEditSoul={() => setEditingSoulCLI(cli)}
                soulCache={soulCache[cli.name]}
              />
            ))}
          </div>
        </div>
        {/* Right: Soul editor */}
        <div className="flex-1 overflow-hidden">
          <CLISoulEditor
            cli={editingSoulCLI}
            onClose={() => setEditingSoulCLI(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 py-5 border-b border-[var(--abu-border)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--abu-text-primary)] flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[var(--abu-clay)]" />
              外部 Agent CLI
            </h2>
            <p className="text-[12px] text-[var(--abu-text-tertiary)] mt-1">
              自动发现系统中安装的其他 AI Agent，每个可配置独立性格
            </p>
          </div>
          <button
            onClick={scan}
            disabled={isScanning}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
              'bg-[var(--abu-bg-active)] text-[var(--abu-text-primary)] hover:bg-[var(--abu-bg-hover)]',
              'border border-[var(--abu-border)]',
              isScanning && 'opacity-50 cursor-not-allowed',
            )}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isScanning && 'animate-spin')} />
            {isScanning ? '扫描中...' : '重新扫描'}
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3">
          <span className="text-[12px] text-[var(--abu-text-secondary)]">
            <span className="font-medium text-green-600">{availableCLIs.length}</span> 可用
          </span>
          <span className="text-[12px] text-[var(--abu-text-secondary)]">
            <span className="font-medium text-[var(--abu-text-muted)]">{unavailableCLIs.length}</span> 未安装
          </span>
          <span className="text-[12px] text-[var(--abu-text-secondary)]">
            <span className="font-medium text-[var(--abu-clay)]">
              {Object.keys(soulCache).length}
            </span> 已配置性格
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {scanError && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-600">
            扫描出错: {scanError}
          </div>
        )}

        {clis.length === 0 && isScanning && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-[var(--abu-text-muted)] animate-spin mx-auto mb-3" />
              <p className="text-[13px] text-[var(--abu-text-muted)]">正在扫描系统中的 Agent CLI...</p>
            </div>
          </div>
        )}

        {clis.length === 0 && !isScanning && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Terminal className="h-8 w-8 text-[var(--abu-text-muted)] mx-auto mb-3" />
              <p className="text-[13px] text-[var(--abu-text-muted)]">未发现任何 Agent CLI</p>
              <p className="text-[11px] text-[var(--abu-text-muted)] mt-1">
                试试安装 <code className="px-1 py-0.5 rounded bg-[var(--abu-bg-muted)]">aider</code>、
                <code className="px-1 py-0.5 rounded bg-[var(--abu-bg-muted)]">claude</code> 等工具
              </p>
            </div>
          </div>
        )}

        {/* Available CLIs */}
        {availableCLIs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[12px] font-medium text-[var(--abu-text-secondary)] mb-2 flex items-center gap-2">
              已安装可用
              <Sparkles className="h-3 w-3 text-[var(--abu-text-muted)]" />
              <span className="text-[10px] text-[var(--abu-text-muted)] font-normal">
                点击 ✨ 按钮为 Agent 配置性格
              </span>
            </h3>
            <div className="space-y-2">
              {availableCLIs.map((cli) => (
                <CLICard
                  key={cli.name}
                  cli={cli}
                  isSelected={false}
                  onClick={() => {}}
                  onEditSoul={() => setEditingSoulCLI(cli)}
                  soulCache={soulCache[cli.name]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Unavailable CLIs */}
        {unavailableCLIs.length > 0 && (
          <div>
            <h3 className="text-[12px] font-medium text-[var(--abu-text-muted)] mb-2">未安装</h3>
            <div className="space-y-2">
              {unavailableCLIs.map((cli) => (
                <CLICard
                  key={cli.name}
                  cli={cli}
                  isSelected={false}
                  onClick={() => {}}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
