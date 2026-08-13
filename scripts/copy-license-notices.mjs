import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await Promise.all([
  copyFile("LICENSE", "dist/LICENSE"),
  copyFile("NOTICE", "dist/NOTICE"),
]);

console.log("Copied LICENSE and NOTICE into dist.");
