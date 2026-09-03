/* Verificación integral del estado canónico, validadores e índices. */

"use strict";

const fixtureDb = db.getSiblingDB("fixture2030");

function duplicateGroups(collection, field) {
  return collection.aggregate([
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: "total" }
  ]).toArray()[0]?.total ?? 0;
}

function assertZero(value, name) {
  if (value !== 0) {
    throw new Error(`${name}: se esperaba 0 y se obtuvo ${value}.`);
  }
}

const counts = {
  teams: fixtureDb.equipos.countDocuments({}),
  players: fixtureDb.jugadores.countDocuments({})
};

const duplicates = {
  equipoId: duplicateGroups(fixtureDb.equipos, "equipoId"),
  codigoEquipo: duplicateGroups(fixtureDb.equipos, "codigo"),
  jugadorId: duplicateGroups(fixtureDb.jugadores, "jugadorId"),
  camisetaPorEquipo: fixtureDb.jugadores.aggregate([
    { $group: { _id: { equipoId: "$equipoId", numeroCamiseta: "$numeroCamiseta" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: "total" }
  ]).toArray()[0]?.total ?? 0
};

const orphanPlayers = fixtureDb.jugadores.aggregate([
  {
    $lookup: {
      from: "equipos",
      localField: "equipoId",
      foreignField: "equipoId",
      as: "equipo"
    }
  },
  { $match: { equipo: { $size: 0 } } },
  { $count: "total" }
]).toArray()[0]?.total ?? 0;

const teamsWithWrongRosterSize = fixtureDb.equipos.aggregate([
  {
    $lookup: {
      from: "jugadores",
      localField: "equipoId",
      foreignField: "equipoId",
      as: "plantel"
    }
  },
  { $project: { _id: 0, equipoId: 1, cantidad: { $size: "$plantel" } } },
  { $match: { cantidad: { $ne: 24 } } },
  { $count: "total" }
]).toArray()[0]?.total ?? 0;

const missingCriticalFields = {
  teams: fixtureDb.equipos.countDocuments({
    $or: [
      { equipoId: { $exists: false } },
      { codigo: { $exists: false } },
      { nombre: { $exists: false } },
      { confederacion: { $exists: false } },
      { rankingReferencia: { $exists: false } }
    ]
  }),
  players: fixtureDb.jugadores.countDocuments({
    $or: [
      { jugadorId: { $exists: false } },
      { equipoId: { $exists: false } },
      { nombre: { $exists: false } },
      { apellido: { $exists: false } },
      { posicion: { $exists: false } },
      { numeroCamiseta: { $exists: false } }
    ]
  })
};

const validators = fixtureDb.getCollectionInfos({ name: { $in: ["equipos", "jugadores"] } })
  .map((info) => ({
    name: info.name,
    validationLevel: info.options.validationLevel,
    validationAction: info.options.validationAction,
    validator: info.options.validator
  }));

const indexes = {
  teams: fixtureDb.equipos.getIndexes(),
  players: fixtureDb.jugadores.getIndexes()
};

if (counts.teams !== 64) {
  throw new Error(`Se esperaban 64 equipos y se obtuvieron ${counts.teams}.`);
}
if (counts.players !== 1536) {
  throw new Error(`Se esperaban 1.536 jugadores y se obtuvieron ${counts.players}.`);
}
Object.entries(duplicates).forEach(([name, value]) => assertZero(value, `duplicados.${name}`));
assertZero(orphanPlayers, "orphanPlayers");
assertZero(teamsWithWrongRosterSize, "teamsWithWrongRosterSize");
assertZero(missingCriticalFields.teams, "missingCriticalFields.teams");
assertZero(missingCriticalFields.players, "missingCriticalFields.players");
if (validators.length !== 2 || validators.some((item) => item.validationLevel !== "strict" || item.validationAction !== "error")) {
  throw new Error("Los validadores estrictos no están instalados en ambas colecciones.");
}

print(EJSON.stringify({
  script: "07_verify_integrity.js",
  counts,
  duplicates,
  orphanPlayers,
  teamsWithWrongRosterSize,
  missingCriticalFields,
  validators,
  indexes,
  status: "OK"
}, null, 2));
