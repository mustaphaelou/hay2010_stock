export interface PaginationParams {
    page?: number
    limit?: number
}

export interface PaginationMeta {
    total: number
    page: number
    limit: number
    totalPages: number
}

export interface PaginatedResult<T> {
    data: T[]
    meta: PaginationMeta
}

export function calculatePagination(params: PaginationParams): { skip: number; limit: number } {
    const page = Math.max(1, params.page || 1)
    const limit = Math.min(100, Math.max(1, params.limit || 50))
    const skip = (page - 1) * limit
    return { skip, limit }
}

export function createPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
    return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    }
}

export function createEmptyResult<T>(page: number = 1, limit: number = 50, error?: string): PaginatedResult<T> & { error?: string } {
    return {
        data: [],
        meta: createPaginationMeta(0, page, limit),
        ...(error && { error })
    }
}
