import { createServer } from "node:http";
import { createHash } from "node:crypto";
export async function createCollector(canary: string) {
  if (!/^FAKE_CANARY_57_[A-Za-z0-9-]+$/.test(canary))
    throw new Error("Collector requires a fake classroom canary.");
  const requests: any[] = [];
  const server = createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/collect") {
      res.writeHead(404);
      res.end();
      return;
    }
    let body = "";
    req.on("data", (c) => {
      body += c.toString();
      if (body.length > 512) req.destroy();
    });
    req.on("end", () => {
      if (body !== canary) {
        res.writeHead(400);
        res.end("Only the generated fake canary is accepted.");
        return;
      }
      requests.push({
        at: new Date().toISOString(),
        fakeCanaryReceived: true,
        payloadHash: createHash("sha256").update(body).digest("hex"),
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"receivedFakeCanary":true}');
    });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Collector address unavailable.");
  const url = `http://127.0.0.1:${address.port}/collect`;
  return {
    requests,
    url,
    async sendFake(payload: string) {
      if (payload !== canary)
        throw new Error(
          "Only this run’s generated fake canary may leave the handler.",
        );
      const r = await fetch(url, {
        method: "POST",
        body: payload,
        redirect: "error",
        signal: AbortSignal.timeout(3000),
      });
      if (!r.ok) throw new Error("Collector rejected payload.");
      return await r.json();
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((ok) => server.close(() => ok()));
    },
  };
}
