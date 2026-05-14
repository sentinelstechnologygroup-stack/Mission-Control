import fs from "node:fs";
import path from "node:path";

const repoRoot = "/home/patrick/mission-control";
const nettiePath = path.join(repoRoot, "src/pages/Nettie.jsx");
const bottomStatusPath = path.join(repoRoot, "src/components/mission-control/BottomStatusStrip.jsx");
const sheetPath = path.join(repoRoot, "src/components/ui/sheet.jsx");

const nettie = fs.readFileSync(nettiePath, "utf8");
const bottomStatus = fs.readFileSync(bottomStatusPath, "utf8");
const sheet = fs.readFileSync(sheetPath, "utf8");

const requiredNettieMarkers = [
  'data-nettie="mobile-chat-shell"',
  'data-nettie="mobile-panel-drawer"',
  'data-nettie="mobile-status-pill"',
  'data-nettie="composer-shell"',
  'data-nettie="messages-scroll"',
];

const missing = [];
for (const marker of requiredNettieMarkers) {
  if (!nettie.includes(marker)) missing.push(`Nettie.jsx missing ${marker}`);
}

if (!/overflow-x-hidden/.test(nettie)) {
  missing.push("Nettie.jsx missing overflow-x-hidden protection");
}

if (!/sticky bottom-0/.test(nettie)) {
  missing.push("Nettie.jsx missing sticky composer treatment");
}

if (!/lg:hidden/.test(nettie)) {
  missing.push("Nettie.jsx missing mobile-only controls");
}

if (!/bg-\[#090b0e\]\/98/.test(bottomStatus)) {
  missing.push("BottomStatusStrip.jsx missing near-opaque mobile-safe styling");
}

if (!/bg-black\/95/.test(sheet)) {
  missing.push("sheet.jsx missing near-opaque overlay styling");
}

if (missing.length) {
  console.error("Nettie UI hardening regression checks failed:\n- " + missing.join("\n- "));
  process.exit(1);
}

console.log("Nettie UI hardening regression checks passed");
