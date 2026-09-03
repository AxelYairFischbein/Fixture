# Módulo Documental — Equipos y Jugadores del Fixture 2030

**Grupo 13 — Integra Consulting**
Hito 4 — Ingeniería de Datos II

Este README permite que cualquier integrante del grupo (o una persona ajena al
grupo) reproduzca el módulo documental completo — ambiente, carga de datos,
consultas y análisis de rendimiento — siguiendo únicamente los pasos
descriptos a continuación (RNF1).

---

## 1. Descripción general

El módulo implementa, sobre MongoDB, las colecciones `equipos` y `jugadores`
del Fixture 2030, vinculadas por referencia (`id_equipo`). Incluye el
ambiente reproducible, la carga inicial de datos, las operaciones de
recuperación/actualización/agregación y la justificación de los índices
mediante `explain()`.

## 2. Estructura de archivos

```
.
├── compose.yml             # Orquestación del contenedor mongodb y su volumen
├── datos_fixture.json      # 64 selecciones nacionales y sus jugadores
├── carga_fixture.js        # Script de carga: validación, índices y upsert idempotente
├── consultas.js             # Recuperación, filtrado, proyección, orden/paginación,
│                            # actualización y agregación
├── evidencia/               # Capturas y salidas de consola de cada paso
└── README.md                # Este archivo
```

## 3. Requisitos previos

| Componente | Versión / detalle |
|---|---|
| Docker Desktop (o Docker Engine + Compose plugin) | Cualquier versión reciente con `docker compose` (v2) |
| Node.js + npm | **Obligatorio.** `carga_fixture.js` y `consultas.js` usan el driver oficial de MongoDB para Node.js — ver Sección 5 |
| `mongosh` | Para verificar la conexión, hacer consultas ad-hoc y correr `explain()` — ver Sección 4 |
| Puerto libre | `27017` en `localhost` |
| Sistema operativo | Windows, macOS o Linux — el módulo es portable (RNF7) |

No se requiere instalar MongoDB de forma local: corre completamente dentro
del contenedor. En la máquina de cada integrante solo se instalan los
clientes: Node.js (para correr los scripts) y `mongosh` (para verificación
y consultas puntuales).

## 4. Instalar `mongosh` en Windows

`mongosh` es el cliente de línea de comandos de MongoDB. Los scripts
`carga_fixture.js` y `consultas.js` **no** se ejecutan con `mongosh` (usan el
driver de Node.js — Sección 5); acá lo usamos para verificar que el
contenedor está disponible (Sección 7), correr consultas puntuales y el
análisis de rendimiento con `explain()` (Sección 10).

### Opción A — Instalador oficial (recomendada)

1. Descargalo desde:
   [https://www.mongodb.com/try/download/shell](https://www.mongodb.com/try/download/shell)
   (elegí **Windows** → paquete `.msi`).
2. Ejecutá el instalador `.msi`. Por defecto agrega `mongosh` al `PATH` del
   sistema.
3. **Cerrá y volvé a abrir PowerShell** (el `PATH` no se actualiza en una
   ventana ya abierta).
4. Verificá la instalación:

   ```powershell
   mongosh --version
   ```

### Opción B — `winget`

```powershell
winget install MongoDB.Shell
```

Igual que con el instalador, hay que **reabrir la terminal** después para
que reconozca el comando.

### Si PowerShell sigue sin reconocer `mongosh`

- Confirmá que la carpeta de instalación (por defecto algo como
  `C:\Program Files\mongosh\`) esté en la variable de entorno `Path` del
  sistema (Panel de control → Sistema → Configuración avanzada → Variables
  de entorno).
- Como alternativa rápida, podés abrir una terminal nueva desde la misma
  carpeta donde quedó instalado el ejecutable, o usar la ruta completa a
  `mongosh.exe` en el comando.

## 5. Instalar la dependencia Node.js (paquete `mongodb`)

`carga_fixture.js` y `consultas.js` están escritos con el driver oficial de
MongoDB para Node.js (`const { MongoClient } = require('mongodb')`), por lo
que **esta instalación es obligatoria** para poder correrlos — no funcionan
con `mongosh --file`.

1. Instalá Node.js LTS (incluye `npm`) desde:
   [https://nodejs.org/](https://nodejs.org/)
   (o con `winget install OpenJS.NodeJS.LTS` en PowerShell). Reabrí la
   terminal después de instalar.

2. Verificá la instalación:

   ```powershell
   node --version
   npm --version
   ```

3. Parado en la carpeta del proyecto (donde está `carga_fixture.js`), inicializá
   el proyecto de Node si todavía no existe un `package.json`:

   ```powershell
   npm init -y
   ```

4. Instalá el driver oficial de MongoDB como dependencia:

   ```powershell
   npm install mongodb
   ```

   Esto crea la carpeta `node_modules/` y agrega `mongodb` a
   `package.json`/`package-lock.json`.

5. Ejecutá los scripts con `node`:

   ```powershell
   node carga_fixture.js
   node consultas.js
   ```

> **Credenciales hardcodeadas en el script:** `carga_fixture.js` define la
> cadena de conexión directamente en el código:
> ```js
> const uri = "mongodb://admin:password123@localhost:27017";
> ```
> Si en algún momento cambian usuario, contraseña o puerto en `compose.yml`
> (Sección 6), tienen que actualizar también esta línea dentro del script —
> a diferencia de los comandos de `mongosh`, acá no se pasa por línea de
> comandos.
>
> **Formato del JSON de entrada:** el script espera que
> `datos_fixture.json` tenga como claves de nivel superior `equiposData` y
> `jugadoresData` (no `equipos`/`jugadores`), ya que hace
> `const { equiposData, jugadoresData } = JSON.parse(rawData);`. Verifiquen
> que el archivo tenga exactamente esos nombres de clave antes de correr la
> carga.

## 6. Variables de entorno / credenciales

Las credenciales del usuario administrador de MongoDB y el nombre de la base
están definidos directamente como variables de entorno dentro de
`compose.yml` (no hace falta un archivo `.env` aparte):

```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: password123
  MONGO_INITDB_DATABASE: fixture2030
```

Con esto, la cadena de conexión que se usa en todos los comandos de este
README es:

```
mongodb://admin:password123@localhost:27017
```

> Si en algún momento cambian usuario, contraseña o puerto en `compose.yml`,
> actualicen esa cadena en los comandos de los pasos siguientes (y, si usan
> la Sección 5, también dentro del script Node.js).

## 7. Levantar el ambiente

1. Ubicate en el directorio raíz del proyecto (donde está `compose.yml`).
2. Iniciá el contenedor y creá el volumen si no existe. La primera vez,
   Docker descarga la imagen `mongodb/mongodb-community-server:8.0-ubi8-slim`:

   ```bash
   docker compose up -d
   ```

3. Verificá que el contenedor esté corriendo:

   ```bash
   docker ps
   ```

   Deberías ver el contenedor `fixture2030-mongodb` en estado `Up`.

4. Revisá los logs para confirmar que el servicio terminó de inicializar:

   ```bash
   docker logs fixture2030-mongodb
   ```

5. Confirmá la conexión con un `ping` a la base:

   ```bash
   mongosh "mongodb://admin:password123@localhost:27017" --eval "db.runCommand({ ping: 1 })"
   ```

   Una respuesta `{ ok: 1 }` confirma que MongoDB está disponible.

   > Guardá la captura de este paso en `evidencia/01_ambiente.png` (o `.txt`
   > con la salida de consola).

## 8. Carga de datos

El script `carga_fixture.js` lee `datos_fixture.json`, aplica las reglas de
validación (`$jsonSchema`, `validationLevel: moderate`), crea las
colecciones e índices definidos en el diseño, y persiste los documentos
mediante `bulkWrite` con `upsert: true` sobre `id_equipo` / `id_jugador`
(evita duplicados si se vuelve a ejecutar — RF8).

1. Colocá `datos_fixture.json` en el mismo directorio que `carga_fixture.js`
   (o ajustá la ruta dentro del script si lo ubicás en otro lugar).

2. Ejecutá la carga con Node.js:

   ```bash
   node carga_fixture.js
   ```

   El propio script deja registro en consola de cada etapa: conexión
   exitosa, configuración de validadores, creación de índices, resultado de
   los `bulkWrite` de equipos y jugadores, y el conteo final de documentos.

3. El script informa al finalizar el conteo de documentos
   insertados/actualizados en cada colección. Verificá el volumen cargado:

   ```bash
   mongosh "mongodb://admin:password123@localhost:27017" --eval "
     db = db.getSiblingDB('fixture2030');
     print('equipos:', db.equipos.countDocuments());
     print('jugadores:', db.jugadores.countDocuments());
   "
   ```

   Se espera `equipos: 64` y `jugadores` ≥ `1000`.

4. **Evidencia de idempotencia:** volvé a ejecutar el mismo comando del
   paso 2 sobre el ambiente ya cargado y repetí la verificación del paso 3.
   El conteo de documentos no debe aumentar.

   > Guardá ambas salidas (primera carga y segunda ejecución) en
   > `evidencia/02_carga.txt`.

## 9. Ejecutar las consultas

`consultas.js` agrupa, en bloques identificados, las operaciones exigidas
por el hito: recuperación por identificador, filtrado, proyección,
ordenamiento y paginación, actualización, e inserción, además del pipeline
de agregación.

```bash
node consultas.js
```

Revisá la salida de consola: cada bloque imprime su objetivo funcional y el
resultado obtenido. Guardá la salida completa (especialmente la del pipeline
de agregación) en `evidencia/03_consultas.txt`.

También podés ejecutar bloques puntuales de forma interactiva, abriendo una
sesión de `mongosh` y pegando el fragmento que te interese:

```bash
mongosh "mongodb://admin:password123@localhost:27017"
```

```js
use fixture2030
db.jugadores.find({ id_equipo: "ARG", posicion: "Delantero" })
```

## 10. Análisis de rendimiento e índices

Para cada índice, el análisis compara el plan de ejecución antes y después
de crearlo, usando `explain("executionStats")`.

1. **Sin índice (referencia):** si querés reproducir el "antes", eliminá
   temporalmente el índice compuesto sobre una copia de prueba de la
   colección, o corré el `explain` contra la colección antes de que
   `carga_fixture.js` cree los índices.

2. **Con índice (estado final del script de carga):**

   ```bash
   mongosh "mongodb://admin:password123@localhost:27017" --eval "
     db = db.getSiblingDB('fixture2030');
     printjson(
       db.jugadores.find({ id_equipo: 'ARG', posicion: 'Delantero' })
         .explain('executionStats')
     );
   "
   ```

   Compará `COLLSCAN` vs `IXSCAN` y la reducción de `totalDocsExamined` /
   `executionTimeMillis` entre ambas corridas.

   > Guardá las dos salidas (`sin índice` y `con índice`) en
   > `evidencia/04_rendimiento.txt`.

## 11. Detener y reiniciar el ambiente

| Acción | Comando | Efecto sobre los datos |
|---|---|---|
| Detener sin perder datos | `docker compose stop` | El volumen se conserva; los datos persisten para el próximo inicio |
| Reanudar | `docker compose start` | Recupera el contenedor con los datos ya cargados |
| Reinicio completo (borrado intencional) | `docker compose down -v` | Elimina el volumen y todos los datos — usar solo a propósito |
| Recargar datos sobre un ambiente ya inicializado | repetir el paso 8.2 | El `upsert` por identificador de negocio evita duplicados |

## 12. Evidencia

Todas las capturas y salidas de consola generadas en los pasos anteriores se
guardan en `evidencia/`, organizadas por paso:

```
evidencia/
├── 01_ambiente.png
├── 02_carga.txt
├── 03_consultas.txt
└── 04_rendimiento.txt
```

## 13. Limitaciones conocidas

- El ambiente local usa un único nodo de MongoDB, sin réplicas ni sharding
  (a diferencia del diseño conceptual distribuido del Hito 3).
- Los jugadores y técnicos del conjunto de datos son sintéticos; los
  equipos corresponden a selecciones reales, pero el plantel no refleja
  convocatorias oficiales del Mundial 2030 (todavía no disputado).
- Este módulo no implementa la proyección de eventos/relaciones de partido
  en Neo4j prevista en el Hito 3; queda fuera de alcance de este hito.
- `carga_fixture.js` y `consultas.js` requieren Node.js y el paquete
  `mongodb` (Sección 5); no son compatibles con `mongosh --file`, ya que
  usan `require()` de un módulo npm que `mongosh` no soporta.