# HAY2010 ERP Setup Guide

## Environment Configuration

Create a `.env.local` file in the project root with the following variables:

```bash
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://cuwscwunrusiauvndggt.supabase.co

# Supabase Anon Key (public key for anonymous access)
# Get this from Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1d3Njd3VucnVzaWF1dm5kZ2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1OTI4NzEsImV4cCI6MjA4NDE2ODg3MX0.HNG3cNPir7x9VjpuvPlGriXI9jv-ruY816MIPwIsnOg
```

## Run the Application

```bash
npm run dev
```

Then visit http://localhost:3000
