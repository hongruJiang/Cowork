/**
 * CLISoulEditor — personality editor for a single external CLI agent.
 *
 * Supports:
 *   - Template picker (Cat/Dog/Owl/Robot/Fox/Custom)
 *   - Free-text soul editing with preview
 *   - Evolution history display
 *   - Usage stats
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, RotateCcw, Clock, Activity, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentCLIStore } from '@/stores/agentCLIStore';
import type { AgentCLIInstance } from '@/core/agent-cli/types';
import {
  PERSONALITY_TEMPLATES,
  fillTemplate,
  getDefaultCLISoulTemplate,
  saveCLISoul,
} from '@/core/agent-cli/soulCLI';
import type { CLIPersonalityType } from '@/core/agent-cli/soulCLI';

interface CLISoulEditorProps {
  cli: AgentCLIInstance;
  onClose: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

/** Small tag-style button for template selection */
function TemplateOption({
  template,
  isSelected,
  onSelect,
}: {
  template: typeof PERSONALITY_TEMPLATES[keyof typeof PERSONALITY_TEMPLATES];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all',
        'border',
        isSelected
          ? 'bg-[var(--abu-clay-bg)] border-[var(--abu-clay)]/40 text-[var(--abu-clay)]'
          : 'border-[var(--abu-border)] bg-[var(--abu-bg-base)] hover:bg-[var(--abu-bg-hover)] text-[var(--abu-text-secondary)]',
      )}
    >
      <span>{template.emoji}</span>
      <span>{template.label.slice(3)}</span>
    </button>
  );
}

export default function CLISoulEditor({ cli, onClose }: CLISoulEditorProps) {
  const { soulCache, loadSoul, invalidateSoul } = useAgentCLIStore();

  const cached = soulCache[cli.name];
  const defaultTemplate = getDefaultCLISoulTemplate(cli);

  const [content, setContent] = useState(cached?.content || defaultTemplate);
  const [personalityType, setPersonalityType] = useState<CLIPersonalityType | null>(
    cached?.personalityType ?? null,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showHistory, setShowHistory] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load from file on mount (may be fresher than cache)
  useEffect(() => {
    loadSoul(cli.name).then((fresh) => {
      if (fresh?.content) {
        setContent(fresh.content);
        setPersonalityType(fresh.personalityType);
      }
    });
  }, [cli.name, loadSoul]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const doSave = useCallback(async (text: string, type: CLIPersonalityType | null) => {
    setSaveStatus('saving');
    try {
      await saveCLISoul(cli.name, text, { personalityType: type ?? undefined });
      invalidateSoul(cli.name);
      setSaveStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error(`Failed to save soul for ${cli.name}:`, err);
      setSaveStatus('idle');
    }
  }, [cli.name, invalidateSoul]);

  const handleTemplateSelect = (type: CLIPersonalityType) => {
    const template = PERSONALITY_TEMPLATES[type];
    const newContent = fillTemplate(template, cli);
    setContent(newContent);
    setPersonalityType(type);

    // Auto-save on template change
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSave(newContent, type);
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSave(value, personalityType);
    }, 800);
  };

  const handleManualSave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSave(content, personalityType);
  };

  const handleReset = () => {
    setContent(defaultTemplate);
    setPersonalityType(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSave(defaultTemplate, null);
  };

  const evolutionHistory = cached?.evolutionHistory ?? [];
  const usageCount = cached?.usageCount ?? 0;

  const statusLabel = saveStatus === 'saving' ? '保存中...'
    : saveStatus === 'saved' ? '已保存 ✓'
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--abu-border)]">
        <div className="flex items-center gap-2">
          <span className="text-lg">{cli.avatar}</span>
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--abu-text-primary)]">
              {cli.label} 的性格设定
            </h3>
            <p className="text-[11px] text-[var(--abu-text-muted)]">
              配置该 Agent 的对话风格和人格
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--abu-bg-hover)] text-[var(--abu-text-muted)] hover:text-[var(--abu-text-primary)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Template Picker */}
      <div className="shrink-0 px-4 py-3 border-b border-[var(--abu-border)]">
        <p className="text-[11px] font-medium text-[var(--abu-text-muted)] mb-2">选择性格模板</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(PERSONALITY_TEMPLATES).map((template) => (
            <TemplateOption
              key={template.id}
              template={template}
              isSelected={personalityType === template.id}
              onSelect={() => handleTemplateSelect(template.id)}
            />
          ))}
        </div>
      </div>

      {/* Soul Editor */}
      <div className="flex-1 min-h-0 px-4 py-3 overflow-hidden flex flex-col">
        <div className="relative flex-1 min-h-0">
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full h-full resize-none rounded-lg border border-[var(--abu-border)] bg-[var(--abu-bg-base)] p-3 text-[13px] font-mono leading-relaxed focus:outline-none focus:border-[var(--abu-clay)] focus:ring-1 focus:ring-[var(--abu-clay)]/20 transition-colors"
            placeholder="描述这个 Agent 的性格..."
            spellCheck={false}
          />
          <div className="absolute bottom-2 right-3 flex items-center gap-2 text-[11px]">
            {statusLabel && (
              <span className="text-[var(--abu-text-placeholder)] transition-opacity duration-200">
                {statusLabel}
              </span>
            )}
            <span className={content.length > 2000 ? 'text-red-500' : 'text-[var(--abu-text-placeholder)]'}>
              {content.length}/2000
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-[11px] text-[var(--abu-text-muted)]">
            {usageCount > 0 && (
              <span className="flex items-center gap-1" title="使用次数">
                <Activity className="h-3 w-3" />
                {usageCount} 次
              </span>
            )}
            {evolutionHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 hover:text-[var(--abu-clay)] transition-colors"
              >
                <Clock className="h-3 w-3" />
                进化记录 ({evolutionHistory.length})
                <ChevronRight className={cn('h-3 w-3 transition-transform', showHistory && 'rotate-90')} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[var(--abu-text-muted)] hover:text-[var(--abu-text-primary)] hover:bg-[var(--abu-bg-hover)] transition-colors"
              title="恢复默认性格"
            >
              <RotateCcw className="h-3 w-3" />
              重置
            </button>
            <button
              onClick={handleManualSave}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-[12px] font-medium bg-[var(--abu-clay)] text-white hover:bg-[var(--abu-clay)]/90 transition-colors"
            >
              <Save className="h-3 w-3" />
              保存
            </button>
          </div>
        </div>

        {/* Evolution history */}
        {showHistory && evolutionHistory.length > 0 && (
          <div className="mt-3 max-h-[120px] overflow-y-auto rounded-lg border border-[var(--abu-border)] p-3">
            <h4 className="text-[11px] font-medium text-[var(--abu-text-muted)] mb-1.5">进化历程</h4>
            {evolutionHistory.map((entry, i) => (
              <div key={i} className="text-[11px] text-[var(--abu-text-secondary)] leading-relaxed py-0.5">
                {entry}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
