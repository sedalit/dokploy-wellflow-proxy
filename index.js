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

const agents = {
  "http:": new http.Agent({ keepAlive: true }),
  "https:": new https.Agent({ keepAlive: true }),
};

const server = http.createServer((req, res) => {
  const dest = new URL(baseURL.toString());
  const incoming = new URL(req.url, "http://placeholder");
  dest.pathname = incoming.pathname;
  dest.search = incoming.search;

  console.log(`Proxying request to: ${dest.toString()}`);

  const transport = dest.protocol === "https:" ? https : http;

  // Go's http.Client ignores the Host header from the map and uses the URL host.
  const headers = { ...req.headers, host: dest.host };

  const proxyReq = transport.request(
    dest,
    {
      method: req.method,
      headers,
      agent: agents[dest.protocol],
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    }
    res.end(err.message);
  });

  req.pipe(proxyReq);
  req.on("aborted", () => proxyReq.destroy());
});

server.listen(port, () => {
  console.log(`Listening on :${port}`);
});
