import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerTurnteamRoutes } from "./turnteam-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  registerTurnteamRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
