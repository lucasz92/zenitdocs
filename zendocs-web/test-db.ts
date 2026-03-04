
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './src/db/schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql, schema });

async function check() {
    try {
        console.log("Checking DB connection and table existence...");
        const result = await db.select().from(schema.documents).limit(1);
        console.log("Success! Table 'documents' exists.");
    } catch (err: any) {
        console.error("Error connecting to DB or table missing:", err.message);
        if (err.message.includes("does not exist")) {
            console.log("SUGGESTION: Run 'npm run db:push' to create the table.");
        }
    }
}

check();
