/**
 * services/offlineDB.ts
 * ─────────────────────────────────────────────────────────────
 * Camada de persistência offline para o EucalyptusEye.
 * Guarda capturas (imagem Blob + GPS + timestamp) no IndexedDB
 * enquanto o técnico está sem rede, para sincronização posterior.
 * ─────────────────────────────────────────────────────────────
 */

const DB_NAME = 'eucalyptus_eye_db';
const DB_VERSION = 1;
const STORE_NAME = 'diagnosticos_pendentes';

// ── Tipos ──────────────────────────────────────────────────────

export interface GpsCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type DiagnosticoStatus = 'pendente' | 'sincronizando' | 'sincronizado' | 'erro';

export interface DiagnosticoPendente {
  /** UUID gerado localmente — torna-se o id na tabela do Supabase */
  id: string;
  /** Blob da imagem capturada */
  imageBlob: Blob;
  /** Coordenadas GPS no momento da captura */
  coords: GpsCoords | null;
  /** ISO 8601 */
  timestamp: string;
  /** ID do utilizador autenticado (Supabase Auth) */
  userId: string;
  status: DiagnosticoStatus;
  /** Número de tentativas de sync falhadas */
  retryCount: number;
}

// ── Inicialização ──────────────────────────────────────────────

let _db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Índice para filtrar por estado de sincronização
        store.createIndex('by_status', 'status', { unique: false });
        // Índice para filtrar por utilizador
        store.createIndex('by_user', 'userId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      _db = (event.target as IDBOpenDBRequest).result;
      resolve(_db);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// ── Helpers internos ───────────────────────────────────────────

async function getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDB();
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── CRUD ───────────────────────────────────────────────────────

/** Guarda um diagnóstico pendente no IndexedDB */
export async function saveDiagnosticoPendente(
  payload: Omit<DiagnosticoPendente, 'status' | 'retryCount'>
): Promise<DiagnosticoPendente> {
  const item: DiagnosticoPendente = {
    ...payload,
    status: 'pendente',
    retryCount: 0,
  };
  const store = await getStore('readwrite');
  await promisify(store.put(item));
  return item;
}

/** Retorna todos os diagnósticos com status 'pendente' ou 'erro' */
export async function getPendentes(): Promise<DiagnosticoPendente[]> {
  const store = await getStore('readonly');
  const index = store.index('by_status');

  const pendentes = await promisify<DiagnosticoPendente[]>(
    index.getAll('pendente') as IDBRequest<DiagnosticoPendente[]>
  );
  const comErro = await promisify<DiagnosticoPendente[]>(
    index.getAll('erro') as IDBRequest<DiagnosticoPendente[]>
  );

  // Só tenta de novo itens com menos de 3 falhas
  return [...pendentes, ...comErro.filter((d) => d.retryCount < 3)];
}

/** Atualiza o status de um item (ex: 'sincronizando', 'sincronizado', 'erro') */
export async function updateStatus(
  id: string,
  status: DiagnosticoStatus,
  incrementRetry = false
): Promise<void> {
  const store = await getStore('readwrite');
  const item = await promisify<DiagnosticoPendente>(
    store.get(id) as IDBRequest<DiagnosticoPendente>
  );
  if (!item) return;

  item.status = status;
  if (incrementRetry) item.retryCount += 1;

  await promisify(store.put(item));
}

/** Remove um item do IndexedDB após sync bem-sucedido */
export async function removeDiagnostico(id: string): Promise<void> {
  const store = await getStore('readwrite');
  await promisify(store.delete(id));
}

/** Retorna a contagem de itens pendentes (para badge na UI) */
export async function countPendentes(): Promise<number> {
  const store = await getStore('readonly');
  const index = store.index('by_status');
  return promisify<number>(index.count('pendente') as IDBRequest<number>);
}

// ── GPS ────────────────────────────────────────────────────────

/** Obtém as coordenadas GPS actuais com timeout de 10 s */
export function getCurrentPosition(): Promise<GpsCoords | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const timeout = setTimeout(() => resolve(null), 10_000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        clearTimeout(timeout);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60_000 }
    );
  });
}

// ── ID único ───────────────────────────────────────────────────

export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
