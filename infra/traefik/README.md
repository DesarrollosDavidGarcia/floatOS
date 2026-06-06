# Traefik — proxy de borde con HTTPS automático

Termina TLS (Let's Encrypt) y enruta cada **subdominio** a la instancia de
cliente correspondiente. Se corre **una vez por VPS**; cada instancia se engancha
sola por labels de Docker (ver `docker-compose.traefik.yml` en la raíz).

```
                Internet :443
                    │
              ┌─────▼─────┐   TLS + ruteo por Host
              │  Traefik  │   (red flotaos-edge)
              └─────┬─────┘
        ┌───────────┼───────────┐
   cliente-a.com  cliente-b.com  cliente-c.com
   (web/api)      (web/api)      (web/api)
```

## Requisitos previos
- VPS con Docker y puertos **80 y 443 abiertos** al público.
- DNS: un registro **A** por cada cliente (`cliente-xyz.tudominio.com`) apuntando
  a la IP del VPS. El cert solo se emite cuando el dominio ya resuelve al VPS.

## Puesta en marcha (una vez)
```bash
docker network create flotaos-edge          # red compartida edge↔instancias
cd infra/traefik
cp .env.example .env                          # define ACME_EMAIL
touch acme.json && chmod 600 acme.json        # almacén de certificados (privado)
docker compose up -d
```

> **Prueba primero con staging**: descomenta la línea `caserver=...staging...` en
> `docker-compose.yml`, valida que emite cert, y luego vuelve a producción
> (borra `acme.json`, recrea: Let's Encrypt limita 5 certs/dominio/semana).

## Enganchar una instancia
En la carpeta del cliente, con `CLIENT_DOMAIN` y `CLIENT_NAME` en su `.env`:
```bash
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d
```
En este modo el **nginx por instancia no arranca** (Traefik hace de proxy);
Traefik enruta `Host(cliente.com)` → `web:3001` y `/api` + `/socket.io` → `api:3000`.

## Notas
- `acme.json` guarda las claves privadas de los certs: **nunca** se versiona
  (está en `.gitignore`) y debe tener permisos `600`.
- El dashboard de Traefik está **deshabilitado** por seguridad. Si lo quieres,
  agrégalo detrás de auth básica y su propio subdominio.
- Renovación de certs: **automática**, sin intervención.
