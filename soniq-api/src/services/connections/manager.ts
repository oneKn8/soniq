// Connection Manager
// Pools WebSocket connections for STT/TTS to reduce latency

import WebSocket from "ws";
import { GoogleGenerativeAI } from "@google/generative-ai";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";
const CARTESIA_WS_URL = "wss://api.cartesia.ai/tts/websocket";

// Pool configuration
const POOL_CONFIG = {
  deepgram: { min: 3, max: 10 },
  cartesia: { min: 3, max: 10 },
};

interface PooledConnection {
  ws: WebSocket;
  createdAt: number;
  lastUsed: number;
}

class ConnectionManager {
  private static instance: ConnectionManager;

  private deepgramPool: PooledConnection[] = [];
  private cartesiaPool: PooledConnection[] = [];
  private geminiClient: GoogleGenerativeAI | null = null;

  private isWarming = false;

  private constructor() {
    // Initialize on first getInstance() call
  }

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  // Pre-warm connections on startup
  async warmConnections(): Promise<void> {
    if (this.isWarming) return;
    this.isWarming = true;

    console.log("[CONN] Warming connection pools...");

    try {
      // Pre-create Deepgram connections
      const deepgramPromises = [];
      for (let i = 0; i < POOL_CONFIG.deepgram.min; i++) {
        deepgramPromises.push(this.createDeepgramConnection());
      }

      // Pre-create Cartesia connections
      const cartesiaPromises = [];
      for (let i = 0; i < POOL_CONFIG.cartesia.min; i++) {
        cartesiaPromises.push(this.createCartesiaConnection());
      }

      // Wait for all connections
      const deepgramResults = await Promise.allSettled(deepgramPromises);
      const cartesiaResults = await Promise.allSettled(cartesiaPromises);

      // Add successful connections to pools
      for (const result of deepgramResults) {
        if (result.status === "fulfilled" && result.value) {
          this.deepgramPool.push(result.value);
        }
      }

      for (const result of cartesiaResults) {
        if (result.status === "fulfilled" && result.value) {
          this.cartesiaPool.push(result.value);
        }
      }

      // Initialize Gemini client
      if (GEMINI_API_KEY) {
        this.geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
      }

      console.log(
        `[CONN] Warmed ${this.deepgramPool.length} Deepgram + ${this.cartesiaPool.length} Cartesia connections`,
      );
    } catch (error) {
      console.error("[CONN] Failed to warm connections:", error);
    } finally {
      this.isWarming = false;
    }
  }

  // Get a Deepgram connection from pool or create new
  async getDeepgramConnection(): Promise<WebSocket> {
    // Try to get from pool
    const pooled = this.deepgramPool.shift();
    if (pooled && pooled.ws.readyState === WebSocket.OPEN) {
      pooled.lastUsed = Date.now();
      return pooled.ws;
    }

    // Create new if pool empty
    const connection = await this.createDeepgramConnection();
    if (connection) {
      return connection.ws;
    }

    throw new Error("Failed to get Deepgram connection");
  }

  // Return Deepgram connection to pool
  returnDeepgramConnection(ws: WebSocket): void {
    if (
      ws.readyState === WebSocket.OPEN &&
      this.deepgramPool.length < POOL_CONFIG.deepgram.max
    ) {
      this.deepgramPool.push({
        ws,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });
    } else {
      ws.close();
    }
  }

  // Get a Cartesia connection from pool or create new
  async getCartesiaConnection(): Promise<WebSocket> {
    // Try to get from pool
    const pooled = this.cartesiaPool.shift();
    if (pooled && pooled.ws.readyState === WebSocket.OPEN) {
      pooled.lastUsed = Date.now();
      return pooled.ws;
    }

    // Create new if pool empty
    const connection = await this.createCartesiaConnection();
    if (connection) {
      return connection.ws;
    }

    throw new Error("Failed to get Cartesia connection");
  }

  // Return Cartesia connection to pool
  returnCartesiaConnection(ws: WebSocket): void {
    if (
      ws.readyState === WebSocket.OPEN &&
      this.cartesiaPool.length < POOL_CONFIG.cartesia.max
    ) {
      this.cartesiaPool.push({
        ws,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });
    } else {
      ws.close();
    }
  }

  // Get Gemini client
  getGeminiClient(): GoogleGenerativeAI | null {
    return this.geminiClient;
  }

  // Create a new Deepgram WebSocket connection
  private async createDeepgramConnection(): Promise<PooledConnection | null> {
    if (!DEEPGRAM_API_KEY) {
      console.warn("[CONN] DEEPGRAM_API_KEY not set");
      return null;
    }

    return new Promise((resolve) => {
      const url = `${DEEPGRAM_WS_URL}?model=nova-2-phonecall&language=en-US&smart_format=true&interim_results=true&utterance_end_ms=1000`;

      const ws = new WebSocket(url, {
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
        },
      });

      const timeout = setTimeout(() => {
        ws.close();
        resolve(null);
      }, 5000);

      ws.on("open", () => {
        clearTimeout(timeout);
        resolve({
          ws,
          createdAt: Date.now(),
          lastUsed: Date.now(),
        });
      });

      ws.on("error", () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  }

  // Create a new Cartesia WebSocket connection
  private async createCartesiaConnection(): Promise<PooledConnection | null> {
    if (!CARTESIA_API_KEY) {
      console.warn("[CONN] CARTESIA_API_KEY not set");
      return null;
    }

    return new Promise((resolve) => {
      const url = `${CARTESIA_WS_URL}?api_key=${CARTESIA_API_KEY}&cartesia_version=2024-06-10`;

      const ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        ws.close();
        resolve(null);
      }, 5000);

      ws.on("open", () => {
        clearTimeout(timeout);
        resolve({
          ws,
          createdAt: Date.now(),
          lastUsed: Date.now(),
        });
      });

      ws.on("error", () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  }

  // Clean up stale connections periodically
  cleanup(): void {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    // Clean Deepgram pool
    this.deepgramPool = this.deepgramPool.filter((conn) => {
      if (
        now - conn.lastUsed > maxAge ||
        conn.ws.readyState !== WebSocket.OPEN
      ) {
        conn.ws.close();
        return false;
      }
      return true;
    });

    // Clean Cartesia pool
    this.cartesiaPool = this.cartesiaPool.filter((conn) => {
      if (
        now - conn.lastUsed > maxAge ||
        conn.ws.readyState !== WebSocket.OPEN
      ) {
        conn.ws.close();
        return false;
      }
      return true;
    });
  }

  // Get pool stats for monitoring
  getStats(): {
    deepgram: number;
    cartesia: number;
    geminiInitialized: boolean;
  } {
    return {
      deepgram: this.deepgramPool.length,
      cartesia: this.cartesiaPool.length,
      geminiInitialized: this.geminiClient !== null,
    };
  }
}

// Export singleton
export const connectionManager = ConnectionManager.getInstance();

// Export for direct access
export { ConnectionManager };
