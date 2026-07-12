# Seeders

## Checklist

```bash
docker cp backend/seed-checklist.js crm-backend-1:/app/seed-checklist.js
docker exec crm-backend-1 node /app/seed-checklist.js
```

## Paquetes

```bash
docker cp backend/seed-packages.js crm-backend-1:/app/seed-packages.js
docker exec crm-backend-1 node /app/seed-packages.js
```

## Patrocinios

```bash
docker cp backend/seed.js crm-backend-1:/app/seed.js
docker cp backend/seed-patrocinios.js crm-backend-1:/app/seed-patrocinios.js
docker exec crm-backend-1 node /app/seed.js
docker exec crm-backend-1 node /app/seed-patrocinios.js
```

> **Nota:** Los seeders de checklist y paquetes borran los registros existentes y los reemplazan. Los de patrocinios solo insertan si no hay datos.
