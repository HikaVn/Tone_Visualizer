import { useCallback, useEffect, useState } from 'react';
import { getAllTakes, openTakeDb } from '../storage/takeStorage';
import type { SavedTake } from '../types/take';

type DiagnosticStatus = 'idle' | 'checking' | 'ok' | 'error';

type StorageDiagnostics = {
  status: DiagnosticStatus;
  message: string;
  origin: string;
  href: string;
  databaseName: string;
  storeName: string;
  takeCount: number;
  takes: SavedTake[];
  savedAnalysisCount: number | null;
  localStorageAvailable: boolean;
  indexedDbAvailable: boolean;
  checkedAt: string | null;
};

const DATABASE_NAME = 'violin-harmonic-analyzer-db';
const STORE_NAME = 'takes';
const SAVED_ANALYSES_KEY = 'harmonic_saved_analyses';

const initialDiagnostics = (): StorageDiagnostics => ({
  status: 'idle',
  message: '未確認',
  origin: window.location.origin,
  href: window.location.href,
  databaseName: DATABASE_NAME,
  storeName: STORE_NAME,
  takeCount: 0,
  takes: [],
  savedAnalysisCount: null,
  localStorageAvailable: false,
  indexedDbAvailable: 'indexedDB' in window,
  checkedAt: null,
});

const readSavedAnalysisCount = (): number | null => {
  const raw = window.localStorage.getItem(SAVED_ANALYSES_KEY);
  if (!raw) return 0;
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? parsed.length : null;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function StorageDiagnosticsPanel() {
  const [diagnostics, setDiagnostics] = useState<StorageDiagnostics>(initialDiagnostics);

  const refresh = useCallback(async () => {
    setDiagnostics((current) => ({ ...current, status: 'checking', message: '確認中...' }));

    try {
      const localStorageAvailable = (() => {
        try {
          window.localStorage.getItem(SAVED_ANALYSES_KEY);
          return true;
        } catch {
          return false;
        }
      })();

      const savedAnalysisCount = localStorageAvailable ? readSavedAnalysisCount() : null;

      await openTakeDb();
      const takes = await getAllTakes();

      setDiagnostics({
        status: 'ok',
        message: `IndexedDBを読めました。保存Take: ${takes.length}件`,
        origin: window.location.origin,
        href: window.location.href,
        databaseName: DATABASE_NAME,
        storeName: STORE_NAME,
        takeCount: takes.length,
        takes,
        savedAnalysisCount,
        localStorageAvailable,
        indexedDbAvailable: true,
        checkedAt: new Date().toLocaleString(),
      });
    } catch (error) {
      setDiagnostics((current) => ({
        ...current,
        status: 'error',
        message: error instanceof Error ? error.message : '保存データ確認に失敗しました。',
        origin: window.location.origin,
        href: window.location.href,
        indexedDbAvailable: 'indexedDB' in window,
        checkedAt: new Date().toLocaleString(),
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <details className="result-card" open>
      <summary><strong>保存データ診断</strong></summary>
      <div className="diagnostics-grid">
        <span>状態</span>
        <strong>{diagnostics.message}</strong>
        <span>現在のorigin</span>
        <code>{diagnostics.origin}</code>
        <span>現在のURL</span>
        <code>{diagnostics.href}</code>
        <span>IndexedDB</span>
        <code>{diagnostics.indexedDbAvailable ? `${diagnostics.databaseName} / ${diagnostics.storeName}` : '未対応'}</code>
        <span>保存Take</span>
        <strong>{diagnostics.takeCount}件</strong>
        <span>比較データ</span>
        <strong>{diagnostics.localStorageAvailable ? `${diagnostics.savedAnalysisCount ?? '読取不可'}件` : 'localStorage未対応'}</strong>
        <span>確認時刻</span>
        <span>{diagnostics.checkedAt ?? '-'}</span>
      </div>
      <button type="button" onClick={() => void refresh()} disabled={diagnostics.status === 'checking'}>再確認</button>
      {diagnostics.takes.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Take</th>
                <th>作成日時</th>
                <th>f0</th>
                <th>音声</th>
              </tr>
            </thead>
            <tbody>
              {diagnostics.takes.map((take) => (
                <tr key={take.id}>
                  <td>{take.name}</td>
                  <td>{new Date(take.createdAt).toLocaleString()}</td>
                  <td>{take.detectedF0Hz?.toFixed(2) ?? 'N/A'} Hz</td>
                  <td>{take.audioMimeType || take.audioBlob.type || 'unknown'} / {formatBytes(take.audioBlob.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={diagnostics.status === 'error' ? 'warning' : undefined}>このoriginには保存Takeが見つかりません。</p>
      )}
    </details>
  );
}
