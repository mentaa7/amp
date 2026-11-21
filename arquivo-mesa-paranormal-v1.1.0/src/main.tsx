import React, { useEffect, useMemo, useState } from 'react';
import { createClient, type User } from '@supabase/supabase-js';
import { createRoot } from 'react-dom/client';
import { Activity, BookOpen, ChevronDown, Dices, FileText, Shield, Users, Plus, Minus, RotateCcw, Search, Eye, Save, UserRound, ScrollText, Download, Upload } from 'lucide-react';
import './style.css';

const skills = [
  ['Acrobacia', 'Físico'], ['Animais', 'Emoção'], ['Aptidão', 'Mente'], ['Atletismo', 'Físico'], ['Bruxaria', 'Mente'], ['Crime', 'Físico'], ['Disciplina', 'Emoção'], ['Enganação', 'Emoção'], ['Furtividade', 'Físico'], ['Inspecionar', 'Mente'], ['Intimidar', 'Emoção'], ['Intuição', 'Emoção'], ['Luta', 'Físico'], ['Medicina', 'Mente'], ['Ofício', 'Mente'], ['Percepção', 'Mente'], ['Persuasão', 'Emoção'], ['Pontaria', 'Físico'], ['Sobrevivência', 'Mente'], ['Vigor', 'Físico']
] as const;
const attr = ['Físico', 'Mente', 'Emoção'] as const;
const dieRank = [4, 6, 8, 10, 12] as const;
type D = typeof dieRank[number];
type Die = { value: number; sides: D; kind: 'ATRIBUTO' | 'PERÍCIA' };
type RollResult = { label: string; attribute: string; dice: Die[]; timestamp: string };
type CharacterData = { name: string; profile: string; vocation: string; level: number; hp: number; pd: number; attributes: Record<string,D>; skillLevels: Record<string,D>; aptitude: string; craft: string; abilities: string[]; notes: string };
const defaultSkills = Object.fromEntries(skills.map(([name]) => [name, 4])) as Record<string,D>;
const initialCharacter: CharacterData = { name: '', profile: '', vocation: '', level: 1, hp: 22, pd: 12, attributes: { Físico: 8, Mente: 6, Emoção: 6 }, skillLevels: defaultSkills, aptitude: '', craft: '', abilities: ['', ''], notes: '' };
const STORAGE_KEY = 'arquivo-mesa-paranormal-character-v050';
const LOCK_KEY = 'arquivo-mesa-paranormal-locked-v050';
const CHANGE_KEY = 'arquivo-mesa-paranormal-change-log-v050';
const CAMPAIGN_KEY = 'arquivo-mesa-paranormal-campaigns-v060';
type CampaignMember = { id: number; name: string; role: 'Mestre'|'Jogador'; character?: string };
type Campaign = { id: number; name: string; description: string; role: 'Mestre' | 'Jogador'; notes: string; created: string; inviteCode: string; members: CampaignMember[] };
type CloudCampaign = { id: string; name: string; description: string; notes: string; created_by: string; created_at: string };
type CloudMember = { user_id: string; role: 'GM' | 'PLAYER'; joined_at: string }; 

function DiceResult({ dice }: { dice: Die[] }) {
  const shape: Record<number, string> = { 4: '50,5 93,91 8,91', 6: '50,5 91,27 91,73 50,95 9,73 9,27', 8: '50,4 82,18 96,50 82,82 50,96 18,82 4,50 18,18', 10: '50,4 91,30 78,88 22,88 9,30', 12: '50,4 75,11 92,31 92,69 75,89 50,96 25,89 8,69 8,31 25,11' };
  return <div className="dice-results" aria-label={dice.map(d => `${d.kind}: d${d.sides}, resultado ${d.value}`).join('; ')}>
    {dice.map((die, index) => <div className={`die die-d${die.sides}`} key={`${index}-${die.kind}`}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`Dado de ${die.sides} lados`}><polygon points={shape[die.sides]} /><path className="die-facet" d={die.sides === 4 ? 'M50 5 L50 91 M8 91 L50 54 L93 91' : die.sides === 6 ? 'M50 5 L50 95 M9 27 L50 50 L91 27 M9 73 L50 50 L91 73' : die.sides === 8 ? 'M50 4 L50 96 M4 50 L96 50 M18 18 L82 82 M82 18 L18 82' : die.sides === 10 ? 'M50 4 L50 88 M9 30 L50 48 L91 30' : 'M50 4 L50 96 M8 31 L50 50 L92 31 M8 69 L50 50 L92 69'} /></svg>
      <strong>{die.value}</strong><small>d{die.sides}</small><em>{die.kind === 'ATRIBUTO' ? 'ATR' : 'PER'}</em>
    </div>)}
  </div>;
}

function App() {
  const [page, setPage] = useState('painel');
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const supabase = useMemo(() => supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null, [supabaseUrl, supabaseAnonKey]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [cloudCampaigns, setCloudCampaigns] = useState<CloudCampaign[]>([]);
  const [cloudCampaignName, setCloudCampaignName] = useState('');
  const [cloudCampaignDescription, setCloudCampaignDescription] = useState('');
  const [selectedCloudCampaign, setSelectedCloudCampaign] = useState<string | null>(null);
  const [cloudNotes, setCloudNotes] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudMessage, setCloudMessage] = useState('');
  const [cloudMembers, setCloudMembers] = useState<CloudMember[]>([]);
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [inviteExpiryDays, setInviteExpiryDays] = useState('7');
  const [inviteMaxUses, setInviteMaxUses] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [character, setCharacter] = useState<CharacterData>(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? { ...initialCharacter, ...JSON.parse(saved) } : initialCharacter; } catch { return initialCharacter; }
  });
  const [history, setHistory] = useState<RollResult[]>([]);
  const [locked, setLocked] = useState<boolean>(() => localStorage.getItem(LOCK_KEY) === 'true');
  const [editMode, setEditMode] = useState<boolean>(() => localStorage.getItem(LOCK_KEY) !== 'true');
  const [changeLog, setChangeLog] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(CHANGE_KEY) || '[]'); } catch { return []; } });
  const [query, setQuery] = useState('');
  const [latestRoll, setLatestRoll] = useState<RollResult | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => { try { const raw = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || '[]'); return Array.isArray(raw) ? raw.map((c:any) => ({ ...c, inviteCode: c.inviteCode || Math.random().toString(36).slice(2,8).toUpperCase(), members: Array.isArray(c.members) ? c.members : [{id: Number(c.id)+1 || Date.now(), name: 'Você', role: c.role || 'Mestre'}] })) : []; } catch { return []; } });
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignRole, setCampaignRole] = useState<'Mestre'|'Jogador'>('Mestre');
  const [selectedCampaign, setSelectedCampaign] = useState<number|null>(null);
  const [campaignNotes, setCampaignNotes] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberCharacter, setMemberCharacter] = useState('');
  const [memberRole, setMemberRole] = useState<'Mestre'|'Jogador'>('Jogador');
  const nav = [['painel', 'Painel', Activity], ['ficha', 'Ficha', FileText], ['rolagem', 'Rolagens', Dices], ['campanha', 'Campanha', Users], ['regras', 'Referência', BookOpen], ['online', 'Infraestrutura', Shield]] as const;

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error }) => { if (error) setAuthMessage(error.message); setAuthUser(data.session?.user ?? null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setAuthUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);
  async function submitAuth() {
    if (!supabase) return;
    if (!authEmail.trim() || !authPassword) { setAuthMessage('Informe e-mail e senha.'); return; }
    if (authPassword.length < 6) { setAuthMessage('A senha precisa ter pelo menos 6 caracteres.'); return; }
    setAuthBusy(true); setAuthMessage('');
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { data: { display_name: authName.trim() } } });
        if (error) throw error;
        if (data.session && data.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({ id: data.user.id, display_name: authName.trim() || authEmail.split('@')[0] });
          if (profileError) throw profileError;
          setAuthMessage('Conta criada e sessão iniciada.');
        } else setAuthMessage('Cadastro enviado. Confira seu e-mail para confirmar a conta antes de entrar.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({ id: data.user.id, display_name: String(data.user.user_metadata?.display_name || authEmail.split('@')[0]) });
          if (profileError) throw profileError;
        }
        setAuthMessage('Login realizado com sucesso.');
      }
    } catch (error) { setAuthMessage(error instanceof Error ? error.message : 'Não foi possível concluir a autenticação.'); }
    finally { setAuthBusy(false); }
  }
  async function signOut() { if (!supabase) return; const { error } = await supabase.auth.signOut(); setAuthMessage(error ? error.message : 'Você saiu da sua conta.'); setCloudCampaigns([]); setSelectedCloudCampaign(null); }

  async function loadCloudCampaigns() {
    if (!supabase || !authUser) { setCloudCampaigns([]); return; }
    setCloudBusy(true); setCloudMessage('');
    const { data, error } = await supabase.from('campaigns').select('id,name,description,notes,created_by,created_at').order('created_at', { ascending: false });
    if (error) setCloudMessage(`Não foi possível carregar as campanhas: ${error.message}`);
    else { setCloudCampaigns((data || []) as CloudCampaign[]); if (selectedCloudCampaign && !(data || []).some((c:any) => c.id === selectedCloudCampaign)) setSelectedCloudCampaign(null); }
    setCloudBusy(false);
  }
  useEffect(() => { if (authUser && supabase) void loadCloudCampaigns(); else { setCloudCampaigns([]); setSelectedCloudCampaign(null); } }, [authUser, supabase]);
  async function loadCloudMembers(campaignId: string) {
    if (!supabase) return;
    const { data, error } = await supabase.from('campaign_members').select('user_id,role,joined_at').eq('campaign_id', campaignId).order('joined_at', { ascending: true });
    if (error) { setCloudMessage(`Não foi possível carregar os participantes: ${error.message}`); return; }
    setCloudMembers((data || []) as CloudMember[]);
  }
  async function createCloudInvite() {
    if (!supabase || !selectedCloudCampaign) return;
    setCloudBusy(true); setCloudMessage('Gerando convite seguro...'); setCreatedInviteCode('');
    const days = Number(inviteExpiryDays);
    const maxUses = inviteMaxUses.trim() ? Number(inviteMaxUses) : null;
    const expiresAt = Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) { setCloudMessage('O limite de usos deve ser um número inteiro maior que zero.'); setCloudBusy(false); return; }
    const { data, error } = await supabase.rpc('create_campaign_invite', { p_campaign_id: selectedCloudCampaign, p_expires_at: expiresAt, p_max_uses: maxUses });
    if (error) setCloudMessage(`Não foi possível gerar o convite: ${error.message}. Confira se executou a migration v1.2.0.`);
    else { setCreatedInviteCode(String(data)); setCloudMessage('Convite criado. Copie o código e envie aos jogadores.'); }
    setCloudBusy(false);
  }
  async function joinCloudCampaign() {
    if (!supabase || !authUser) { setCloudMessage('Entre na sua conta antes de usar um convite.'); return; }
    if (!joinInviteCode.trim()) { setCloudMessage('Informe o código do convite.'); return; }
    setCloudBusy(true); setCloudMessage('Validando convite...');
    const { data, error } = await supabase.rpc('join_campaign_by_invite', { p_invite_code: joinInviteCode.trim().toUpperCase() });
    if (error) setCloudMessage(`Não foi possível entrar na campanha: ${error.message}`);
    else {
      const campaignId = String(data);
      setJoinInviteCode(''); setSelectedCloudCampaign(campaignId); setCreatedInviteCode('');
      await loadCloudCampaigns(); await loadCloudMembers(campaignId);
      setCloudMessage('Você entrou na campanha com sucesso.');
    }
    setCloudBusy(false);
  }
  async function createCloudCampaign() {
    if (!supabase || !authUser) { setCloudMessage('Entre na sua conta antes de criar uma campanha online.'); return; }
    if (!cloudCampaignName.trim()) { setCloudMessage('Informe o nome da campanha.'); return; }
    setCloudBusy(true); setCloudMessage('Criando campanha na nuvem...');
    const { data, error } = await supabase.rpc('create_campaign_with_owner', { campaign_name: cloudCampaignName.trim(), campaign_description: cloudCampaignDescription.trim() });
    if (error) { setCloudMessage(`Não foi possível criar a campanha: ${error.message}. Confira se executou a migration v1.1.0.`); setCloudBusy(false); return; }
    setCloudCampaignName(''); setCloudCampaignDescription('');
    const createdId = typeof data === 'string' ? data : (data as any)?.id;
    await loadCloudCampaigns();
    if (createdId) { setSelectedCloudCampaign(createdId); await loadCloudMembers(createdId); }
    setCloudMessage('Campanha criada e vinculada à sua conta na nuvem.'); setCloudBusy(false);
  }
  async function saveCloudCampaignNotes() {
    if (!supabase || !selectedCloudCampaign) return;
    setCloudBusy(true); const { error } = await supabase.from('campaigns').update({ notes: cloudNotes, updated_at: new Date().toISOString() }).eq('id', selectedCloudCampaign);
    setCloudMessage(error ? `Não foi possível salvar as notas: ${error.message}` : 'Diário da campanha salvo na nuvem.');
    if (!error) await loadCloudCampaigns(); setCloudBusy(false);
  }

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(character)); }, [character]);
  useEffect(() => { localStorage.setItem(LOCK_KEY, String(locked)); }, [locked]);
  useEffect(() => { localStorage.setItem(CHANGE_KEY, JSON.stringify(changeLog)); }, [changeLog]);
  useEffect(() => { localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaigns)); }, [campaigns]);
  const update = <K extends keyof CharacterData>(key: K, value: CharacterData[K]) => { if (!locked || editMode || key === 'hp' || key === 'pd') setCharacter(old => ({ ...old, [key]: value })); };
  function finishEditing() { if (!character.name.trim()) { alert('Informe o nome do personagem antes de confirmar.'); return; } setLocked(true); setEditMode(false); setChangeLog(items => [`Ficha confirmada/editada em ${new Date().toLocaleString('pt-BR')}`, ...items].slice(0,30)); }
  function unlockEditing() { setEditMode(true); setLocked(false); }
  function createCampaign() { if (!campaignName.trim()) { alert('Informe o nome da campanha.'); return; } const c: Campaign = { id: Date.now(), name: campaignName.trim(), description: campaignDescription.trim(), role: campaignRole, notes: '', created: new Date().toLocaleDateString('pt-BR'), inviteCode: Math.random().toString(36).slice(2,8).toUpperCase(), members: [{id: Date.now()+1, name: 'Você', role: campaignRole, character: campaignRole==='Jogador' ? character.name : undefined}] }; setCampaigns(list => [c, ...list]); setSelectedCampaign(c.id); setCampaignName(''); setCampaignDescription(''); }
  function saveCampaignNotes() { if (selectedCampaign === null) return; setCampaigns(list => list.map(c => c.id === selectedCampaign ? {...c, notes: campaignNotes} : c)); alert('Notas da campanha salvas neste dispositivo.'); }
  function addCampaignMember() { if (selectedCampaign===null || !memberName.trim()) { alert('Informe o nome do participante.'); return; } setCampaigns(list=>list.map(c=>c.id===selectedCampaign ? {...c,members:[...c.members,{id:Date.now(),name:memberName.trim(),role:memberRole,character:memberCharacter.trim()||undefined}]}:c)); setMemberName('');setMemberCharacter(''); }
  function removeCampaignMember(campaignId:number,memberId:number){setCampaigns(list=>list.map(c=>c.id===campaignId? {...c,members:c.members.filter(m=>m.id!==memberId)}:c));}
  function exportBackup() { const backup = { format: 'ARQUIVO_BACKUP', version: '0.8.0', exportedAt: new Date().toISOString(), character, locked, changeLog, campaigns, history }; const blob = new Blob([JSON.stringify(backup,null,2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`arquivo-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); }
  function importBackup(file:File) { const reader = new FileReader(); reader.onload = () => { try { const b = JSON.parse(String(reader.result)); if (b.format !== 'ARQUIVO_BACKUP' || !b.character || !Array.isArray(b.campaigns)) throw new Error('Arquivo inválido'); if (!confirm('Importar backup? Isso substituirá ficha, campanhas e histórico atuais neste navegador.')) return; setCharacter({...initialCharacter,...b.character}); setLocked(Boolean(b.locked)); setEditMode(!Boolean(b.locked)); setChangeLog(Array.isArray(b.changeLog)?b.changeLog:[]); setCampaigns(b.campaigns.map((c:any)=>({...c, inviteCode:c.inviteCode||Math.random().toString(36).slice(2,8).toUpperCase(), members:Array.isArray(c.members)?c.members:[{id:Date.now(),name:'Você',role:c.role||'Mestre'}]}))); setHistory(Array.isArray(b.history)?b.history:[]); alert('Backup importado.'); } catch { alert('Não foi possível importar: arquivo inválido ou incompatível.'); } }; reader.readAsText(file); }
  const permanentLocked = locked && !editMode;
  const updateAttribute = (name: string, value: D) => update('attributes', { ...character.attributes, [name]: value });
  const updateSkill = (name: string, value: D) => update('skillLevels', { ...character.skillLevels, [name]: value });

  function makeDie(sides: D, kind: Die['kind']): Die { return { value: Math.floor(Math.random() * sides) + 1, sides, kind }; }
  function rollAttribute(attribute: string) {
    const result: RollResult = { label: attribute, attribute, dice: [makeDie(character.attributes[attribute], 'ATRIBUTO')], timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
    setLatestRoll(result); setHistory(items => [result, ...items].slice(0, 50));
  }
  function rollSkill(skill: string, attribute: string) {
    const result: RollResult = { label: skill, attribute, dice: [makeDie(character.attributes[attribute], 'ATRIBUTO'), makeDie(character.skillLevels[skill], 'PERÍCIA')], timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
    setLatestRoll(result); setHistory(items => [result, ...items].slice(0, 50));
  }
  const filtered = useMemo(() => skills.filter(([name]) => name.toLowerCase().includes(query.toLowerCase())), [query]);
  const title = page === 'painel' ? 'Painel do investigador' : page === 'ficha' ? 'Dossiê do personagem' : page === 'rolagem' ? 'Central de rolagens' : page === 'campanha' ? 'Campanha' : page === 'online' ? 'Infraestrutura online' : 'Referência rápida';

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="sigil"><Eye size={23} /></div><div><b>ARQUIVO</b><small>DIVISÃO DE INVESTIGAÇÃO</small></div></div>
      <div className="campaign"><div className="campaign-top"><span className="pulse" /> OPERAÇÃO ATIVA <ChevronDown size={14} /></div><p>O caso em andamento</p><small>ACESSO RESTRITO · NÍVEL 02</small></div>
      <nav>{nav.map(([id, label, Icon]) => <button className={page === id ? 'active' : ''} onClick={() => setPage(id)} key={id}><Icon size={18} />{label}</button>)}</nav>
      <div className="sidebottom"><Shield size={16} /> <span>ARQUIVO SALVO NESTE DISPOSITIVO</span><small>FICHA LOCAL · v0.5</small></div>
    </aside>

    <main>
      <header><div><span className="eyebrow">ARQUIVO CENTRAL <i>/</i> {page.toUpperCase()}</span><h1>{title}</h1></div><div className="profile"><span className="avatar">{character.name.slice(0,1).toUpperCase() || '?'}</span><span>{character.name || 'Sem identificação'}<small>AGENTE · FICHA LOCAL</small></span></div></header>

      {page === 'painel' && <>
        <section className="welcome"><div className="welcome-copy"><div className="case-stamp">DOCUMENTO<br/>CONFIDENCIAL</div><span className="eyebrow">REGISTRO DE INVESTIGAÇÃO <i>·</i> CASO 001-A</span><h2>O inexplicável não espera.</h2><p>Consulte seus recursos, revise sua ficha e prepare-se para a próxima operação.</p><button className="primary" onClick={() => setPage('ficha')}><FileText size={17} /> Abrir dossiê</button></div><div className="art"><div className="art-ring ring-one"></div><div className="art-ring ring-two"></div><Eye size={104} /><span>OBSERVAR<br/>NÃO É COMPREENDER</span></div></section>
        <div className="grid stats">
          <div className="stat"><span>VIDA</span><div className="number">{character.hp}<small> PV</small></div><div className="controls"><button aria-label="Diminuir PV" onClick={() => update('hp', Math.max(0, character.hp - 1))}><Minus /></button><button aria-label="Aumentar PV" onClick={() => update('hp', character.hp + 1)}><Plus /></button></div><div className="bar"><i style={{ width: `${Math.min(100, character.hp / 30 * 100)}%` }} /></div></div>
          <div className="stat"><span>DETERMINAÇÃO</span><div className="number">{character.pd}<small> PD</small></div><div className="controls"><button aria-label="Diminuir PD" onClick={() => update('pd', Math.max(0, character.pd - 1))}><Minus /></button><button aria-label="Aumentar PD" onClick={() => update('pd', character.pd + 1)}><Plus /></button></div><div className="bar orange"><i style={{ width: `${Math.min(100, character.pd / 20 * 100)}%` }} /></div></div>
          <div className="stat"><span>ROLAGEM RÁPIDA · ATRIBUTOS</span><div className="attribute-list">{attr.map(a => <div className="quick-attribute" key={a}><button onClick={() => rollAttribute(a)}>{a}</button><b>d{character.attributes[a]}</b><Dices size={15} /></div>)}</div></div>
        </div>
        {latestRoll && <section className="panel latest"><span className="eyebrow">ÚLTIMA ROLAGEM · {latestRoll.timestamp}</span><h3>{latestRoll.label} · {latestRoll.attribute}</h3><DiceResult dice={latestRoll.dice} /><small>Dados apresentados separadamente. O jogador soma os resultados; a decisão sobre o teste permanece com o mestre.</small></section>}
        <section className="panel"><div className="panelhead"><h3>Rolagens recentes</h3><button className="ghost" onClick={() => setPage('rolagem')}>Ver histórico →</button></div>{history.length ? history.slice(0, 4).map((r, i) => <div className="history" key={`${r.timestamp}-${i}`}><Dices size={16} /><span><b>{r.label}</b> · {r.attribute}<DiceResult dice={r.dice} /></span></div>) : <p className="muted">Ainda não há registros. Abra a ficha e clique em uma perícia para realizar um teste.</p>}</section>
      </>}

      {page === 'ficha' && <><section className="panel wide dossier-lock"><div className="panelhead"><h3>{locked && !editMode ? 'Dossiê protegido' : 'Criação / edição do personagem'}</h3><span className="saved-label">{locked && !editMode ? 'ACESSO SOMENTE LEITURA' : 'MODO DE ALTERAÇÃO'}</span></div><p className="muted">{locked && !editMode ? 'Ficha protegida contra alterações acidentais. Recursos de sessão (PV e PD) continuam ajustáveis.' : 'Revise os campos e confirme para proteger o dossiê. Ao evoluir ou precisar corrigir dados, use Editar ficha.'}</p>{locked && !editMode ? <button className="primary" onClick={unlockEditing}><FileText size={16}/> Editar ficha</button> : <button className="primary" onClick={finishEditing}><Save size={16}/> {locked ? 'Salvar e bloquear ficha' : 'Confirmar criação e bloquear'}</button>}</section><div className="two">
        <section className="panel wide"><div className="panelhead"><h3><UserRound size={18} /> Identificação do agente</h3><span className="saved-label"><Save size={13}/> SALVAMENTO AUTOMÁTICO</span></div><div className="character-fields">
          <label>Nome do personagem<input value={character.name} disabled={permanentLocked} onChange={e => update('name', e.target.value)} placeholder="Nome do personagem" /></label>
          <label>Perfil<select value={character.profile} disabled={permanentLocked} onChange={e => update('profile', e.target.value)}><option value="">Selecione o perfil</option><option>Executor</option><option>Analista</option><option>Vigilante</option></select></label>
          <label>Vocação<input value={character.vocation} disabled={permanentLocked} onChange={e => update('vocation', e.target.value)} placeholder="Vocação do personagem" /></label>
          <label>Nível<input type="number" min="1" max="10" value={character.level} disabled={permanentLocked} onChange={e => update('level', Math.min(10, Math.max(1, Number(e.target.value))))} /></label>
        </div><p className="muted">Perfil, vocação e nível seguem os campos descritos na ficha do Playtest Beta 1.2.</p></section>
        <section className="panel"><h3>Recursos</h3><div className="resource"><label>Pontos de Vida · PV<input type="number" min="0" value={character.hp} onChange={e => update('hp', Math.max(0, Number(e.target.value)))} /></label><label>Pontos de Determinação · PD<input type="number" min="0" value={character.pd} onChange={e => update('pd', Math.max(0, Number(e.target.value)))} /></label></div><p className="muted">Os valores são editáveis. A ficha não calcula limites ou progressão automaticamente.</p></section>
        <section className="panel"><h3>Atributos · clique para rolar</h3>{attr.map(a => <div className="attrrow" key={a}><button className="attribute-roll" onClick={() => rollAttribute(a)}><span>{a}</span><b>d{character.attributes[a]}</b><Dices size={16} /></button><select aria-label={`Dado de ${a}`} value={character.attributes[a]} disabled={permanentLocked} onChange={e => updateAttribute(a, Number(e.target.value) as D)}>{dieRank.map(d => <option key={d} value={d}>d{d}</option>)}</select>{latestRoll?.label === a && <div className="inline-result"><DiceResult dice={latestRoll.dice} /></div>}</div>)}</section>
        <section className="panel wide"><h3>Perícias · dados individuais</h3><p className="muted">Cada perícia possui seu próprio dado e um atributo-base. Clique no nome para rolar os dois dados separados. Você faz a soma manualmente. O mestre pode determinar outro atributo quando a situação justificar.</p><div className="skill-edit-grid">{skills.map(([s, a]) => <div className="skill-edit" key={s}><button className="skill-name" onClick={() => rollSkill(s, a)}><span>{s}</span><small>{a} · atributo d{character.attributes[a]}</small><Dices size={15} /></button><select aria-label={`Dado da perícia ${s}`} value={character.skillLevels[s]} disabled={permanentLocked} onChange={e => updateSkill(s, Number(e.target.value) as D)}>{dieRank.map(d => <option key={d} value={d}>d{d}</option>)}</select>{latestRoll?.label === s && <div className="inline-result"><DiceResult dice={latestRoll.dice} /></div>}</div>)}</div>
          <div className="specializations"><label>Aptidão · especialização<input value={character.aptitude} disabled={permanentLocked} onChange={e => update('aptitude', e.target.value)} placeholder="Ex.: Erudição, Artes, Folclore..." /></label><label>Ofício · especialização<input value={character.craft} disabled={permanentLocked} onChange={e => update('craft', e.target.value)} placeholder="Ex.: Alquimia, Carpintaria, Metalurgia..." /></label></div>
        </section>
        <section className="panel wide"><h3><ScrollText size={18}/> Habilidades e anotações</h3><div className="ability-fields"><label>Habilidade 1<textarea value={character.abilities[0]} disabled={permanentLocked} onChange={e => update('abilities', [e.target.value, character.abilities[1]])} placeholder="Nome e descrição da habilidade" rows={3}/></label><label>Habilidade 2<textarea value={character.abilities[1]} disabled={permanentLocked} onChange={e => update('abilities', [character.abilities[0], e.target.value])} placeholder="Nome e descrição da habilidade" rows={3}/></label></div><label>Anotações do personagem<textarea value={character.notes} disabled={permanentLocked} onChange={e => update('notes', e.target.value)} placeholder="História, relações, pistas, detalhes importantes..." rows={4}/></label></section>
        {latestRoll && <section className="panel wide latest"><span className="eyebrow">ÚLTIMA ROLAGEM · {latestRoll.timestamp}</span><h3>{latestRoll.label} ({latestRoll.attribute})</h3><DiceResult dice={latestRoll.dice} /><small>Sem soma, DT ou classificação automática. O jogador soma os dados e o mestre determina o resultado.</small></section>}
      </div>

      </>}

      {page === 'rolagem' && <div className="two">
        <section className="panel"><h3>Como funciona</h3><p className="muted">Um teste usa dois dados: um do atributo e outro da perícia. O Arquivo mostra cada resultado separadamente, sem calcular a soma, comparar DT ou classificar sucesso e falha.</p><div className="dice-legend"><span>Dado do atributo</span><span>Dado da perícia</span><span>Soma manual</span><span>Decisão do mestre</span></div></section>
        <section className="panel"><h3>Atributos · rolagem individual</h3><div className="quick-roll-list">{attr.map(a => <div className="quick-roll-item" key={a}><button onClick={() => rollAttribute(a)}><span>{a}<small>d{character.attributes[a]}</small></span><Dices size={17} /></button>{latestRoll?.label === a && <DiceResult dice={latestRoll.dice} />}</div>)}</div><h3 className="subheading">Perícias · teste completo</h3><div className="search"><Search size={16} /><input placeholder="Buscar perícia..." value={query} onChange={e => setQuery(e.target.value)} /></div><div className="skillgrid">{filtered.map(([s, a]) => <div className="skill-card" key={s}><button onClick={() => rollSkill(s, a)}><span>{s}</span><small>{a} d{character.attributes[a]} + perícia d{character.skillLevels[s]}</small><Dices size={15} /></button>{latestRoll?.label === s && <div className="inline-result"><DiceResult dice={latestRoll.dice} /></div>}</div>)}</div></section>
        {latestRoll && <section className="panel wide latest"><span className="eyebrow">RESULTADO · {latestRoll.timestamp}</span><h3>{latestRoll.label} ({latestRoll.attribute})</h3><DiceResult dice={latestRoll.dice} /><small>Resultados individuais, sem soma automática. O jogador soma; o mestre decide se passa ou não.</small></section>}
        <section className="panel wide"><div className="panelhead"><h3>Histórico de rolagens</h3><button className="ghost" onClick={() => { setHistory([]); setLatestRoll(null); }}><RotateCcw size={15} /> Limpar</button></div>{history.length ? history.map((r, i) => <div className="history" key={`${r.timestamp}-${i}`}><Dices size={16} /><span><b>{r.label}</b> ({r.attribute})<DiceResult dice={r.dice} /> <small className="history-time">{r.timestamp}</small></span></div>) : <p className="muted">Nenhuma rolagem registrada.</p>}</section>
      </div>}

      {changeLog.length > 0 && <section className="panel wide"><h3>Histórico do dossiê</h3>{changeLog.map((entry,i)=><div className="history" key={i}><FileText size={15}/><span>{entry}</span></div>)}</section>}
      {page === 'campanha' && <div className="two campaign-layout">
        <section className="panel wide"><span className="eyebrow">ETAPA 1.1 · OPERAÇÕES NA NUVEM</span><h3>Campanhas online</h3><p className="muted">Estas campanhas ficam vinculadas à sua conta Supabase e podem ser acessadas em outros dispositivos depois do login. Seus registros locais antigos continuam preservados separadamente.</p>
          {!supabase || !authUser ? <div className="online-status"><span className="status-dot offline"/><b>Entre na sua conta na aba Infraestrutura para usar campanhas online.</b></div> : <><div className="member-form"><label>Nome da campanha<input value={cloudCampaignName} onChange={e=>setCloudCampaignName(e.target.value)} placeholder="Ex.: O silêncio de Santa Teresa"/></label><label>Descrição<textarea rows={2} value={cloudCampaignDescription} onChange={e=>setCloudCampaignDescription(e.target.value)} placeholder="Premissa e contexto da operação..."/></label><button className="primary" disabled={cloudBusy} onClick={createCloudCampaign}><Plus size={16}/> Criar campanha online</button></div><div className="panelhead"><h3>Entrar em uma campanha</h3></div><div className="member-form"><label>Código de convite<input value={joinInviteCode} onChange={e=>setJoinInviteCode(e.target.value.toUpperCase())} placeholder="Cole o código recebido" autoComplete="off"/></label><button className="primary" disabled={cloudBusy} onClick={joinCloudCampaign}>Entrar na campanha</button></div><div className="panelhead"><h3>Suas campanhas na nuvem</h3><button className="ghost" disabled={cloudBusy} onClick={()=>void loadCloudCampaigns()}><RotateCcw size={15}/> Atualizar</button></div>{cloudBusy && <p className="muted">Sincronizando com o Supabase...</p>}{cloudCampaigns.length===0 ? <p className="muted">Nenhuma campanha online encontrada para esta conta.</p> : cloudCampaigns.map(c=><button className="campaign-record" key={c.id} onClick={()=>{setSelectedCloudCampaign(c.id);setCloudNotes(c.notes || '');setCreatedInviteCode('');void loadCloudMembers(c.id);}}><b>{c.name}</b><small>{c.created_by===authUser.id ? 'Mestre · ' : 'Participante · '}{new Date(c.created_at).toLocaleDateString('pt-BR')}</small><p>{c.description || 'Sem descrição'}</p></button>)}{selectedCloudCampaign && cloudCampaigns.some(c=>c.id===selectedCloudCampaign) && <div className="panel wide"><div className="panelhead"><h3>{cloudCampaigns.find(c=>c.id===selectedCloudCampaign)?.name}</h3><span className="saved-label">SALVO NA NUVEM</span></div><div className="panelhead"><h3>Participantes da operação</h3><button className="ghost" disabled={cloudBusy} onClick={()=>void loadCloudMembers(selectedCloudCampaign)}><RotateCcw size={15}/> Atualizar equipe</button></div>{cloudMembers.length===0 ? <p className="muted">Nenhum participante listado.</p> : cloudMembers.map(m=><div className="history campaign-member" key={m.user_id}><UserRound size={16}/><span><b>{m.user_id===authUser?.id ? 'Você' : `Agente ${m.user_id.slice(0,8)}`}</b><small>{m.role==='GM'?'Mestre':'Jogador'} · entrou em {new Date(m.joined_at).toLocaleDateString('pt-BR')}</small></span></div>)}{cloudCampaigns.find(c=>c.id===selectedCloudCampaign)?.created_by===authUser?.id && <><div className="panelhead"><h3>Gerar convite para jogadores</h3></div><div className="member-form"><label>Validade<input type="number" min="1" max="365" value={inviteExpiryDays} onChange={e=>setInviteExpiryDays(e.target.value)} placeholder="Dias (vazio = sem validade)"/></label><label>Limite de usos<input type="number" min="1" value={inviteMaxUses} onChange={e=>setInviteMaxUses(e.target.value)} placeholder="Ilimitado"/></label><button className="primary" disabled={cloudBusy} onClick={createCloudInvite}><Plus size={16}/> Gerar código</button></div>{createdInviteCode && <div className="online-status"><b>Código: {createdInviteCode}</b><button className="ghost" onClick={()=>void navigator.clipboard?.writeText(createdInviteCode)}>Copiar código</button></div>}</>}<div className="panelhead"><h3>Diário da campanha</h3><span className="saved-label">SALVO NA NUVEM</span></div><label>Diário da campanha<textarea rows={6} value={cloudNotes} onChange={e=>setCloudNotes(e.target.value)} placeholder="Registre resumo das sessões, pistas e acontecimentos..."/></label><button className="primary" disabled={cloudBusy || cloudCampaigns.find(c=>c.id===selectedCloudCampaign)?.created_by!==authUser?.id} onClick={saveCloudCampaignNotes}><Save size={16}/> Salvar diário</button>{cloudCampaigns.find(c=>c.id===selectedCloudCampaign)?.created_by!==authUser?.id && <p className="muted">Você pode visualizar o diário. Apenas o mestre pode alterá-lo.</p>}</div>}</>}{cloudMessage && <p className="auth-message" role="status">{cloudMessage}</p>}</section>
        <section className="panel wide"><span className="eyebrow">ARQUIVO LOCAL</span><h3>Registros deste dispositivo</h3><p className="muted">Suas campanhas antigas e seus dados locais continuam disponíveis aqui. Elas não são enviadas automaticamente para a nuvem.</p></section>
        <section className="panel"><span className="eyebrow">CENTRAL DE OPERAÇÕES</span><h3>Registrar nova campanha</h3><p className="muted">Crie um registro local para organizar a mesa. Convites e sincronização online ainda não estão disponíveis nesta versão.</p><label>Nome da campanha<input value={campaignName} onChange={e=>setCampaignName(e.target.value)} placeholder="Ex.: O silêncio de Santa Teresa" /></label><label>Descrição<textarea rows={3} value={campaignDescription} onChange={e=>setCampaignDescription(e.target.value)} placeholder="Premissa, cenário, resumo..." /></label><label>Seu papel<select value={campaignRole} onChange={e=>setCampaignRole(e.target.value as 'Mestre'|'Jogador')}><option>Mestre</option><option>Jogador</option></select></label><button className="primary" onClick={createCampaign}><Plus size={16}/> Criar registro</button></section><section className="panel"><div className="panelhead"><h3>Campanhas registradas</h3><div className="backup-actions"><button className="ghost" onClick={exportBackup}><Download size={15}/> Backup</button><label className="backup-import"><Upload size={15}/> Importar<input type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];if(f)importBackup(f);e.currentTarget.value="";}}/></label></div></div>{campaigns.length===0 ? <p className="muted">Nenhuma campanha cadastrada neste dispositivo.</p> : campaigns.map(c=><button className="campaign-record" key={c.id} onClick={()=>{setSelectedCampaign(c.id);setCampaignNotes(c.notes);}}><b>{c.name}</b><small>{c.role} · criada em {c.created}</small><p>{c.description || 'Sem descrição'}</p></button>)}</section>{selectedCampaign!==null && campaigns.find(c=>c.id===selectedCampaign) && <section className="panel wide"><div className="panelhead"><h3>{campaigns.find(c=>c.id===selectedCampaign)?.name}</h3><span className="saved-label">REGISTRO LOCAL</span></div><label>Notas e diário da campanha<textarea rows={6} value={campaignNotes} onChange={e=>setCampaignNotes(e.target.value)} placeholder="Resumo da sessão, pistas, eventos, decisões..." /></label><button className="primary" onClick={saveCampaignNotes}><Save size={16}/> Salvar notas</button><div className="panelhead"><h3>Equipe da operação</h3><span className="saved-label">{campaigns.find(c=>c.id===selectedCampaign)?.members.length || 0} REGISTRADOS</span></div><p className="muted">Código local de convite: <b>{campaigns.find(c=>c.id===selectedCampaign)?.inviteCode}</b> — ainda não permite ingresso remoto; é apenas um identificador provisório.</p>{campaigns.find(c=>c.id===selectedCampaign)?.members.map(m=><div className="history campaign-member" key={m.id}><UserRound size={16}/><span><b>{m.name}</b><small>{m.role}{m.character ? ` · ${m.character}` : ''}</small></span>{m.name!=='Você' && <button className="ghost" onClick={()=>removeCampaignMember(selectedCampaign!,m.id)}>Remover</button>}</div>)}<div className="member-form"><label>Nome<input value={memberName} onChange={e=>setMemberName(e.target.value)} placeholder="Nome do participante"/></label><label>Papel<select value={memberRole} onChange={e=>setMemberRole(e.target.value as 'Mestre'|'Jogador')}><option>Jogador</option><option>Mestre</option></select></label><label>Personagem (opcional)<input value={memberCharacter} onChange={e=>setMemberCharacter(e.target.value)} placeholder="Nome da ficha"/></label><button className="primary" onClick={addCampaignMember}><Plus size={16}/> Registrar participante</button></div><p className="muted">Neste protótipo, notas, campanhas e equipe ficam no navegador deste dispositivo. Convites remotos e sincronização ainda não existem.</p></section>}</div>}
      {page === 'online' && <div className="two">
        <section className="panel wide"><span className="eyebrow">ETAPA 1.0 · IDENTIDADE E ACESSO</span><h3>Conta do Arquivo</h3><p className="muted">O sistema de autenticação usa Supabase Auth. Sua conta está conectada ao projeto. As campanhas criadas na seção Campanha podem ser armazenadas na nuvem; fichas, rolagens e campanhas locais antigas continuam neste navegador.</p>
          {!supabase ? <><div className="online-status"><span className="status-dot offline"/><b>Supabase não configurado</b></div><p className="muted">Crie um arquivo <code>.env.local</code> na raiz do projeto e preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Depois reinicie o servidor com npm run dev.</p></> : <>
            <div className="online-status"><span className={`status-dot ${authUser ? 'online' : 'offline'}`}/><b>{authUser ? `Conectado: ${authUser.email}` : 'Serviço configurado · nenhuma conta conectada'}</b></div>
            {authUser ? <div className="auth-card"><p>Você está autenticado no Arquivo.</p><small className="muted">ID da conta: {authUser.id}</small><button className="primary" onClick={signOut}>Sair da conta</button></div> : <div className="auth-card"><div className="auth-tabs"><button className={authMode==='login'?'selected':''} onClick={()=>{setAuthMode('login');setAuthMessage('');}}>Entrar</button><button className={authMode==='signup'?'selected':''} onClick={()=>{setAuthMode('signup');setAuthMessage('');}}>Criar conta</button></div>{authMode==='signup' && <label>Nome de exibição<input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Como deseja aparecer na mesa?"/></label>}<label>E-mail<input type="email" autoComplete="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="voce@email.com"/></label><label>Senha<input type="password" autoComplete={authMode==='login'?'current-password':'new-password'} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></label><button className="primary" disabled={authBusy} onClick={submitAuth}>{authBusy?'Aguarde...':authMode==='login'?'Entrar':'Criar minha conta'}</button>{authMessage && <p className="auth-message" role="status">{authMessage}</p>}</div>}
          </>}
        </section>
        <section className="panel wide"><span className="eyebrow">ETAPA 0.9 · FUNDAÇÃO DO SERVIDOR</span><h3>Estrutura de banco de dados</h3><p className="muted">A migration PostgreSQL da versão anterior continua sendo a base do projeto. A autenticação agora pode usar esse banco quando as credenciais forem configuradas.</p><div className="online-status"><span className={`status-dot ${supabase && authUser ? 'online' : 'offline'}`}/> <b>{supabase && authUser ? 'Conta autenticada' : 'Dados de campanha ainda locais'}</b></div><p>As tabelas de perfis, campanhas, participantes, personagens e convites estão preparadas. A criação de campanhas online e o diário já usam o banco; convites e sincronização em tempo real ainda estão pendentes.</p></section>
        <section className="panel"><h3>Próximos passos para ativar</h3><ol><li>Criar um projeto gratuito no Supabase.</li><li>Executar a migration SQL incluída na pasta <code>supabase/migrations</code>.</li><li>Configurar as chaves públicas do projeto no ambiente local.</li><li>Execute também a migration 202611210002_cloud_campaigns.sql para habilitar campanhas online.</li></ol><p className="muted">Não coloque chaves secretas ou service-role no frontend.</p></section>
        <section className="panel wide"><h3>O que o esquema prepara</h3><div className="grid online-features"><div><b>Contas</b><small>Perfis associados ao usuário autenticado.</small></div><div><b>Campanhas</b><small>Campanhas persistentes e autoria.</small></div><div><b>Participantes</b><small>Papéis GM e PLAYER por campanha.</small></div><div><b>Personagens</b><small>Ficha JSON, vínculo e estado de bloqueio.</small></div><div><b>Convites</b><small>Estrutura de códigos, expiração e limites.</small></div><div><b>Segurança</b><small>Políticas de Row Level Security como primeira camada de isolamento.</small></div></div></section>
      </div>}

      {page === 'regras' && <section className="panel"><h3>Referência · Playtest Beta 1.2</h3><ul><li>Os atributos são Físico, Mente e Emoção.</li><li>As 20 perícias possuem atributo-base, mas cada uma também possui seu próprio dado.</li><li>Um teste rola um dado do atributo e outro da perícia.</li><li>Aptidão e Ofício permitem registrar especializações.</li><li>A ficha inclui nome, perfil, vocação, nível, atributos, perícias, PV, PD e habilidades.</li><li>O jogador soma os resultados manualmente; o site não solicita DT nem declara sucesso ou falha.</li></ul><p className="muted">Fonte de implementação: Playtest Beta 1.2, páginas 6 a 9. Esta versão ainda não implementa progressão, efeitos especiais, combate ou habilidades automatizadas.</p></section>}
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
