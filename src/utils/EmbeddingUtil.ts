import { pipeline, Pipeline, PipelineType } from '@xenova/transformers';
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { logger } from './logging.js';

// Define the structure for the embedding pipeline more explicitly
type EmbeddingPipeline = Pipeline & {
    (text: string | string[], options?: { pooling?: 'mean', normalize?: boolean }): Promise<any>; // Adjust 'any' based on actual output type if known
};

/**
 * Singleton class to manage the loading and usage of a sentence transformer model
 * for generating text embeddings.
 */
export class EmbeddingUtil {
    private static instance: EmbeddingUtil | null = null;
    private extractor: Promise<EmbeddingPipeline | null>; // Store the promise to handle async loading

    private constructor() {
        this.extractor = this.loadModel();
    }

    /**
     * Loads the embedding model specified in the configuration.
     * Handles asynchronous loading and potential errors.
     */
    private async loadModel(): Promise<EmbeddingPipeline | null> {
        try {
            const configManager = ConfigurationManager.getInstance();
            // TODO: Add 'embeddingModel' to config types and ConfigurationManager
            // const modelName = configManager.getCoreConfig().embeddingModel || 'Xenova/all-MiniLM-L6-v2';
            const modelName = 'Xenova/all-MiniLM-L6-v2'; // Hardcoded for now, replace with config access
            logger.info(`Loading embedding model: ${modelName}... (This may take time on first run)`);

            // Specify the task and model
            // Type assertion needed as pipeline() return type is broad
            const extractorPipeline = await pipeline('feature-extraction', modelName) as EmbeddingPipeline;

            logger.info(`Embedding model ${modelName} loaded successfully.`);
            return extractorPipeline;
        } catch (error) {
            logger.error('Failed to load embedding model:', error);
            // Return null or throw error depending on desired handling
            // Returning null allows graceful degradation if embedding fails
            return null;
        }
    }

    /**
     * Gets the singleton instance of EmbeddingUtil.
     */
    public static getInstance(): EmbeddingUtil {
        if (!EmbeddingUtil.instance) {
            EmbeddingUtil.instance = new EmbeddingUtil();
        }
        return EmbeddingUtil.instance;
    }

    /**
     * Generates a normalized embedding vector for a single text string.
     * @param text The text to embed.
     * @returns A promise that resolves to the normalized embedding vector (number[]) or null if the model failed to load.
     */
    public async generateEmbedding(text: string): Promise<number[] | null> {
        const extractor = await this.extractor;
        if (!extractor || !text) {
            logger.warn('Embedding model not available or text is empty.');
            return null;
        }

        try {
            // Generate embedding, pool, and normalize
            const output = await extractor(text, { pooling: 'mean', normalize: true });
            // The actual embedding data is usually in output.data
            // Convert Float32Array to a regular number array
            return Array.from(output.data as Float32Array);
        } catch (error) {
            logger.error('Error generating single embedding:', error);
            return null;
        }
    }

    /**
     * Generates normalized embedding vectors for multiple text strings.
     * @param texts An array of texts to embed.
     * @returns A promise that resolves to an array of normalized embedding vectors (number[][]) or null if the model failed to load.
     */
    public async generateEmbeddings(texts: string[]): Promise<number[][] | null> {
        const extractor = await this.extractor;
        if (!extractor || !texts || texts.length === 0) {
            logger.warn('Embedding model not available or texts array is empty.');
            return null;
        }

        // Filter out any empty strings to avoid errors
        const validTexts = texts.filter(t => t && t.trim() !== '');
        if (validTexts.length === 0) {
            return [];
        }

        try {
            // The library might handle batching automatically when given an array
            const outputs = await extractor(validTexts, { pooling: 'mean', normalize: true });

            // Assuming the output structure for multiple inputs needs mapping
            // This might need adjustment based on the library's actual batch output format
            if (Array.isArray(outputs)) {
                // If it returns an array of outputs
                return outputs.map(output => Array.from(output.data as Float32Array));
            } else if (outputs.data && outputs.dims) {
                // If it returns a single tensor for the batch
                const batchSize = outputs.dims[0];
                const embeddingSize = outputs.dims[1];
                const embeddings: number[][] = [];
                const flatData = Array.from(outputs.data as Float32Array);
                for (let i = 0; i < batchSize; ++i) {
                    embeddings.push(flatData.slice(i * embeddingSize, (i + 1) * embeddingSize));
                }
                return embeddings;
            } else {
                logger.error('Unexpected output format from batch embedding generation.');
                return null;
            }

        } catch (error) {
            logger.error('Error generating batch embeddings:', error);
            return null;
        }
    }
}
