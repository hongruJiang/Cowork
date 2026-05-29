/**
 * Agent CLI Module — External AI Agent CLI discovery and integration
 */
export { scanAgentCLIs, checkAgentCLI } from './scanner';
export { runExternalCLI, buildCLICommand, cliResultToMessage } from './runner';
export type { CLIRunResult } from './runner';
export {
  loadCLISoul,
  saveCLISoul,
  getDefaultCLISoulTemplate,
  fillTemplate,
  injectSoulToPrompt,
  recordCLIUsage,
  getEvolutionSuggestion,
  PERSONALITY_TEMPLATES,
} from './soulCLI';
export type { CLIPersonalityType, CLIPersonalityTemplate } from './soulCLI';
export { AGENT_CLI_CATALOG } from './types';
export type {
  AgentCLIDefinition,
  AgentCLIInstance,
  CLIDiscoveryMethod,
  CLIStatus,
} from './types';
