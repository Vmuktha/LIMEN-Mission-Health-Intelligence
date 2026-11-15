"use client";

import { useEffect, useState } from "react";
import { LIMEN_DATABASE_NAME, LIMEN_DATABASE_VERSION } from "@/lib/storage/database";

type NetworkState = "checking" | "online" | "offline";
type DatabaseState = "checking" | "detected" | "missing" | "unsupported" | "unknown";

export function StorageStatus({ compact = false }: { readonly compact?: boolean }) {
  const [network, setNetwork] = useState<NetworkState>("checking");
  const [database, setDatabase] = useState<DatabaseState>("checking");

  useEffect(() => {
    const updateNetwork = () => setNetwork(navigator.onLine ? "online" : "offline");
    const initialNetworkCheck = window.setTimeout(updateNetwork, 0);
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);

    let active = true;
    const databases = globalThis.indexedDB?.databases;
    if (!globalThis.indexedDB) queueMicrotask(() => { if (active) setDatabase("unsupported"); });
    else if (!databases) queueMicrotask(() => { if (active) setDatabase("unknown"); });
    else {
      void databases.call(globalThis.indexedDB).then((listed) => {
        if (!active) return;
        const found = listed.find((entry) => entry.name === LIMEN_DATABASE_NAME);
        setDatabase(found ? typeof found.version === "number" && found.version <= LIMEN_DATABASE_VERSION ? "detected" : "unknown" : "missing");
      }).catch(() => { if (active) setDatabase("unknown"); });
    }

    return () => {
      active = false;
      window.clearTimeout(initialNetworkCheck);
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, []);

  const networkLabel = network === "checking" ? "Checking connection" : network === "online" ? "Browser reports online" : "Browser reports offline";
  const storageLabel = database === "checking" ? "Checking local database" : database === "detected" ? "Existing local database detected · write access unverified" : database === "missing" ? "No local database yet · write access untested" : database === "unsupported" ? "IndexedDB unavailable" : "Local database status not verifiable";
  const networkTone = network === "online" ? "text-ion-soft" : network === "offline" ? "text-amber-200" : "text-glow-muted";
  const storageTone = database === "detected" ? "text-ion-soft" : database === "unsupported" || database === "missing" ? "text-amber-200" : "text-glow-muted";

  return (
    <div className={compact ? "flex flex-wrap gap-x-5 gap-y-2 text-xs" : "flex flex-col gap-3 rounded-panel border border-horizon/70 bg-void/55 p-4 text-xs sm:flex-row sm:items-start sm:justify-between"} aria-label="Connection and local storage status">
      <p className={networkTone}><span className="font-semibold">Connection:</span> {networkLabel}<span className="sr-only">. This reports the browser network flag, not end-to-end service reachability.</span></p>
      <p className={storageTone}><span className="font-semibold">Storage:</span> {storageLabel}<span className="sr-only">. Checking status does not open, upgrade, or write to the database.</span></p>
    </div>
  );
}
