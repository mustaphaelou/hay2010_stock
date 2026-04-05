import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

async function createDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    console.error('Set it in .env file or export it:');
    console.error('  export DATABASE_URL="postgresql://user:password@host:5432/postgres"');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl
  });

  try {
    await client.connect();
    const dbName = process.env.POSTGRES_DB || 'hay2010_db';
    const res = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database ${dbName} created successfully.`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }
  } catch (err) {
    console.error('Error creating database:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDb();
