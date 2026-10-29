# Production Deployment Guide

## 1) Environment variables for Dokploy / VPS

Copy the example file and update it:

cp deployment/production.env.example .env

Then replace the placeholder values:
- DB_HOST = your MariaDB host or service name
- DB_PORT = 3306 (or your MariaDB port)
- DB_USER = database user
- DB_PASSWORD = database password
- DB_NAME = medbox_db
- CORS_ORIGIN = your public domain, for example https://medbox.example.com
- JWT_SECRET = long secret string

## 2) Start the app

For Dokploy:
- Build Command: npm install
- Start Command: npm start
- Port: 3000

For VPS:

cd /path/to/project
npm install
npm start

## 3) Reverse proxy and HTTPS

Use Nginx or Traefik in front of the app.
A sample configuration is available at:
- deployment/nginx-https.conf.example

Replace medbox.example.com with your domain.

## 4) Important notes

- The app must run on 0.0.0.0 and port 3000.
- Browser and ESP32 must reach the public HTTPS URL, not raw HTTP.
- The DB must be reachable from the app server.
- CORS must match the public domain exactly.

## 5) Example public URL

https://medbox.example.com
