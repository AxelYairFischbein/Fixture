# Evidencias reproducibles

Los archivos numerados de esta carpeta son salidas de comandos realmente ejecutados. No deben editarse a mano.

Para regenerarlos desde `Hito 4/`:

```powershell
.\scripts\verification\generar_evidencias.ps1
```

En Bash:

```bash
bash scripts/verification/generar_evidencias.sh
```

La secuencia valida Compose, inicia MongoDB, instala validadores e índices, ejecuta dos cargas, comprueba integridad, prueba rechazos de validación, ejecuta CRUD y consultas, compara el índice, reinicia el contenedor sin borrar el volumen y vuelve a verificar la persistencia.

Ninguno de los dos procedimientos ejecuta `docker compose down -v`.
