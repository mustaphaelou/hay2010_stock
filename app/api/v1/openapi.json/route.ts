import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'

export async function GET() {
  try {
    const yamlPath = join(process.cwd(), 'lib/api/openapi.yaml')
    const fileContents = readFileSync(yamlPath, 'utf8')
    const data = yaml.load(fileContents)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error serving OpenAPI JSON:', error)
    return NextResponse.json(
      { error: 'Failed to load OpenAPI specification' }, 
      { status: 500 }
    )
  }
}
