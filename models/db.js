const pg = require('pg');
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/todo';

const client = new pg.Client(connectionString);
client.connect();
const query = client.query(
  'CREATE TABLE session(sid VARCHAR(40) not null PRIMARY KEY, sess JSON not null, expire TIMESTAMP(6) not null)');
query.on('end', () => { client.end(); });
