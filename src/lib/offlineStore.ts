/**
 * Gerenciador de Armazenamento Offline e Sincronização
 * Salva os dados localmente usando IndexedDB e gerencia uma fila de sincronização.
 */

const DB_NAME = 'SistemaEliteOfflineDB';
const DB_VERSION = 2;

export interface SyncItem {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  user_id: string;
  timestamp: number;
}

class OfflineStore {
  private db: IDBDatabase | null = null;

  async init() {
    if (this.db) return this.db;

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        // Tabelas de cache de dados
        if (!db.objectStoreNames.contains('products')) db.createObjectStore('products', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('expenses')) db.createObjectStore('expenses', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('orders')) db.createObjectStore('orders', { keyPath: 'id' });
        
        // Fila de sincronização (o que ainda não subiu pro servidor)
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve(this.db!);
      };

      request.onerror = (event: any) => reject(event.target.error);
    });
  }

  // --- Operações de Cache (Leitura) ---

  async saveToCache(table: string, data: any[], userId: string) {
    await this.init();
    const tx = this.db!.transaction(table, 'readwrite');
    const store = tx.objectStore(table);

    const existing = await new Promise<any[]>((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
    existing
      .filter((item) => item.user_id === userId)
      .forEach((item) => store.delete(item.id));

    data.forEach(item => store.put(item));
    return new Promise((resolve) => tx.oncomplete = resolve);
  }

  async getFromCache(table: string, userId: string): Promise<any[]> {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db!.transaction(table, 'readonly');
      const store = tx.objectStore(table);
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result || []).filter((item: any) => item.user_id === userId));
    });
  }

  // --- Fila de Sincronização (Escrita) ---

  async addToSyncQueue(table: string, action: SyncItem['action'], data: any, userId: string) {
    await this.init();
    const syncItem: SyncItem = {
      id: crypto.randomUUID(),
      table,
      action,
      data,
      user_id: userId,
      timestamp: Date.now()
    };

    // Atualiza o cache local IMEDIATAMENTE para o usuário ver
    const tx = this.db!.transaction([table, 'sync_queue'], 'readwrite');
    const dataStore = tx.objectStore(table);
    const syncStore = tx.objectStore('sync_queue');

    if (action === 'DELETE') {
      dataStore.delete(data.id);
    } else {
      dataStore.put(data);
    }

    syncStore.add(syncItem);
    return new Promise((resolve) => tx.oncomplete = resolve);
  }

  async getSyncQueue(userId: string): Promise<SyncItem[]> {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db!.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result || []).filter((item: SyncItem) => item.user_id === userId));
    });
  }

  async removeFromSyncQueue(id: string) {
    await this.init();
    const tx = this.db!.transaction('sync_queue', 'readwrite');
    tx.objectStore('sync_queue').delete(id);
    return new Promise((resolve) => tx.oncomplete = resolve);
  }
}

export const offlineStore = new OfflineStore();
