import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';
import { DraftData } from '../types/chainOfDraft.js'; // Assuming DraftData is the correct type
import { logger } from '../utils/index.js';

// Default path relative to project root
const DEFAULT_DB_PATH = 'data/mcp-thought-server.sqlite';

export class StorageService {
    private dbPath: string;
    private db: Awaited<ReturnType<typeof open>> | null = null;

    constructor() {
        const envPath = process.env.MCP_SQLITE_PATH;
        if (!envPath) {
            // Corrected logger.warn
            logger.warn('MCP_SQLITE_PATH environment variable not set. Using default path.', { defaultPath: DEFAULT_DB_PATH });
            this.dbPath = path.resolve(process.cwd(), DEFAULT_DB_PATH);
        } else {
            // Resolve relative to CWD if not absolute
            this.dbPath = path.resolve(process.cwd(), envPath);
        }
        // Corrected logger.info
        logger.info('StorageService configured', { dbPath: this.dbPath });
    }

    /**
     * Initializes the database connection and creates tables if they don't exist.
     * Must be called before other methods.
     */
    public async initialize(): Promise<void> {
        try {
            // Ensure the directory exists
            const dir = path.dirname(this.dbPath);
            await fs.mkdir(dir, { recursive: true });
            // Corrected logger.debug
            logger.debug('Ensured directory exists', { directory: dir });

            // Open the database connection
            this.db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });
            // Corrected logger.info
            logger.info('SQLite database connected successfully', { dbPath: this.dbPath });

            // Create the drafts table if it doesn't exist
            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS drafts (
                    sessionId TEXT NOT NULL,
                    draftNumber INTEGER NOT NULL,
                    jsonData TEXT NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (sessionId, draftNumber)
                );
            `);
            // Consider adding indexes later if performance becomes an issue
            // await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_drafts_session ON drafts (sessionId);`);
            // Corrected logger.info
            logger.info("Table 'drafts' initialized successfully.");

        } catch (error) {
            // Corrected logger.error
            logger.error('Failed to initialize database', error, { dbPath: this.dbPath });
            throw error; // Re-throw to prevent service usage without DB
        }
    }

    private ensureDbConnected(): NonNullable<typeof this.db> {
        if (!this.db) {
            // This error should ideally use the logger too, but it might happen before logger is fully reliable
            // Or if the logger itself depends on something that failed during init.
            // Throwing a standard Error here is acceptable.
            throw new Error("Database not initialized. Call initialize() first.");
        }
        return this.db;
    }

    /**
     * Saves or replaces a draft for a given session.
     */
    public async setDraft(sessionId: string, draft: DraftData): Promise<void> {
        const db = this.ensureDbConnected();
        const jsonData = JSON.stringify(draft);
        try {
            // Use INSERT OR REPLACE to handle both new drafts and updates
            await db.run(
                `INSERT OR REPLACE INTO drafts (sessionId, draftNumber, jsonData) VALUES (?, ?, ?)`,
                sessionId,
                draft.draftNumber,
                jsonData
            );
            // Corrected logger.debug
            logger.debug('Draft saved successfully', { sessionId, draftNumber: draft.draftNumber });
        } catch (error) {
            // Corrected logger.error
            logger.error('Failed to save draft', error, { sessionId, draftNumber: draft.draftNumber });
            throw error;
        }
    }

    /**
     * Retrieves a specific draft for a given session.
     */
    public async getDraft(sessionId: string, draftNumber: number): Promise<DraftData | undefined> {
        const db = this.ensureDbConnected();
        try {
            const row = await db.get<{ jsonData: string }>(
                `SELECT jsonData FROM drafts WHERE sessionId = ? AND draftNumber = ?`,
                sessionId,
                draftNumber
            );

            if (row) {
                // Corrected logger.debug
                logger.debug('Draft retrieved successfully', { sessionId, draftNumber });
                return JSON.parse(row.jsonData) as DraftData;
            } else {
                // Corrected logger.debug
                logger.debug('Draft not found', { sessionId, draftNumber });
                return undefined;
            }
        } catch (error) {
            // Corrected logger.error
            logger.error('Failed to retrieve draft', error, { sessionId, draftNumber });
            throw error;
        }
    }

    /**
     * Retrieves the most recent drafts for a session, ordered by draft number descending.
     * (Optional - implement if needed for confidence calculations)
     */
    public async getRecentDrafts(sessionId: string, limit: number): Promise<DraftData[]> {
        const db = this.ensureDbConnected();
        try {
            // Cast to unknown then to the expected array type
            const rows = (await db.all<{ jsonData: string }>(
                `SELECT jsonData FROM drafts WHERE sessionId = ? ORDER BY draftNumber DESC LIMIT ?`,
                sessionId,
                limit
            )) as unknown as Array<{ jsonData: string }>; // Force cast

            // Corrected logger.debug
            logger.debug('Retrieved recent drafts', { sessionId, count: rows.length, limit });
            // Type assertion for row in map should be okay now
            return rows.map((row: { jsonData: string }) => JSON.parse(row.jsonData) as DraftData);
        } catch (error) {
            // Corrected logger.error
            logger.error('Failed to retrieve recent drafts', error, { sessionId, limit });
            throw error;
        }
    }

    /**
     * Closes the database connection.
     */
    public async close(): Promise<void> {
        if (this.db) {
            try {
                await this.db.close();
                this.db = null;
                // Corrected logger.info
                logger.info('SQLite database connection closed', { dbPath: this.dbPath });
            } catch (error) {
                // Corrected logger.error
                logger.error('Failed to close database connection', error, { dbPath: this.dbPath });
                throw error;
            }
        }
    }

    // Potential future methods:
    // async deleteDraft(sessionId: string, draftNumber: number): Promise<void> { ... }
    // async deleteSession(sessionId: string): Promise<void> { ... }
    // async cleanupOldSessions(maxAgeInDays: number): Promise<void> { ... }
}
