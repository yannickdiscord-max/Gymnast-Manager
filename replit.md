# Turnteam

## Overview

Turnteam is a gymnastics team management mobile app built with Expo (React Native). It allows coaches or team managers to track gymnasts ("sporters"), their skill levels ("niveaus"), and their progress on different gymnastics apparatus ("toestellen") like floor, rings, vault, bars, etc. The app supports favoriting athletes, adding/removing them, and tracking which skills ("onderdelen") each athlete has mastered on each apparatus.

The project uses a dual architecture: an Expo/React Native frontend for the mobile UI and an Express.js backend server. Currently, the app's primary data storage is local (AsyncStorage on the client), but the backend has Drizzle ORM configured with PostgreSQL for future server-side data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)
- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture
- **Routing**: `expo-router` with file-based routing. Routes are defined in the `app/` directory:
  - `app/index.tsx` — Home screen showing list of sporters with favorite/all filter
  - `app/add-sporter.tsx` — Modal screen for adding a new gymnast
  - `app/sporter/[id].tsx` — Detail view for a single gymnast showing their apparatus progress
  - `app/toestel/[toestelId].tsx` — Screen for managing skills on a specific apparatus for a gymnast
- **State Management**: React Query (`@tanstack/react-query`) is set up for server-state management, though the current implementation uses local state with `useState` and `useFocusEffect` for data loading
- **Local Storage**: `@react-native-async-storage/async-storage` is used as the primary data store via `lib/storage.ts`. All sporter data (athletes, their levels, favorites, and skill tracking) is persisted locally on-device
- **UI**: Custom components with React Native StyleSheet, no external UI library. Uses Inter font family (400, 500, 600, 700 weights). Color constants defined in `constants/colors.ts` with a teal/green primary palette
- **Haptics**: `expo-haptics` for tactile feedback on interactions
- **Typed Routes**: Experimental typed routes enabled in Expo config

### Backend (Express.js)
- **Server**: Express 5 running on Node.js, defined in `server/index.ts`
- **Routes**: Registered in `server/routes.ts` — currently empty, ready for API endpoints prefixed with `/api`
- **CORS**: Custom CORS middleware supporting Replit domains and localhost development
- **Storage Layer**: `server/storage.ts` defines an `IStorage` interface with a `MemStorage` in-memory implementation for users. This is a placeholder ready to be swapped for database-backed storage
- **Static serving**: In production, serves a static build of the Expo web app; in development, proxies to the Expo dev server

### Database (Drizzle + PostgreSQL)
- **ORM**: Drizzle ORM configured in `drizzle.config.ts` pointing to `DATABASE_URL`
- **Schema**: Defined in `shared/schema.ts` — currently has a `users` table with `id` (UUID), `username`, and `password` fields
- **Validation**: `drizzle-zod` generates Zod schemas from the Drizzle table definitions
- **Migrations**: Output to `./migrations` directory
- **Push command**: `npm run db:push` to sync schema to database
- **Note**: The database schema (users table) is separate from the client-side sporter data model. The sporter functionality currently lives entirely in AsyncStorage on the client side

### Data Model (Client-Side)
The `Sporter` interface in `lib/storage.ts`:
- `id`: UUID string
- `naam`: athlete name
- `niveau`: skill level
- `favoriet`: boolean favorite flag
- `onderdelen`: Record mapping apparatus names to arrays of mastered skill names

Six apparatus types: Vloer (Floor), Voltige, Ringen (Rings), Sprong (Vault), Brug (Bars), Rekstok (Horizontal Bar), each with predefined lists of skills.

### Build System
- **Development**: Two parallel processes — `expo:dev` for the Expo dev server and `server:dev` for the Express backend
- **Production**: `expo:static:build` creates a static web build, `server:build` bundles the server with esbuild, `server:prod` serves everything
- **Custom build script**: `scripts/build.js` handles Expo web static builds with Metro bundler integration

### Path Aliases
- `@/*` maps to project root
- `@shared/*` maps to `./shared/*`

## External Dependencies

### Core Services
- **PostgreSQL**: Database configured via `DATABASE_URL` environment variable. Used by Drizzle ORM for server-side data persistence
- **Replit**: Hosting platform with environment variables (`REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`, `REPLIT_INTERNAL_APP_DOMAIN`) used for CORS configuration, build deployment, and Expo dev server proxy setup

### Key NPM Packages
- **expo** (~54.0.27): Core framework for React Native cross-platform development
- **expo-router** (~6.0.17): File-based routing
- **express** (^5.0.1): Backend HTTP server
- **drizzle-orm** (^0.39.3) + **drizzle-zod** (^0.7.0): Database ORM and schema validation
- **pg** (^8.16.3): PostgreSQL client driver
- **@tanstack/react-query** (^5.83.0): Server-state management
- **@react-native-async-storage/async-storage** (2.2.0): Local key-value storage
- **react-native-reanimated** (~4.1.1): Animations
- **react-native-gesture-handler** (~2.28.0): Touch gesture handling
- **react-native-keyboard-controller** (^1.20.6): Keyboard-aware scrolling
- **expo-haptics**: Haptic feedback
- **expo-crypto**: UUID generation for client-side IDs
- **expo-image-picker**: Image selection capability
- **http-proxy-middleware**: Dev server proxying to Expo bundler
- **esbuild**: Server-side TypeScript bundling for production