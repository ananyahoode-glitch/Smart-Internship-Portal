const { Client } = require("pg");
const dotenv = require("dotenv");
const path = require("path");

// Load env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

async function setup() {
  const dbUser = process.env.DB_USER || "postgres";
  const dbPassword = process.env.DB_PASSWORD || "bijju@10";
  const dbPort = process.env.DB_PORT || 5432;
  const dbName = process.env.DB_NAME || "internship_portal";

  console.log("Connecting to PostgreSQL to check/create database...");
  
  // Connect to the default 'postgres' database to create the app database
  const client = new Client({
    user: dbUser,
    host: "localhost",
    database: "postgres",
    password: dbPassword,
    port: dbPort,
  });

  try {
    await client.connect();
    
    // Check if database exists
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (res.rowCount === 0) {
      console.log(`Database '${dbName}' does not exist. Creating it...`);
      // CREATE DATABASE cannot run inside a transaction block, pg handles it
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database '${dbName}' created successfully.`);
    } else {
      console.log(`Database '${dbName}' already exists.`);
    }
  } catch (err) {
    console.error("Error setting up database:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  console.log(`Connecting to database '${dbName}' to check/create tables...`);
  // Now connect to the new/existing database
  const dbClient = new Client({
    user: dbUser,
    host: "localhost",
    database: dbName,
    password: dbPassword,
    port: dbPort,
  });

  try {
    await dbClient.connect();

    // Create users table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `;
    await dbClient.query(createTableQuery);
    console.log("Table 'users' is ready (created or already exists).");

  } catch (err) {
    console.error("Error setting up tables:", err.message);
    process.exit(1);
  } finally {
    await dbClient.end();
  }

  console.log("Database setup completed successfully!");
}

setup();
