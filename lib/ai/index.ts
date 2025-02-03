import { openai } from '@ai-sdk/openai';
import { mistral } from '@ai-sdk/mistral';
import { LanguageModelV1, experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';
import { ollama } from "ollama-ai-provider"

import { customMiddleware } from './custom-middleware';
import { ModelProviders } from './models';

export const customModel = (apiIdentifier: string, provider: ModelProviders) => {
  let model: LanguageModelV1;
  switch(provider) {
    case ModelProviders.MISTRAL:
      model = mistral(apiIdentifier);
      break;
    case ModelProviders.OLLAMA:
      model = ollama(apiIdentifier)
      break;
    default:
      model = openai(apiIdentifier)
  }
  return wrapLanguageModel({
    model,
    middleware: customMiddleware,
  });
};

export const imageGenerationModel = openai.image('dall-e-3');
