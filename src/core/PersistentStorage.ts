import fs from 'fs';
import path from 'path';
import { ConfigManager } from './ConfigManager';

export class PersistentStorage {
  private config = new ConfigManager();
  private dbPath: string;

  constructor() {
    const dir = this.config.getLogsDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.dbPath = path.resolve(dir, 'system_db.json');
    if (!fs.existsSync(this.dbPath)) {
      fs.writeFileSync(this.dbPath, JSON.stringify({ logs: [], knowledge: [] }));
    }
  }

  saveData(key: string, data: any) {
    try {
      const db = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
      if (!db[key]) db[key] = [];
      db[key].push(data);
      fs.writeFileSync(this.dbPath, JSON.stringify(db, null, 2));
    } catch (e) {
      console.error('[PERSISTENCE] Failed to save data');
    }
  }

  loadData(key: string) {
    try {
      const db = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
      return db[key] || [];
    } catch (e) {
      return [];
    }
  }
}
