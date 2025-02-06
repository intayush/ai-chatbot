import {openai} from "@ai-sdk/openai";
import { mistral } from "@ai-sdk/mistral";


const embeddingModelProvider = process.env.TEXT_EMBEDDING_MODEL_PROVIDER ?? "openai";
const textembeddingModel = process.env.TEXT_EMBEDDING_MODEL ?? "text-embedding-ada-002";
const embeddingModel = embeddingModelProvider === "openai" ? openai.embedding(textembeddingModel) : mistral.textEmbeddingModel(textembeddingModel);
export default embeddingModel;