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
  const values: any = {
    SYSTEM: [Activity, 'CPU', metrics.cpu, 'Memória', metrics.memory],
    STORAGE: [HardDrive, 'Disco', metrics.disk],
    NETWORK: [Network, 'Download', metrics.download ? `${(metrics.download / 1e6).toFixed(1)} MB/s` : '—', 'Upload', metrics.upload ? `${(metrics.upload / 1e6).toFixed(1)} MB/s` : '—'],
    CLOCK: [Server, 'Agora', new Date().toLocaleTimeString('pt-BR')],
    WEATHER: [CloudSun, 'Temperatura', weatherValue, 'Sensação', remote?.current?.apparent_temperature != null ? `${Math.round(remote.current.apparent_temperature)}°C` : '—'],
    SEARCH: [Search, 'Pesquisa', 'Google'],
    STATUS: [Activity, 'Serviços', 'Veja os indicadores nos aplicativos'],
    PROMQL: [Activity, widget.config?.unit || 'Valor', prometheusValue != null ? `${Number(prometheusValue).toFixed(Number(widget.config?.decimals ?? 1))}${widget.config?.suffix || ''}` : '—'],
  };
  const data = values[widget.type] || [MemoryStick, widget.title, '—'];
  const Icon = data[0];

  return (
    <div className={dashboardCn('widget')}>
      <button className={dashboardCn('widget-delete', !editingLayout && 'item-control')} onClick={onDelete}><X /></button>
      {editingLayout && (
        <div className={dashboardCn('widget-actions')}>
          <button onClick={onEdit} title="Editar"><Edit3 /></button>
        </div>
      )}
      <div className={dashboardCn('widget-title')}><Icon />{widget.title}</div>
      <div className={dashboardCn('widget-values')}>
        {data.slice(1).map((value: any, index: number) => (
          <span key={index} className={typeof value === 'number' ? dashboardClassNames.metric : ''}>
            {typeof value === 'number' ? `${value.toFixed(0)}%` : value}
          </span>
        ))}
      </div>
      {['SYSTEM', 'STORAGE', 'NETWORK'].includes(widget.type) && (
        <MetricChart series={widget.type === 'SYSTEM' ? [history.cpu || [], history.memory || []] : widget.type === 'STORAGE' ? [history.disk || []] : [history.download || [], history.upload || []]} />
      )}
    </div>
  );
}

function MetricChart({ series }: { series: Array<Array<{ timestamp: number; value: number }>> }) {
  const colors = ['var(--accent)', '#4ad6c8'];
  const paths = series.map((points) => {
    if (points.length < 2) return '';
    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const span = Math.max(...values) - min || 1;
    return points.map((point, index) => `${index ? 'L' : 'M'} ${(index / (points.length - 1)) * 100} ${32 - ((point.value - min) / span) * 28}`).join(' ');
  });
  return (
    <svg className={dashboardCn('metric-chart')} viewBox="0 0 100 36" preserveAspectRatio="none">
      {paths.map((path, index) => <path key={index} d={path} fill="none" stroke={colors[index]} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}
