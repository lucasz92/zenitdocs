
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function test() {
    try {
        console.log("Quick check: SELECT * FROM documents LIMIT 0");
        const result = await sql`SELECT * FROM documents LIMIT 0`;
        console.log("Table exists!");
    } catch (err: any) {
        console.log("Error:", err.message);
        if (err.message.includes("does not exist")) {
            console.log("CONFIRMED: Table 'documents' is missing.");
        }
    }
}

test();
