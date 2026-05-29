/**
 * AgentCLISwitcher — dropdown next to the Abu avatar in the chat header,
 * allowing users to switch between Abu's built-in agent and external CLIs.
 *
 * Now shows personality badges for agents with Soul configured:
 *   🐱 Cat, 🐕 Dog, 🦉 Owl, 🤖 Robot, 🦊 Fox, 🧬 Custom
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronDown, Check, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentCLIStore } from '@/stores/agentCLIStore';
import type { AgentCLIInstance } from '@/core/agent-cli/types';
import { PERSONALITY_TEMPLATES } from '@/core/agent-cli/soulCLI';
import type { CLIPersonalityType } from '@/core/agent-cli/soulCLI';
import abuAvatar from '@/assets/abu-avatar.png';

/** Small inline badge showing personality type */
function PersonalityBadge({ type, size }: { type: CLIPersonalityType; size?: 'sm' }) {
  const template = PERSONALITY_TEMPLATES[type];
  if (!template) return null;
  const cls = size === 'sm'
    ? 'text-[10px] px-1 py-px'
    : 'text-[10px] px-1.5 py-0.5';
  return (
    <span className={cn(
      'rounded-full bg-[var(--abu-clay-bg)] text-[var(--abu-clay)] font-medium inline-flex items-center gap-0.5',
      cls,
    )}>
      {template.emoji} {template.label.slice(0, 2)}
    </span>
  );
}

interface AgentCLISwitcherProps {
  className?: string;
}

export default function AgentCLISwitcher({ className }: AgentCLISwitcherProps) {
  const {
    clis, isScanning, activeCLI, setActiveCLI, scan, getAvailableCLIs,
    soulCache, evolutionHints, dismissEvolutionHint,
  } = useAgentCLIStore();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const availableCLIs = getAvailableCLIs();
  const activeInstance = activeCLI
    ? clis.find((c) => c.name === activeCLI)
    : null;

  // Get soul info for active CLI
  const activeSoul = useMemo(() => {
    if (activeCLI && soulCache[activeCLI]) {
      return soulCache[activeCLI];
    }
    return null;
  }, [activeCLI, soulCache]);

  // Evolution hint for active CLI
  const activeEvolutionHint = useMemo(() => {
    if (activeCLI && evolutionHints[activeCLI]) {
      return evolutionHints[activeCLI];
    }
    return null;
  }, [activeCLI, evolutionHints]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Auto-scan on first mount
  useEffect(() => {
    if (clis.length === 0 && !isScanning) {
      scan();
    }
  }, [clis.length, isScanning, scan]);

  const handleSelect = (instance: AgentCLIInstance | null) => {
    setActiveCLI(instance?.name ?? null);
    setOpen(false);
  };

  const handleRescan = (e: React.MouseEvent) => {
    e.stopPropagation();
    scan();
  };

  return (
    <div className={cn('relative', className)} ref={wrapperRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all',
          'border',
          activeInstance
            ? 'bg-[var(--abu-clay-bg)] border-[var(--abu-clay)]/30 text-[var(--abu-clay)]'
            : 'bg-[var(--abu-bg-base)] border-[var(--abu-border)] hover:bg-[var(--abu-bg-hover)] text-[var(--abu-text-primary)]',
        )}
        title={activeInstance ? `使用 ${activeInstance.label}` : '使用 Abu（内置）'}
      >
        {activeInstance ? (
          <>
            {activeSoul?.personalityType ? (
              // Show personality emoji as the avatar
              <span className="text-sm leading-none">
                {PERSONALITY_TEMPLATES[activeSoul.personalityType]?.emoji ?? activeInstance.avatar}
              </span>
            ) : (
              <span className="text-sm leading-none">{activeInstance.avatar}</span>
            )}
            <span className="truncate max-w-[80px]">{activeInstance.label}</span>
            {activeSoul?.personalityType && (
              <Sparkles className="h-3 w-3 text-[var(--abu-clay)]/60" />
            )}
          </>
        ) : (
          <>
            <img src={abuAvatar} alt="Abu" className="h-4 w-4 rounded-full" />
            <span>Abu</span>
          </>
        )}
        <ChevronDown className={cn('h-3 w-3 transition-transform opacity-60', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-[280px] max-h-[380px] overflow-y-auto rounded-lg border border-[var(--abu-border)] bg-[var(--abu-bg-base)] shadow-lg py-1">
          {/* Abu (built-in) — the master */}
          <button
            onClick={() => handleSelect(null)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
              !activeCLI
                ? 'bg-[var(--abu-clay-bg)]'
                : 'hover:bg-[var(--abu-bg-hover)]',
            )}
          >
            <img src={abuAvatar} alt="Abu" className="h-5 w-5 rounded-full" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'text-[13px] font-medium',
                  !activeCLI ? 'text-[var(--abu-clay)]' : 'text-[var(--abu-text-primary)]',
                )}>
                  Abu
                </span>
                {!activeCLI && <Check className="h-3 w-3 text-[var(--abu-clay)] shrink-0" />}
                <span className="text-[10px] px-1 py-px rounded bg-[var(--abu-bg-hover)] text-[var(--abu-text-muted)]">
                  主人
                </span>
              </div>
              <p className="text-[11px] text-[var(--abu-text-tertiary)] mt-0.5 leading-snug">
                统一调度所有 Agent，分配任务
              </p>
            </div>
          </button>

          {/* Divider */}
          {availableCLIs.length > 0 && (
            <div className="my-1 mx-2 border-t border-[var(--abu-border)]" />
          )}

          {/* External CLIs header */}
          {availableCLIs.length > 0 && (
            <div className="px-3 py-1.5 flex items-center justify-between">
              <span className="text-[10px] font-medium text-[var(--abu-text-muted)] uppercase tracking-wider">
                伙伴 Agent
              </span>
              <button
                onClick={handleRescan}
                className={cn(
                  'p-0.5 rounded hover:bg-[var(--abu-bg-hover)] transition-colors',
                  isScanning && 'animate-spin',
                )}
                title="重新扫描"
              >
                <RefreshCw className="h-3 w-3 text-[var(--abu-text-muted)]" />
              </button>
            </div>
          )}

          {/* Available external CLIs */}
          {availableCLIs.map((cli) => {
            const isActive = activeCLI === cli.name;
            const soul = soulCache[cli.name];
            const personality = soul?.personalityType;
            return (
              <button
                key={cli.name}
                onClick={() => handleSelect(cli)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                  isActive
                    ? 'bg-[var(--abu-clay-bg)]'
                    : 'hover:bg-[var(--abu-bg-hover)]',
                )}
              >
                {/* Show personality emoji if soul is configured, otherwise CLI default */}
                <span className="text-base leading-none shrink-0">
                  {personality
                    ? PERSONALITY_TEMPLATES[personality]?.emoji
                    : cli.avatar}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      'text-[13px] font-medium truncate',
                      isActive ? 'text-[var(--abu-clay)]' : 'text-[var(--abu-text-primary)]',
                    )}>
                      {cli.label}
                    </span>
                    {isActive && <Check className="h-3 w-3 text-[var(--abu-clay)] shrink-0" />}
                    {personality && <PersonalityBadge type={personality} size="sm" />}
                    {soul && !personality && (
                      <span className="text-[10px] text-[var(--abu-text-muted)]">🧬</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--abu-text-tertiary)] mt-0.5 leading-snug line-clamp-2">
                    {cli.description}
                    {cli.version && <span className="ml-1 text-[var(--abu-text-muted)]">v{cli.version}</span>}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Evolution hint banner for active CLI */}
          {activeEvolutionHint && (
            <div className="mx-2 mb-1 p-2 rounded-md bg-[var(--abu-clay-bg)] border border-[var(--abu-clay)]/20">
              <p className="text-[11px] text-[var(--abu-clay)] leading-snug">{activeEvolutionHint}</p>
              <button
                onClick={() => activeCLI && dismissEvolutionHint(activeCLI)}
                className="mt-1 text-[10px] text-[var(--abu-text-muted)] hover:underline"
              >
                知道了
              </button>
            </div>
          )}

          {/* Not installed CLIs */}
          {clis.filter((c) => c.status !== 'available').length > 0 && (
            <>
              <div className="my-1 mx-2 border-t border-[var(--abu-border)]" />
              <div className="px-3 py-1.5">
                <span className="text-[10px] font-medium text-[var(--abu-text-muted)] uppercase tracking-wider">
                  未安装
                </span>
              </div>
              {clis
                .filter((c) => c.status !== 'available')
                .map((cli) => (
                  <div
                    key={cli.name}
                    className="flex items-center gap-3 px-3 py-1.5 opacity-50"
                  >
                    <span className="text-base leading-none shrink-0">{cli.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] text-[var(--abu-text-muted)]">{cli.label}</span>
                    </div>
                    <span className="text-[10px] text-[var(--abu-text-muted)] shrink-0">
                      未安装
                    </span>
                  </div>
                ))}
            </>
          )}

          {/* Scanning indicator */}
          {isScanning && (
            <div className="px-3 py-2 text-center text-[11px] text-[var(--abu-text-muted)]">
              正在扫描系统...
            </div>
          )}

          {/* Empty state */}
          {!isScanning && clis.length === 0 && (
            <div className="px-3 py-3 text-center">
              <p className="text-[12px] text-[var(--abu-text-muted)]">
                未发现外部 Agent CLI
              </p>
              <button
                onClick={handleRescan}
                className="mt-1 text-[11px] text-[var(--abu-clay)] hover:underline"
              >
                点击扫描
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
