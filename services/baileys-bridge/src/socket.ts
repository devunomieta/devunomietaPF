import makeWASocket, {
  Browsers,
  DisconnectReason,
  WASocket,
  proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import QRCode from "qrcode";
import { SupabaseClient } from "@supabase/supabase-js";
import { useSupabaseAuthState } from "./supabaseAuth.js";
import { forwardToCrmWebhook } from "./webhook.js";

export type ConnectionState = "connecting" | "connected" | "qr_ready" | "disconnected" | "logged_out";

export class BaileysSocketManager {
  private sock: WASocket | null = null;
  private supabase: SupabaseClient;
  private logger = pino({ level: process.env.LOG_LEVEL || "info" });
  private qrCodeDataUrl: string | null = null;
  private connectionState: ConnectionState = "disconnected";
  private connectedPhone: string | null = null;
  private reconnectAttempts = 0;
  private clearCredsFn: (() => Promise<void>) | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  public async init(): Promise<void> {
    const { state, saveCreds, clearCreds } = await useSupabaseAuthState(this.supabase);
    this.clearCredsFn = clearCreds;

    this.logger.info("Initializing Baileys socket with Supabase auth state...");
    this.connectionState = "connecting";

    try {
      this.sock = makeWASocket({
        auth: state,
        logger: this.logger.child({ module: "baileys" }),
        browser: Browsers.ubuntu("Chrome"),
        syncFullHistory: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
      });

      this.setupListeners(saveCreds);
    } catch (err) {
      this.logger.error({ err }, "Fatal error creating Baileys socket");
      this.connectionState = "disconnected";
      this.scheduleReconnect(5000);
    }
  }

  private setupListeners(saveCreds: () => Promise<void>) {
    if (!this.sock) return;

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          this.qrCodeDataUrl = await QRCode.toDataURL(qr);
          this.connectionState = "qr_ready";
          this.logger.info("Generated new WhatsApp QR code for pairing.");
        } catch (e) {
          this.logger.error({ err: e }, "Failed to convert QR string to data URL");
        }
      }

      if (connection === "open") {
        this.connectionState = "connected";
        this.reconnectAttempts = 0;
        this.qrCodeDataUrl = null;

        const rawUser = this.sock?.user?.id || "";
        this.connectedPhone = rawUser.split(":")[0]?.replace("@s.whatsapp.net", "") || null;
        this.logger.info(`WhatsApp connected successfully. Account: ${this.connectedPhone}`);

        forwardToCrmWebhook({
          event: "connection.update",
          status: "connected",
          phone: this.connectedPhone || undefined,
        });
      }

      if (connection === "close") {
        const error = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = error !== DisconnectReason.loggedOut;

        this.logger.warn({ statusCode: error }, `Connection closed. Should reconnect: ${shouldReconnect}`);

        if (error === DisconnectReason.loggedOut) {
          this.connectionState = "logged_out";
          this.connectedPhone = null;
          this.qrCodeDataUrl = null;
          if (this.clearCredsFn) await this.clearCredsFn();
          forwardToCrmWebhook({ event: "connection.update", status: "logged_out" });
          // Start over to emit new QR code
          this.init();
        } else {
          this.connectionState = "disconnected";
          const delay = Math.min(30000, 2000 * Math.pow(1.5, this.reconnectAttempts++));
          this.scheduleReconnect(delay);
        }
      }
    });

    // Inbound Messages
    this.sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        if (msg.key.fromMe) continue; // Ignore own outgoing messages
        const jid = msg.key.remoteJid;
        if (!jid || jid.endsWith("@g.us")) continue; // Focus on direct contact chats

        const phone = jid.replace("@s.whatsapp.net", "").replace("@c.us", "");
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          "";

        if (phone && text) {
          this.logger.info(`Inbound message received from ${phone}`);

          // Recommendation 4: Direct Supabase Ingestion Fallback
          try {
            await this.supabase.from("crm_whatsapp_events").insert([
              {
                phone,
                message: text,
                direction: "inbound",
                status: "delivered",
                provider_message_id: msg.key.id || null,
              },
            ]);
          } catch (dbErr) {
            this.logger.warn({ dbErr }, "Direct Supabase inbound insert fallback warning");
          }

          forwardToCrmWebhook({
            event: "message.inbound",
            phone,
            message: text,
            messageId: msg.key.id || "",
            timestamp: typeof msg.messageTimestamp === "number" ? msg.messageTimestamp * 1000 : Date.now(),
          });
        }
      }
    });

    // Message Status Receipts (Delivered, Read)
    this.sock.ev.on("messages.update", (updates) => {
      for (const update of updates) {
        if (!update.key.id) continue;
        const statusMap: Record<number, "sent" | "delivered" | "read"> = {
          2: "sent",
          3: "delivered",
          4: "read",
        };

        const status = update.update.status ? statusMap[update.update.status] : undefined;
        if (status) {
          forwardToCrmWebhook({
            event: "message.status",
            messageId: update.key.id,
            status,
          });
        }
      }
    });
  }

  private scheduleReconnect(delayMs: number) {
    this.logger.info(`Scheduling reconnect in ${Math.round(delayMs / 1000)}s...`);
    setTimeout(() => {
      this.init();
    }, delayMs);
  }

  public async requestPairingCode(phone: string): Promise<{ success: boolean; code?: string; error?: string }> {
    if (!this.sock) {
      return { success: false, error: "Socket is not initialized." };
    }
    const cleanPhone = phone.replace(/[^\d]/g, "");
    if (cleanPhone.length < 8) {
      return { success: false, error: "Invalid phone number." };
    }

    try {
      this.logger.info(`Requesting 8-digit pairing code for ${cleanPhone}...`);
      const code = await this.sock.requestPairingCode(cleanPhone);
      return { success: true, code };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to request pairing code";
      this.logger.error({ err, phone }, "Pairing code request error");
      return { success: false, error: errMsg };
    }
  }

  public async sendMediaMessage(
    phone: string,
    mediaUrl: string,
    mediaType: "image" | "document" | "audio" | "video",
    caption?: string,
    fileName?: string
  ): Promise<{ success: true; messageId: string } | { error: string }> {
    if (!this.sock || this.connectionState !== "connected") {
      return { error: `WhatsApp is not connected (current state: ${this.connectionState})` };
    }

    const cleanPhone = phone.replace(/[^\d]/g, "");
    if (cleanPhone.length < 8) {
      return { error: `Invalid phone number: ${phone}` };
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;

    try {
      try {
        await this.sock.sendPresenceUpdate("composing", jid);
        await new Promise((r) => setTimeout(r, 1200));
        await this.sock.sendPresenceUpdate("paused", jid);
      } catch {
        // ignore presence errors
      }

      let payload: Record<string, unknown>;
      if (mediaType === "image") {
        payload = { image: { url: mediaUrl }, caption: caption || undefined };
      } else if (mediaType === "document") {
        payload = {
          document: { url: mediaUrl },
          mimetype: mediaUrl.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
          fileName: fileName || "document.pdf",
          caption: caption || undefined,
        };
      } else if (mediaType === "audio") {
        payload = { audio: { url: mediaUrl }, mimetype: "audio/mp4", ptt: true };
      } else {
        payload = { video: { url: mediaUrl }, caption: caption || undefined };
      }

      const sent = await this.sock.sendMessage(jid, payload as never);
      const messageId = sent?.key.id || `media_${Date.now()}`;

      // Recommendation 4: Direct Supabase ingestion fallback
      try {
        await this.supabase.from("crm_whatsapp_events").insert([
          {
            phone: cleanPhone,
            message: caption ? `[${mediaType.toUpperCase()}]: ${caption}` : `[${mediaType.toUpperCase()}] ${mediaUrl}`,
            direction: "outbound",
            status: "sent",
            provider_message_id: messageId,
          },
        ]);
      } catch (dbErr) {
        this.logger.warn({ dbErr }, "Direct Supabase write failed (non-fatal)");
      }

      return { success: true, messageId };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to dispatch media";
      this.logger.error({ err, phone, mediaUrl }, "Failed to send media via Baileys");
      return { error: errMsg };
    }
  }

  public async sendMessage(
    phone: string,
    message: string
  ): Promise<{ success: true; messageId: string } | { error: string }> {
    if (!this.sock || this.connectionState !== "connected") {
      return { error: `WhatsApp is not connected (current state: ${this.connectionState})` };
    }

    const cleanPhone = phone.replace(/[^\d]/g, "");
    if (cleanPhone.length < 8) {
      return { error: `Invalid phone number: ${phone}` };
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;

    try {
      // Human presence simulation: Show typing indicator for 1.2s before transmission
      try {
        await this.sock.sendPresenceUpdate("composing", jid);
        await new Promise((r) => setTimeout(r, 1200));
        await this.sock.sendPresenceUpdate("paused", jid);
      } catch {
        // Continue even if presence update fails
      }

      const sent = await this.sock.sendMessage(jid, { text: message });
      const messageId = sent?.key.id || `msg_${Date.now()}`;

      // Recommendation 4: Direct Supabase ingestion fallback (ensures data safety even if Vercel webhook cold-starts)
      try {
        await this.supabase.from("crm_whatsapp_events").insert([
          {
            phone: cleanPhone,
            message,
            direction: "outbound",
            status: "sent",
            provider_message_id: messageId,
          },
        ]);
      } catch (dbErr) {
        this.logger.warn({ dbErr }, "Direct Supabase write fallback failed (non-fatal)");
      }

      return { success: true, messageId };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to dispatch message";
      this.logger.error({ err, phone }, "Failed to send message via Baileys");
      return { error: errMsg };
    }
  }

  public async logout(): Promise<{ success: boolean }> {
    try {
      if (this.sock) {
        await this.sock.logout();
      }
      if (this.clearCredsFn) {
        await this.clearCredsFn();
      }
      this.connectionState = "logged_out";
      this.connectedPhone = null;
      this.qrCodeDataUrl = null;
      this.init();
      return { success: true };
    } catch (err) {
      this.logger.error({ err }, "Logout error");
      return { success: false };
    }
  }

  public getStatus(): {
    state: ConnectionState;
    phone: string | null;
    qrAvailable: boolean;
  } {
    return {
      state: this.connectionState,
      phone: this.connectedPhone,
      qrAvailable: Boolean(this.qrCodeDataUrl),
    };
  }

  public getQrDataUrl(): string | null {
    return this.qrCodeDataUrl;
  }
}
