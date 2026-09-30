import { networkInterfaces } from "os";
import type { NextConfig } from "next";

// The dev server only serves its scripts to localhost by default. Allow this
// machine's own network addresses too, so the game opens by IP from a phone
// or a teammate's laptop on the same Wi-Fi.
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net && net.family === "IPv4" && !net.internal)
  .map((net) => net!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses,
};

export default nextConfig;
