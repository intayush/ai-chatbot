import "dotenv/config"
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
// import mammoth from "mammoth";
import {QdrantClient} from "@qdrant/qdrant-js";
import {openai} from "@ai-sdk/openai";
import {embed} from "ai";


// Qdrant Client Setup
const qdrant = new QdrantClient({ url: 'http://localhost:6333' });


const COLLECTION_NAME = 'documents';
const CHUNK_SIZE = 1000; // Characters per chunk

const embeddingModel = openai.embedding("text-embedding-ada-002");
// Ensure collection exists
async function ensureCollection() {
    const collections = await qdrant.getCollections();
    if (!collections.collections.some(c => c.name === COLLECTION_NAME)) {
        await qdrant.createCollection(COLLECTION_NAME, {
            vectors: { size: 1536, distance: 'Cosine' },
        });
        console.log(`Collection '${COLLECTION_NAME}' created.`);
    }
}

// Extract text from different file types
async function extractText(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
        const data = fs.readFileSync(filePath);
        const pdfData = await pdfParse(data);
        return pdfData.text;
    }  else if (ext === '.txt') {
        return fs.readFileSync(filePath, 'utf-8');
    } else {
        throw new Error(`Unsupported file type: ${ext}`);
    }
}

// Split text into chunks
function splitIntoChunks(text: string, chunkSize: number) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}

// Get OpenAI embeddings
async function getEmbedding(text: string) {
    const stringEmbedResult = await embed({
        model: embeddingModel,
        value: text
    });
    return stringEmbedResult.embedding;
}

// Seed documents
async function seedDocuments() {
    await ensureCollection();

    const resourceDir = path.join(process.cwd(), 'resources');
    const files = fs.readdirSync(resourceDir);
    let idCounter = 1;

    for (const file of files) {
        const filePath = path.join(resourceDir, file);
        console.log(`Processing ${file}...`);

        try {
            const content = await extractText(filePath);
            const chunks = splitIntoChunks(content, CHUNK_SIZE);

            const points = await Promise.all(chunks.map(async (chunk, index) => ({
                id: idCounter++,
                vector: await getEmbedding(chunk),
                payload: {
                    fileName: file,
                    chunkIndex: index,
                    content: chunk,
                },
            })));

            // @ts-ignore
            await qdrant.upsert(COLLECTION_NAME, { points });
            console.log(`Seeded ${file} with ${chunks.length} chunks.`);
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
        }
    }

    console.log('All documents seeded successfully!');
}

// Run the script
seedDocuments().then(() => console.log("Completed")).catch(console.error);
