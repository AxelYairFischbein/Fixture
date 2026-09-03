/* Crea las colecciones base sin depender de un volumen vacío. */

"use strict";

const fixtureDb = db.getSiblingDB("fixture2030");

function ensureCollection(name) {
  if (fixtureDb.getCollectionNames().includes(name)) {
    return { collection: name, action: "already_exists" };
  }
  const result = fixtureDb.createCollection(name);
  if (!result.ok) {
    throw new Error(`No se pudo crear ${name}: ${EJSON.stringify(result)}`);
  }
  return { collection: name, action: "created" };
}

print(EJSON.stringify({
  script: "01_collections.js",
  database: fixtureDb.getName(),
  result: [ensureCollection("equipos"), ensureCollection("jugadores")]
}, null, 2));
