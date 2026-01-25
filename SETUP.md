# HAY2010 ERP Setup Guide

## Environment Configuration

Create a `.env.local` file in the project root with the following variables:

```bash
# Supabase Project URL
# Get this from Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url

# Supabase Anon Key (public key for anonymous access)
# Get this from Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Run the Application

```bash
npm run dev
```

Then visit http://localhost:3000
