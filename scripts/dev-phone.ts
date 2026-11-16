import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { renderUnicodeCompact } from "uqr";

// `bun run dev:phone`: the dev server, opened on a phone through a Cloudflare
// quick tunnel (`brew install cloudflared`). The tunnel gives it an https
// address, which the editor needs: browsers only offer crypto.randomUUID on
// https or localhost, so the Mac's own address over Wi-Fi won't do. The
// address is new each run and open to anyone who has it until this stops.
const port = Number(process.env.PORT) || 3000;
const TUNNEL_ADDRESS = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

const devServer = spawn(
  "bun",
  ["run", "dev", "--port", String(port), "--strictPort"],
  {
    env: {
      ...process.env,
      // Vite only answers the hosts it knows, and each tunnel's is new.
      __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: ".trycloudflare.com"
    },
    stdio: "inherit"
  }
);
const tunnel = spawn(
  "cloudflared",
  ["tunnel", "--no-autoupdate", "--url", `http://localhost:${port}`],
  { stdio: ["ignore", "ignore", "pipe"] }
);
let address: string | undefined;
let isAnnounced = false;

function stop(exitCode: number) {
  devServer.kill();
  tunnel.kill();
  process.exit(exitCode);
}

tunnel.on("error", () => {
  console.error("cloudflared isn't installed: brew install cloudflared");
  stop(1);
});
devServer.on("exit", code => stop(code ?? 0));
tunnel.on("exit", code => stop(code ?? 0));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

// cloudflared logs to stderr. It names the address before the tunnel is up,
// so the address is announced, once and with a QR code to scan, when the
// first connection registers. Only its errors are passed on.
createInterface({ input: tunnel.stderr }).on("line", line => {
  if (line.includes(" ERR ")) console.error(line);

  address ??= TUNNEL_ADDRESS.exec(line)?.[0];

  if (
    address &&
    !isAnnounced &&
    line.includes("Registered tunnel connection")
  ) {
    isAnnounced = true;
    console.log(`\nOn your phone: ${address}\n`);
    console.log(renderUnicodeCompact(address));
  }
});
