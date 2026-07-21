import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { clearSession, initializeApi, setToastSink } from '../../api/http/client';
import { useConnectServer } from '../../api/connection/useConnectServer';
import { useLogin } from '../../api/auth/useLogin';
import { useRegister } from '../../api/auth/useRegister';
import { useMetricsOverview } from '../../api/metrics/useMetricsOverview';
import { useMetricsHistory } from '../../api/metrics/useMetricsHistory';
import { useCreateApplication } from '../../api/applications/useCreateApplication';
import { useUpdateApplication } from '../../api/applications/useUpdateApplication';
import { useCreateWidget } from '../../api/widgets/useCreateWidget';
import { useUpdateWidget } from '../../api/widgets/useUpdateWidget';
import { useUpdateBranding } from '../../api/dashboard/useUpdateBranding';
import { useDeleteApplication } from '../../api/applications/useDeleteApplication';
import { useDeleteWidget } from '../../api/widgets/useDeleteWidget';
import { useSaveLayout } from '../../api/layouts/useSaveLayout';
import { useChangePassword } from '../../api/auth/useChangePassword';
type Phase = 'loading' | 'server' | 'auth' | 'dashboard';
type AppItem = {
  id: string;
  name: string;
  url: string;
  deepLink?: string;
  icon?: string;
  inDock: boolean;
};
function normalize(value: string) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use http:// ou https://');
  url.pathname = url.pathname.replace(/\/+$/, '') + '/api';
  return url.toString().replace(/\/$/, '');
}
export default function ApplicationShell({ dashboardQuery }: { dashboardQuery: any }) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>('loading');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  useEffect(() => {
    setToastSink((message, type) => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3500);
    });
    return () => setToastSink(() => {});
  }, []);
  useEffect(() => {
    initializeApi().then(({ hasServer, authenticated }) =>
      setPhase(!hasServer ? 'server' : authenticated ? 'dashboard' : 'auth'),
    );
  }, []);
  let content: React.ReactNode;
  if (phase === 'loading')
    content = (
      <Center>
        <ActivityIndicator color="#ff7a1a" />
      </Center>
    );
  else if (phase === 'server') content = <ServerSetup done={() => setPhase('auth')} />;
  else if (phase === 'auth')
    content = <Auth done={() => setPhase('dashboard')} reset={() => setPhase('server')} />;
  else
    content = (
      <Dashboard
        dashboardQuery={dashboardQuery}
        logout={async () => {
          await clearSession();
          queryClient.clear();
          setPhase('auth');
        }}
      />
    );
  return (
    <View className="flex-1">
      {content}
      {toast && (
        <View className={`${s.toast} ${toast.type === 'error' ? s.toastError : ''}`}>
          <Text className={s.toastText}>{toast.message}</Text>
        </View>
      )}
    </View>
  );
}
function ServerSetup({ done }: { done: () => void }) {
  const connectServer = useConnectServer();
  const [url, setUrl] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function connect() {
    setBusy(true);
    try {
      const normalized = normalize(url);
      await connectServer.mutateAsync(normalized);
      done();
    } catch {
      setError('Não foi possível conectar ao endereço informado.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView className={s.page}>
      <KeyboardAvoidingView
        className={s.center}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Logo />
        <Text className={s.title}>Conecte ao seu DashLab</Text>
        <Text className={s.muted}>Digite o endereço do seu servidor para continuar.</Text>
        <TextInput
          className={s.input}
          autoCapitalize="none"
          keyboardType="url"
          value={url}
          onChangeText={setUrl}
          placeholder="https://home.exemplo.com"
          placeholderTextColor="#617184"
        />
        <Button title={busy ? 'Conectando…' : 'Conectar'} onPress={connect} />
      </KeyboardAvoidingView>
      {!!error && (
        <InfoModal title="Servidor indisponível" message={error} close={() => setError('')} />
      )}
    </SafeAreaView>
  );
}
function Auth({ done, reset }: { done: () => void; reset: () => void }) {
  const login = useLogin(),
    createAccount = useRegister();
  const [register, setRegister] = useState(false),
    [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      await (register ? createAccount : login).mutateAsync({ username, password });
      done();
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView className={s.page}>
      <View className={s.center}>
        <Logo />
        <Text className={s.title}>{register ? 'Crie sua conta' : 'Seu homelab, do seu jeito'}</Text>
        <TextInput
          className={s.input}
          autoCapitalize="none"
          placeholder="Usuário"
          placeholderTextColor="#617184"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          className={s.input}
          secureTextEntry
          placeholder="Senha"
          placeholderTextColor="#617184"
          value={password}
          onChangeText={setPassword}
        />
        <Button title={busy ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar'} onPress={submit} />
        <Pressable onPress={() => setRegister(!register)}>
          <Text className={s.link}>{register ? 'Já tenho uma conta' : 'Criar uma conta'}</Text>
        </Pressable>
        <Pressable onPress={reset}>
          <Text className={s.subtle}>Trocar servidor</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
function Dashboard({ logout, dashboardQuery }: { logout: () => void; dashboardQuery: any }) {
  const metricsQuery = useMetricsOverview(),
    historyQuery = useMetricsHistory(),
    createApplication = useCreateApplication(),
    updateApplication = useUpdateApplication(),
    createWidget = useCreateWidget(),
    updateWidget = useUpdateWidget(),
    updateBranding = useUpdateBranding(),
    deleteApplication = useDeleteApplication(),
    deleteWidget = useDeleteWidget(),
    saveLayout = useSaveLayout(),
    changePassword = useChangePassword(),
    data = dashboardQuery.data,
    metrics = (metricsQuery.data || {}) as Record<string, number | null>,
    history = historyQuery.data || {};
  const [show, setShow] = useState(false),
    [mode, setMode] = useState<'app' | 'widget' | 'brand' | 'account'>('app'),
    [selected, setSelected] = useState<any>(null),
    [actionItem, setActionItem] = useState<{ kind: 'app' | 'widget'; item: any } | null>(null),
    [confirmDelete, setConfirmDelete] = useState<{
      kind: 'applications' | 'widgets';
      id: string;
      name: string;
    } | null>(null),
    [info, setInfo] = useState<{ title: string; message: string } | null>(null),
    [query, setQuery] = useState(''),
    [name, setName] = useState(''),
    [url, setUrl] = useState('https://'),
    [extra, setExtra] = useState('');
  function edit(kind: 'app' | 'widget', item: any) {
    setMode(kind);
    setSelected(item);
    setName(item.name || item.title);
    setUrl(item.url || 'https://');
    setExtra(item.category || item.type || 'SYSTEM');
    setShow(true);
  }
  async function save() {
    try {
      if (mode === 'app')
        await (selected
          ? updateApplication.mutateAsync({
              id: selected.id,
              data: { name, url, category: extra || undefined },
            })
          : createApplication.mutateAsync({ name, url, category: extra || undefined }));
      if (mode === 'widget')
        await (selected
          ? updateWidget.mutateAsync({
              id: selected.id,
              data: { title: name, type: extra || 'SYSTEM', config: selected.config || {} },
            })
          : createWidget.mutateAsync({ title: name, type: extra || 'SYSTEM', config: {} }));
      if (mode === 'brand')
        await updateBranding.mutateAsync({
          name,
          accent: extra || '#ff7a1a',
          wallpaper: url === 'https://' ? '' : url,
        });
      if (mode === 'account')
        await changePassword.mutateAsync({ currentPassword: name, newPassword: url });
      setShow(false);
      setName('');
      setSelected(null);
      setExtra('');
      setUrl('https://');
    } catch {}
  }
  async function remove() {
    if (!confirmDelete) return;
    const x = confirmDelete;
    setConfirmDelete(null);
    try {
      await (x.kind === 'applications'
        ? deleteApplication.mutateAsync(x.id)
        : deleteWidget.mutateAsync(x.id));
    } catch {}
  }
  async function saveLayouts(layouts: any[]) {
    await saveLayout.mutateAsync(
      layouts.map((x: any) => ({
        kind: x.kind,
        applicationId: x.applicationId,
        widgetId: x.widgetId,
        x: x.x || 0,
        y: x.y || 0,
        w: x.w || 1,
        h: x.h || 1,
      })),
    );
  }
  async function moveItem(kind: 'APPLICATION' | 'WIDGET', id: string, delta: number) {
    const layouts = [...data.layouts],
      same = layouts.filter((x: any) => x.kind === kind),
      field = kind === 'APPLICATION' ? 'applicationId' : 'widgetId',
      at = same.findIndex((x: any) => x[field] === id),
      to = Math.max(0, Math.min(same.length - 1, at + delta));
    if (at === to) return;
    const a = same[at],
      b = same[to],
      ai = layouts.indexOf(a),
      bi = layouts.indexOf(b);
    [layouts[ai], layouts[bi]] = [layouts[bi], layouts[ai]];
    await saveLayouts(layouts);
  }
  async function resizeItem(id: string, delta: number) {
    await saveLayouts(
      data.layouts.map((x: any) =>
        x.widgetId === id ? { ...x, w: Math.max(1, Math.min(6, (x.w || 1) + delta)) } : x,
      ),
    );
  }
  async function open(app: AppItem) {
    if (app.deepLink) {
      const ok = await Linking.canOpenURL(app.deepLink);
      if (ok) return Linking.openURL(app.deepLink);
    }
    Linking.openURL(app.url);
  }
  if (!data)
    return (
      <Center>
        <ActivityIndicator color="#ff7a1a" />
      </Center>
    );
  return (
    <SafeAreaView className={s.page}>
      <StatusBar style="light" />
      <View className={s.header}>
        <View>
          <Text className={s.brand}>{data.branding?.name || data.name}</Text>
          <Text className={s.muted}>Seu espaço pessoal</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Pressable
            onPress={() => {
              setMode('brand');
              setName(data.branding?.name || data.name);
              setUrl(data.branding?.wallpaper || 'https://');
              setExtra(data.branding?.accent || '#ff7a1a');
              setShow(true);
            }}
          >
            <Ionicons name="settings-outline" color="#dbe5ef" size={23} />
          </Pressable>
          <Pressable
            onLongPress={logout}
            onPress={() => {
              setMode('account');
              setName('');
              setUrl('');
              setShow(true);
            }}
          >
            <Ionicons name="person-circle-outline" color="#dbe5ef" size={25} />
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerClassName={s.content}>
        <View className={s.search}>
          <Ionicons name="search" color="#8190a2" size={18} />
          <TextInput
            className={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Pesquisar apps ou web"
            placeholderTextColor="#8190a2"
            returnKeyType="search"
            onSubmitEditing={() => {
              const local = data.applications.find((a: any) =>
                a.name.toLowerCase().includes(query.toLowerCase()),
              );
              local
                ? open(local)
                : Linking.openURL(`https://google.com/search?q=${encodeURIComponent(query)}`);
            }}
          />
        </View>
        <Text className={s.section}>Aplicativos</Text>
        <FlatList
          scrollEnabled={false}
          data={data.layouts
            .filter((l: any) => l.kind === 'APPLICATION')
            .map((l: any) => data.applications.find((a: any) => a.id === l.applicationId))
            .filter(
              (a: any) => a && (!query || a.name.toLowerCase().includes(query.toLowerCase())),
            )}
          numColumns={3}
          keyExtractor={(x: any) => x.id}
          renderItem={({ item }) => (
            <Pressable
              className={s.app}
              onPress={() => open(item)}
              onLongPress={() => setActionItem({ kind: 'app', item })}
            >
              <View className={s.appIcon}>
                <Image source={{ uri: appImage(item) }} className={s.realAppIcon} />
              </View>
              <Text numberOfLines={1} className={s.appName}>
                {item.name}
              </Text>
            </Pressable>
          )}
        />
        <Text className={s.section}>Visão geral</Text>
        <View className={s.widgets}>
          {data.widgets.slice(0, 6).map((w: any) => (
            <Pressable
              className={s.widget}
              key={w.id}
              onLongPress={() => setActionItem({ kind: 'widget', item: w })}
            >
              <Ionicons name={widgetIcon(w.type)} color="#ff8b35" size={21} />
              <Text className={s.widgetTitle}>{w.title}</Text>
              <Text className={s.metric}>{widgetValue(w.type, metrics)}</Text>
              {['SYSTEM', 'STORAGE', 'NETWORK'].includes(w.type) && (
                <MiniBars values={widgetSeries(w.type, history)} />
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Pressable
        className={s.fab}
        onPress={() => {
          setMode('app');
          setSelected(null);
          setName('');
          setUrl('https://');
          setExtra('');
          setShow(true);
        }}
        onLongPress={() => {
          setMode('widget');
          setName('');
          setExtra('SYSTEM');
          setShow(true);
        }}
      >
        <Ionicons name="add" color="white" size={30} />
      </Pressable>
      <Modal transparent visible={show} animationType="slide" onRequestClose={() => setShow(false)}>
        <View className={s.modalBack}>
          <View className={s.sheet}>
            <Text className={s.title}>
              {mode === 'app'
                ? selected
                  ? 'Editar aplicativo'
                  : 'Novo aplicativo'
                : mode === 'widget'
                  ? selected
                    ? 'Editar widget'
                    : 'Novo widget'
                  : mode === 'brand'
                    ? 'Personalizar'
                    : 'Minha conta'}
            </Text>
            <TextInput
              className={s.input}
              placeholder={
                mode === 'account' ? 'Senha atual' : mode === 'widget' ? 'Título' : 'Nome'
              }
              placeholderTextColor="#617184"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              className={s.input}
              secureTextEntry={mode === 'account'}
              placeholder={mode === 'account' ? 'Nova senha' : 'https://...'}
              placeholderTextColor="#617184"
              value={url}
              onChangeText={setUrl}
            />
            {mode === 'app' && (
              <TextInput
                className={s.input}
                placeholder="Categoria"
                placeholderTextColor="#617184"
                value={extra}
                onChangeText={setExtra}
              />
            )}
            {mode === 'widget' && (
              <View className={s.typeGrid}>
                {[
                  'SYSTEM',
                  'STORAGE',
                  'NETWORK',
                  'CLOCK',
                  'WEATHER',
                  'SEARCH',
                  'STATUS',
                  'PROMQL',
                ].map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setExtra(t)}
                    className={`${s.typeChip} ${extra === t ? s.typeChipActive : ''}`}
                  >
                    <Text className={s.typeText}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {mode === 'brand' && (
              <TextInput
                className={s.input}
                placeholder="#ff7a1a"
                placeholderTextColor="#617184"
                value={extra}
                onChangeText={setExtra}
              />
            )}
            <Button title="Salvar" onPress={save} />
            {mode === 'account' && (
              <Pressable onPress={logout}>
                <Text className={s.link}>Sair desta conta</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setShow(false)}>
              <Text className={s.link}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {!!actionItem && (
        <ActionModal
          title={actionItem.item.name || actionItem.item.title}
          close={() => setActionItem(null)}
          actions={
            actionItem.kind === 'app'
              ? [
                  {
                    label: 'Mover antes',
                    run: () => moveItem('APPLICATION', actionItem.item.id, -1),
                  },
                  {
                    label: 'Mover depois',
                    run: () => moveItem('APPLICATION', actionItem.item.id, 1),
                  },
                  { label: 'Editar', run: () => edit('app', actionItem.item) },
                  {
                    label: 'Excluir',
                    danger: true,
                    run: () =>
                      setConfirmDelete({
                        kind: 'applications',
                        id: actionItem.item.id,
                        name: actionItem.item.name,
                      }),
                  },
                ]
              : [
                  { label: 'Mover antes', run: () => moveItem('WIDGET', actionItem.item.id, -1) },
                  { label: 'Mover depois', run: () => moveItem('WIDGET', actionItem.item.id, 1) },
                  { label: 'Diminuir', run: () => resizeItem(actionItem.item.id, -1) },
                  { label: 'Aumentar', run: () => resizeItem(actionItem.item.id, 1) },
                  { label: 'Editar', run: () => edit('widget', actionItem.item) },
                  {
                    label: 'Excluir',
                    danger: true,
                    run: () =>
                      setConfirmDelete({
                        kind: 'widgets',
                        id: actionItem.item.id,
                        name: actionItem.item.title,
                      }),
                  },
                ]
          }
        />
      )}
      {!!confirmDelete && (
        <ConfirmMobile
          title="Excluir item"
          message={`Deseja excluir “${confirmDelete.name}”?`}
          cancel={() => setConfirmDelete(null)}
          confirm={remove}
        />
      )}
      {!!info && (
        <InfoModal title={info.title} message={info.message} close={() => setInfo(null)} />
      )}
    </SafeAreaView>
  );
}
const appImage = (app: AppItem) =>
  app.icon?.startsWith('http') ? app.icon : `${new URL(app.url).origin}/favicon.ico`;
const widgetIcon = (x: string): any =>
  (
    ({
      SYSTEM: 'speedometer-outline',
      STORAGE: 'server-outline',
      NETWORK: 'swap-vertical-outline',
      CLOCK: 'time-outline',
      WEATHER: 'partly-sunny-outline',
      SEARCH: 'search-outline',
    }) as any
  )[x] || 'grid-outline';
const widgetValue = (type: string, metrics: Record<string, number | null>) => {
  const percent = (value: number | null | undefined) =>
    typeof value === 'number' ? `${value.toFixed(0)}%` : '—';
  const rate = (value: number | null | undefined) =>
    typeof value === 'number' ? `${(value / 1_000_000).toFixed(1)} MB/s` : '—';
  if (type === 'SYSTEM') return `CPU ${percent(metrics.cpu)} · RAM ${percent(metrics.memory)}`;
  if (type === 'STORAGE') return percent(metrics.disk);
  if (type === 'NETWORK') return `↓ ${rate(metrics.download)} · ↑ ${rate(metrics.upload)}`;
  if (type === 'CLOCK')
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return '—';
};
const widgetSeries = (type: string, history: any) =>
  type === 'SYSTEM'
    ? history.cpu || []
    : type === 'STORAGE'
      ? history.disk || []
      : history.download || [];
function MiniBars({ values }: { values: Array<{ value: number }> }) {
  const points = values.slice(-24),
    max = Math.max(1, ...points.map((x) => x.value));
  return (
    <View className={s.miniChart}>
      {points.map((x, i) => (
        <View key={i} className={s.miniBar} style={{ height: Math.max(2, (x.value / max) * 30) }} />
      ))}
    </View>
  );
}
function Logo() {
  return (
    <View className={s.logo}>
      <Text className={s.logoText}>D</Text>
    </View>
  );
}
function Button({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable className={s.button} onPress={onPress}>
      <Text className={s.buttonText}>{title}</Text>
    </Pressable>
  );
}
function Center({ children }: { children: React.ReactNode }) {
  return <View className={`${s.page} ${s.center}`}>{children}</View>;
}
function InfoModal({
  title,
  message,
  close,
}: {
  title: string;
  message: string;
  close: () => void;
}) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <View className={s.dialogBack}>
        <View className={s.dialog}>
          <Text className={s.dialogTitle}>{title}</Text>
          <Text className={s.dialogMessage}>{message}</Text>
          <Button title="Entendi" onPress={close} />
        </View>
      </View>
    </Modal>
  );
}
function ConfirmMobile({
  title,
  message,
  cancel,
  confirm,
}: {
  title: string;
  message: string;
  cancel: () => void;
  confirm: () => void;
}) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={cancel}>
      <View className={s.dialogBack}>
        <View className={s.dialog}>
          <Text className={s.dialogTitle}>{title}</Text>
          <Text className={s.dialogMessage}>{message}</Text>
          <View className={s.dialogActions}>
            <Pressable className={s.dialogSecondary} onPress={cancel}>
              <Text className={s.dialogSecondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable className={s.dialogDanger} onPress={confirm}>
              <Text className={s.buttonText}>Excluir</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
function ActionModal({
  title,
  actions,
  close,
}: {
  title: string;
  actions: Array<{ label: string; danger?: boolean; run: () => void | Promise<void> }>;
  close: () => void;
}) {
  return (
    <Modal transparent visible animationType="slide" onRequestClose={close}>
      <Pressable className={s.modalBack} onPress={close}>
        <Pressable className={s.actionSheet} onPress={() => {}}>
          <View className={s.sheetHandle} />
          <Text className={s.dialogTitle}>{title}</Text>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              className={s.actionRow}
              onPress={() => {
                close();
                a.run();
              }}
            >
              <Text className={`${s.actionText} ${a.danger ? s.actionDanger : ''}`}>{a.label}</Text>
            </Pressable>
          ))}
          <Pressable className={s.actionRow} onPress={close}>
            <Text className={s.actionText}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const s = {
  page: 'flex-1 bg-[#091019]',
  center: 'flex-1 justify-center p-7 gap-4',
  logo: 'w-[82px] h-[82px] rounded-[25px] bg-accent self-center items-center justify-center mb-[18px]',
  logoText: 'text-[40px] font-extrabold text-white',
  title: 'text-[25px] font-bold text-[#f6f8fb] text-center mb-1',
  muted: 'text-[#8d9bac] text-sm',
  input: 'h-14 bg-[#111d2a] border border-[#263545] text-white rounded-[14px] px-4 text-[15px]',
  button: 'h-10 bg-accent px-4 rounded-xl items-center justify-center',
  buttonText: 'text-white font-bold text-sm',
  link: 'text-[#ff9a50] text-center p-2',
  subtle: 'text-[#647486] text-center',
  header: 'p-5 flex-row justify-between items-center',
  brand: 'text-white text-[23px] font-bold',
  content: 'px-[18px] pb-[110px]',
  search:
    'h-12 rounded-[15px] bg-white/[0.07] border border-white/[0.09] flex-row items-center gap-2 px-[14px]',
  searchText: 'text-[#8090a2]',
  searchInput: 'flex-1 text-[#eef3f8] py-2',
  section: 'text-[#dbe5ef] font-bold text-[17px] mt-7 mb-4',
  app: 'w-1/3 items-center mb-6',
  appIcon:
    'w-[66px] h-[66px] rounded-[20px] bg-white/[0.08] border border-white/[0.11] items-center justify-center',
  emoji: 'text-[32px]',
  realAppIcon: 'w-[42px] h-[42px] rounded-[10px]',
  appName: 'text-[#dbe5ef] text-xs mt-2 max-w-[95px]',
  widgets: 'flex-row flex-wrap gap-2.5',
  widget: 'w-full min-h-[105px] bg-white/[0.06] border border-white/[0.09] rounded-[19px] p-[15px]',
  widgetTitle: 'text-[#9eacbc] text-xs mt-[7px]',
  metric: 'text-white text-[23px] font-bold mt-1',
  miniChart: 'h-[34px] mt-2 flex-row items-end gap-0.5',
  miniBar: 'flex-1 bg-accent rounded-sm opacity-80',
  fab: 'absolute right-5 bottom-6 w-[58px] h-[58px] rounded-[19px] bg-accent items-center justify-center shadow-2xl',
  modalBack: 'flex-1 bg-black/60 justify-end',
  sheet: 'bg-[#101a26] rounded-t-[28px] p-6 pb-10 gap-[14px]',
  typeGrid: 'flex-row flex-wrap gap-[7px]',
  typeChip: 'px-2.5 py-[7px] rounded-[10px] bg-white/[0.05] border border-white/[0.09]',
  typeChipActive: 'bg-orange-500/30 border-accent',
  typeText: 'text-[#dbe5ef] text-[11px]',
  toast:
    'absolute top-[54px] left-5 right-5 z-50 bg-[#173426] border border-[#3bd47b66] rounded-[14px] px-4 py-[13px]',
  toastError: 'bg-[#3b2023] border-[#ff6b6b77]',
  toastText: 'text-[#f4f8fb] font-semibold text-center',
  dialogBack: 'flex-1 bg-black/70 items-center justify-center p-6',
  dialog: 'w-full max-w-[420px] bg-[#111d29] rounded-3xl border border-white/[0.11] p-[22px] gap-4',
  dialogTitle: 'text-[#f5f8fb] text-xl font-bold',
  dialogMessage: 'text-[#a9b5c2] text-[15px] leading-[21px]',
  dialogActions: 'flex-row gap-2.5',
  dialogSecondary:
    'flex-1 h-10 rounded-[13px] border border-white/[0.13] items-center justify-center',
  dialogSecondaryText: 'text-[#dbe5ef] font-bold',
  dialogDanger: 'flex-1 h-10 rounded-[13px] bg-[#d84b4b] items-center justify-center',
  actionSheet: 'bg-[#101a26] rounded-t-[28px] p-5 pb-[34px] gap-1',
  sheetHandle: 'w-[42px] h-1 rounded-sm bg-white/20 self-center mb-[14px]',
  actionRow: 'py-[15px] border-b border-white/[0.05]',
  actionText: 'text-[#e5ebf1] text-base text-center',
  actionDanger: 'text-[#ff7f78]',
};
