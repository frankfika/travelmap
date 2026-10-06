// Run: npx esbuild scripts/parser-check.ts --bundle --platform=node --define:import.meta.env={} --log-level=error | node
import { parseLocal } from "@/lib/aiParser";
import assert from "node:assert/strict";

const now = new Date(2026, 9, 3); // 2026-10-03
const names = (t: string) => parseLocal(t, now).cities.map((c) => c.name);

assert.deepEqual(names("我去年去了成都和东京"), ["成都", "东京"]);
assert.equal(parseLocal("我去年去了成都和东京", now).dateStart, "2025-01-01");
assert.deepEqual(names("Tokyo 2024"), ["Tokyo"]);
assert.equal(parseLocal("Tokyo 2024", now).dateStart, "2024-01-01");
assert.equal(parseLocal("成都，2024 年春天", now).dateStart, "2024-03-01");
assert.equal(parseLocal("上个月去上海出差", now).dateStart, "2026-09-01");
assert.equal(parseLocal("上个月去上海出差", now).kind, "business");
assert.equal(parseLocal("长春探亲", now).kind, "home");
assert.equal(parseLocal("长春探亲", now).dateStart, "2026-10-03"); // 长春's 春 is not spring
assert.equal(parseLocal("went to New York and Paris in march 2023", now).dateStart, "2023-03-01");
assert.deepEqual(names("went to New York and Paris in march 2023"), ["New York", "Paris"]);
assert.equal(parseLocal("Kyoto 2024-05", now).dateStart, "2024-05-01");
assert.equal(parseLocal("北京 2024-03-15 到 2024-03-20", now).dateEnd, "2024-03-20");
console.log("parser ok");
