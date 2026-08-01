// One-shot: remove the hardcoded Vercel insights <script> from every HTML page
// (analytics is now consent-gated in js/shell.js) and bump all ?v= cache stamps to 66.
// Deterministic + self-verifying. Safe to re-run (idempotent).
import { readFileSync, writeFileSync } from "node:fs";

const dir = "C:/Users/mikef/cloudskin-v56/";
const pages = ["about", "account", "collection", "creator", "home", "index", "login", "product", "studio"];
const VER = 66;

const insightsRe = /[ \t]*<script\b[^>]*src="\/_vercel\/insights\/script\.js"[^>]*><\/script>\r?\n?/g;
const vRe = /\?v=\d+/g;

const report = [];
for (const name of pages) {
  const f = dir + name + ".html";
  let src = readFileSync(f, "utf8");
  const eol = src.includes("\r\n") ? "CRLF" : "LF";
  const insightsRemoved = (src.match(insightsRe) || []).length;
  src = src.replace(insightsRe, "");
  const vBumped = (src.match(vRe) || []).length;
  src = src.replace(vRe, "?v=" + VER);
  writeFileSync(f, src);
  const residualInsights = (src.match(/_vercel\/insights/g) || []).length;
  const residualNon66 = (src.match(/\?v=(?!66\b)\d+/g) || []).length;
  report.push({ file: name + ".html", eol, insightsRemoved, vBumped, residualInsights, residualNon66 });
}
console.table(report);
const rI = report.reduce((a, b) => a + b.residualInsights, 0);
const rV = report.reduce((a, b) => a + b.residualNon66, 0);
const bumped = report.reduce((a, b) => a + b.vBumped, 0);
const removed = report.reduce((a, b) => a + b.insightsRemoved, 0);
console.log(`\nTOTAL insights removed: ${removed} | ?v bumped: ${bumped} | residual insights: ${rI} | residual non-66 ?v: ${rV}`);
console.log(rI === 0 && rV === 0 ? "OK: clean" : "FAIL: residuals remain");
