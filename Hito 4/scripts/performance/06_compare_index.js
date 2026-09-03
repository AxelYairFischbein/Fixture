/*
 * Comparación reproducible: elimina y recrea únicamente un índice no esencial.
 * Los índices únicos y de integridad nunca se quitan.
 */

"use strict";

const fixtureDb = db.getSiblingDB("fixture2030");
const collection = fixtureDb.jugadores;
const INDEX_NAME = "idx_jugadores_nacionalidad_altura";
const filter = { nacionalidadCodigo: "F01", alturaCm: { $gte: 180 } };
const projection = { _id: 0, jugadorId: 1, apellido: 1, alturaCm: 1 };
const sort = { alturaCm: -1, jugadorId: 1 };

function planStages(value, result = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => planStages(item, result));
  } else if (value && typeof value === "object") {
    if (typeof value.stage === "string") {
      result.push(value.stage);
    }
    Object.values(value).forEach((item) => planStages(item, result));
  }
  return [...new Set(result)];
}

function summarize(explainResult) {
  const winningPlan = explainResult.queryPlanner.winningPlan;
  return {
    winningPlanRootStage: winningPlan.stage ?? winningPlan.queryPlan?.stage ?? "SBE_OR_OTHER",
    winningPlanStages: planStages(winningPlan),
    nReturned: explainResult.executionStats.nReturned,
    totalDocsExamined: explainResult.executionStats.totalDocsExamined,
    totalKeysExamined: explainResult.executionStats.totalKeysExamined,
    executionTimeMillis: explainResult.executionStats.executionTimeMillis,
    indexesUsed: winningPlan.indexName
      ? [winningPlan.indexName]
      : [...new Set((EJSON.stringify(winningPlan).match(/idx_[A-Za-z0-9_]+/g) ?? []))]
  };
}

if (collection.getIndexes().some((index) => index.name === INDEX_NAME)) {
  collection.dropIndex(INDEX_NAME);
}

const beforeExplain = collection.find(filter, projection).sort(sort).explain("executionStats");
const before = summarize(beforeExplain);

const createdIndex = collection.createIndex(
  { nacionalidadCodigo: 1, alturaCm: -1, jugadorId: 1 },
  { name: INDEX_NAME }
);

const afterExplain = collection.find(filter, projection).sort(sort).explain("executionStats");
const after = summarize(afterExplain);

if (!before.winningPlanStages.includes("COLLSCAN")) {
  throw new Error(`La medición previa no produjo COLLSCAN: ${EJSON.stringify(before)}`);
}
if (!after.winningPlanStages.includes("IXSCAN")) {
  throw new Error(`La medición posterior no produjo IXSCAN: ${EJSON.stringify(after)}`);
}
if (before.nReturned !== after.nReturned) {
  throw new Error("La consulta no devolvió la misma cantidad antes y después del índice.");
}

print(EJSON.stringify({
  script: "06_compare_index.js",
  objective: "Filtrar jugadores por nacionalidad y altura con orden estable.",
  collection: "jugadores",
  filter,
  returnedFields: Object.keys(projection).filter((field) => projection[field] === 1),
  sort,
  performanceIndex: {
    name: createdIndex,
    key: { nacionalidadCodigo: 1, alturaCm: -1, jugadorId: 1 },
    essentialForIntegrity: false
  },
  before,
  after,
  observedDifference: {
    docsExaminedReduction: before.totalDocsExamined - after.totalDocsExamined,
    keysExaminedIncrease: after.totalKeysExamined - before.totalKeysExamined
  },
  status: "OK"
}, null, 2));
