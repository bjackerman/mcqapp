export class LocalStorageAdapter {
  constructor(key, legacyKeys = []) {
    this.key = key;
    this.legacyKeys = legacyKeys;
  }

  isAvailable() {
    return typeof localStorage !== 'undefined';
  }

  get() {
    if (!this.isAvailable()) return null;

    // Try primary key first
    const raw = localStorage.getItem(this.key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        localStorage.removeItem(this.key);
      }
    }

    // Try legacy keys
    for (const legacyKey of this.legacyKeys) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;

      try {
        const data = JSON.parse(legacyRaw);
        // If we found legacy data, move it to the new key and clear old ones
        this.save(data);
        this.clearLegacy();
        return data;
      } catch {
        localStorage.removeItem(legacyKey);
      }
    }

    return null;
  }

  save(data) {
    if (!this.isAvailable()) return;
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  clear() {
    if (!this.isAvailable()) return;
    localStorage.removeItem(this.key);
  }

  clearLegacy() {
    if (!this.isAvailable()) return;
    for (const legacyKey of this.legacyKeys) {
      localStorage.removeItem(legacyKey);
    }
  }
}
