import { embed, tool } from "ai";
import { z } from "zod";
import embeddingModel from "../textEmbeddingModel";
import qdrant from "@/lib/db/vector-db-client";

export const generateEmbedding = async (value: string): Promise<number[]> => {
    const input = value.replaceAll('\\n', ' ');
    const { embedding } = await embed({
        model: embeddingModel,
        value: input,
    });
    return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
    try {
    const userQueryEmbedded = await generateEmbedding(userQuery);
    const collectionName = process.env.QDRANT_COLLECTION ?? 'documents';
    const client = qdrant;
    const relevantDocs = await client.search(collectionName, {
        vector: userQueryEmbedded,
        limit: 5
    });
    const filteredData = relevantDocs.map((item: any) => {
        const meta = (item.payload?.metadata as any);
        return {
            source: meta?.source,
            page_content: meta?.page_content
        }
    });
    return filteredData;
    } catch(e) {
        console.error(e);
    }
};


export const getInformation = tool({
    description: `Get information from your knowledge base to answer questions.`,
    parameters: z.object({
        question: z.string().describe('the users question'),
    }),
    execute: async ({ question }) => findRelevantContent(question),
})