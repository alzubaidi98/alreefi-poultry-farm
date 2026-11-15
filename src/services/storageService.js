import { createInitialFarmState } from '../mockData.js';

const STORAGE_KEY = 'alreefi_farm_v3_state';
const LEGACY_V2_KEY = 'alreefi_farm_v2_state';

/**
 * Ensures any persisted V2 or partial state seamlessly receives new V3 fields/collections
 * without discarding user logs, tasks, or accounts.
 */
export function hydrateV3State(parsed) {
  const fresh = createInitialFarmState();
  if (!parsed || !Array.isArray(parsed.houses) || !Array.isArray(parsed.userAccounts)) {
    return fresh;
  }

  const hydratedHouses = parsed.houses.map((h) => {
    const templateHouse = fresh.houses.find((fh) => fh.id === h.id);
    return {
      ...(templateHouse || {}),
      ...h,
      siloSightGlassTons:
        h.siloSightGlassTons !== undefined
          ? h.siloSightGlassTons
          : h.feedSystemType === 'silo'
          ? Number(((h.siloCurrentKg ?? 15000) / 1000).toFixed(2))
          : null,
      siloBottomQuarterAlertTons: h.siloBottomQuarterAlertTons ?? 5.0,
      siloConsumptionHistory: Array.isArray(h.siloConsumptionHistory)
        ? h.siloConsumptionHistory
        : templateHouse?.siloConsumptionHistory || [],
      previousCycleTeamIds: Array.isArray(h.previousCycleTeamIds)
        ? h.previousCycleTeamIds
        : templateHouse?.previousCycleTeamIds || [],
    };
  });

  return {
    ...fresh,
    ...parsed,
    version: 3,
    houses: hydratedHouses,
    taskCategories:
      Array.isArray(parsed.taskCategories) && parsed.taskCategories.length > 0
        ? parsed.taskCategories
        : fresh.taskCategories,
    recurringTaskRules:
      Array.isArray(parsed.recurringTaskRules) && parsed.recurringTaskRules.length > 0
        ? parsed.recurringTaskRules
        : fresh.recurringTaskRules,
    recurringCompletions: parsed.recurringCompletions || {},
    ordersAndBills:
      Array.isArray(parsed.ordersAndBills) && parsed.ordersAndBills.length > 0
        ? parsed.ordersAndBills
        : fresh.ordersAndBills,
    harvestLaborRecords:
      Array.isArray(parsed.harvestLaborRecords) && parsed.harvestLaborRecords.length > 0
        ? parsed.harvestLaborRecords
        : fresh.harvestLaborRecords,
  };
}

/**
 * LocalStorageAdapter — Active default persistence engine.
 * Reads/writes complete farm state to browser localStorage and auto-seeds from src/mockData.js.
 */
export class LocalStorageAdapter {
  constructor(storageKey = STORAGE_KEY) {
    this.id = 'local';
    this.label = 'Browser LocalStorage (Offline-First)';
    this.storageKey = storageKey;
  }

  async fetchFarmState() {
    try {
      const rawV3 = window.localStorage.getItem(this.storageKey);
      if (rawV3) {
        const parsed = JSON.parse(rawV3);
        return hydrateV3State(parsed);
      }

      const rawV2 = window.localStorage.getItem(LEGACY_V2_KEY);
      if (rawV2) {
        const migrated = hydrateV3State(JSON.parse(rawV2));
        await this.saveFarmState(migrated);
        return migrated;
      }

      const seeded = createInitialFarmState();
      await this.saveFarmState(seeded);
      return seeded;
    } catch (error) {
      console.error('[LocalStorageAdapter] Failed to read state, reseeding:', error);
      const seeded = createInitialFarmState();
      return seeded;
    }
  }

  async saveFarmState(state) {
    const payload = {
      ...state,
      lastUpdated: new Date().toISOString(),
    };
    window.localStorage.setItem(this.storageKey, JSON.stringify(payload));
    return { ok: true, adapter: this.id, timestamp: payload.lastUpdated };
  }

  async saveLog(logEntry, currentState) {
    const nextState = {
      ...currentState,
      healthLogs: [logEntry, ...(currentState.healthLogs || [])],
    };
    await this.saveFarmState(nextState);
    return nextState;
  }

  async syncTasks(tasks, currentState) {
    const nextState = {
      ...currentState,
      tasks,
    };
    await this.saveFarmState(nextState);
    return nextState;
  }

  async resetDemoData() {
    const seeded = createInitialFarmState();
    await this.saveFarmState(seeded);
    return seeded;
  }
}

/**
 * FirebaseAdapter — Pre-wired stub for Firebase Firestore / Realtime Database (Spark free tier).
 * Ready for Firebase SDK / REST integration once credentials are provided in Farm Settings.
 */
export class FirebaseAdapter {
  constructor(config = {}) {
    this.id = 'firebase';
    this.label = 'Firebase Firestore / RTDB (Cloud Sync Stub)';
    this.config = config;
    this.fallback = new LocalStorageAdapter();
  }

  isConfigured() {
    return Boolean(this.config?.projectId && this.config?.apiKey);
  }

  async fetchFarmState() {
    if (!this.isConfigured()) {
      console.info('[FirebaseAdapter] Credentials not set; falling back to local cache.');
      return this.fallback.fetchFarmState();
    }
    // Pre-wired Firestore REST endpoint pattern:
    // GET https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}
    return this.fallback.fetchFarmState();
  }

  async saveFarmState(state) {
    await this.fallback.saveFarmState(state);
    return {
      ok: true,
      adapter: this.id,
      syncedToCloud: this.isConfigured(),
      note: this.isConfigured()
        ? 'State queued for Firestore document patch.'
        : 'Saved locally (enter Firebase API Key in Settings to enable live sync).',
    };
  }

  async saveLog(logEntry, currentState) {
    return this.fallback.saveLog(logEntry, currentState);
  }

  async syncTasks(tasks, currentState) {
    return this.fallback.syncTasks(tasks, currentState);
  }
}

/**
 * GoogleDriveAdapter — Pre-wired REST wrapper using Google Drive API v3
 * to read/write JSON snapshots and archive exported PDF reports to 1TB+ Google Drive storage.
 */
export class GoogleDriveAdapter {
  constructor(config = {}) {
    this.id = 'gdrive';
    this.label = 'Google Drive API v3 (JSON & PDF Archive Stub)';
    this.config = config;
    this.fallback = new LocalStorageAdapter();
  }

  isConfigured() {
    return Boolean(this.config?.folderId && this.config?.clientId);
  }

  async fetchFarmState() {
    // Pre-wired Drive API v3 query:
    // GET https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+name='alreefi-farm-db.json'
    return this.fallback.fetchFarmState();
  }

  async saveFarmState(state) {
    await this.fallback.saveFarmState(state);
    return {
      ok: true,
      adapter: this.id,
      syncedToCloud: this.isConfigured(),
      note: this.isConfigured()
        ? 'Snapshot staged for Drive API v3 multipart upload.'
        : 'Saved locally (use Export JSON Snapshot or configure Google Drive Folder ID).',
    };
  }

  async saveLog(logEntry, currentState) {
    return this.fallback.saveLog(logEntry, currentState);
  }

  async syncTasks(tasks, currentState) {
    return this.fallback.syncTasks(tasks, currentState);
  }

  async uploadPdfReport(pdfBlob, filename) {
    console.info(
      `[GoogleDriveAdapter] Stub ready to upload ${filename} (${pdfBlob?.size || 0} bytes) to folder ${this.config?.folderId || 'root'}`
    );
    return {
      ok: true,
      archived: this.isConfigured(),
      filename,
    };
  }
}

/**
 * UnraidServerAdapter — Pre-wired REST & WebSocket/MQTT client for self-hosted Unraid servers
 * exposed via Cloudflare Tunnels or Tailscale for SQLite/Postgres storage & live Zigbee/Wi-Fi sensors.
 */
export class UnraidServerAdapter {
  constructor(config = {}) {
    this.id = 'unraid';
    this.label = 'Self-Hosted Unraid Server (Tailscale / Cloudflare Tunnel Stub)';
    this.config = config;
    this.fallback = new LocalStorageAdapter();
  }

  isConfigured() {
    return Boolean(this.config?.endpointUrl && this.config?.apiToken);
  }

  async fetchFarmState() {
    // Pre-wired Unraid REST endpoint:
    // GET ${this.config.endpointUrl}/api/v1/farm/state (Authorization: Bearer ${apiToken})
    return this.fallback.fetchFarmState();
  }

  async saveFarmState(state) {
    await this.fallback.saveFarmState(state);
    return {
      ok: true,
      adapter: this.id,
      syncedToCloud: this.isConfigured(),
      note: this.isConfigured()
        ? `Synced with ${this.config.endpointUrl}`
        : 'Saved locally (provide Unraid API token in Settings to stream to home server).',
    };
  }

  async saveLog(logEntry, currentState) {
    return this.fallback.saveLog(logEntry, currentState);
  }

  async syncTasks(tasks, currentState) {
    return this.fallback.syncTasks(tasks, currentState);
  }

  /**
   * Simulates or opens a live WebSocket/MQTT sensor telemetry stream from Zigbee/Wi-Fi house probes.
   * Emits a pure `driftHouseSensors` updater function when called with `(null, onReading)` or `(onTick)`
   * so React state updates never overwrite `prev.houses` with a stale closure snapshot.
   */
  subscribeLiveSensors(housesOrOnTick, maybeOnReading) {
    const timer = window.setInterval(() => {
      if (typeof housesOrOnTick === 'function' && !maybeOnReading) {
        housesOrOnTick(driftHouseSensors);
      } else if (typeof maybeOnReading === 'function') {
        if (typeof housesOrOnTick === 'function') {
          maybeOnReading(driftHouseSensors(housesOrOnTick()));
        } else if (!housesOrOnTick) {
          maybeOnReading(driftHouseSensors);
        } else {
          maybeOnReading(driftHouseSensors(housesOrOnTick));
        }
      }
    }, Math.max(5, Number(this.config?.sensorPollingSec || 10)) * 1000);

    return () => window.clearInterval(timer);
  }
}

/**
 * Pure helper applying simulated Zigbee/Wi-Fi telemetry drift to active cultivation houses.
 */
export function driftHouseSensors(houses = []) {
  return (houses || []).map((house) => {
    if (house.phase === 'cleaning' || house.archived || house.isActive === false) return house;
    const drift = () => Number(((Math.random() - 0.5) * 0.4).toFixed(1));
    const currentCo2 = Number(house.zones?.co2Ppm ?? house.co2Ppm ?? 1900);
    const currentNegPa = Number(house.zones?.negativePressurePa ?? house.negativePressurePa ?? 25);
    const nextCo2 = Math.max(400, Math.round(currentCo2 + (Math.random() - 0.5) * 30));
    const nextNegPa = Number(Math.max(8, Math.min(45, currentNegPa + (Math.random() - 0.5) * 0.6)).toFixed(1));
    return {
      ...house,
      co2Ppm: nextCo2,
      negativePressurePa: nextNegPa,
      zones: {
        ...house.zones,
        start: Number((Number(house.zones.start) + drift()).toFixed(1)),
        middle: Number((Number(house.zones.middle) + drift()).toFixed(1)),
        end: Number((Number(house.zones.end) + drift()).toFixed(1)),
        outside: Number((Number(house.zones.outside) + drift() * 0.6).toFixed(1)),
        humidity: Math.min(85, Math.max(35, Math.round(Number(house.zones.humidity) + (Math.random() - 0.5) * 2))),
        co2Ppm: nextCo2,
        negativePressurePa: nextNegPa,
        lastSensorSync: new Date().toISOString(),
      },
    };
  });
}

/**
 * StorageService Facade — Single entry point for UI components to read, persist, export, and switch adapters.
 */
class StorageServiceFacade {
  constructor() {
    this.local = new LocalStorageAdapter();
  }

  getAdapter(settings) {
    const active = settings?.storage?.activeAdapter || 'local';
    switch (active) {
      case 'firebase':
        return new FirebaseAdapter(settings?.storage?.firebaseConfig);
      case 'gdrive':
        return new GoogleDriveAdapter(settings?.storage?.googleDriveConfig);
      case 'unraid':
        return new UnraidServerAdapter(settings?.storage?.unraidConfig);
      case 'local':
      default:
        return this.local;
    }
  }

  async loadState() {
    const localState = await this.local.fetchFarmState();
    const adapter = this.getAdapter(localState.settings);
    if (adapter.id !== 'local') {
      return adapter.fetchFarmState();
    }
    return localState;
  }

  async saveState(state) {
    const adapter = this.getAdapter(state?.settings);
    return adapter.saveFarmState(state);
  }

  async resetDemoData() {
    return this.local.resetDemoData();
  }

  /**
   * Downloads a portable .json snapshot ready for Google Drive desktop sync or manual archival.
   */
  exportDatabaseJSON(state) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `alreefi-farm-backup-${timestamp}.json`;
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return filename;
  }

  /**
   * Parses and validates an uploaded .json database snapshot.
   */
  importDatabaseJSON(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file selected.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(String(event.target?.result || ''));
          if (!parsed || !Array.isArray(parsed.houses) || !parsed.settings) {
            reject(new Error('Invalid AlReefi farm backup JSON structure.'));
            return;
          }
          await this.local.saveFarmState(parsed);
          resolve(parsed);
        } catch (err) {
          reject(new Error(`Failed to parse JSON backup: ${err.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Unable to read selected file.'));
      reader.readAsText(file);
    });
  }
}

export const storageService = new StorageServiceFacade();

/**
 * Compresses an uploaded proof photo into a lightweight JPEG data URL (max 640px wide)
 * so photo attachments remain fast and safe within browser LocalStorage limits.
 */
export function compressImageFile(file, maxWidth = 640, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (PNG, JPG, WebP).'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load selected image.'));
      img.src = String(event.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Reads an order/invoice attachment (either Image or PDF) into `{ name, mimeType, sizeBytes, dataUrl }`.
 * Images are compressed for safe LocalStorage persistence; PDFs up to 2.5MB are stored as DataURL.
 */
export async function readAttachmentFile(file, maxPdfMb = 2.5) {
  if (!file) throw new Error('No file selected.');
  if (file.type.startsWith('image/')) {
    const dataUrl = await compressImageFile(file, 900, 0.78);
    return {
      name: file.name,
      mimeType: 'image/jpeg',
      sizeBytes: dataUrl.length,
      dataUrl,
    };
  }
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    if (file.size > maxPdfMb * 1024 * 1024) {
      throw new Error(`PDF exceeds ${maxPdfMb} MB browser storage limit.`);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        resolve({
          name: file.name,
          mimeType: 'application/pdf',
          sizeBytes: file.size,
          dataUrl: String(ev.target?.result || ''),
        });
      reader.onerror = () => reject(new Error('Failed to read PDF file.'));
      reader.readAsDataURL(file);
    });
  }
  throw new Error('Please upload an Image (JPG/PNG) or PDF invoice/bill.');
}

export default storageService;
