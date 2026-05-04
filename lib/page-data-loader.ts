export interface PageDataResult<T> {
  data: T[]
  error: string | null
}

const DEFAULT_ERROR_MESSAGE = "Erreur lors du chargement des données"

export async function loadPageData<T>(
  fetchFn: () => Promise<{ data?: T[]; error?: string }>,
  options?: { errorMessage?: string }
): Promise<PageDataResult<T>> {
  try {
    const result = await fetchFn()
    if (result.error) {
      return { data: result.data ?? [], error: result.error }
    }
    return { data: result.data ?? [], error: null }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : (options?.errorMessage ?? DEFAULT_ERROR_MESSAGE)
    return { data: [], error: message }
  }
}
