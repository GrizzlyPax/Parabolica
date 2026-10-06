var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
__name(randomCode, "randomCode");
function randomKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 32);
}
__name(randomKey, "randomKey");
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Commissioner-Key",
  "Access-Control-Max-Age": "86400"
};
function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS, ...extra } });
}
__name(json, "json");
function error(message, status) {
  return json({ error: message, serverNow: Date.now() }, status);
}
__name(error, "error");
var MAX_BODY = 256 * 1024;
var src_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    if (path === "/api/health") return json({ ok: true, serverNow: Date.now() });
    if (path === "/api/leagues" && request.method === "POST") {
      const body = await readJson(request);
      if (!body || typeof body !== "object" || !("definition" in body)) return error("expected {definition}", 400);
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode();
        const stub = env.LEAGUE.get(env.LEAGUE.idFromName(code));
        const res = await stub.fetch(new Request(`https://league/create`, { method: "POST", body: JSON.stringify({ code, definition: body.definition }), headers: { "Content-Type": "application/json" } }));
        if (res.status === 409) continue;
        return res;
      }
      return error("could not allocate a code", 503);
    }
    const m = path.match(/^\/api\/leagues\/([A-Z0-9]{4,12})(?:\/(decrees|digests|version))?$/i);
    if (m) {
      const code = m[1].toUpperCase();
      const stub = env.LEAGUE.get(env.LEAGUE.idFromName(code));
      const sub = m[2] ?? "";
      const target = new URL(`https://league/${sub || "state"}`);
      return stub.fetch(new Request(target.toString(), request));
    }
    return error("not found", 404);
  }
};
async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
__name(readJson, "readJson");
var LeagueObject = class {
  static {
    __name(this, "LeagueObject");
  }
  state;
  constructor(state) {
    this.state = state;
  }
  async load() {
    return this.state.storage.get("league");
  }
  async save(rec) {
    rec.version += 1;
    await this.state.storage.put("league", rec);
  }
  async fetch(request) {
    const url = new URL(request.url);
    const op = url.pathname.slice(1);
    const rec = await this.load();
    if (op === "create") {
      if (rec) return error("code taken", 409);
      const body = await readJson(request);
      if (!body) return error("bad body", 400);
      const fresh = { code: body.code, createdAt: Date.now(), commissionerKey: randomKey(), definition: body.definition, decrees: [], digests: {}, version: 0 };
      await this.save(fresh);
      return json({ code: fresh.code, commissionerKey: fresh.commissionerKey, version: fresh.version, serverNow: Date.now() }, 201);
    }
    if (!rec) return error("no such league", 404);
    if (op === "state" && request.method === "GET") {
      return json({ code: rec.code, createdAt: rec.createdAt, definition: rec.definition, decrees: rec.decrees, digests: rec.digests, version: rec.version, serverNow: Date.now() });
    }
    if (op === "version" && request.method === "GET") {
      return json({ version: rec.version, serverNow: Date.now() });
    }
    if (op === "decrees" && request.method === "POST") {
      if (request.headers.get("X-Commissioner-Key") !== rec.commissionerKey) return error("not the commissioner", 403);
      const body = await readJson(request);
      if (!body?.decree || typeof body.decree !== "object") return error("expected {decree}", 400);
      rec.decrees.push(body.decree);
      await this.save(rec);
      return json({ decrees: rec.decrees, version: rec.version, serverNow: Date.now() });
    }
    if (op === "digests" && request.method === "POST") {
      const body = await readJson(request);
      if (!body || typeof body.index !== "number" || typeof body.fingerprint !== "string" || body.digest === void 0) return error("expected {index, fingerprint, digest}", 400);
      const key = String(body.index);
      const have = rec.digests[key];
      if (!have) {
        rec.digests[key] = { fingerprint: body.fingerprint, digest: body.digest, postedAt: Date.now() };
        await this.save(rec);
        return json({ result: "stored", version: rec.version, serverNow: Date.now() });
      }
      if (have.fingerprint === body.fingerprint) return json({ result: "matched", version: rec.version, serverNow: Date.now() });
      return json({ result: "conflict", canonical: have, version: rec.version, serverNow: Date.now() }, 409);
    }
    return error("not found", 404);
  }
};

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error2 = reduceError(e);
    const body = JSON.stringify(error2);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-52ismm/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-52ismm/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  LeagueObject,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
