import { PostgrestFilterBuilder } from '@supabase/postgrest-js'

/**
 * Fetch all rows from a Supabase query by paginating automatically
 * @param query The initial Supabase query
 * @param pageSize Number of rows per page (default 1000)
 */
export async function fetchAllRows<T>(
    query: PostgrestFilterBuilder<any, any, T[]>,
    pageSize: number = 1000
): Promise<T[]> {
    let allData: T[] = []
    let from = 0
    let hasMore = true

    while (hasMore) {
        const { data, error } = await query.range(from, from + pageSize - 1)

        if (error) {
            console.error('Error in fetchAllRows:', error)
            throw error
        }

        if (data && data.length > 0) {
            allData = allData.concat(data as T[])
            from += pageSize
            hasMore = data.length === pageSize
        } else {
            hasMore = false
        }
    }

    return allData
}
