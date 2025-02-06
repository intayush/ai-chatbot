import { QdrantClient } from "@qdrant/qdrant-js";
// Qdrant Client Setup
const qdrantUrl = process.env.QDRANT_URL ?? 'http://127.0.0.1:6333';
const qdrantClientConfig: {url: string; apiKey?: string; } = {
    url: qdrantUrl
};
if(qdrantClientConfig['url'].includes('qdrant.io')) {
    qdrantClientConfig['apiKey'] = process.env.QDRANT_API_KEY
}
const qdrant = new QdrantClient(qdrantClientConfig);

export default qdrant;