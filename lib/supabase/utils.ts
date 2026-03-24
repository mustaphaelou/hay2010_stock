import { PostgrestFilterBuilder, GenericSchema } from '@supabase/postgrest-js'

/**
* Fetch all rows from a Supabase query by paginating automatically
* @param query The initial Supabase query
* @param pageSize Number of rows per page (default 1000)
*/
export async function fetchAllRows<
  Schema extends GenericSchema,
  Row extends Record<string, unknown>,
  Result
>(
  query: PostgrestFilterBuilder<Schema, Row, Result>,
  pageSize: number = 1000
): Promise<Result[]> {
  let allData: Result[] = []
  let from = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await query.range(from, from + pageSize - 1)

    if (error) {
      console.error('Error in fetchAllRows:', error)
      throw error
    }

    if (data && data.length > 0) {
      allData = allData.concat(data as Result[])
      from += pageSize
      hasMore = data.length === pageSize
    } else {
      hasMore = false
    }
  }

  return allData
}
