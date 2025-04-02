import OpenAI from 'openai';
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { logger } from './logging.js';

// Define the expected JSON structure from the LLM
interface CoherenceRatingResponse {
    rating: number;
}

/**
 * Utility class for checking text coherence using an LLM.
 * Handles API client initialization and interaction based on environment variables.
 */
export class CoherenceCheckerUtil {
    private static instance: CoherenceCheckerUtil | null = null;
    private openai: OpenAI | null = null;
    private model: string;
    private enabled: boolean;
    private readonly defaultScore = 0.7; // Neutral score fallback

    private constructor() {
        const apiKey = process.env['COHERENCE_API_KEY'];
        const modelName = process.env['COHERENCE_CHECK_MODEL'];
        const baseURL = process.env['COHERENCE_API_BASE']; // Optional base URL
        const referer = process.env['COHERENCE_HTTP_REFERER']; // Optional Referer Header
        const title = process.env['COHERENCE_X_TITLE']; // Optional Title Header

        this.enabled = !!(apiKey && modelName); // Enable only if key and model are set

        if (this.enabled) {
            this.model = modelName!; // Assert non-null as enabled is true
            try {
                const defaultHeaders: Record<string, string> = {};
                if (referer) {
                    defaultHeaders['HTTP-Referer'] = referer;
                }
                if (title) {
                    defaultHeaders['X-Title'] = title;
                }

                this.openai = new OpenAI({
                    apiKey: apiKey,
                    baseURL: baseURL, // If undefined, the library uses the default OpenAI URL
                    defaultHeaders: Object.keys(defaultHeaders).length > 0 ? defaultHeaders : undefined,
                });
                // CHANGE 1: logger.info with context
                logger.info('LLM Coherence Checker enabled', { model: this.model, endpoint: baseURL || 'Default OpenAI' });
                if (Object.keys(defaultHeaders).length > 0) {
                    // CHANGE 2: logger.info with context
                    logger.info('Using default headers', { headers: defaultHeaders });
                }
            } catch (error) {
                // CHANGE 3: logger.error with error object
                logger.error('Failed to initialize OpenAI client for coherence check', error);
                this.openai = null;
                this.enabled = false; // Disable if client fails to init
            }
        } else {
            this.model = 'N/A'; // Set a default value when disabled
            // CHANGE 4: logger.info without context (no change needed in signature)
            logger.info('LLM Coherence Checker disabled (COHERENCE_API_KEY or COHERENCE_CHECK_MODEL not set).');
        }
    }

    /**
     * Gets the singleton instance of CoherenceCheckerUtil.
     */
    public static getInstance(): CoherenceCheckerUtil {
        if (!CoherenceCheckerUtil.instance) {
            CoherenceCheckerUtil.instance = new CoherenceCheckerUtil();
        }
        return CoherenceCheckerUtil.instance;
    }

    /**
     * Checks the coherence of the given text using the configured LLM.
     * Returns a normalized score (0-1) or the default score if disabled or on error.
     * @param text The text to evaluate.
     * @returns A promise resolving to the coherence score (0-1).
     */
    public async checkCoherence(text: string): Promise<number> {
        if (!this.enabled || !this.openai || !text) {
            // Return default score if disabled, client failed init, or no text
            return this.defaultScore;
        }

        const prompt = this.formatPrompt(text);
        const schema = {
            name: "coherence_rating",
            strict: true,
            schema: {
                type: "object",
                properties: {
                    rating: {
                        type: "number",
                        description: "Coherence rating from 1 to 5.",
                        minimum: 1,
                        maximum: 5
                    }
                },
                required: ["rating"],
                additionalProperties: false
            }
        };

        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_schema", json_schema: schema }, // Restored this line
                temperature: 0.2, // Low temperature for deterministic rating
                max_tokens: 50, // Should only need a few tokens for the JSON
            });

            // +++ Add check for choices array +++
            if (!response.choices || response.choices.length === 0) {
                // CHANGE 5: logger.info with context (stringified response)
                logger.info('LLM coherence check raw response', { response: JSON.stringify(response) });
                // CHANGE 6: logger.warn with context
                logger.warn('LLM coherence check response missing choices array. Using default score.', { response });
                return this.defaultScore;
            }
            // +++ End check +++

            const content = response.choices[0]?.message?.content;
            if (!content) {
                // CHANGE 7: logger.warn without context
                logger.warn('LLM coherence check returned null/empty content in message. Using default score.');
                return this.defaultScore;
            }

            try {
                const parsed = JSON.parse(content) as Partial<CoherenceRatingResponse>;
                if (typeof parsed.rating === 'number' && parsed.rating >= 1 && parsed.rating <= 5) {
                    // Normalize 1-5 rating to 0-1 scale
                    const normalizedScore = (parsed.rating - 1) / 4;
                    // CHANGE 8: logger.debug with context
                    logger.debug('LLM Coherence Check successful', { rating: parsed.rating, normalizedScore });
                    return normalizedScore;
                } else {
                    // CHANGE 9: logger.warn with context
                    logger.warn('LLM coherence check returned invalid rating. Using default score.', { rating: parsed.rating });
                    return this.defaultScore;
                }
            } catch (parseError) {
                // CHANGE 10: logger.warn with context and error object (Corrected: error goes in context)
                logger.warn('LLM coherence check failed to parse JSON response. Using default score.', { responseContent: content, error: parseError instanceof Error ? { message: parseError.message, stack: parseError.stack } : parseError });
                return this.defaultScore;
            }

        } catch (apiError: unknown) { // Catch as unknown
            // Log the full error object structure if possible
            let errorDetails: any = { message: 'Unknown API error structure' };
            if (apiError instanceof Error) {
                errorDetails = {
                    message: apiError.message,
                    name: apiError.name,
                    stack: apiError.stack,
                    // Attempt to log OpenAI specific details if available
                    status: (apiError as any)?.status,
                    code: (apiError as any)?.code,
                    type: (apiError as any)?.type,
                };
            } else if (typeof apiError === 'object' && apiError !== null) {
                errorDetails = apiError; // Log the object directly if not an Error instance
            } else {
                errorDetails = { message: String(apiError) };
            }
            // CHANGE 11: logger.error with context (errorDetails is already structured)
            logger.error('LLM coherence check API call failed. Using default score.', apiError, { errorDetails });
            return this.defaultScore;
        }
    }

    /**
     * Formats the prompt for the coherence checking LLM.
     * @param textToEvaluate The text to be evaluated.
     * @returns The formatted prompt string.
     */
    private formatPrompt(textToEvaluate: string): string {
        // Using template literals for clarity
        return `
You are an expert evaluator focusing solely on text structure and flow.
Analyze the following text ONLY for its logical coherence and internal consistency.
Ignore grammar, style, and factual accuracy.
Does the reasoning follow a logical path? Are there internal contradictions?

Rate the coherence on a scale of 1 to 5, where:
1 = Completely incoherent, illogical, or contradictory.
3 = Moderately coherent, some logical gaps or awkward transitions.
5 = Highly coherent, clear logical flow, internally consistent.

Respond ONLY with a valid JSON object containing a single key "rating" with the numerical value (1-5). Example: {"rating": 4}

Text to evaluate:
>>>
${textToEvaluate}
>>>

JSON Response:
        `.trim(); // Trim whitespace
    }
}
