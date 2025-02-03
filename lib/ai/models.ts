// Define your models here.
export enum ModelProviders {
  OPENAI = 'openai',
  MISTRAL = 'mistral',
  OLLAMA = 'ollama'
}

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
  provider: ModelProviders;
}

export const models: Array<Model> = [
  {
    id: 'gpt-4o-mini',
    label: 'GPT 4o mini',
    apiIdentifier: 'gpt-4o-mini',
    description: 'Small model for fast, lightweight tasks',
    provider: ModelProviders.OPENAI
  },
  {
    id: 'gpt-4o',
    label: 'GPT 4o',
    apiIdentifier: 'gpt-4o',
    description: 'For complex, multi-step tasks',
    provider: ModelProviders.OPENAI
  },
  {
    id: 'mistral-large',
    label: 'Mistral Large',
    apiIdentifier: 'mistral-large-latest',
    description: 'GPT 4o alternative',
    provider: ModelProviders.MISTRAL
  }
] as const;

export const DEFAULT_MODEL_NAME: string = 'gpt-4o-mini';
