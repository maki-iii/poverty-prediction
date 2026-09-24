# Run a separate Docker copy on Windows

This setup keeps the existing XAMPP database and the original `ml/data` and
`ml/saved_models` directories intact. Docker uses a new database volume and
copies under `docker-state`. It is a local setup, available at http://localhost:8080.

## First start

1. Open Docker Desktop in Linux-container mode. `docker version` must show both
   Client and Server sections. Restart your terminal if Docker is not on PATH.
2. Start MySQL in XAMPP. Pause training, uploads and changes to the original app
   while preparing the copy. Keep `backend/.env` and the existing Firebase
   `backend/configs/serviceAccountKey.json` file in place.
3. In PowerShell, from the project directory, run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\docker\prepare.ps1
   docker compose --env-file .env.docker config --quiet
   docker compose --env-file .env.docker up --build -d --wait --wait-timeout 180
   docker compose --env-file .env.docker ps
   ```

   Preparation exports every table (including users and audit logs), copies data
   and models, and creates fresh Docker database credentials. It refuses to
   overwrite an existing copy. If mysqldump is elsewhere, set `$env:MYSQLDUMP_PATH`
   to its full executable path first. Node.js and the existing backend npm
   dependencies must be installed.

4. Before logging in or changing Docker data, compare imported table counts:

   ```powershell
   docker compose --env-file .env.docker exec backend node /verification/verify.cjs
   ```

5. Open http://localhost:8080 and sign in with an existing account. Check actuals,
   forecasts, predictions, audit logs, and access to uploaded files. Only then
   test new training or uploads on this copy.

## Everyday commands

```powershell
docker compose --env-file .env.docker logs --tail 100
docker compose --env-file .env.docker stop
docker compose --env-file .env.docker start
```

Use `up --build -d` after code changes. Do not run `down -v`: it deletes the Docker
database volume. A volume is persistent storage, not a replacement for backups.
The SQL import runs only when the database volume is first initialized. Do not
re-run the import over an existing database or delete its volume to troubleshoot.

The original Windows app and the Docker copy do not synchronize changes.
`docker-state/database.sql` is the initial backup; it does not include later
Docker activity. Keep `docker-state`, `.env.docker`, and the original credentials
private and out of Git. They are excluded from image builds.

## Configuration notes

- XAMPP's database is MariaDB. This setup imports its logical SQL backup into
  MariaDB 10.11 rather than sharing or moving the original database files.
- Browser API requests use the same origin through Nginx. Only port 8080 is
  published to the local computer; database, backend and ML ports stay internal.
- Backend credentials for JWT and email come from the existing `backend/.env`.
  Database settings are overridden to point exclusively at the Docker database.
  Firebase's private key is mounted at runtime, never copied into an image.
- Existing Random Forest artifacts use scikit-learn 1.8.0, pinned in the Docker
  requirements. Validate copied models before relying on new predictions.
- FastAPI uses one worker because job progress and cancellation are in memory.
- The proxy accepts uploads up to 512 MB. Increase `client_max_body_size` in
  `frontend/nginx.conf` and rebuild if your files are larger.
- On an import/build failure, inspect `docker compose --env-file .env.docker logs`.
  Keep the initial SQL backup and original app untouched while investigating.
