#!/usr/bin/env node

import { put } from "@vercel/blob";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

function getDatabaseUrl() {
  return (
    process.env.BACKUP_DATABASE_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    null
  );
}

function getPgDumpCommand() {
  return process.env.PG_DUMP_BIN ?? "pg_dump";
}

function formatTimestamp(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`,
        ),
      );
    });
  });
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  const pgDumpCommand = getPgDumpCommand();

  if (!databaseUrl) {
    throw new Error(
      "BACKUP_DATABASE_URL, DATABASE_URL or POSTGRES_PRISMA_URL is required.",
    );
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required.");
  }

  const blobPrefix = (process.env.BACKUP_BLOB_PATH_PREFIX ?? "db-backups").replace(
    /\/+$/,
    "",
  );
  const now = new Date();
  const timestamp = formatTimestamp(now);
  const dumpFilename = `pronos-des-potos-${timestamp}.dump`;
  const blobPath = `${blobPrefix}/${dumpFilename}`;
  const workingDir = await mkdtemp(path.join(tmpdir(), "pronos-db-backup-"));
  const dumpPath = path.join(workingDir, dumpFilename);

  try {
    await runCommand(
      pgDumpCommand,
      [
        "--format=custom",
        "--no-owner",
        "--no-acl",
        `--file=${dumpPath}`,
        `--dbname=${databaseUrl}`,
      ],
      process.env,
    );

    const dump = await readFile(dumpPath);

    const blob = await put(blobPath, dump, {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/octet-stream",
      token,
    });

    console.log(
      JSON.stringify({
        blobPath,
        size: dump.byteLength,
        url: blob.url,
      }),
    );
  } finally {
    await rm(workingDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
