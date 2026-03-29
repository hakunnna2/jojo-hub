// Enhanced localStorage manager with error handling, versioning, and backup

const STORAGE_VERSION = '1.0';
const STORAGE_PREFIX = 'gm2_study_hub';

interface StorageData {
  version: string;
  timestamp: number;
  data: Record<string, any>;
}

class StorageManager {
  private prefix = STORAGE_PREFIX;
  private version = STORAGE_VERSION;

  // Get item with error handling
  getItem<T>(key: string, defaultValue: T): T {
    try {
      const fullKey = `${this.prefix}:${key}`;
      const item = localStorage.getItem(fullKey);
      
      if (!item) return defaultValue;

      const parsed = JSON.parse(item);
      return parsed.data ?? defaultValue;
    } catch (error) {
      console.error(`Storage read error for key "${key}":`, error);
      return defaultValue;
    }
  }

  // Set item with error handling and versioning
  setItem<T>(key: string, value: T): boolean {
    try {
      const fullKey = `${this.prefix}:${key}`;
      const data: StorageData = {
        version: this.version,
        timestamp: Date.now(),
        data: value,
      };
      
      localStorage.setItem(fullKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Storage write error for key "${key}":`, error);
      // Fallback: try to clear old data and retry
      try {
        this.clearOldData();
        localStorage.setItem(`${this.prefix}:${key}`, JSON.stringify({
          version: this.version,
          timestamp: Date.now(),
          data: value,
        }));
        return true;
      } catch {
        return false;
      }
    }
  }

  // Remove item
  removeItem(key: string): void {
    try {
      const fullKey = `${this.prefix}:${key}`;
      localStorage.removeItem(fullKey);
    } catch (error) {
      console.error(`Storage remove error for key "${key}":`, error);
    }
  }

  // Clear all app data
  clearAll(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(`${this.prefix}:`)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  // Clear old/corrupted data
  private clearOldData(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(`${this.prefix}:`)) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              // Remove if version mismatch or corrupted
              if (!parsed.version || parsed.version !== this.version) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Error clearing old data:', error);
    }
  }

  // Export all data as JSON
  exportData(): string {
    try {
      const exportData: Record<string, any> = {};
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(`${this.prefix}:`)) {
          const cleanKey = key.replace(`${this.prefix}:`, '');
          const item = localStorage.getItem(key);
          if (item) {
            try {
              exportData[cleanKey] = JSON.parse(item);
            } catch {
              exportData[cleanKey] = item;
            }
          }
        }
      });

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Export data error:', error);
      return '{}';
    }
  }

  // Import data from JSON
  importData(jsonString: string): boolean {
    try {
      const importData = JSON.parse(jsonString);
      
      Object.entries(importData).forEach(([key, value]) => {
        this.setItem(key, value);
      });
      
      return true;
    } catch (error) {
      console.error('Import data error:', error);
      return false;
    }
  }

  // Get storage usage info
  getStorageInfo(): { used: string; available: string; percentage: number } {
    try {
      let used = 0;
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(`${this.prefix}:`)) {
          used += (localStorage.getItem(key) || '').length;
        }
      });

      const usedKb = (used / 1024).toFixed(2);
      const availableKb = (5 * 1024).toFixed(2); // 5MB typical limit
      const percentage = (used / (5 * 1024 * 1024)) * 100;

      return {
        used: `${usedKb} KB`,
        available: `${availableKb} KB`,
        percentage: Math.round(percentage),
      };
    } catch (error) {
      console.error('Storage info error:', error);
      return { used: '0 KB', available: '5 MB', percentage: 0 };
    }
  }
}

export const storage = new StorageManager();
