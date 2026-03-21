import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { execSync } from "child_process";
import { resolve } from "path";

const PORT = parseInt(process.env.DEPLOY_PORT || "9000", 10);
const SECRET = process.env.DEPLOY_SECRET || "";
const PROJECT_DIR = resolve(process.env.PROJECT_DIR || ".");

function log(msg: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function run(cmd: string): string {
  log(`> ${cmd}`);
  try {
    const output = execSync(cmd, {
      cwd: PROJECT_DIR,
      timeout: 120000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output.trim();
  } catch (err: any) {
    log(`command failed: ${err.message}`);
    throw err;
  }
}

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    return;
  }

  // deploy endpoint
  if (req.method === "POST" && req.url === "/deploy") {
    const body = await parseBody(req);

    // verify secret if configured
    if (SECRET) {
      let payload: any;
      try { payload = JSON.parse(body); } catch { payload = {}; }
      if (payload.secret !== SECRET) {
        log("deploy rejected: invalid secret");
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid secret" }));
        return;
      }
    }

    log("deploy started");
    const steps: { step: string; output?: string; error?: string }[] = [];

    try {
      // step 1: git pull
      const pullOut = run("git pull origin main");
      steps.push({ step: "git pull", output: pullOut });

      // step 2: install dependencies
      const installOut = run("npm install --production");
      steps.push({ step: "npm install", output: installOut });

      // step 3: build
      const buildOut = run("npm run build");
      steps.push({ step: "npm run build", output: buildOut });

      // step 4: restart app
      try {
        const restartOut = run("pm2 restart mcp-app");
        steps.push({ step: "pm2 restart", output: restartOut });
      } catch {
        log("pm2 restart failed — trying npm start in background");
        steps.push({ step: "pm2 restart", error: "pm2 not available — manual restart needed" });
      }

      log("deploy completed successfully");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, steps }));
    } catch (err: any) {
      log(`deploy failed: ${err.message}`);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message, steps }));
    }
    return;
  }

  // 404 for anything else
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  log(`deploy hook listening on port ${PORT}`);
  log(`project dir: ${PROJECT_DIR}`);
  if (SECRET) log("secret verification: enabled");
  else log("warning: no DEPLOY_SECRET set — deploy endpoint is unprotected");
});
