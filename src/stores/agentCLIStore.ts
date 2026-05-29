/**
 * Agent CLI Store — manages discovered external agent CLIs, active selection,
 * per-CLI soul personalities, and self-evolution tracking.
 */
import { create } from 'zustand';
import type { AgentCLIInstance } from '../core/agent-cli/types';
import { scanAgentCLIs } from '../core/agent-cli/scanner';
import { loadCLISoul, getEvolutionSuggestion } from '../core/agent-cli/soulCLI';
import type { CLIPersonalityType } from '../core/agent-cli/soulCLI';

/** Per-CLI soul cache (loaded on demand, cleared on rescan) */
export interface CLISoulCache {
  content: string;
  personalityType: CLIPersonalityType | null;
  usageCount: number;
  evolutionHistory: string[];
}

interface AgentCLIState {
  /** All discovered agent CLIs */
  clis: AgentCLIInstance[];
  /** Whether a scan is in progress */
  isScanning: boolean;
  /** Current active agent CLI name (null = Abu built-in agent) */
  activeCLI: string | null;
  /** Last scan error, if any */
  scanError: string | null;
  /** Per-CLI soul cache: cliName → soul data */
  soulCache: Record<string, CLISoulCache>;
  /** Whether souls are being loaded */
  soulsLoading: boolean;
  /** Evolution hints per CLI (cliName → hint message) */
  evolutionHints: Record<string, string>;
}

interface AgentCLIActions {
  /** Scan the system for installed agent CLIs */
  scan: () => Promise<void>;
  /** Set the active CLI (null = switch back to Abu) */
  setActiveCLI: (name: string | null) => void;
  /** Get the currently active CLI instance */
  getActiveInstance: () => AgentCLIInstance | null;
  /** Get list of available (installed + working) CLIs */
  getAvailableCLIs: () => AgentCLIInstance[];
  /** Re-check a specific CLI */
  rescan: () => Promise<void>;

  // ── Soul management ──────────────────────────────────────────────

  /** Load all CLI souls into cache */
  loadAllSouls: () => Promise<void>;
  /** Load a single CLI's soul into cache */
  loadSoul: (cliName: string) => Promise<CLISoulCache | null>;
  /** Get cached soul for a CLI (returns null if not loaded) */
  getSoul: (cliName: string) => CLISoulCache | null;
  /** Invalidate soul cache (e.g. after save) */
  invalidateSoul: (cliName: string) => void;
  /** Clear a specific evolution hint */
  dismissEvolutionHint: (cliName: string) => void;
  /** Add or update an evolution hint */
  setEvolutionHint: (cliName: string, hint: string) => void;
}

export type AgentCLIStore = AgentCLIState & AgentCLIActions;

export const useAgentCLIStore = create<AgentCLIStore>()((set, get) => ({
  clis: [],
  isScanning: false,
  activeCLI: null,
  scanError: null,
  soulCache: {},
  soulsLoading: false,
  evolutionHints: {},

  scan: async () => {
    set({ isScanning: true, scanError: null });
    try {
      const clis = await scanAgentCLIs();
      set({ clis, isScanning: false, soulCache: {} });
      // Auto-load souls for available CLIs
      get().loadAllSouls();
    } catch (err) {
      console.warn('[AgentCLI] Scan failed:', err);
      set({
        isScanning: false,
        scanError: String(err),
      });
    }
  },

  setActiveCLI: (name) => {
    set({ activeCLI: name });
    // When switching, check for evolution hints
    if (name) {
      const soul = get().soulCache[name];
      if (soul && soul.usageCount > 0 && soul.usageCount % 10 === 0) {
        const hint = getEvolutionSuggestion(name, soul.usageCount);
        if (hint) {
          set((state) => ({
            evolutionHints: { ...state.evolutionHints, [name]: hint },
          }));
        }
      }
    }
  },

  getActiveInstance: () => {
    const { clis, activeCLI } = get();
    if (!activeCLI) return null;
    return clis.find((c) => c.name === activeCLI && c.status === 'available') ?? null;
  },

  getAvailableCLIs: () => {
    return get().clis.filter((c) => c.status === 'available');
  },

  rescan: async () => {
    await get().scan();
  },

  // ── Soul management ──────────────────────────────────────────────

  loadAllSouls: async () => {
    const { clis } = get();
    set({ soulsLoading: true });
    try {
      const cache: Record<string, CLISoulCache> = {};
      for (const cli of clis) {
        if (cli.status === 'available') {
          const soulData = await loadCLISoul(cli.name);
          if (soulData.content || soulData.usageCount > 0) {
            cache[cli.name] = {
              content: soulData.content,
              personalityType: soulData.personalityType,
              usageCount: soulData.usageCount,
              evolutionHistory: soulData.evolutionHistory,
            };
          }
        }
      }
      set({ soulCache: cache, soulsLoading: false });
    } catch (err) {
      console.warn('[AgentCLI] Failed to load souls:', err);
      set({ soulsLoading: false });
    }
  },

  loadSoul: async (cliName: string) => {
    try {
      const soulData = await loadCLISoul(cliName);
      if (soulData.content || soulData.usageCount > 0) {
        const cacheEntry: CLISoulCache = {
          content: soulData.content,
          personalityType: soulData.personalityType,
          usageCount: soulData.usageCount,
          evolutionHistory: soulData.evolutionHistory,
        };
        set((state) => ({
          soulCache: { ...state.soulCache, [cliName]: cacheEntry },
        }));
        return cacheEntry;
      }
    } catch (err) {
      console.warn(`[AgentCLI] Failed to load soul for ${cliName}:`, err);
    }
    return null;
  },

  getSoul: (cliName: string) => {
    return get().soulCache[cliName] ?? null;
  },

  invalidateSoul: (cliName: string) => {
    set((state) => {
      const newCache = { ...state.soulCache };
      delete newCache[cliName];
      return { soulCache: newCache };
    });
    // Reload
    get().loadSoul(cliName);
  },

  dismissEvolutionHint: (cliName: string) => {
    set((state) => {
      const newHints = { ...state.evolutionHints };
      delete newHints[cliName];
      return { evolutionHints: newHints };
    });
  },

  setEvolutionHint: (cliName: string, hint: string) => {
    set((state) => ({
      evolutionHints: { ...state.evolutionHints, [cliName]: hint },
    }));
  },
}));
