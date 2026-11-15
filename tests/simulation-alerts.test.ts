import assert from "node:assert/strict";
import test from "node:test";
import { buildSimulationAlerts } from "@/lib/simulation/alerts";
import { analyzeSimulationScenario } from "@/lib/simulation/analysis";
import { getAsterOneScenario } from "@/lib/simulation/scenario";
import { getClaraReyesScenario } from "@/lib/simulation/clara-scenario";

test("alert rules are deterministic and retain source IDs, timestamps, versions, and limitations", () => {
  const scenario = getAsterOneScenario();
  const analysis = analyzeSimulationScenario(scenario);
  const alerts = buildSimulationAlerts(scenario, analysis);
  assert.deepEqual(buildSimulationAlerts(scenario, analysis), alerts);
  assert.ok(alerts.length >= 1);
  assert.ok(alerts.every((alert) => alert.ruleVersion === "1.0.0" && alert.timestamp && alert.sources.length > 0));
  assert.ok(alerts.every((alert) => alert.sources.every((source) => source.id && source.href && source.timestamp)));
  assert.ok(alerts.some((alert) => alert.ruleId === "SIM-MEASUREMENT-AVAILABILITY" && alert.value === "Not eligible · not zero"));
  assert.ok(alerts.some((alert) => alert.ruleId === "SIM-SELF-REPORT-CHANGE" && alert.previousValue && alert.currentValue));
});

test("the complete Clara fixture does not produce Aster's missing-positioning alert", () => {
  const scenario = getClaraReyesScenario();
  const alerts = buildSimulationAlerts(scenario, analyzeSimulationScenario(scenario));
  assert.ok(alerts.some((alert) => alert.ruleId === "SIM-SELF-REPORT-CHANGE"));
  assert.ok(alerts.every((alert) => alert.ruleId !== "SIM-MEASUREMENT-AVAILABILITY"));
});
