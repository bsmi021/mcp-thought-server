export class BaseError extends Error {
    public code: string;
    public status: number;
    public details?: any;
    
    constructor(message: string, code: string, status: number, details?: any) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.status = status;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends BaseError {
    constructor(message: string, details?: any) {
        super(message, 'VALIDATION_ERROR', 400, details);
    }
}

export class EntityNotFoundError extends BaseError {
    constructor(message: string) {
        super(message, 'NOT_FOUND', 404);
    }
}

export class DatabaseError extends BaseError {
    constructor(message: string, details?: any) {
        super(message, 'DATABASE_ERROR', 500, details);
    }
}

export class UnauthorizedError extends BaseError {
    constructor(message: string) {
        super(message, 'UNAUTHORIZED', 401);
    }
}

export class ForbiddenError extends BaseError {
    constructor(message: string) {
        super(message, 'FORBIDDEN', 403);
    }
}
