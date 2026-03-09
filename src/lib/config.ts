import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { load } from 'js-yaml'; // You may need to install: npm install js-yaml

export interface RuleConfig {
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'error';
}

export interface GuardBotConfig {
  rules: Record<string, RuleConfig>;
  framework?: 'react' | 'vue' | 'django';
}

const DEFAULT_CONFIG: GuardBotConfig = {
  rules: {},
};

export function loadConfig(rootPath: string): GuardBotConfig {
  const configPath = join(rootPath, '.guardbot.yml');
  
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const fileContents = readFileSync(configPath, 'utf8');
    return load(fileContents) as GuardBotConfig;
  } catch (e) {
    console.warn('Failed to parse .guardbot.yml, using defaults.');
    return DEFAULT_CONFIG;
  }
}
