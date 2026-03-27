export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-primary"
    >
      Aller au contenu principal
    </a>
  )
}
