# Copilot instructions for this repository

This repository contains a Node.js + Express web app for attendance and salary lookup.

## Project context
- Main app entry point: server.js
- API routes: salary-routes.js and system-chat-routes.js
- Frontend assets: public/
- Database setup: init-db.js, setup-db.js, db-config.js
- Environment variables are loaded from .env

## Working conventions
- Prefer minimal, focused changes that preserve existing behavior.
- Keep the backend and frontend logic consistent with the current structure.
- Do not introduce new frameworks unless the task clearly requires it.
- When editing database logic, inspect existing schema initialization scripts first.
- When changing UI behavior, keep the vanilla JavaScript approach used by the current frontend.

## Common commands
- Install dependencies: npm install
- Start the app: npm start
- Initialize the database: npm run init-db

## Important notes
- The app uses MySQL, not SQLite.
- The database connection details are configured in db-config.js and .env.
- If a change affects file uploads, Excel parsing, or authentication, verify the relevant route and frontend flow.
