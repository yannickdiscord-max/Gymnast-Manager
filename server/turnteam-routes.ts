import type { Express, Request, Response, NextFunction } from "express";
import { Router } from "express";
import * as svc from "./turnteam-service";
import type {
  AgendaKalenderCategorie,
  OuderGesprekType,
  Toestel,
} from "../shared/turnteam-domain";
import {
  DUPLICATE_TRAINING_SESSION_ERROR,
  DUPLICATE_WEDSTRIJD_ERROR,
  INVALID_AGENDA_DATUM,
  INVALID_OUDER_GESPREK_DATUM,
  INVALID_TRAINING_SESSION_DATUM,
  LESPLAN_ACTION_FORBIDDEN,
  MISSING_AGENDA_LESPLAN_PLAN,
  MISSING_AGENDA_TITEL,
} from "../shared/turnteam-domain";

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function badRequest(res: Response, message: string): void {
  res.status(400).json({ message });
}

function pid(req: Request, key: string): string {
  const v = (req.params as Record<string, string | string[]>)[key];
  if (v == null) return "";
  return typeof v === "string" ? v : v[0] ?? "";
}

export function registerTurnteamRoutes(app: Express): void {
  const api = Router();

  api.get(
    "/health",
    asyncHandler(async (_req, res) => {
      const sporters = await svc.listSporters();
      res.json({ ok: true, sporterCount: sporters.length });
    }),
  );

  api.get(
    "/sporters",
    asyncHandler(async (_req, res) => {
      res.json(await svc.listSporters());
    }),
  );

  api.post(
    "/sporters",
    asyncHandler(async (req, res) => {
      const naam = String(req.body?.naam ?? "").trim();
      const niveau = String(req.body?.niveau ?? "").trim();
      if (!naam || !niveau) {
        badRequest(res, "naam and niveau are required");
        return;
      }
      res.json(await svc.addSporter(naam, niveau));
    }),
  );

  api.post(
    "/sporters/:id/toggle-favoriet",
    asyncHandler(async (req, res) => {
      res.json(await svc.toggleFavoriet(pid(req, "id")));
    }),
  );

  api.get(
    "/sporters/:id",
    asyncHandler(async (req, res) => {
      const s = await svc.getSporter(pid(req, "id"));
      if (!s) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      res.json(s);
    }),
  );

  api.patch(
    "/sporters/:id/niveau",
    asyncHandler(async (req, res) => {
      const niveau = String(req.body?.niveau ?? "").trim();
      if (!niveau) {
        badRequest(res, "niveau required");
        return;
      }
      const s = await svc.updateSporterNiveau(pid(req, "id"), niveau);
      if (!s) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      res.json(s);
    }),
  );

  api.delete(
    "/sporters/:id",
    asyncHandler(async (req, res) => {
      await svc.deleteSporter(pid(req, "id"));
      res.status(204).end();
    }),
  );

  api.patch(
    "/sporters/:id/onderdelen/:toestel",
    asyncHandler(async (req, res) => {
      const onderdelen = req.body?.onderdelen;
      if (!Array.isArray(onderdelen)) {
        badRequest(res, "onderdelen array required");
        return;
      }
      await svc.updateSporterOnderdelen(
        pid(req, "id"),
        pid(req, "toestel") as Toestel,
        onderdelen as string[],
      );
      res.status(204).end();
    }),
  );

  api.patch(
    "/sporters/:id/oefening/:toestel",
    asyncHandler(async (req, res) => {
      const oefening = req.body?.oefening;
      if (!Array.isArray(oefening)) {
        badRequest(res, "oefening array required");
        return;
      }
      await svc.updateSporterOefening(
        pid(req, "id"),
        pid(req, "toestel") as Toestel,
        oefening as string[],
      );
      res.status(204).end();
    }),
  );

  api.get(
    "/onderdelen/:toestel",
    asyncHandler(async (req, res) => {
      res.json(await svc.getOnderdelen(pid(req, "toestel") as Toestel));
    }),
  );

  api.post(
    "/onderdelen/:toestel",
    asyncHandler(async (req, res) => {
      await svc.addOnderdeel(pid(req, "toestel") as Toestel, req.body);
      res.status(204).end();
    }),
  );

  api.delete(
    "/onderdelen/:toestel",
    asyncHandler(async (req, res) => {
      const naam = String(req.query.naam ?? "");
      if (!naam) {
        badRequest(res, "naam query required");
        return;
      }
      await svc.deleteOnderdeel(pid(req, "toestel") as Toestel, naam);
      res.status(204).end();
    }),
  );

  api.get(
    "/blessures/:sporterId",
    asyncHandler(async (req, res) => {
      res.json(await svc.getBlessuresForSporter(pid(req, "sporterId")));
    }),
  );

  api.post(
    "/blessures/:sporterId/current",
    asyncHandler(async (req, res) => {
      const blessureNaam = String(req.body?.blessureNaam ?? "");
      res.json(
        await svc.addCurrentBlessure(pid(req, "sporterId"), blessureNaam),
      );
    }),
  );

  api.delete(
    "/blessures/:sporterId/current",
    asyncHandler(async (req, res) => {
      const naam = String(req.query.naam ?? "");
      res.json(
        await svc.removeCurrentBlessure(pid(req, "sporterId"), naam),
      );
    }),
  );

  api.post(
    "/blessures/:sporterId/move-to-previous",
    asyncHandler(async (req, res) => {
      const blessureNaam = String(req.body?.blessureNaam ?? "");
      res.json(
        await svc.moveCurrentBlessureToPrevious(
          pid(req, "sporterId"),
          blessureNaam,
        ),
      );
    }),
  );

  api.delete(
    "/blessures/:sporterId/previous",
    asyncHandler(async (req, res) => {
      const naam = String(req.query.naam ?? "");
      res.json(
        await svc.removePreviousBlessure(pid(req, "sporterId"), naam),
      );
    }),
  );

  api.get(
    "/training-sessions",
    asyncHandler(async (_req, res) => {
      res.json(await svc.getTrainingSessions());
    }),
  );

  api.get(
    "/training-sessions/by-datum",
    asyncHandler(async (req, res) => {
      const datum = String(req.query.datum ?? "");
      const s = await svc.getTrainingSessionForDatum(datum);
      if (!s) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      res.json(s);
    }),
  );

  api.post(
    "/training-sessions",
    asyncHandler(async (req, res) => {
      try {
        const datum = String(req.body?.datum ?? "");
        const attendeeSporterIds = req.body?.attendeeSporterIds;
        if (!Array.isArray(attendeeSporterIds)) {
          badRequest(res, "attendeeSporterIds array required");
          return;
        }
        res.json(
          await svc.addTrainingSession(datum, attendeeSporterIds as string[]),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === DUPLICATE_TRAINING_SESSION_ERROR) {
          res.status(409).json({ message: msg });
          return;
        }
        if (msg === INVALID_TRAINING_SESSION_DATUM) {
          res.status(400).json({ message: msg });
          return;
        }
        throw e;
      }
    }),
  );

  api.get(
    "/training-sessions/attendance/:sporterId",
    asyncHandler(async (req, res) => {
      res.json(
        await svc.getSporterAttendanceSummary(pid(req, "sporterId")),
      );
    }),
  );

  api.get(
    "/ouder-gesprekken/sporter/:sporterId",
    asyncHandler(async (req, res) => {
      res.json(await svc.getOuderGesprekkenForSporter(pid(req, "sporterId")));
    }),
  );

  api.get(
    "/ouder-gesprekken/last-pop-label/:sporterId",
    asyncHandler(async (req, res) => {
      res.json({
        label: await svc.getLastPopGesprekLabel(pid(req, "sporterId")),
      });
    }),
  );

  api.post(
    "/ouder-gesprekken",
    asyncHandler(async (req, res) => {
      try {
        const sporterId = String(req.body?.sporterId ?? "");
        const datum = String(req.body?.datum ?? "");
        const type = req.body?.type as OuderGesprekType;
        const notities = String(req.body?.notities ?? "");
        if (!sporterId) {
          badRequest(res, "sporterId required");
          return;
        }
        res.json(await svc.addOuderGesprek(sporterId, datum, type, notities));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === INVALID_OUDER_GESPREK_DATUM) {
          res.status(400).json({ message: msg });
          return;
        }
        throw e;
      }
    }),
  );

  api.patch(
    "/ouder-gesprekken/:id",
    asyncHandler(async (req, res) => {
      try {
        const g = await svc.updateOuderGesprek(pid(req, "id"), {
          datum: req.body?.datum,
          type: req.body?.type,
          notities: req.body?.notities,
        });
        if (!g) {
          res.status(404).json({ message: "Not found" });
          return;
        }
        res.json(g);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === INVALID_OUDER_GESPREK_DATUM) {
          res.status(400).json({ message: msg });
          return;
        }
        throw e;
      }
    }),
  );

  api.delete(
    "/ouder-gesprekken/:id",
    asyncHandler(async (req, res) => {
      await svc.deleteOuderGesprek(pid(req, "id"));
      res.status(204).end();
    }),
  );

  api.get(
    "/wedstrijden/last-other/:sporterId",
    asyncHandler(async (req, res) => {
      const w = await svc.getLastWedstrijdFromOtherSporters(pid(req, "sporterId"));
      res.json(w ?? null);
    }),
  );

  api.get(
    "/wedstrijden/sporter/:sporterId",
    asyncHandler(async (req, res) => {
      res.json(await svc.getWedstrijden(pid(req, "sporterId")));
    }),
  );

  api.get(
    "/wedstrijden/:id",
    asyncHandler(async (req, res) => {
      const w = await svc.getWedstrijd(pid(req, "id"));
      if (!w) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      res.json(w);
    }),
  );

  api.post(
    "/wedstrijden",
    asyncHandler(async (req, res) => {
      try {
        const sporterId = String(req.body?.sporterId ?? "");
        const naam = String(req.body?.naam ?? "");
        const datum = String(req.body?.datum ?? "");
        const locatie = String(req.body?.locatie ?? "");
        const expectedDWaarde = req.body?.expectedDWaarde;
        const targetNiveaus = req.body?.targetNiveaus;
        res.json(
          await svc.addWedstrijd(
            sporterId,
            naam,
            datum,
            locatie,
            expectedDWaarde,
            {
              targetNiveaus: Array.isArray(targetNiveaus)
                ? (targetNiveaus as string[])
                : undefined,
            },
          ),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === DUPLICATE_WEDSTRIJD_ERROR) {
          res.status(409).json({ message: msg });
          return;
        }
        throw e;
      }
    }),
  );

  api.post(
    "/wedstrijden/multi",
    asyncHandler(async (req, res) => {
      try {
        res.json(
          await svc.addWedstrijdForSporters({
            sporterIds: req.body?.sporterIds ?? [],
            naam: String(req.body?.naam ?? ""),
            datum: String(req.body?.datum ?? ""),
            locatie: String(req.body?.locatie ?? ""),
            expectedDWaardeBySporterId: req.body?.expectedDWaardeBySporterId,
          }),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === DUPLICATE_WEDSTRIJD_ERROR) {
          res.status(409).json({ message: msg });
          return;
        }
        throw e;
      }
    }),
  );

  api.patch(
    "/wedstrijden/:id/scores",
    asyncHandler(async (req, res) => {
      await svc.saveWedstrijdScores(pid(req, "id"), req.body?.scores ?? {});
      res.status(204).end();
    }),
  );

  api.patch(
    "/wedstrijden/:id/toestel-notes/:toestel",
    asyncHandler(async (req, res) => {
      await svc.saveToestelNotes(
        pid(req, "id"),
        pid(req, "toestel"),
        String(req.body?.dScoreNote ?? ""),
        String(req.body?.eScoreNote ?? ""),
        String(req.body?.penaltyNote ?? ""),
      );
      res.status(204).end();
    }),
  );

  api.patch(
    "/wedstrijden/:id/expected-d/:toestel",
    asyncHandler(async (req, res) => {
      const value = req.body?.value;
      await svc.saveExpectedDWaarde(
        pid(req, "id"),
        pid(req, "toestel"),
        value === null || value === undefined ? null : Number(value),
      );
      res.status(204).end();
    }),
  );

  api.patch(
    "/wedstrijden/:id/naam",
    asyncHandler(async (req, res) => {
      await svc.saveWedstrijdNaam(pid(req, "id"), String(req.body?.naam ?? ""));
      res.status(204).end();
    }),
  );

  api.patch(
    "/wedstrijden/:id/info",
    asyncHandler(async (req, res) => {
      await svc.saveWedstrijdInfo(
        pid(req, "id"),
        String(req.body?.naam ?? ""),
        String(req.body?.datum ?? ""),
        String(req.body?.locatie ?? ""),
      );
      res.status(204).end();
    }),
  );

  api.delete(
    "/wedstrijden/:id",
    asyncHandler(async (req, res) => {
      await svc.deleteWedstrijd(pid(req, "id"));
      res.status(204).end();
    }),
  );

  api.get(
    "/agenda/upcoming",
    asyncHandler(async (req, res) => {
      const only =
        String(req.query.onlyFavorieten ?? "") === "1" ||
        String(req.query.onlyFavorieten ?? "") === "true";
      const viewerRaw = req.query.viewerUserId;
      const viewerUserId =
        typeof viewerRaw === "string" ? viewerRaw.trim() : undefined;
      res.json(
        await svc.getUpcomingAgendaItems({
          onlyFavorieten: only,
          viewerUserId:
            viewerUserId !== undefined && viewerUserId !== ""
              ? viewerUserId
              : undefined,
        }),
      );
    }),
  );

  api.post(
    "/agenda/custom-events",
    asyncHandler(async (req, res) => {
      try {
        const lv = req.body?.lesplanVisibility;
        const lesplanVisibility =
          lv === "private" || lv === "public" ? lv : undefined;
        const ou = req.body?.ownerUserId;
        const ownerUserId =
          ou === null || ou === undefined
            ? undefined
            : String(ou).trim() || null;
        res.json(
          await svc.addCustomAgendaEvent(
            String(req.body?.titel ?? ""),
            String(req.body?.datum ?? ""),
            String(req.body?.locatie ?? ""),
            req.body?.categorie as AgendaKalenderCategorie,
            String(req.body?.notitie ?? ""),
            {
              lesplanVisibility,
              ownerUserId:
                ownerUserId === undefined ? undefined : ownerUserId,
            },
          ),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (
          msg === MISSING_AGENDA_TITEL ||
          msg === MISSING_AGENDA_LESPLAN_PLAN ||
          msg === INVALID_AGENDA_DATUM
        ) {
          res.status(400).json({ message: msg });
          return;
        }
        throw e;
      }
    }),
  );

  api.patch(
    "/agenda/lesplan/:id",
    asyncHandler(async (req, res) => {
      const actor = String(req.body?.viewerUserId ?? "").trim();
      if (!actor) {
        badRequest(res, "viewerUserId is required");
        return;
      }
      const lv = req.body?.lesplanVisibility;
      const lesplanVisibility = lv === "private" ? "private" : "public";
      try {
        const updated = await svc.updateLesplanById(
          pid(req, "id"),
          {
            datum: String(req.body?.datum ?? ""),
            notitie: String(req.body?.notitie ?? ""),
            lesplanVisibility,
          },
          actor,
        );
        if (!updated) {
          res.status(404).json({ message: "Not found" });
          return;
        }
        res.json(updated);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === LESPLAN_ACTION_FORBIDDEN) {
          res.status(403).json({ message: msg });
          return;
        }
        if (msg === MISSING_AGENDA_LESPLAN_PLAN || msg === INVALID_AGENDA_DATUM) {
          res.status(400).json({ message: msg });
          return;
        }
        throw e;
      }
    }),
  );

  api.delete(
    "/agenda/lesplan/:id",
    asyncHandler(async (req, res) => {
      const actorRaw = req.query.viewerUserId;
      const actor =
        typeof actorRaw === "string"
          ? actorRaw.trim()
          : Array.isArray(actorRaw)
            ? String(actorRaw[0] ?? "").trim()
            : "";
      if (!actor) {
        badRequest(res, "viewerUserId query parameter is required");
        return;
      }
      try {
        const ok = await svc.deleteLesplanById(pid(req, "id"), actor);
        if (!ok) {
          res.status(404).json({ message: "Not found" });
          return;
        }
        res.status(204).end();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === LESPLAN_ACTION_FORBIDDEN) {
          res.status(403).json({ message: msg });
          return;
        }
        throw e;
      }
    }),
  );

  api.post(
    "/migration/import-legacy",
    asyncHandler(async (req, res) => {
      await svc.importLegacyPayload(req.body ?? {});
      res.status(204).end();
    }),
  );

  app.use("/api", api);
}
