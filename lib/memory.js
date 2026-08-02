import { list, put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "missions.json");
const BLOB_PREFIX = "missions/";
const MAX_MISSIONS = 100;

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, "[]\n", "utf8");
  }
}

async function listMissionsFromFs(limit) {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  let missions = [];
  try {
    missions = JSON.parse(raw);
  } catch {
    missions = [];
  }
  if (!Array.isArray(missions)) missions = [];
  return missions
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limit);
}

async function appendMissionToFs(entry) {
  await ensureStore();
  const missions = await listMissionsFromFs(500);
  missions.unshift(entry);
  const trimmed = missions.slice(0, MAX_MISSIONS);
  await fs.writeFile(STORE_PATH, JSON.stringify(trimmed, null, 2) + "\n", "utf8");
  return entry;
}

async function listMissionsFromBlob(limit) {
  const { blobs } = await list({
    prefix: BLOB_PREFIX,
    limit: MAX_MISSIONS,
  });

  const missions = (
    await Promise.all(
      blobs.map(async (blob) => {
        try {
          const res = await fetch(blob.url);
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      })
    )
  ).filter(Boolean);

  return missions
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limit);
}

async function appendMissionToBlob(entry) {
  await put(`${BLOB_PREFIX}${entry.id}.json`, JSON.stringify(entry), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return entry;
}

export async function listMissions(limit = 20) {
  if (hasBlobToken()) return listMissionsFromBlob(limit);
  return listMissionsFromFs(limit);
}

export async function appendMission(mission) {
  const entry = {
    ...mission,
    id: mission.id || `msn_${Date.now()}`,
    createdAt: Date.now(),
  };

  if (hasBlobToken()) return appendMissionToBlob(entry);
  return appendMissionToFs(entry);
}
