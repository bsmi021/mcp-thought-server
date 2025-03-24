import { SequentialThoughtData } from "../types";
import chalk from "chalk";

export class SequentialThinkingService {
    private thoughtHistory: SequentialThoughtData[] = [];
    private branches: Record<string, SequentialThoughtData[]> = {};

    public validateData(input: unknown): SequentialThoughtData {
        const data = input as Record<string, unknown>;

        if (!data.thought || typeof data.thought !== 'string') {
            throw new Error('Invalid thought: must be a string');
        }
        if (!data.thoughtNumber || typeof data.thoughtNumber !== 'number') {
            throw new Error('Invalid thoughtNumber: must be a number');
        }
        if (!data.totalThoughts || typeof data.totalThoughts !== 'number') {
            throw new Error('Invalid totalThoughts: must be a number');
        }
        if (typeof data.nextThoughtNeeded !== 'boolean') {
            throw new Error('Invalid nextThoughtNeeded: must be a boolean');
        }

        return {
            thought: data.thought,
            thoughtNumber: data.thoughtNumber,
            totalThoughts: data.totalThoughts,
            nextThoughtNeeded: data.nextThoughtNeeded,
            isRevision: data.isRevision as boolean | undefined,
            revisesThought: data.revisesThought as number | undefined,
            branchFromThought: data.branchFromThought as number | undefined,
            branchId: data.branchId as string | undefined,
            needsMoreThoughts: data.needsMoreThoughts as boolean | undefined,
        };
    }

    private formatThought(thoughtData: SequentialThoughtData): string {
        const { thoughtNumber, totalThoughts, thought, isRevision, revisesThought, branchFromThought, branchId } = thoughtData;

        let prefix = '';
        let context = '';

        if (isRevision) {
            prefix = chalk.yellow('🔄 Revision');
            context = ` (revising thought ${revisesThought})`;
        } else if (branchFromThought) {
            prefix = chalk.green('🌿 Branch');
            context = ` (from thought ${branchFromThought}, ID: ${branchId})`;
        } else {
            prefix = chalk.blue('💭 Thought');
            context = '';
        }

        const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}`;
        const border = '─'.repeat(Math.max(header.length, thought.length) + 4);

        return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │
└${border}┘`;
    }

    public processThought(input: unknown): { content: Array<{ type: string; text: string }>; isError?: boolean } {
        try {
            const validatedInput = this.validateData(input);

            if (validatedInput.thoughtNumber > validatedInput.totalThoughts) {
                validatedInput.totalThoughts = validatedInput.thoughtNumber;
            }

            this.thoughtHistory.push(validatedInput);

            if (validatedInput.branchFromThought && validatedInput.branchId) {
                if (!this.branches[validatedInput.branchId]) {
                    this.branches[validatedInput.branchId] = [];
                }
                this.branches[validatedInput.branchId].push(validatedInput);
            }

            const formattedThought = this.formatThought(validatedInput);
            console.error(formattedThought);

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        thoughtNumber: validatedInput.thoughtNumber,
                        totalThoughts: validatedInput.totalThoughts,
                        nextThoughtNeeded: validatedInput.nextThoughtNeeded,
                        branches: Object.keys(this.branches),
                        thoughtHistoryLength: this.thoughtHistory.length
                    }, null, 2)
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        error: error instanceof Error ? error.message : String(error),
                        status: 'failed'
                    }, null, 2)
                }],
                isError: true
            };
        }
    }
}
