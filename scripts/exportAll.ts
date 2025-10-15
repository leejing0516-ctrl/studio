
import * as fs from "node:fs/promises";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function dumpCollection(colName: string) {
  const snap = await db.collection(colName).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function main() {
  const configMain = (await db.doc("config/main").get()).data() ?? {};
  const [students, teachers, classes] = await Promise.all([
    dumpCollection("students"),
    dumpCollection("teachers"),
    dumpCollection("classes"),
  ]);

  const out = { config: configMain, students, teachers, classes, exportedAt: new Date().toISOString() };
  await fs.writeFile("./export.json", JSON.stringify(out, null, 2), "utf-8");
  console.log("Exported → export.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
