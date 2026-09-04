# Hito 4 - Módulo Documental de Equipos y Jugadores

Grupo 13 - Fixture Mundial 2030. Este directorio contiene un módulo MongoDB local, reproducible y verificable mediante Docker Compose. El conjunto canónico tiene **64 equipos sintéticos** y **1.536 jugadores sintéticos** (24 por equipo). Los datos no representan participantes oficiales del Mundial 2030.

## Requisitos previos

- Docker Desktop o Docker Engine con el complemento Docker Compose.
- Al menos 2 GB libres para imagen, contenedor y volumen.
- PowerShell 5.1+ en Windows o Bash en Linux/macOS para generar todas las evidencias de una vez.
- Puerto `27017` libre, o definir otro valor en `.env`.

MongoDB se ejecuta exclusivamente dentro de Docker. No hace falta instalar el servidor ni `mongosh` en Windows: el contenedor incluye el cliente utilizado por los comandos.

## Estructura

```text
Hito 4/
|-- .env.example
|-- .gitignore
|-- docker-compose.yml
|-- README.md
|-- docs/
|   |-- Catalogo_Consultas.md
|   `-- Grupo_13_Hito_4_Decisiones_Documentales_Fixture2030.md
|-- evidencias/
|   |-- README.md
|   `-- 00...14_*.txt
`-- scripts/
    |-- init/01_collections.js
    |-- validations/02_validators.js
    |-- data/02_seed.js
    |-- indexes/03_indexes.js
    |-- operations/04_demo_crud.js
    |-- queries/05_queries.js
    |-- performance/06_compare_index.js
    `-- verification/
        |-- 07_verify_integrity.js
        |-- 08_test_validation.js
        |-- generar_evidencias.ps1
        `-- generar_evidencias.sh
```

## Variables y credenciales locales

El Compose mantiene los valores locales del archivo original y permite reemplazarlos:

| Variable | Valor predeterminado | Uso |
|---|---:|---|
| `MONGO_PORT` | `27017` | Puerto publicado en la notebook. |
| `MONGO_ROOT_USERNAME` | `admin` | Usuario administrador local. |
| `MONGO_ROOT_PASSWORD` | `password123` | Contraseña local de desarrollo. |

La base queda fijada en `fixture2030`, como exige el hito. Para personalizar puerto o credenciales, copiar `.env.example` como `.env` antes del primer inicio. `.env` está ignorado por Git. Las credenciales predeterminadas son sólo para el laboratorio local y no son adecuadas para producción. Si se cambia el usuario o la contraseña con un volumen ya inicializado, MongoDB no recrea las credenciales; las variables de inicialización se aplican a una base vacía.

## Inicio desde cero

Todos los comandos siguientes se ejecutan dentro de `Hito 4/`.

1. Validar la configuración efectiva:

   ```powershell
   docker compose config
   ```

2. Iniciar MongoDB:

   ```powershell
   docker compose up -d
   ```

3. Esperar a que el estado sea `healthy`:

   ```powershell
   docker compose ps
   ```

4. Comprobar disponibilidad con las credenciales predeterminadas:

   ```powershell
   docker compose exec -T mongodb mongosh --quiet --username admin --password password123 --authenticationDatabase admin fixture2030 --eval "db.adminCommand({ ping: 1 })"
   ```

5. Crear o comprobar las colecciones:

   ```powershell
   docker compose exec -T mongodb mongosh --quiet --username admin --password password123 --authenticationDatabase admin fixture2030 --file /workspace/scripts/init/01_collections.js
   ```

6. Instalar o actualizar los validadores:

   ```powershell
   docker compose exec -T mongodb mongosh --quiet --username admin --password password123 --authenticationDatabase admin fixture2030 --file /workspace/scripts/validations/02_validators.js
   ```

7. Crear los índices:

   ```powershell
   docker compose exec -T mongodb mongosh --quiet --username admin --password password123 --authenticationDatabase admin fixture2030 --file /workspace/scripts/indexes/03_indexes.js
   ```

8. Cargar los datos canónicos:

   ```powershell
   docker compose exec -T mongodb mongosh --quiet --username admin --password password123 --authenticationDatabase admin fixture2030 --file /workspace/scripts/data/02_seed.js
   ```

La primera carga informa `upserted: 64` y `upserted: 1536` sobre colecciones vacías. Las ejecuciones posteriores informan `matched: 64`, `matched: 1536`, `modified: 0` y mantienen los mismos recuentos. No depende de un script de inicialización que se ejecute una única vez al crear el volumen.

Si se personalizaron las credenciales, sustituir `admin` y `password123` en los comandos manuales. Los generadores automáticos de evidencia leen las credenciales efectivas dentro del contenedor.

## Validaciones e integridad

Ejecutar la verificación integral:

```powershell
docker compose exec -T mongodb mongosh --quiet --username admin --password password123 --authenticationDatabase admin fixture2030 --file /workspace/scripts/verification/07_verify_integrity.js
```

El script falla con código distinto de cero salvo que se cumpla todo lo siguiente:

- 64 equipos y 1.536 jugadores;
- cero duplicados de `equipoId`, código de equipo, `jugadorId` y camiseta dentro de un equipo;
- cero jugadores huérfanos;
- 24 jugadores por cada equipo;
- cero campos críticos ausentes;
- validadores con `validationLevel: strict` y `validationAction: error`;
- índices disponibles.

Para demostrar que MongoDB rechaza documentos inválidos sin dejar residuos:

```powershell
docker compose exec -T mongodb mongosh --quiet --username admin --password password123 --authenticationDatabase admin fixture2030 --file /workspace/scripts/verification/08_test_validation.js
```

La relación entre colecciones no es una clave foránea nativa. La carga y la inserción controlada comprueban primero el equipo, y `07_verify_integrity.js` usa `$lookup` para detectar cualquier jugador sin equipo válido.

## Operaciones, consultas y agregaciones

La demostración CRUD inserta un equipo y un jugador temporales, actualiza ambos, comprueba la relación y elimina primero el jugador y luego el equipo. Puede repetirse y siempre restaura el conjunto canónico:

```powershell
docker compose exec -T mongodb mongosh --quiet --username admin --password password123 --authenticationDatabase admin fixture2030 --file /workspace/scripts/operations/04_demo_crud.js
```

Las doce consultas Q01-Q12 incluyen recuperación por identificador, filtros, proyecciones, ordenamiento, paginación, plantel por equipo, dos controles de relación y agregaciones con `$group` y `$lookup`:

```powershell
docker compose exec -T mongodb mongosh --quiet --username admin --password password123 --authenticationDatabase admin fixture2030 --file /workspace/scripts/queries/05_queries.js
```

El contrato funcional de cada operación —colección, filtro, campos, índice y resultado esperado— está en [docs/Catalogo_Consultas.md](docs/Catalogo_Consultas.md).

## Índices y rendimiento

Los índices se pueden volver a crear de forma idempotente con `03_indexes.js`. La comparación controlada elimina y recrea únicamente `idx_jugadores_nacionalidad_altura`; nunca elimina índices únicos:

```powershell
docker compose exec -T mongodb mongosh --quiet --username admin --password password123 --authenticationDatabase admin fixture2030 --file /workspace/scripts/performance/06_compare_index.js
```

En la ejecución registrada, la consulta por `nacionalidadCodigo = F01` y `alturaCm >= 180`, ordenada por altura e identificador, devolvió 15 documentos en ambos casos:

| Métrica | Antes | Después |
|---|---:|---:|
| Etapas | `SORT`, `PROJECTION_SIMPLE`, `COLLSCAN` | `PROJECTION_SIMPLE`, `FETCH`, `IXSCAN` |
| `nReturned` | 15 | 15 |
| `totalDocsExamined` | 1.536 | 15 |
| `totalKeysExamined` | 0 | 15 |
| `executionTimeMillis` | 0 | 0 |

El conjunto local es pequeño, por lo que el tiempo redondeado no permite afirmar una mejora temporal. La evidencia válida es el cambio de plan y la reducción real de 1.521 documentos examinados. El detalle está en `evidencias/11_comparacion_rendimiento_indice.txt`.

## Generar todas las evidencias

Con Docker Desktop/Engine disponible, el siguiente comando reproduce toda la secuencia en Windows:

```powershell
.\scripts\verification\generar_evidencias.ps1
```

En Linux o macOS:

```bash
bash scripts/verification/generar_evidencias.sh
```

El proceso valida Compose, inicia y espera MongoDB, instala validadores e índices, carga dos veces, prueba integridad y rechazos, ejecuta CRUD, consultas y rendimiento, verifica el estado final, reinicia el contenedor sin borrar el volumen y vuelve a comprobar datos e integridad. Las salidas reales se guardan en `evidencias/`.

## Conexión interactiva con mongosh

Dentro del contenedor:

```powershell
docker compose exec mongodb mongosh --username admin --password password123 --authenticationDatabase admin fixture2030
```

Desde un `mongosh` instalado en la notebook:

```powershell
mongosh "mongodb://admin:password123@localhost:27017/fixture2030?authSource=admin"
```

MongoDB Compass puede utilizar la misma URI.

## Detención, reinicio y persistencia

Detener sin eliminar contenedor ni volumen:

```powershell
docker compose stop
```

Volver a iniciar:

```powershell
docker compose start
```

Reiniciar el servicio conservando el volumen:

```powershell
docker compose restart mongodb
```

También se puede ejecutar `docker compose down`; elimina contenedor y red, pero conserva el volumen nombrado. Para comprobar persistencia, ejecutar `07_verify_integrity.js`, reiniciar con el comando anterior y ejecutar otra vez el verificador. La evidencia reproducida en `13_persistencia_despues_reinicio.txt` registra 64 equipos, 1.536 jugadores y cero huérfanos después del reinicio.

> **No ejecutar `docker compose down -v` si se desea conservar la información.** La opción `-v` elimina el volumen persistente.

## Supuestos y limitaciones

- Las fuentes no definen los 64 participantes oficiales de 2030. Por eso todos los equipos y jugadores están marcados con `esDatoSintetico: true` y `origen: sintetico-grupo13-v1`.
- Se eligieron exactamente 1.536 jugadores para mantener continuidad con “más de 1.500” de los hitos previos y obtener 24 por cada uno de los 64 equipos.
- El entorno es un único nodo local. No simula alta disponibilidad, sharding ni despliegue multirregional.
- En una futura arquitectura MongoDB con réplicas, las escrituras oficiales deberían confirmarse por mayoría y las lecturas deberían usar una política coherente con los datos confirmados. Esta es una decisión conceptual pendiente, no una configuración implementada aquí.
- La notación N/R/W se reserva para Cassandra. En MongoDB, las decisiones de consistencia se expresan mediante conceptos propios del motor.
- MongoDB no garantiza por sí solo referencias entre colecciones. Los scripts de escritura y verificación cubren esa integridad dentro del alcance local.
- No se incorporan API REST, interfaz gráfica, Mongo Express, Mongoose ni otros motores: el módulo conserva la responsabilidad documental de equipos y jugadores.
