import assert from "node:assert/strict";
import test from "node:test";
import { NAV_ITEMS, navItemsForPath } from "@/components/layout/nav-items";

test("operational navigation and destinations are preserved", () => {
  assert.equal(navItemsForPath("/mission"), NAV_ITEMS);
  assert.deepEqual(navItemsForPath("/").map((item) => item.href), NAV_ITEMS.map((item) => item.href));
});

test("simulation navigation mirrors LIMEN's operational groups without exposing fake sync", () => {
  const items = navItemsForPath("/simulation/mission");
  const routeByLabel = new Map(items.map((item) => [item.label, item.href]));
  assert.equal(routeByLabel.get("Mission overview"), "/simulation/mission");
  assert.equal(routeByLabel.get("Mission contexts"), "/simulation/contexts");
  assert.equal(routeByLabel.get("Sensorimotor assessment"), "/simulation/assessments");
  assert.equal(routeByLabel.get("Personal trends"), "/simulation/trends");
  assert.equal(routeByLabel.get("Signal Concordance"), "/simulation/concordance");
  assert.equal(routeByLabel.get("NASA OSDR explorer"), "/simulation/osdr");
  assert.equal(routeByLabel.get("Astronaut profiles"), "/simulation");
  assert.ok(!items.some((item) => /sync/i.test(item.label) || item.href.includes("/sync")));
  assert.ok(!items.some((item) => item.href === "/privacy"));
});
