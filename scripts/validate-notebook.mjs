import { readFileSync } from "node:fs";
import { validateRoadmap } from "../public/roadmap.mjs";

try {
  validateRoadmap(JSON.parse(readFileSync("public/data/roadmap.json", "utf8")));
  console.log("Public notebook data validation passed.");
} catch (error) {
  console.error(`Notebook validation failed: ${error.message}`);
  process.exitCode = 1;
}
