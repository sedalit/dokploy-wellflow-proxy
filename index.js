const http = require("http");
const https = require("https");
const { URL } = require("url");

const target = process.env.TARGET_URL;
if (!target) {
  console.error("TARGET_URL is not set");
  process.exit(1);
}

let baseURL;
try {
  baseURL = new URL(target);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const port = process.env.PORT || "8080";

const ALLOWED_ORIGIN = "https://janitorai.com";

const agents = {
  "http:": new http.Agent({ keepAlive: true }),
  "https:": new https.Agent({ keepAlive: true }),
};

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  if (origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ||
      "Content-Type, Authorization"
  );

  res.setHeader("Access-Control-Max-Age", "86400");
}

const server = http.createServer((req, res) => {
  setCorsHeaders(req, res);

  // Обрабатываем preflight-запрос
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const dest = new URL(baseURL.toString());
  console.log(`Proxying request to: ${dest.toString()}`);

  const transport = dest.protocol === "https:" ? https : http;

  const headers = {
    ...req.headers,
    host: dest.host,
  };

  const proxyReq = transport.request(
    dest,
    {
      method: req.method,
      headers,
      agent: agents[dest.protocol],
    },
    (proxyRes) => {
      // Копируем заголовки целевого сервера
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value !== undefined) {
          res.setHeader(key, value);
        }
      }

      // Повторно выставляем CORS (на случай если целевой сервер их перезаписал)
      setCorsHeaders(req, res);

      res.writeHead(proxyRes.statusCode || 502);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      setCorsHeaders(req, res);
      res.writeHead(502, {
        "Content-Type": "text/plain; charset=utf-8",
      });
    }

    res.end(err.message);
  });

  req.pipe(proxyReq);

  req.on("aborted", () => {
    proxyReq.destroy();
  });
});

server.listen(port, () => {
  console.log(`Listening on :${port}`);
});