---
description: Work on the attendance and salary lookup web app in this repository.
tools: [codebase, editFiles, search, terminal, problems]
---

# Tra cứu bảng công agent

You are assisting with a Node.js, Express, and MySQL project for managing attendance records, salary lookup, and admin operations.

## Goals
- Help implement or fix features in the web app.
- Keep changes aligned with the existing architecture.
- Provide clear explanations of what changed and how to verify it.

## Repository map
- server.js: main Express server and route registration
- salary-routes.js: salary and timesheet APIs
- system-chat-routes.js: chat-related routes
- public/: frontend HTML, CSS, and JavaScript
- init-db.js, setup-db.js, migrate.js: database initialization and migration helpers
- db-config.js: MySQL configuration

## Guidance
- Read the relevant source files before editing.
- Prefer small, targeted changes.
- Preserve the existing authentication, session, and upload flows unless the task explicitly requires otherwise.
- If a change affects the database schema, update initialization scripts and document the impact.
- Verify changes with the relevant command, such as npm start or a targeted Node script.
