import Bonjour from "bonjour-service";

const SERVICE_TYPE = "shareweb";
const SERVICE_PROTOCOL = "tcp";
const SCAN_TIMEOUT_MS = 4000;

export type DiscoveredDevice = {
  id: string;
  name: string;
  host: string;
  port: number;
  addresses: string[];
  txt: Record<string, string>;
};

let activeBrowser: ReturnType<Bonjour["find"]> | null = null;

export function advertiseService(
  name: string,
  port: number,
  txt: Record<string, string> = {}
) {
  const bonjour = new Bonjour();
  const service = bonjour.publish({
    name,
    type: SERVICE_TYPE,
    protocol: SERVICE_PROTOCOL as any,
    port,
    txt,
  });
  service.on("up", () => {});
  return { bonjour, service };
}

export async function discoverDevices(
  selfName: string,
  selfServerId: string,
  timeoutMs = SCAN_TIMEOUT_MS
): Promise<DiscoveredDevice[]> {
  if (activeBrowser) {
    activeBrowser.stop();
    activeBrowser = null;
  }

  const bonjour = new Bonjour();
  const devices: DiscoveredDevice[] = [];
  const selfTxt = { serverId: selfServerId };

  const browser: ReturnType<Bonjour["find"]> = bonjour.find(
    { type: SERVICE_TYPE, protocol: SERVICE_PROTOCOL as any, txt: selfTxt },
    (service: any) => {
      const txt: Record<string, string> = {};
      for (const k in service.txt || {}) txt[k] = String(service.txt[k]);
      if (txt.serverId === selfServerId) return;
      const entry: DiscoveredDevice = {
        id: service.fqdn || service.name,
        name: service.name,
        host: service.host || service.referer?.address || "",
        port: service.port || 0,
        addresses: service.addresses || [],
        txt,
      };
      const existing = devices.find((d) => d.id === entry.id);
      if (!existing) {
        devices.push(entry);
      }
    }
  );
  activeBrowser = browser;
  browser.start();

  await new Promise((resolve) => setTimeout(resolve, timeoutMs));

  if (activeBrowser) {
    activeBrowser.stop();
    activeBrowser = null;
  }
  bonjour.destroy();

  return devices;
}

export function stopDiscovery() {
  if (activeBrowser) {
    activeBrowser.stop();
    activeBrowser = null;
  }
}
