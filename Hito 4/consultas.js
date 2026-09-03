const { MongoClient } = require('mongodb');

const uri = "mongodb://admin:password123@localhost:27017";
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const db = client.db('fixture2030');
        const equiposColl = db.collection('equipos');
        const jugadoresColl = db.collection('jugadores');

        console.log("========================================");
        console.log("EJECUCIÓN DE CONSULTAS - HITO 4");
        console.log("========================================\n");

        // 1. Inserción
        console.log("--- 1. Inserción (Equipo y Jugador Nuevo) ---");
        const nuevoEquipo = { id_equipo: "NUEVO1", nombre: "Selección Invitada", cantidad_jugadores: 1 };
        await equiposColl.updateOne({ id_equipo: "NUEVO1" }, { $set: nuevoEquipo }, { upsert: true });
        
        const nuevoJugador = { id_jugador: "JUG9999", id_equipo: "NUEVO1", nombre: "Jugador Test", posicion: "Delantero", dorsal: 9, estadisticas: { goles: 0 } };
        await jugadoresColl.updateOne({ id_jugador: "JUG9999" }, { $set: nuevoJugador }, { upsert: true });
        console.log("-> Se insertó correctamente el equipo 'NUEVO1' y el jugador 'JUG9999'.");

        // 1.b Prueba de validación: inserción de un documento invalido (RF7)
        console.log("\n--- 1.b Prueba de validación (jugador sin campos críticos) ---");
        try {
            await jugadoresColl.insertOne({ id_jugador: "JUG_INVALIDO", nombre: "Sin Posicion Ni Dorsal" });
            console.log("-> ERROR: el documento invalido se insertó (la validación no está funcionando).");
        } catch (e) {
            console.log(`-> Insercion rechazada correctamente por $jsonSchema. Codigo: ${e.code}, Motivo: ${e.errInfo ? JSON.stringify(e.errInfo.details) : e.message}`);
        }

        // 2. Recuperación por identificador
        console.log("\n--- 2. Recuperación por Identificador ---");
        const equipoBuscado = await equiposColl.findOne({ id_equipo: "ARG" });
        console.log("-> Equipo encontrado:", equipoBuscado ? equipoBuscado.nombre : "No encontrado");
        
        const jugadorBuscado = await jugadoresColl.findOne({ id_jugador: "ARG-001" });
        console.log("-> Jugador encontrado:", jugadorBuscado ? jugadorBuscado.nombre : "No encontrado");

        // 3. Recuperación filtrada
        console.log("\n--- 3. Recuperación Filtrada (Mediocampistas de ARG) ---");
        const mediocampistas = await jugadoresColl.find({ id_equipo: "ARG", posicion: "Mediocampista" }).toArray();
        console.log(`-> Se encontraron ${mediocampistas.length} mediocampistas en el equipo ARG.`);

        // 4. Proyección
        console.log("\n--- 4. Proyección (Solo atributos necesarios) ---");
        const proyeccion = await jugadoresColl.find({ id_equipo: "ARG" }, { projection: { _id: 0, nombre: 1, dorsal: 1 } }).limit(3).toArray();
        console.log("-> Jugadores (solo nombre y dorsal):", proyeccion);

        // 5. Ordenamiento y Paginación
        console.log("\n--- 5. Ordenamiento y Paginación (Goleadores, pagina 1) ---");
        const pagina1 = await jugadoresColl.find().sort({ "estadisticas.goles": -1 }).skip(0).limit(3).toArray();
        pagina1.forEach((j, i) => console.log(`   ${i+1}. ${j.nombre} (${j.estadisticas.goles} goles)`));

        console.log("\n--- 5.b Ordenamiento y Paginación (Goleadores, pagina 2) ---");
        const pagina2 = await jugadoresColl.find().sort({ "estadisticas.goles": -1 }).skip(3).limit(3).toArray();
        pagina2.forEach((j, i) => console.log(`   ${i+4}. ${j.nombre} (${j.estadisticas.goles} goles)`));

        // 6. Actualización
        console.log("\n--- 6. Actualización ---");
        await jugadoresColl.updateOne({ id_jugador: "JUG9999" }, { $inc: { "estadisticas.goles": 1 } });
        console.log("-> Se actualizó sumando 1 gol al jugador JUG9999.");

        await equiposColl.updateOne({ id_equipo: "ARG" }, { $set: { sede_concentracion: "Buenos Aires, Argentina (actualizado)" } });
        console.log("-> Se actualizó la sede de concentración del equipo ARG (sin tocar sus jugadores).");

        // 7. Agregación
        console.log("\n--- 7. Agregación (Goles Totales por Equipo) ---");
        const pipeline = [
            {
                $group: {
                    _id: "$id_equipo",
                    totalGoles: { $sum: "$estadisticas.goles" }
                }
            },
            { $sort: { totalGoles: -1 } },
            { $limit: 3 }
        ];
        const statsEquipos = await jugadoresColl.aggregate(pipeline).toArray();
        console.log("-> Top 3 Equipos con más goles acumulados:", statsEquipos);

    } finally {
        await client.close();
    }
}
run().catch(console.dir);