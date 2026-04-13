import { neon } from '@neondatabase/serverless';

const database = neon(process.env.DATABASE_URL);

export default database;
