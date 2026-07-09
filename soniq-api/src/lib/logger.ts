import { createRequire } from "node:module";
import pino, { type Logger, type LoggerOptions } from "pino";

/**
 * Single shared structured logger for the API.
 *
 * - Level comes from LOG_LEVEL (default "info").
 * - In non-production, pretty-prints via pino-pretty when that dev dependency
 *   is installed; otherwise (and always in production) emits line-delimited JSON
 *   suitable for log shippers.
 * - Error-shaped fields are run through pino's standard error serializer so a
 *   full stack trace is captured. The serializer is a no-op for non-error values,
 *   so it is safe to attach it to the common "carries an error" field names.
 *
 * Usage mirrors pino's signature: logger.info(msgOrObj, msg?). Attach structured
 * data as the first argument object, e.g. logger.error({ err }, "failed to X").
 */

const require = createRequire(import.meta.url);

const isProduction = process.env.NODE_ENV === "production";
// Vitest sets VITEST=true. Never spawn a pretty-print worker thread during tests:
// it complicates teardown and adds no value to captured test output.
const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

const errSerializer = pino.stdSerializers.err;

// Field names that, by convention in this codebase, carry an Error (or an
// error-ish value). Serializing them yields { type, message, stack }.
const serializers: LoggerOptions["serializers"] = {
  err: errSerializer,
  error: errSerializer,
  e: errSerializer,
  ex: errSerializer,
  errors: errSerializer,
  routingError: errSerializer,
  errorText: errSerializer,
};

function prettyTransport(): LoggerOptions["transport"] | undefined {
  if (isProduction || isTest) return undefined;
  try {
    // Only enable pretty printing when pino-pretty is actually resolvable.
    require.resolve("pino-pretty");
    return {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    };
  } catch {
    return undefined;
  }
}

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL || "info",
  serializers,
};

const transport = prettyTransport();
if (transport) {
  options.transport = transport;
}

export const logger: Logger = pino(options);

export type { Logger };
