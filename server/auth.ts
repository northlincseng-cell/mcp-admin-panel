import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";
import type { Express, Request, Response, NextFunction } from "express";
import { getDb, getPool } from "./db";
import { users, hasRole } from "@shared/schema";
import { eq } from "drizzle-orm";

// ═══════════════════════════════════════════════════
//  TYPE AUGMENTATION
// ═══════════════════════════════════════════════════

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      displayName: string;
      role: string;
      active: boolean;
      mustChangePassword: boolean;
    }
  }
}

// ═══════════════════════════════════════════════════
//  SAFE USER (strip passwordHash before sending)
// ═══════════════════════════════════════════════════

function safeUser(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// ═══════════════════════════════════════════════════
//  SETUP — call once from index.ts
// ═══════════════════════════════════════════════════

export function setupAuth(app: Express) {
  const PgStore = connectPgSimple(session);
  const pool = getPool();

  // Session config — uses PostgreSQL for persistence across restarts
  const sessionMiddleware = session({
    store: new PgStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "mcp-admin-session-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: false, // set true when behind HTTPS
      sameSite: "lax",
    },
  });

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  // ═══════════════════════════════════════════════════
  //  PASSPORT LOCAL STRATEGY
  // ═══════════════════════════════════════════════════

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const db = getDb();
        const user = await db
          .select()
          .from(users)
          .where(eq(users.username, username.toLowerCase().trim()))
          .limit(1);

        if (!user.length) {
          return done(null, false, { message: "invalid credentials" });
        }

        const found = user[0];

        if (!found.active) {
          return done(null, false, { message: "account disabled" });
        }

        const valid = await bcrypt.compare(password, found.passwordHash);
        if (!valid) {
          return done(null, false, { message: "invalid credentials" });
        }

        // Update last login
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, found.id));

        return done(null, {
          id: found.id,
          username: found.username,
          displayName: found.displayName,
          role: found.role,
          active: found.active,
          mustChangePassword: found.mustChangePassword,
        });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!result.length || !result[0].active) {
        return done(null, false);
      }

      const found = result[0];
      done(null, {
        id: found.id,
        username: found.username,
        displayName: found.displayName,
        role: found.role,
        active: found.active,
        mustChangePassword: found.mustChangePassword,
      });
    } catch (err) {
      done(err);
    }
  });

  // ═══════════════════════════════════════════════════
  //  AUTH ROUTES
  // ═══════════════════════════════════════════════════

  // Login
  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || "invalid credentials" });
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json({ user: safeUser(user) });
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "logout failed" });
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("session destroy error:", destroyErr);
        }
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    });
  });

  // Session check — returns current user or 401
  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "not authenticated" });
    }
    res.json({ user: req.user });
  });

  // Change password
  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "not authenticated" });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "both current and new password required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "password must be at least 8 characters" });
    }

    try {
      const db = getDb();
      const userRecord = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!userRecord.length) {
        return res.status(404).json({ error: "user not found" });
      }

      const valid = await bcrypt.compare(currentPassword, userRecord[0].passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "current password incorrect" });
      }

      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(newPassword, salt);

      await db
        .update(users)
        .set({
          passwordHash: hash,
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.user!.id));

      // Update session user
      (req.user as any).mustChangePassword = false;

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}

// ═══════════════════════════════════════════════════
//  MIDDLEWARE — require authentication
// ═══════════════════════════════════════════════════

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "authentication required" });
  }
  next();
}

// ═══════════════════════════════════════════════════
//  MIDDLEWARE — require minimum role
// ═══════════════════════════════════════════════════

export function requireRole(minimumRole: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "authentication required" });
    }
    if (!hasRole(req.user!.role, minimumRole)) {
      return res.status(403).json({ error: "insufficient permissions" });
    }
    next();
  };
}
