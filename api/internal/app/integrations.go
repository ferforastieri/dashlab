package app

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Integrations struct {
	client        *http.Client
	allowlist     map[string]struct{}
	prometheusURL string
	targetLabels  string
	networkLabels string
	diskLabels    string
	mu            sync.RWMutex
}

func (i *Integrations) Configure(settings map[string]string) {
	i.mu.Lock()
	defer i.mu.Unlock()
	if value, ok := settings["prometheus_url"]; ok {
		i.prometheusURL = strings.TrimRight(strings.TrimSpace(value), "/")
	}
	if value, ok := settings["prometheus_target_labels"]; ok {
		i.targetLabels = strings.TrimSpace(value)
	}
	if value, ok := settings["prometheus_network_labels"]; ok {
		i.networkLabels = strings.TrimSpace(value)
	}
	if value, ok := settings["prometheus_disk_labels"]; ok {
		i.diskLabels = strings.TrimSpace(value)
	}
}

func NewIntegrations() *Integrations {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	return &Integrations{
		client:        &http.Client{Timeout: 6 * time.Second, Transport: transport, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }},
		allowlist:     map[string]struct{}{},
		networkLabels: `device!="lo"`,
		diskLabels:    `device=~"nvme[0-9]+n[0-9]+|sd[a-z]+"`,
	}
}

func (i *Integrations) metric(name string, labels ...string) string {
	parts := make([]string, 0)
	for _, group := range append([]string{i.targetLabels}, labels...) {
		for _, part := range strings.Split(group, ",") {
			if trimmed := strings.TrimSpace(part); trimmed != "" {
				parts = append(parts, trimmed)
			}
		}
	}
	if len(parts) == 0 {
		return name
	}
	return name + "{" + strings.Join(parts, ",") + "}"
}

func configuredQuery(name, fallback string) string {
	_ = name
	return fallback
}

func (i *Integrations) queries() map[string]string {
	return map[string]string{
		"cpu":      configuredQuery("CPU", fmt.Sprintf("100 - avg(rate(%s[5m])) * 100", i.metric("node_cpu_seconds_total", `mode="idle"`))),
		"memory":   configuredQuery("MEMORY", fmt.Sprintf("(1-%s/%s)*100", i.metric("node_memory_MemAvailable_bytes"), i.metric("node_memory_MemTotal_bytes"))),
		"download": configuredQuery("DOWNLOAD", fmt.Sprintf("sum(rate(%s[5m]))", i.metric("node_network_receive_bytes_total", i.networkLabels))),
		"upload":   configuredQuery("UPLOAD", fmt.Sprintf("sum(rate(%s[5m]))", i.metric("node_network_transmit_bytes_total", i.networkLabels))),
		"disks":    configuredQuery("DISK_UTILIZATION", fmt.Sprintf("rate(%s[5m])*100", i.metric("node_disk_io_time_seconds_total", i.diskLabels))),
	}
}

func (i *Integrations) MetricsOverview(ctx context.Context) (map[string]any, error) {
	if i.prometheusURL == "" {
		return nil, fmt.Errorf("Prometheus não configurado")
	}
	result := map[string]any{}
	for key, query := range i.queries() {
		if key == "disks" {
			continue
		}
		response, err := i.prometheus(ctx, "/api/v1/query", map[string]string{"query": query})
		if err != nil {
			result[key] = nil
			continue
		}
		series := promSeries(response)
		if len(series) == 0 {
			result[key] = float64(0)
		} else {
			result[key] = scalarValue(series[0]["value"])
		}
	}
	diskQueries := map[string]string{
		"info":        configuredQuery("DISK_INFO", i.metric("node_disk_info", i.diskLabels)),
		"utilization": i.queries()["disks"],
		"read":        configuredQuery("DISK_READ", fmt.Sprintf("rate(%s[5m])", i.metric("node_disk_read_bytes_total", i.diskLabels))),
		"write":       configuredQuery("DISK_WRITE", fmt.Sprintf("rate(%s[5m])", i.metric("node_disk_written_bytes_total", i.diskLabels))),
		"temperature": configuredQuery("DISK_TEMPERATURE", i.metric("smartmon_temperature_celsius_raw_value")),
		"health":      configuredQuery("DISK_HEALTH", i.metric("smartmon_device_smart_healthy")),
	}
	series := map[string][]map[string]any{}
	for key, query := range diskQueries {
		response, err := i.prometheus(ctx, "/api/v1/query", map[string]string{"query": query})
		if err != nil {
			series[key] = nil
			continue
		}
		series[key] = promSeries(response)
	}
	byDevice := func(items []map[string]any) map[string]map[string]any {
		result := map[string]map[string]any{}
		for _, item := range items {
			metric, _ := item["metric"].(map[string]any)
			device := normalizeDevice(stringValue(metric["device"]))
			if device == "" {
				device = normalizeDevice(stringValue(metric["disk"]))
			}
			result[device] = item
		}
		return result
	}
	utilization, read, write, temperature, health := byDevice(series["utilization"]), byDevice(series["read"]), byDevice(series["write"]), byDevice(series["temperature"]), byDevice(series["health"])
	disks := make([]map[string]any, 0)
	for _, entry := range series["info"] {
		metric, _ := entry["metric"].(map[string]any)
		device := normalizeDevice(stringValue(metric["device"]))
		model := stringValue(metric["model"])
		if model == "" {
			model = device
		}
		tempValue, hasTemp := temperature[device]
		healthValue, hasHealth := health[device]
		disk := map[string]any{"device": device, "model": model, "value": seriesValue(utilization[device]), "read": seriesValue(read[device]), "write": seriesValue(write[device]), "temperature": nil, "healthy": nil}
		if hasTemp {
			disk["temperature"] = seriesValue(tempValue)
		}
		if hasHealth {
			disk["healthy"] = seriesValue(healthValue) == 1
		}
		disks = append(disks, disk)
	}
	result["disks"] = disks
	return result, nil
}

func (i *Integrations) MetricsHistory(ctx context.Context, rangeValue string) (map[string]any, error) {
	if i.prometheusURL == "" {
		return nil, fmt.Errorf("Prometheus não configurado")
	}
	secondsByRange := map[string]int64{"15m": 900, "1h": 3600, "6h": 21600, "24h": 86400}
	seconds, ok := secondsByRange[rangeValue]
	if !ok {
		rangeValue = "1h"
		seconds = 3600
	}
	end := time.Now().Unix()
	start := end - seconds
	step := seconds / 60
	if step < 15 {
		step = 15
	}
	result := map[string]any{"range": rangeValue}
	for key, query := range i.queries() {
		response, err := i.prometheus(ctx, "/api/v1/query_range", map[string]string{"query": query, "start": strconv.FormatInt(start, 10), "end": strconv.FormatInt(end, 10), "step": strconv.FormatInt(step, 10)})
		if err != nil {
			if key == "disks" {
				result[key] = []any{}
			} else {
				result[key] = []any{}
			}
			continue
		}
		series := promSeries(response)
		if key == "disks" {
			values := make([]map[string]any, 0, len(series))
			for _, entry := range series {
				metric, _ := entry["metric"].(map[string]any)
				values = append(values, map[string]any{"name": stringValue(metric["device"]), "device": stringValue(metric["device"]), "instance": firstString(metric["instance"], metric["nodename"]), "points": points(entry["values"])})
			}
			result[key] = values
		} else if len(series) > 0 {
			result[key] = points(series[0]["values"])
		} else {
			result[key] = []any{}
		}
	}
	return result, nil
}

func (i *Integrations) PromQL(ctx context.Context, query string) (any, error) {
	if i.prometheusURL == "" || strings.TrimSpace(query) == "" || len(query) > 1000 {
		return nil, fmt.Errorf("Consulta PromQL inválida")
	}
	return i.prometheus(ctx, "/api/v1/query", map[string]string{"query": query})
}

func (i *Integrations) Statuses(ctx context.Context, applications []Application) []map[string]any {
	visible := make([]Application, 0, len(applications))
	for _, app := range applications {
		if app.Visible {
			visible = append(visible, app)
		}
	}
	result := make([]map[string]any, len(visible))
	var wait sync.WaitGroup
	for index, app := range visible {
		wait.Add(1)
		go func(index int, app Application) {
			defer wait.Done()
			started := time.Now()
			target := app.StatusURL
			if target == "" {
				target = app.URL
			}
			if !outboundURLAllowed(target, i.allowlist) {
				result[index] = map[string]any{"id": app.ID, "online": false, "status": nil, "latency": time.Since(started).Milliseconds()}
				return
			}
			request, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
			status := 0
			online := false
			if err == nil {
				response, requestErr := i.client.Do(request)
				if requestErr == nil {
					status = response.StatusCode
					online = status < 500
					response.Body.Close()
				}
			}
			item := map[string]any{"id": app.ID, "online": online, "status": nil, "latency": time.Since(started).Milliseconds()}
			if status > 0 {
				item["status"] = status
			}
			result[index] = item
		}(index, app)
	}
	wait.Wait()
	return result
}

func (i *Integrations) Weather(ctx context.Context, latitude, longitude float64) (any, error) {
	values := url.Values{"latitude": {strconv.FormatFloat(latitude, 'f', -1, 64)}, "longitude": {strconv.FormatFloat(longitude, 'f', -1, 64)}, "current": {"temperature_2m,apparent_temperature,weather_code,is_day"}, "timezone": {"auto"}, "forecast_days": {"1"}}
	return i.fetch(ctx, "https://api.open-meteo.com/v1/forecast?"+values.Encode())
}

func (i *Integrations) prometheus(ctx context.Context, path string, params map[string]string) (any, error) {
	i.mu.RLock()
	baseURL := i.prometheusURL
	allowlist := i.allowlist
	i.mu.RUnlock()
	if !outboundURLAllowed(baseURL, allowlist) {
		return nil, fmt.Errorf("destino do Prometheus não permitido")
	}
	values := url.Values{}
	for key, value := range params {
		values.Set(key, value)
	}
	return i.fetch(ctx, baseURL+path+"?"+values.Encode())
}
func (i *Integrations) fetch(ctx context.Context, target string) (any, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, err
	}
	response, err := i.client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("serviço respondeu HTTP %d", response.StatusCode)
	}
	var result any
	err = json.NewDecoder(response.Body).Decode(&result)
	return result, err
}

func promSeries(value any) []map[string]any {
	root, _ := value.(map[string]any)
	data, _ := root["data"].(map[string]any)
	raw, _ := data["result"].([]any)
	result := make([]map[string]any, 0, len(raw))
	for _, item := range raw {
		if entry, ok := item.(map[string]any); ok {
			result = append(result, entry)
		}
	}
	return result
}
func scalarValue(value any) float64 {
	pair, _ := value.([]any)
	if len(pair) < 2 {
		return 0
	}
	number, _ := strconv.ParseFloat(fmt.Sprint(pair[1]), 64)
	return number
}
func seriesValue(value map[string]any) float64 {
	if value == nil {
		return 0
	}
	return scalarValue(value["value"])
}
func points(value any) []map[string]any {
	raw, _ := value.([]any)
	result := make([]map[string]any, 0, len(raw))
	for _, item := range raw {
		pair, _ := item.([]any)
		if len(pair) < 2 {
			continue
		}
		timestamp, _ := pair[0].(float64)
		number, _ := strconv.ParseFloat(fmt.Sprint(pair[1]), 64)
		result = append(result, map[string]any{"timestamp": timestamp, "value": number})
	}
	return result
}
func stringValue(value any) string {
	if value == nil {
		return ""
	}
	return fmt.Sprint(value)
}
func firstString(values ...any) string {
	for _, value := range values {
		if text := stringValue(value); text != "" {
			return text
		}
	}
	return ""
}
func normalizeDevice(value string) string {
	value = strings.TrimPrefix(value, "/dev/")
	if strings.HasPrefix(value, "nvme") && !strings.Contains(value, "n") {
		return value + "n1"
	}
	return value
}
