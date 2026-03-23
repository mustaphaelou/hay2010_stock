const { Client } = require('pg');

async function createDb() {
    const client = new Client({
        connectionString: 'postgresql://postgres:o0UY4XeESKjZwilUBAGmfST01uhw3u24TWWbNPTSmaLtIQoliOCkaqVxACvfUDoP@130.110.247.238:5432/postgres'
    });

    try {
        await client.connect();
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname='hay2010_db'");
        if (res.rowCount === 0) {
            await client.query('CREATE DATABASE hay2010_db');
            console.log('Database hay2010_db created successfully.');
        } else {
            console.log('Database hay2010_db already exists.');
        }
    } catch (err) {
        console.error('Error creating database:', err);
    } finally {
        await client.end();
    }
}

createDb();
