import { openai } from "@ai-sdk/openai";
import { QdrantClient } from "@qdrant/qdrant-js";
import { embed, tool } from "ai";
import { z } from "zod";

const embeddingModel = openai.embedding('text-embedding-3-large');

export const generateEmbedding = async (value: string): Promise<number[]> => {
    const input = value.replaceAll('\\n', ' ');
    const { embedding } = await embed({
        model: embeddingModel,
        value: input,
    });
    return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
    const userQueryEmbedded = await generateEmbedding(userQuery);
    const collectionName = process.env.QDRANT_COLLECTION ?? 'docs';

    const client = new QdrantClient({ url: process.env.QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });

    const relevantDocs = await client.search(collectionName, {
        vector: userQueryEmbedded,
        limit: 5
    });
    const filteredData = relevantDocs.map((item: any) => {
        const meta = (item.payload?.metadata as any);
        return {
            source: meta?.source,
            page: meta?.page,
            page_content: meta?.page_content
        }
    });
    return filteredData;
};


export const getInformation = tool({
    description: `Get information from your RFP knowledge base to answer questions. Call this tool only if the question pertains to RFP or software engineering.`,
    parameters: z.object({
        question: z.string().describe('the users question'),
    }),
    execute: async ({ question }) => findRelevantContent(question),
})