import type { LiveMonitorState } from '../hooks/useLiveMonitor';
import LiveWaveformCanvas from './LiveWaveformCanvas';

type Props = { monitor: LiveMonitorState };

export default function LiveMonitorPanel({ monitor }: Props) {
  return (
    <details className="result-card">
      <summary><strong>Live Monitor</strong></summary>
      <div>
        {!monitor.isMonitoring ? <button type="button" onClick={() => void monitor.startMonitor()}>Start Monitor</button> : <button type="button" onClick={monitor.stopMonitor}>Stop Monitor</button>}
      </div>
      <p>Peak: {Number.isFinite(monitor.peakDbfs) ? `${monitor.peakDbfs.toFixed(1)} dBFS` : 'N/A'}</p>
      <p>Status: {monitor.clippingStatus}</p>
      {monitor.errorMessage ? <p className="warning">{monitor.errorMessage}</p> : null}
      <LiveWaveformCanvas data={monitor.timeDomainData} />
    </details>
  );
}
