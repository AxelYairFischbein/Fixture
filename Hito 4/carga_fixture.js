const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// URI con las credenciales que configuraste en tu contenedor local
const uri = "mongodb://admin:password123@localhost:27017";
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const db = client.db('fixture2030');
        console.log("Conectado exitosamente a MongoDB.");

        // 1. Configuración de validación para Equipos
        await db.command({
            collMod: 'equipos',
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["id_equipo", "nombre", "cantidad_jugadores"],
                    properties: {
                        id_equipo: { bsonType: "string" },
                        nombre: { bsonType: "string" },
                        cantidad_jugadores: { bsonType: "int" }
                    }
                }
            },
            validationLevel: "moderate",
            validationAction: "error"
        }).catch(async (e) => {
            if (e.code === 26) {
                await db.createCollection('equipos');
                await db.command({ collMod: 'equipos', validator: {
                    $jsonSchema: {
                        bsonType: "object",
                        required: ["id_equipo", "nombre", "cantidad_jugadores"],
                        properties: {
                            id_equipo: { bsonType: "string" },
                            nombre: { bsonType: "string" },
                            cantidad_jugadores: { bsonType: "int" }
                        }
                    }
                }, validationLevel: "moderate", validationAction: "error" });
            }
        });

        // 2. Configuración de validación para Jugadores
        await db.command({
            collMod: 'jugadores',
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["id_jugador", "id_equipo", "nombre", "posicion", "dorsal"],
                    properties: {
                        id_jugador: { bsonType: "string" },
                        id_equipo: { bsonType: "string" },
                        nombre: { bsonType: "string" },
                        posicion: { bsonType: "string" },
                        dorsal: { bsonType: "int" }
                    }
                }
            },
            validationLevel: "moderate",
            validationAction: "error"
        }).catch(async (e) => {
            if (e.code === 26) {
                await db.createCollection('jugadores');
                await db.command({ collMod: 'jugadores', validator: {
                    $jsonSchema: {
                        bsonType: "object",
                        required: ["id_jugador", "id_equipo", "nombre", "posicion", "dorsal"],
                        properties: {
                            id_jugador: { bsonType: "string" },
                            id_equipo: { bsonType: "string" },
                            nombre: { bsonType: "string" },
                            posicion: { bsonType: "string" },
                            dorsal: { bsonType: "int" }
                        }
                    }
                }, validationLevel: "moderate", validationAction: "error" });
            }
        });

        // 3. Creación de Índices
        const equiposColl = db.collection('equipos');
        const jugadoresColl = db.collection('jugadores');

        await equiposColl.createIndex({ id_equipo: 1 }, { unique: true });
        await jugadoresColl.createIndex({ id_jugador: 1 }, { unique: true });
        await jugadoresColl.createIndex({ id_equipo: 1 });
        await jugadoresColl.createIndex({ id_equipo: 1, posicion: 1 });
        await jugadoresColl.createIndex({ "estadisticas.goles": -1 });

        // 4. Leer datos del archivo JSON local
        console.log("Leyendo archivo datos_fixture.json...");
        const jsonPath = path.join(__dirname, 'datos_fixture.json');
        
        if (!fs.existsSync(jsonPath)) {
            throw new Error(`No se encontró el archivo de datos en la ruta: ${jsonPath}`);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf-8');
        
        // Destructuración corregida para coincidir con tu archivo JSON
        const { equipos, jugadores } = JSON.parse(rawData);

        if (!equipos || !jugadores) {
            throw new Error("El JSON no contiene las propiedades 'equipos' o 'jugadores'. Verificá la estructura.");
        }

        // Convertir strings de fecha a objetos Date (para mantener el formato correcto en MongoDB)
        jugadores.forEach(jug => {
            if (jug.fecha_nacimiento) {
                jug.fecha_nacimiento = new Date(jug.fecha_nacimiento);
            }
        });

        // 5. Carga de datos mediante bulkWrite (Upsert para evitar duplicados)
        const bulkEquipos = equipos.map(eq => ({
            updateOne: { filter: { id_equipo: eq.id_equipo }, update: { $set: eq }, upsert: true }
        }));
        
        const bulkJugadores = jugadores.map(jug => ({
            updateOne: { filter: { id_jugador: jug.id_jugador }, update: { $set: jug }, upsert: true }
        }));

        console.log("Iniciando carga de equipos en MongoDB...");
        const resEquipos = await equiposColl.bulkWrite(bulkEquipos);
        console.log(`Equipos cargados exitosamente. Operaciones procesadas: ${resEquipos.ok}`);

        console.log("Iniciando carga de jugadores en MongoDB...");
        const resJugadores = await jugadoresColl.bulkWrite(bulkJugadores);
        console.log(`Jugadores cargados exitosamente. Operaciones procesadas: ${resJugadores.ok}`);

        const totalEq = await equiposColl.countDocuments();
        const totalJug = await jugadoresColl.countDocuments();
        console.log(`\n¡Carga finalizada con éxito! Total en BD: ${totalEq} equipos y ${totalJug} jugadores.`);

    } catch (error) {
        console.error("Ocurrió un error durante la carga:", error);
    } finally {
        await client.close();
    }
}

run().catch(console.dir);