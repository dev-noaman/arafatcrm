export interface Paginated<T> {
    data: T[];
    page: number;
    limit: number;
    total: number;
}
export interface ApiError {
    statusCode: number;
    message: string;
    error: string;
    details?: Record<string, unknown>;
}
