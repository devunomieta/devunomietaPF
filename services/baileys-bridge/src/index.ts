import "dotenv/config";
import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import { createSupabaseClient } from "./supabaseAuth.js";
import { BaileysSocketManager } from "./socket.js";

const port = Number(process.env.PORT) || 8080;
const host = "0.0.0.0";
const internalSecret = process.env.INTERNAL_SERVICE_KEY;

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// Initialize Supabase & Baileys
const supabase = createSupabaseClient();
const socketManager = new BaileysSocketManager(supabase);

// Security Middleware for Protected Routes
async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!internalSecret) return; // If unset in local dev, allow
  const provided = request.headers["x-service-key"] || request.headers["authorization"]?.replace("Bearer ", "");
  if (provided !== internalSecret) {
    reply.status(401).send({ error: "Unauthorized: Invalid or missing x-service-key" });
  }
}

// 1. Health check route (used by Render and Vercel Keepalive Cron)
app.get("/health", async () => {
  const status = socketManager.getStatus();
  return {
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    whatsapp: status.state,
    phone: status.phone,
  };
});

// 2. Status route
app.get("/status", { preHandler: requireAuth }, async () => {
  const status = socketManager.getStatus();
  return {
    state: status.state,
    phone: status.phone,
    qrAvailable: status.qrAvailable,
  };
});

// 3. QR Code route (returns live Base64 PNG data URL)
app.get("/qr", { preHandler: requireAuth }, async (_req, reply) => {
  const qr = socketManager.getQrDataUrl();
  const status = socketManager.getStatus();

  if (status.state === "connected") {
    return { state: "connected", phone: status.phone, qr: null };
  }

  if (!qr) {
    reply.status(503);
    return { error: "QR code not ready yet or socket connecting", state: status.state, qr: null };
  }

  return { state: status.state, qr };
});

// 4. Send Message route
interface SendBody {
  phone: string;
  message: string;
}

app.post<{ Body: SendBody }>("/send", { preHandler: requireAuth }, async (req, reply) => {
  const { phone, message } = req.body || {};

  if (!phone || !message) {
    reply.status(400);
    return { error: "Both 'phone' and 'message' are required fields." };
  }

  const result = await socketManager.sendMessage(phone, message);
  if ("error" in result) {
    reply.status(502);
    return result;
  }

  return result;
});

// 5. Logout / Unlink Device route
app.post("/logout", { preHandler: requireAuth }, async () => {
  const result = await socketManager.logout();
  return result;
});

// Boot the Fastify server and start Baileys
async function start() {
  try {
    await socketManager.init();
    await app.listen({ port, host });
    console.log(`[Baileys Bridge] HTTP Server listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
