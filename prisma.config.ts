import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config();

const prismaEnvFile = process.env.PRISMA_ENV_FILE ?? ".env.local";

config({ path: prismaEnvFile, override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
