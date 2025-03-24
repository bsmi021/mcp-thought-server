export interface SequentialThoughtData {
    thought: string;
    thoughtNumber: number;
    totalThoughts: number;
    isRevision?: boolean;
    revisesThought?: number;
    branchFromThought?: number;
    branchId?: string;
    needsMoreThoughts?: boolean;
    nextThoughtNeeded: boolean;
}
