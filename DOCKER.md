# Despliegue con Docker Compose

El despliegue publica solamente la aplicación web. PostgreSQL permanece aislado en la red interna de Docker y el backend se conecta mediante el nombre estable del servicio `db`; no depende de `localhost` ni de la IP del servidor.

## Inicio

1. Copia `.env.example` como `.env` y cambia `POSTGRES_PASSWORD`.
2. Construye e inicia los servicios:

   ```sh
   docker compose up -d --build
   ```

El servicio `migrate` espera a que PostgreSQL esté listo y ejecuta `prisma migrate deploy`. El backend solo inicia si las migraciones terminan correctamente.

## Acceso desde la red local

Consulta la dirección IPv4 del equipo que ejecuta Docker y abre desde cualquier equipo de la misma red:

```text
http://IP_DEL_SERVIDOR:8080
```

Si cambias `APP_PORT`, usa ese puerto. También debes permitir dicho puerto TCP en el firewall del anfitrión. No configures `VITE_API_URL` ni `VITE_SOCKET_URL` para el despliegue Compose: Nginx enruta `/api` y `/socket.io` al backend conservando el mismo origen.

## Comprobaciones útiles

```sh
docker compose ps
docker compose logs migrate
docker compose logs -f backend frontend
```

Para aplicar migraciones nuevas en una instalación existente:

```sh
docker compose run --rm migrate
```

La información de PostgreSQL se conserva en el volumen administrado `delimuu_db_data`.
