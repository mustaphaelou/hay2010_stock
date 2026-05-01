import { NextResponse } from 'next/server'

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <title>HAY2010 Stock API - Documentation</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <!-- Define the API document URL for Scalar to fetch -->
    <script id="api-reference" data-url="/api/v1/openapi.json"></script>
    
    <!-- Load Scalar UI script -->
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
