import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { checkAdmin, adminCall } from '../services/adminApi';
import { isLocalApiConfigured } from '../services/localApi';
import { rankFoods } from '../utils/search';
import type { AdminState, Food, Section } from '../types';

const nav: { label: Section; icon: string; group?: string }[] = [
  { label: 'Dashboard', icon: '▦' }, { label: 'Meal Items', icon: '◷', group: 'CATALOG' },
  { label: 'Maternal Foods', icon: '◈' }, { label: 'Missing References', icon: '↗' },
  { label: 'Data Quality', icon: '◎' }, { label: 'Settings', icon: '⚙', group: 'WORKSPACE' },
];
const displayName = (r: Food) => String(r.display_name || r.english_name || r.item_name || r.food_id || 'Unnamed record');
const dateText = (v: unknown) => v ? new Date(String(v)).toLocaleDateString() : '—';

function App() {
  const [section, setSection] = useState<Section>('Dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [admin, setAdmin] = useState<AdminState | null>(null);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Food[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState<Food | null>(null);
  const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; table: 'meal_items' | 'maternal_foods'; record?: Food } | null>(null);
  const pageSize = 25;
  useEffect(() => { void checkAdmin().then(setAdmin); }, []);

  const load = useCallback(async (target = section, offsetPage = page, q = query) => {
    setError('');
    setBusy(true);
    try {
      if (target === 'Dashboard') {
        const value = await adminCall<Record<string, number>>('dashboard');
        setMetrics(value);
      } else if (target !== 'Settings') {
        const table = target === 'Meal Items' ? 'meal_items' : target === 'Maternal Foods' ? 'maternal_foods' : target === 'Missing References' ? 'missing_references' : 'data_quality';
        const response = await adminCall<{ rows: Food[]; total: number }>('list', { table, q, offset: offsetPage * pageSize, limit: pageSize });
        setRows(response.rows || []); setTotal(response.total || 0);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load records.'); setRows([]); if (target === 'Dashboard') setMetrics(null); }
    finally { setBusy(false); }
  }, [section, page, query]);
  useEffect(() => {
    if (!admin?.authorized) return;
    const timer = window.setTimeout(() => void load(), query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [admin?.authorized, section, page, query, load]);

  const copied = async (value: unknown) => {
    if (value == null || value === '') return;
    try { await navigator.clipboard.writeText(String(value)); setToast('Food ID copied'); window.setTimeout(() => setToast(''), 2200); }
    catch { setToast('Clipboard access is unavailable'); window.setTimeout(() => setToast(''), 2400); }
  };
  const go = (item: Section, initialQuery = '') => { setSection(item); setPage(0); setQuery(initialQuery); setError(''); setMobileOpen(false); setSelected(null); };
  const saveRecord = async (values: Record<string, unknown>) => {
    if (!editor) return;
    setBusy(true); setError('');
    try {
      await adminCall(editor.mode, { table: editor.table, id: editor.record?.id, values });
      setEditor(null); setSelected(null); setToast(editor.mode === 'create' ? 'Record added' : 'Changes saved');
      window.setTimeout(() => setToast(''), 2200); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save record.'); }
    finally { setBusy(false); }
  };
  const removeRecord = async (record: Food) => {
    const table = section === 'Meal Items' ? 'meal_items' : 'maternal_foods';
    if (!record.id || !window.confirm(`Delete “${displayName(record)}”? This cannot be undone.`)) return;
    setBusy(true); setError('');
    try {
      await adminCall('delete', { table, id: record.id });
      setSelected(null); setToast('Record deleted'); window.setTimeout(() => setToast(''), 2200); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete record.'); }
    finally { setBusy(false); }
  };

  const results = useMemo(() => query.trim() ? rankFoods(rows, query) : rows, [rows, query]);
  const title = section === 'Missing References' ? 'Missing Food References' : section;

  return <div className="shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark">m</div><div><b>maathru care</b><small>RESEARCH PORTAL</small></div></div>
      <div className="workspace"><span className="workspace-dot"/>Food database<span className="chevron">⌄</span></div>
      <nav>{nav.map(item => <div key={item.label}>{item.group && <div className="nav-label">{item.group}</div>}<button className={`nav-item ${section === item.label ? 'active' : ''}`} onClick={() => go(item.label)}><span className="nav-icon">{item.icon}</span>{item.label}{item.label === 'Missing References' && <span className="nav-count">!</span>}</button></div>)}</nav>
      <div className="sidebar-foot"><div className="avatar">MC</div><div className="user-lines"><b>Local workspace</b><small>{admin?.authorized ? 'Local admin service' : 'Local only'}</small></div><button aria-label="Local settings" className="signout" onClick={() => go('Settings')}>⚙</button></div>
    </aside>
    {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation"/>}
    <main className="main">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open navigation">☰</button><div className="crumb">Food Database <span>/</span> <b>{title}</b></div><div className="top-actions"><span className={`status ${admin?.authorized ? 'ok' : ''}`}><i/>{admin?.authorized ? 'Local admin service' : 'Local service needed'}</span><button className="help-button" onClick={() => go('Settings')}>Help & setup</button></div></header>
      <div className="content">
        {!admin?.authorized && section !== 'Settings' ? <AccessGate state={admin} onRetry={async () => setAdmin(await checkAdmin())} onSettings={() => go('Settings')} error={error}/> : <>
          <div className="page-heading"><div><div className="eyebrow">FOOD DATA / {section.toUpperCase()}</div><h1>{title}</h1><p>{section === 'Dashboard' ? 'A clear view of catalog health and food references.' : descriptions[section]}</p></div><div className="heading-actions">{section === 'Dashboard' && <button className="btn secondary" onClick={() => void load()}>⟳ <span>Refresh</span></button>}{['Meal Items', 'Maternal Foods'].includes(section) && <button className="btn primary" disabled={!admin?.writesEnabled} title={!admin?.writesEnabled ? admin?.reason || 'Add SUPABASE_SERVICE_ROLE_KEY to server/.env to enable writes.' : undefined} onClick={() => setEditor({ mode: 'create', table: section === 'Meal Items' ? 'meal_items' : 'maternal_foods' })}>＋ <span>Add record</span></button>}</div></div>
          {!admin?.writesEnabled && <div className="info-banner"><span className="banner-icon">i</span><span><b>Read-only mode</b> — {admin?.reason || 'Add SUPABASE_SERVICE_ROLE_KEY to server/.env to enable Add, Edit, and Delete.'} The browser sends database requests only to this local server.</span><button onClick={() => go('Settings')}>Review setup →</button></div>}
          {error && <div className="error-banner">{error}<button onClick={() => void load()}>Retry</button></div>}
          {section === 'Dashboard' ? <Dashboard metrics={metrics} loading={busy} onNavigate={go}/> : section === 'Settings' ? <Settings state={admin}/> : <>
            <div className="table-tools"><div className="searchbox"><span>⌕</span><input aria-label="Search records" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder={`Search ${section.toLowerCase()} by name, food ID…`}/>{query && <button onClick={() => setQuery('')}>×</button>}<kbd>⌘ K</kbd></div><button className="filter-btn" onClick={() => setToast('Filters are applied server-side with search')}>☷ <span>Filters</span></button><button className="filter-btn" onClick={() => void load()}>⟳</button></div>
            {section === 'Missing References' && <div className="subnote">Meal item food IDs without a matching maternal food. Historical resolution counts are not available.</div>}
            <div className="table-wrap">{busy ? <LoadingRows/> : results.length ? <RecordTable section={section} rows={results} onCopy={copied} onOpen={setSelected}/> : <Empty error={error} section={section} query={query}/>}</div>
            <div className="pagination"><span>{total ? `${Math.min(page * pageSize + 1, total)}–${Math.min((page + 1) * pageSize, total)} of ${total} records` : 'No records loaded'}</span><div><button disabled={!page || busy} onClick={() => setPage(p => p - 1)}>← <span>Previous</span></button><button disabled={(page + 1) * pageSize >= total || busy} onClick={() => setPage(p => p + 1)}><span>Next</span> →</button></div></div>
          </>}
        </>}
      </div>
      {selected && <Detail record={selected} section={section} canWrite={Boolean(admin?.writesEnabled)} onClose={() => setSelected(null)} onCopy={copied} onNavigate={go} onEdit={() => setEditor({ mode: 'edit', table: section === 'Meal Items' ? 'meal_items' : 'maternal_foods', record: selected })} onDelete={() => void removeRecord(selected)}/>}
      {editor && <RecordEditor key={`${editor.mode}-${editor.table}-${String(editor.record?.id ?? 'new')}`} mode={editor.mode} table={editor.table} record={editor.record} busy={busy} onClose={() => setEditor(null)} onSave={saveRecord}/>}
      {toast && <div role="status" className="toast">✓　{toast}</div>}
    </main>
  </div>;
}

const descriptions: Record<Section, string> = { Dashboard: '', 'Meal Items': 'Search meal history and inspect food reference links.', 'Maternal Foods': 'Manage the nutrition catalog used across Maathru Care.', 'Missing References': 'Find meal items with unresolved food IDs.', 'Data Quality': 'Review data warnings and incomplete or inconsistent records.', Settings: 'Connection, authorization, and image upload configuration.' };

function AccessGate({ state, onRetry, onSettings, error }: { state: AdminState | null; onRetry: () => void; onSettings: () => void; error: string }) {
 return <div className="gate"><div className="gate-icon">L</div><div className="eyebrow">LOCAL WORKSPACE</div><h1>Local admin service is not ready</h1><p>No website sign-in is required. Database records stay unavailable until a trusted service running on this computer is configured. That service must bind to localhost and keep all database credentials on the server.</p><div className="gate-error">{error || state?.reason || 'Local admin service is not configured.'}</div><div className="gate-actions"><button className="btn secondary" onClick={onRetry}>Check again</button><button className="text-link" onClick={onSettings}>View setup</button></div><div className="gate-note">This website has no sign-in screen and sends no database credentials from the browser.</div></div>;
}

function Dashboard({ metrics, loading, onNavigate }: { metrics: Record<string, number> | null; loading: boolean; onNavigate: (s: Section) => void }) {
 const cards: { title: string; key: string; sub: string; icon: string; tone: string; target: Section }[] = [
  { title: 'Meal items', key: 'mealItems', sub: 'Across meal logs', icon: '◷', tone: 'lavender', target: 'Meal Items' },
  { title: 'Maternal foods', key: 'maternalFoods', sub: 'Nutrition catalog', icon: '◈', tone: 'mint', target: 'Maternal Foods' },
  { title: 'Linked references', key: 'linkedMealItems', sub: 'Meal items with a match', icon: '↗', tone: 'blue', target: 'Meal Items' },
  { title: 'Missing references', key: 'missingReferences', sub: 'Need a catalog match', icon: '!', tone: 'amber', target: 'Missing References' },
  { title: 'Data quality flags', key: 'qualityIssues', sub: 'Review recommended', icon: '◎', tone: 'rose', target: 'Data Quality' },
  { title: 'Recently added', key: 'recentRecords', sub: 'Added in the last 30 days', icon: '＋', tone: 'gray', target: 'Maternal Foods' },
 ];
 return <><div className="section-title"><div><h2>Overview</h2><p>Live counts from the authorized admin service.</p></div><span className="live-label"><i/> LIVE DATA</span></div><div className="stats-grid">{cards.map(c => <button className="stat-card" key={c.key} onClick={() => onNavigate(c.target)}><div className="stat-top"><span>{c.title}</span><span className={`stat-icon ${c.tone}`}>{c.icon}</span></div><div className="stat-number">{loading ? <i className="skeleton"/> : metrics?.[c.key] ?? '—'}</div><div className="stat-sub">{c.sub}<span>→</span></div></button>)}</div><div className="dashboard-lower"><section className="panel quick-panel"><div className="panel-heading"><div><h3>Quick access</h3><p>Jump into a data set</p></div><span className="dots">•••</span></div><div className="quick-list"><Quick label="Browse maternal foods" text="Search names, categories, food IDs" icon="◈" onClick={() => onNavigate('Maternal Foods')}/><Quick label="Check missing references" text="Find unresolved food IDs" icon="↗" onClick={() => onNavigate('Missing References')}/><Quick label="Review data quality" text="See warnings and incomplete records" icon="◎" onClick={() => onNavigate('Data Quality')}/></div></section><section className="panel activity-panel"><div className="panel-heading"><div><h3>Recent activity</h3><p>Latest additions from the catalog</p></div><button className="text-link" onClick={() => onNavigate('Maternal Foods')}>View catalog →</button></div>{loading ? <LoadingRows compact/> : metrics?.recentRecords ? <div className="activity-placeholder"><span className="activity-icon">◈</span><span><b>Recent records available</b><small>Open the catalog to view recently added foods</small></span></div> : <div className="activity-placeholder"><span className="activity-icon quiet">◷</span><span><b>No recent records to show</b><small>Activity will appear here when available</small></span></div>}</section></div></>;
}
function Quick({ label, text, icon, onClick }: { label: string; text: string; icon: string; onClick: () => void }) { return <button className="quick-row" onClick={onClick}><span className="quick-icon">{icon}</span><span><b>{label}</b><small>{text}</small></span><span className="quick-arrow">→</span></button>; }

function RecordTable({ section, rows, onCopy, onOpen }: { section: Section; rows: Food[]; onCopy: (x: unknown) => void; onOpen: (x: Food) => void }) {
 const maternal = section === 'Maternal Foods';
 const missing = section === 'Missing References';
 const headers = maternal ? ['Food ID', 'Display name', 'Category', 'English name', 'Serving unit', 'Carbs', 'GI', 'Contraindicated', 'Created'] : ['Item name', 'Food ID', 'Meal log ID', 'Serving', 'Carbs', 'Image', 'Reference status', 'Created'];
 return <table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}<th className="action-head">ACTION</th></tr></thead><tbody>{rows.map((r, i) => {
  const id = r.food_id;
 const missingRef = missing || r.reference_status === 'missing' || r.linked === false;
  const linkStatus = !id ? 'Missing ID' : missingRef ? 'Missing food' : r.reference_status === 'ambiguous' ? 'Ambiguous' : r.reference_status === 'linked' || r.linked === true ? 'Linked' : 'Not checked';
  const data = maternal ? [<FoodId value={id} onCopy={onCopy}/>,displayName(r),r.category || '—',r.english_name || '—',r.serving_unit || '—',r.carbs_g ?? '—',r.gi_index ?? '—',r.is_contraindicated ? <span className="tag warning">Yes</span> : 'No',dateText(r.created_at)] : [displayName(r),<FoodId value={id} onCopy={onCopy}/>,r.meal_log_id || '—',r.serving_multiplier ?? '—',r.carbs_g ?? '—',r.image_uri ? String(r.image_uri).startsWith('blob:') ? <span className="tag warning">Temporary</span> : <span className="tag success">Available</span> : '—',<span className={`tag ${linkStatus === 'Linked' ? 'success' : linkStatus === 'Not checked' ? '' : 'warning'}`}>{linkStatus}</span>,dateText(r.created_at)];
  return <tr key={String(r.id ?? `${id}-${i}`)} onClick={() => onOpen(r)}>{data.map((v, j) => <td key={j}>{v as ReactNode}</td>)}<td><button className="row-open" onClick={e => { e.stopPropagation(); onOpen(r); }}>View →</button></td></tr>;
 })}</tbody></table>;
}
function FoodId({ value, onCopy }: { value: unknown; onCopy: (x: unknown) => void }) { const present = value != null && value !== ''; return <span className="food-id">{present ? String(value) : <i>Missing</i>}{present && <button title="Copy exact food ID" aria-label="Copy food ID" onClick={e => { e.stopPropagation(); void onCopy(value); }}>ID</button>}</span>; }
function LoadingRows({ compact = false }: { compact?: boolean }) { return <div className={`loading-list ${compact ? 'compact' : ''}`}>{Array.from({ length: compact ? 2 : 7 }, (_, i) => <div key={i}><i/><i/><i/></div>)}</div>; }
function Empty({ error, section, query }: { error: string; section: Section; query: string }) { return <div className="empty-state"><div>⌕</div><b>{error ? 'Records could not be loaded' : query ? 'No matching records' : `No ${section.toLowerCase()} to display`}</b><p>{error || (query ? 'Try a shorter spelling or search by food ID.' : 'When data is returned by the authorized service, it will appear here.')}</p></div>; }

function Detail({ record, section, canWrite, onClose, onCopy, onNavigate, onEdit, onDelete }: { record: Food; section: Section; canWrite: boolean; onClose: () => void; onCopy: (v: unknown) => void; onNavigate: (s: Section, q?: string) => void; onEdit: () => void; onDelete: () => void }) {
 const keys = Object.keys(record).filter(k => !['password','image_uri'].includes(k));
 return <><button className="drawer-scrim" onClick={onClose} aria-label="Close detail"/><aside className="drawer"><div className="drawer-head"><div><div className="eyebrow">{section.toUpperCase()} / RECORD</div><h2>{displayName(record)}</h2></div><button onClick={onClose} aria-label="Close">×</button></div><div className="drawer-id"><span>Food ID</span><FoodId value={record.food_id} onCopy={onCopy}/></div><div className="drawer-fields">{keys.map(k => <div key={k}><span>{k.replaceAll('_',' ')}</span><b>{record[k] == null || record[k] === '' ? '—' : typeof record[k] === 'object' ? JSON.stringify(record[k]) : String(record[k])}</b></div>)}</div><div className="drawer-actions">{canWrite && <><button className="btn secondary" onClick={onEdit}>✎ Edit</button><button className="btn danger" onClick={onDelete}>Delete</button></>}<button className="btn secondary" onClick={() => { onClose(); onNavigate(section === 'Meal Items' ? 'Maternal Foods' : 'Meal Items', String(record.food_id ?? '')); }}>View related records →</button></div><div className="drawer-note">{canWrite ? 'Changes are sent through the local server.' : 'Configure a Supabase service-role key in server/.env to enable changes.'}</div></aside></>;
}

type EditorTable = 'meal_items' | 'maternal_foods';
type EditorField = { key: string; label: string; kind?: 'text' | 'number' | 'checkbox' | 'meal-log'; required?: boolean };
const editorFields: Record<EditorTable, EditorField[]> = {
 maternal_foods: [
  { key: 'food_id', label: 'Food ID', required: true }, { key: 'display_name', label: 'Display name', required: true },
  { key: 'english_name', label: 'English name' }, { key: 'scientific_name', label: 'Scientific name' }, { key: 'category', label: 'Category' },
  { key: 'serving_unit', label: 'Serving unit' },
  { key: 'carbs_g', label: 'Carbohydrates (g)', kind: 'number' }, { key: 'sugar_g', label: 'Sugar (g)', kind: 'number' },
  { key: 'fiber_g', label: 'Fiber (g)', kind: 'number' }, { key: 'fat_g', label: 'Fat (g)', kind: 'number' },
  { key: 'iron_mg', label: 'Iron (mg)', kind: 'number' }, { key: 'calcium_mg', label: 'Calcium (mg)', kind: 'number' },
  { key: 'gi_index', label: 'GI', kind: 'number' }, { key: 'is_contraindicated', label: 'Contraindicated', kind: 'checkbox' },
 ],
 meal_items: [
  { key: 'meal_log_id', label: 'Meal log', kind: 'meal-log', required: true }, { key: 'food_id', label: 'Food ID (optional)' },
  { key: 'item_name', label: 'Item name' }, { key: 'image_uri', label: 'Image URI' }, { key: 'serving_multiplier', label: 'Serving multiplier', kind: 'number' },
  { key: 'carbs_g', label: 'Carbohydrates (g)', kind: 'number' }, { key: 'sugar_g', label: 'Sugar (g)', kind: 'number' },
  { key: 'fiber_g', label: 'Fiber (g)', kind: 'number' }, { key: 'fat_g', label: 'Fat (g)', kind: 'number' },
  { key: 'iron_mg', label: 'Iron (mg)', kind: 'number' }, { key: 'calcium_mg', label: 'Calcium (mg)', kind: 'number' },
 ],
};
function RecordEditor({ mode, table, record, busy, onClose, onSave }: { mode: 'create' | 'edit'; table: EditorTable; record?: Food; busy: boolean; onClose: () => void; onSave: (values: Record<string, unknown>) => void }) {
 const [values, setValues] = useState<Record<string, unknown>>(() => Object.fromEntries(editorFields[table].map(f => [f.key, record?.[f.key] ?? (f.kind === 'checkbox' ? false : '')])));
 const [logs, setLogs] = useState<{ id: string | number; created_at?: string }[]>([]);
 const [loadError, setLoadError] = useState('');
 useEffect(() => { if (table === 'meal_items') void adminCall<{ id: string | number; created_at?: string }[]>('meal_logs').then(setLogs).catch(e => setLoadError(e instanceof Error ? e.message : 'Could not load meal logs.')); }, [table]);
 const submit = (event: FormEvent) => { event.preventDefault(); const clean = { ...values }; for (const field of editorFields[table]) if (field.kind === 'number') clean[field.key] = clean[field.key] === '' ? null : Number(clean[field.key]); onSave(clean); };
 return <div className="editor-overlay" role="presentation"><form className="record-editor" onSubmit={submit}><div className="editor-head"><div><div className="eyebrow">{mode === 'create' ? 'NEW RECORD' : 'EDIT RECORD'}</div><h2>{mode === 'create' ? 'Add ' : 'Edit '}{table === 'meal_items' ? 'meal item' : 'maternal food'}</h2></div><button type="button" className="editor-close" onClick={onClose} aria-label="Close">×</button></div>{loadError && <div className="field-error">{loadError}</div>}<div className="editor-fields">{editorFields[table].map(field => <label className={field.kind === 'checkbox' ? 'editor-check' : ''} key={field.key}><span>{field.label}{field.required ? ' *' : ''}</span>{field.kind === 'checkbox' ? <input type="checkbox" checked={Boolean(values[field.key])} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.checked }))}/> : field.kind === 'meal-log' ? <select required value={String(values[field.key] ?? '')} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}><option value="">Choose a meal log</option>{logs.map(log => <option key={String(log.id)} value={String(log.id)}>{String(log.id)}{log.created_at ? ` · ${new Date(log.created_at).toLocaleString()}` : ''}</option>)}</select> : <input type={field.kind === 'number' ? 'number' : 'text'} min={field.kind === 'number' ? '0' : undefined} step={field.kind === 'number' ? 'any' : undefined} required={field.required} value={String(values[field.key] ?? '')} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}/>}</label>)}</div><div className="editor-footer"><button type="button" className="btn secondary" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="btn primary" disabled={busy || Boolean(loadError)}>{busy ? 'Saving…' : mode === 'create' ? 'Add record' : 'Save changes'}</button></div></form></div>;
}

function Settings({ state }: { state: AdminState | null }) {
 const [preview, setPreview] = useState(''); const [previewError, setPreviewError] = useState(''); const apiConfigured = isLocalApiConfigured();
 const chooseImage = (file?: File) => { if (!file) return; if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setPreviewError('Choose a JPEG, PNG, or WebP image.'); return; } if (file.size > 5*1024*1024) { setPreviewError('Choose an image under 5 MB.'); return; } setPreviewError(''); setPreview(URL.createObjectURL(file)); };
 return <div className="settings-grid"><section className="panel settings-card"><div className="panel-heading"><div><h3>Local workspace</h3><p>This admin website is intended for use on this computer only.</p></div><span className="tag success">No sign-in</span></div><div className="setting-row"><span>Website address</span><b>127.0.0.1</b></div><div className="setting-row"><span>Browser login</span><b>Not used</b></div><div className="setting-row"><span>Local API</span><b>{apiConfigured ? 'Configured' : 'Not configured'}</b></div><div className="setting-row"><span>Database access</span><b>{state?.authorized ? state.writesEnabled ? 'Read and write enabled' : 'Read only' : 'Unavailable'}</b></div></section><section className="panel settings-card"><div className="panel-heading"><div><h3>Image preview</h3><p>Select an image to preview locally.</p></div><span className="tag warning">Upload unavailable</span></div><p className="settings-body">This build does not upload to Cloudinary. No image is sent or saved.</p><div className="upload-preview"><label className="upload-label">Browse image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => chooseImage(e.target.files?.[0])}/></label><span>PNG, JPG, WebP - max 5 MB</span>{preview && <img src={preview} alt="Selected food preview"/>}</div>{previewError && <div className="field-error">{previewError}</div>}</section><section className="panel settings-card setup-wide"><div className="panel-heading"><div><h3>Local admin service</h3><p>Configured through VITE_LOCAL_ADMIN_API_URL.</p></div><span className={'tag ' + (apiConfigured ? 'success' : 'warning')}>{apiConfigured ? 'Loopback URL set' : 'Not connected'}</span></div><pre>POST http://127.0.0.1:8787/api
Actions: status, dashboard, list, create, update, delete
Writes: {state?.writesEnabled ? 'enabled' : 'needs service key'}</pre><p className="settings-body">Reads use the Supabase anon/publishable key. Add SUPABASE_SERVICE_ROLE_KEY to the ignored server/.env file to enable local writes, then restart npm run admin:server.</p>{state?.reason && <div className="field-error">{state.reason}</div>}</section></div>;
}
export default App;
