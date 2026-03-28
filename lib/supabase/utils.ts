// Supabase utility stub - Supabase has been removed from this project
// This file is kept for backward compatibility but will throw an error if used

/**
 * @deprecated Use Prisma client directly from @/lib/db/prisma
 * Prisma supports pagination natively with skip/take
 */
export async function fetchAllRows<T>(
  query: {
    range: (from: number, to: number) => Promise<{ data: T[] | null; error: Error | null }>
  },
  pageSize: number = 1000
): Promise<T[]> {
  throw new Error('Supabase utilities are no longer available. Use Prisma client with skip/take for pagination.')
}
