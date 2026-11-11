//env.ts
//Reads the settings from the .env file in one place, so the rest of the code uses `env.pert`, `env.moguri` etc.

import dotenv from "dotenv";
dotenv.config({ quiet: true });

//=== STEP 1: read the settings from .env
// All settings (port, database adresss, JWT secret... )are raed from .env here, once, so the rest of the code usesenv.port, env.monogoUri And so on

//Next - STEP 2: ( CONNECT TO MongoDB) -> SEVER/src/confing/database.ts

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri:
    process.env.MONGO_URI ||
    "mongodb+srv://victorpascal00_db_user:yOWK8H8EZJmFdo6z@cluster0.pkjg7ys.mongodb.net/QuickCart",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15d", // "Remain logged in for 15 days"
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
};
