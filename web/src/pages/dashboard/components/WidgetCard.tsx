import { Activity, CloudSun, Edit3, HardDrive, MemoryStick, Network, Search, Server, X } from 'lucide-react';
import { useWeatherQuery } from '../../../api/weather/useWeatherQuery';
import { useWidgetDataQuery } from '../../../api/widgets/useWidgetDataQuery';
import { DashboardWidget } from '../dashboard.types';
import { dashboardClassNames, dashboardCn } from '../dashboard.styles';

type WidgetCardProps = {
  widget: DashboardWidget;
  metrics: any;
  history: any;
  onDelete: () => void;
  onEdit: () => void;
  editingLayout: boolean;
};

export function WidgetCard({ widget, metrics, history, onDelete, onEdit, editingLayout }: WidgetCardProps) {
  const { latitude = -23.55, longitude = -46.63 } = widget.config || {};
  const prometheusQuery = useWidgetDataQuery(widget.id, widget.type === 'PROMQL');
  const weatherQuery = useWeatherQuery(latitude, longitude, widget.type === 'WEATHER');
  const remote = widget.type === 'PROMQL' ? prometheusQuery.data : weatherQuery.data;
  const prometheusValue = remote?.data?.result?.[0]?.value?.[1];
  const weatherValue = remote?.current?.temperature_2m != null ? `${Math.round(remote.current.temperature_2m)}°C` : '—';
  const formatRate = (value: number | null | undefined) => value == null ? '—' : `${(value / 1e6).toFixed(1)} MB/s`;
  const formatDiskRate = (value: number | null | undefined) => value == null
    ? '—'
    : value >= 1e6 ? `${(value / 1e6).toFixed(1)} MB/s` : `${(value / 1e3).toFixed(0)} KB/s`;
  const values: any = {
    CLOCK: [Server, 'Agora', new Date().toLocaleTimeString('pt-BR')],
    WEATHER: [CloudSun, 'Temperatura', weatherValue, 'Sensação', remote?.current?.apparent_temperature != null ? `${Math.round(remote.current.apparent_temperature)}°C` : '—'],
    SEARCH: [Search, 'Pesquisa', 'Google'],
    STATUS: [Activity, 'Serviços', 'Veja os indicadores nos aplicativos'],
    PROMQL: [Activity, widget.config?.unit || 'Valor', prometheusValue != null ? `${Number(prometheusValue).toFixed(Number(widget.config?.decimals ?? 1))}${widget.config?.suffix || ''}` : '—'],
  };
  const metricIcons: Record<string, typeof Activity> = { SYSTEM: Activity, STORAGE: HardDrive, NETWORK: Network };
  const data = values[widget.type] || [metricIcons[widget.type] || MemoryStick, widget.title, '—'];
  const Icon = data[0];
  const diskEntries = new Map<string, any>();
  for (const disk of history.disks || []) diskEntries.set(disk.device || disk.name, disk);
  for (const disk of metrics.disks || []) {
    const key = disk.device;
    diskEntries.set(key, { ...diskEntries.get(key), ...disk });
  }
  const disks = [...diskEntries.values()].map((disk: any) => {
    const points = disk.points || [];
    return {
      label: disk.device || disk.name,
      detail: [
        disk.model,
        `↓ ${formatDiskRate(disk.read)}`,
        `↑ ${formatDiskRate(disk.write)}`,
        disk.temperature == null ? null : `${disk.temperature.toFixed(0)}°C`,
        disk.healthy == null ? null : disk.healthy ? 'SMART OK' : 'SMART ALERTA',
      ].filter(Boolean).join(' · '),
      value: `${Number(disk.value ?? points[points.length - 1]?.value ?? 0).toFixed(0)}%`,
      points,
    };
  });
  const metricLanes = widget.type === 'SYSTEM'
    ? [
        { label: 'CPU', value: metrics.cpu == null ? '—' : `${metrics.cpu.toFixed(0)}%`, points: history.cpu || [] },
        { label: 'Memória', value: metrics.memory == null ? '—' : `${metrics.memory.toFixed(0)}%`, points: history.memory || [] },
      ]
    : widget.type === 'NETWORK'
      ? [
          { label: 'Download', value: formatRate(metrics.download), points: history.download || [] },
          { label: 'Upload', value: formatRate(metrics.upload), points: history.upload || [] },
        ]
      : widget.type === 'STORAGE' ? disks : [];

  if (widget.type === 'DIVIDER') {
    return (
      <div className="divider-widget" role="separator" aria-label={widget.title}>
        {widget.title && <span>{widget.title}</span>}
        {editingLayout && (
          <div className={dashboardCn('widget-actions')}>
            <button onClick={onEdit} title="Editar"><Edit3 /></button>
            <button onClick={onDelete} title="Excluir"><X /></button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={dashboardCn('widget')}>
      <button className={dashboardCn('widget-delete', !editingLayout && 'item-control')} onClick={onDelete}><X /></button>
      {editingLayout && (
        <div className={dashboardCn('widget-actions')}>
          <button onClick={onEdit} title="Editar"><Edit3 /></button>
        </div>
      )}
      <div className={dashboardCn('widget-title')}><Icon />{widget.title}</div>
      {metricLanes.length > 0 ? (
        <MetricLanes lanes={metricLanes} />
      ) : (
        <div className={dashboardCn('widget-values')}>
          {data.slice(1).map((value: any, index: number) => (
            <span key={index} className={typeof value === 'number' ? dashboardClassNames.metric : ''}>
              {typeof value === 'number' ? `${value.toFixed(0)}%` : value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type MetricLane = {
  label: string;
  detail?: string;
  value: string;
  points: Array<{ timestamp: number; value: number }>;
};

function MetricLanes({ lanes }: { lanes: MetricLane[] }) {
  return (
    <div className="metric-lanes">
      {lanes.map((lane) => <MetricChart key={`${lane.label}:${lane.detail || ''}`} lane={lane} />)}
    </div>
  );
}

function MetricChart({ lane }: { lane: MetricLane }) {
  const values = lane.points.map((point) => point.value);
  const min = values.length ? Math.min(...values) : 0;
  const span = (values.length ? Math.max(...values) : 1) - min || 1;
  const path = lane.points.length < 2 ? '' : lane.points.map((point, index) =>
    `${index ? 'L' : 'M'} ${(index / (lane.points.length - 1)) * 100} ${32 - ((point.value - min) / span) * 28}`,
  ).join(' ');
  return (
    <div className="metric-lane">
      <div className="metric-lane-head">
        <span title={lane.detail}>{lane.label}{lane.detail && <small>{lane.detail}</small>}</span>
        <strong>{lane.value}</strong>
      </div>
      <svg className={dashboardCn('metric-chart')} viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
