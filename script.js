
// LUMI: menu de espaços para telas pequenas
(() => {
  const button = document.getElementById('mobileSpacesButton');
  const panel = document.getElementById('mobileSpacesPanel');
  const list = document.getElementById('mobileSpacesList');
  const close = document.getElementById('mobileSpacesClose');
  const source = document.getElementById('spaceList');

  if (!button || !panel || !list || !source) {
    console.warn('LUMI: elementos do menu mobile de espaços não encontrados.');
    return;
  }

  function refresh() {
    list.innerHTML = source.innerHTML ||
      '<div class="space-list-empty">Entre na sua conta para ver seus espaços.</div>';
  }

  function toggle(open) {
    refresh();
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  }

  button.addEventListener('click', () => toggle(panel.hidden));
  close?.addEventListener('click', () => toggle(false));

  list.addEventListener('click', event => {
    if (event.target.closest('[data-space-id]')) toggle(false);
  });

  document.addEventListener('click', event => {
    if (!panel.hidden &&
        !event.target.closest('#mobileSpacesPanel') &&
        !event.target.closest('#mobileSpacesButton')) {
      toggle(false);
    }
  });

  new MutationObserver(() => {
    if (!panel.hidden) refresh();
  }).observe(source, {
    childList: true, subtree: true, attributes: true
  });
})();


import { supabase } from './database/supabase.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { user: null, profile: null, spaces: [], activeSpace: null, channels: [], activeChannel: null, messages: [], realtime: null, spaceReplyTo: null, spaceCallChannel: null, spaceReactions: [], authMode: 'signin', page: 'home', search: '', channelCount: 0, messageCount: 0, conversations: [], activeConversation: null, dmMessages: [], dmRealtime: null, dmSearchResults: [], callRealtime: null, callPC: null, callLocalStream: null, callRemoteStream: null, callPeerId: null, callConversationId: null, callMode: 'audio', callStatus: 'idle', pendingCallOffer: null, callSeenSignals: new Set(), callMuted: false, callVideoEnabled: true, pendingIceSignals: [], callScreenStream: null, dmRecorder: null, dmRecordStream: null, dmRecordChunks: [], callRetryTimer: null, editingChannelId: null };
const symbols = ['✳','🎮','🎨','☕','✦','🌙'];
// Configure os selos oficiais aqui. Use IDs de usuários obtidos no Supabase Auth.
const APP_OWNER_USER_ID = '222eba63-627c-4cc9-bf49-09da8cb7550d'; // conta dona do LUMI
const VERIFIED_USER_IDS = ['66fbb608-8672-40d7-aedc-7e7645726ebf']; // UUIDs de contas verificadas, aprovadas por você
const TESTER_USER_IDS = ['222eba63-627c-4cc9-bf49-09da8cb7550d']; // Adicione aqui UUIDs de testers autorizados
const STAFF_USER_IDS = ['222eba63-627c-4cc9-bf49-09da8cb7550d']; // Adicione aqui UUIDs da equipe do LUMI
function accountBadges(userId, isInfinity = false) {
  if (!userId) return '';
  const owner = userId === APP_OWNER_USER_ID && APP_OWNER_USER_ID.length > 0;
  const infinity = owner || Boolean(isInfinity) || (userId === state.user?.id && Boolean(state.profile?.vip_purchased));
  const verified = owner || VERIFIED_USER_IDS.includes(userId);
  const tester = TESTER_USER_IDS.includes(userId);
  const staff = owner || STAFF_USER_IDS.includes(userId);
  return (infinity ? '<span class="lumi-badge infinity-badge" title="LUMI INFINITY" aria-label="LUMI INFINITY">∞</span>' : '')
    + (verified ? '<span class="lumi-badge verified-badge" title="Conta verificada" aria-label="Conta verificada">✓</span>' : '')
    + (owner ? '<span class="lumi-badge owner-badge" title="Dono do LUMI" aria-label="Dono do LUMI">✦</span>' : '')
    + (tester ? '<span class="lumi-badge tester-badge" title="Tester do LUMI" aria-label="Tester do LUMI">T</span>' : '')
    + (staff ? '<span class="lumi-badge staff-badge" title="Equipe LUMI" aria-label="Equipe LUMI">S</span>' : '');
}
function avatarMarkup(name, url, className='avatar') {
  return url ? `<img class="${className} avatar-image" src="${escapeHTML(url)}" alt="Foto de ${escapeHTML(name)}">` : `<span class="${className}">${escapeHTML(initials(name))}</span>`;
}

function toast(message, type = '') {
  const node = document.createElement('div'); node.className = `toast ${type}`; node.textContent = message; $('#toastRegion').append(node);
  setTimeout(() => node.remove(), 3600);
}
function initials(name = '?') { return name.trim().split(/\s+/).slice(0,2).map(part => part[0] || '').join('').toUpperCase() || '?'; }
function escapeHTML(value = '') { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function shortDate(value) { const date = new Date(value); return date.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}); }
function openModal(id) { const dialog = document.getElementById(id); if (dialog && !dialog.open) dialog.showModal(); }
function closeModal(id) { const dialog = document.getElementById(id); if (dialog?.open) dialog.close(); }
function requireAuth() { if (!state.user) { openModal('authModal'); return false; } return true; }

function setAuthMode(mode) {
  state.authMode = mode;
  const signup = mode === 'signup';
  $('#authTitle').textContent = signup ? 'Crie sua conta' : 'Entre na sua conta';
  $('#authDescription').textContent = signup ? 'Seu lugar para se conectar começa aqui.' : 'Seu espaço e suas conversas estão esperando por você.';
  $('#authSubmit').innerHTML = signup ? 'Criar conta <span>→</span>' : 'Entrar <span>→</span>';
  $('#authSwitchText').textContent = signup ? 'Já tem uma conta?' : 'Ainda não tem uma conta?';
  $('#authSwitch').textContent = signup ? 'Entrar' : 'Criar conta';
  $$('.signup-only').forEach(el => el.classList.toggle('hidden', !signup));
  $('#authPassword').autocomplete = signup ? 'new-password' : 'current-password';
  $('#authError').textContent = '';
}

function updateIdentity() {
  const name = state.profile?.display_name || state.user?.user_metadata?.display_name || state.user?.email?.split('@')[0] || 'Visitante';
  const photo = state.profile?.avatar_url;
  ['accountAvatar','topAvatar','profileAvatar','userAvatar'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    if (photo) { el.innerHTML = `<img class="avatar-image" src="${escapeHTML(photo)}" alt="Foto de perfil">`; }
    else el.textContent = initials(name);
  });
  $('#accountName').innerHTML = `${escapeHTML(name)} ${accountBadges(state.user?.id,state.profile?.vip_purchased)}`;
  $('#accountStatus').textContent = state.user ? `@${state.profile?.username || 'lumi-user'}` : 'Entre para continuar';
  $('#profileName').innerHTML = `${state.user ? escapeHTML(name) : 'Boas-vindas!'} ${accountBadges(state.user?.id,state.profile?.vip_purchased)}`;
  $('#profileHandle').textContent = state.user ? `@${state.profile?.username || 'lumi-user'}` : 'Entre para personalizar seu perfil';
  $('#accountButton').title = state.user ? 'Abrir opções da conta' : 'Entrar ou criar conta';
}

function setPage(page) {
  if (page === 'settings' && !requireAuth()) return;
  state.page = page;
  $$('.rail-button[data-page]').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
  const main = $('.main-panel');
  main.classList.toggle('workspace-mode', page === 'space' || page === 'inbox');
  $('.app-shell').classList.toggle('workspace-mode', page === 'space' || page === 'inbox');
  $('.app-shell').classList.toggle('inbox-mode', page === 'inbox');
  if (page === 'home') { renderHome(); return; }
  if (page === 'space' && state.activeSpace) { renderWorkspace(); return; }
  if (page === 'discover') { renderDiscover(); return; }
  if (page === 'inbox') { renderInbox(); return; }
  if (page === 'profile') { renderProfile(); return; }
  if (page === 'settings') { renderSettings(); return; }
  renderHome();
}

function canManageChannels(space = state.activeSpace) {
  return !!state.user && !!space && (space.owner_id === state.user.id || ['owner', 'admin'].includes(space.role));
}

function channelManageActionsHTML(channel) {
  if (!channel || !canManageChannels()) return '';
  return `<div class="channel-header-actions"><button type="button" class="secondary-button" data-action="edit-channel" data-channel-edit="${channel.id}" title="Editar canal"><span class="material-symbols-rounded">edit</span> Editar canal</button><button type="button" class="channel-delete-button" data-action="delete-channel" data-channel-delete="${channel.id}" title="Excluir canal" aria-label="Excluir canal"><span class="material-symbols-rounded">delete</span></button></div>`;
}

function renderSpaceNav() {
  const inWorkspace = state.page === 'space' && !!state.activeSpace;
  const inInbox = state.page === 'inbox';
  $('#spaceSearch').closest('.sidebar-search').hidden = inWorkspace || inInbox;
  $('#spacesDirectory').hidden = inWorkspace || inInbox;
  $('#activeSpaceNav').hidden = !inWorkspace && !inInbox;
  if (inInbox) {
    $('#activeSpaceNav').innerHTML = `
      <div class="dm-sidebar-heading"><div class="dm-sidebar-title"><span class="material-symbols-rounded">forum</span><strong>Mensagens diretas</strong></div><button class="icon-button" id="dmRefreshButton" type="button" title="Atualizar conversas"><span class="material-symbols-rounded">refresh</span></button></div>
      <div class="sidebar-search dm-sidebar-search"><span class="material-symbols-rounded">search</span><input id="dmPeopleSearch" placeholder="Buscar pessoas" autocomplete="off"><button id="dmSearchButton" type="button" title="Buscar"><span class="material-symbols-rounded">person_search</span></button></div>
      <div id="dmSearchResults" class="dm-search-results dm-sidebar-results"></div>
      <div class="channel-sidebar-title dm-list-label"><span>SUAS CONVERSAS</span><span class="material-symbols-rounded">chat_bubble</span></div>
      <div id="dmConversationList" class="dm-conversation-list"><div class="dm-empty-small">Carregando conversas…</div></div>`;
    return;
  }
  if (inWorkspace) {
    const space = state.activeSpace;
    $('#activeSpaceNav').innerHTML = `
      <div class="active-space-title">
        <div class="active-space-icon ${space.image_url ? 'has-space-photo' : ''}">${spacePhotoContent(space)}</div>
        <div class="active-space-name"><small>SEU ESPAÇO · COMUNIDADE</small><strong>${escapeHTML(space.name)}</strong>${space.description ? `<p>${escapeHTML(space.description)}</p>` : ''}</div>
        <button class="icon-button active-space-menu" data-action="invite" title="Opções do espaço" aria-label="Opções do espaço"><span class="material-symbols-rounded">expand_more</span></button>
      </div>
      <details class="space-manage-details"><summary><span class="material-symbols-rounded">tune</span> Gerenciar espaço <span class="material-symbols-rounded manage-chevron">expand_more</span></summary><div class="active-space-actions"><button type="button" data-action="invite"><span>↗</span> Convidar</button><button type="button" data-action="manage-members"><span>♙</span> Membros</button>${space.owner_id === state.user?.id ? '<button type="button" data-action="edit-space"><span class="material-symbols-rounded">edit</span> Editar espaço</button><button type="button" data-action="change-space-photo"><span class="material-symbols-rounded">image</span> Foto</button><button type="button" class="space-owner-delete" data-action="delete-space"><span class="material-symbols-rounded">delete</span> Apagar espaço</button>' : ''}</div></details>
      <div class="channel-sidebar-title channel-group-heading"><span><span class="material-symbols-rounded">tag</span> CANAIS DE TEXTO</span>${canManageChannels(space) ? '<button type="button" data-action="create-channel" data-channel-kind="text" title="Criar canal de texto" aria-label="Criar canal de texto">＋</button>' : ''}</div>
      <div class="channel-list sidebar-channel-list text-channel-list">${state.channels.filter(c => c.kind !== 'voice').map(c => `<div class="channel-entry-row"><button class="channel-entry ${c.id === state.activeChannel?.id ? 'active' : ''}" data-channel-id="${c.id}"><span class="material-symbols-rounded channel-type-icon">tag</span><span class="channel-entry-name">${escapeHTML(c.name)}</span></button>${canManageChannels(space) ? `<span class="channel-entry-actions"><button type="button" data-action="move-channel-up" data-move-channel="${c.id}" title="Mover canal para cima" aria-label="Mover canal para cima"><span class="material-symbols-rounded">keyboard_arrow_up</span></button><button type="button" data-action="move-channel-down" data-move-channel="${c.id}" title="Mover canal para baixo" aria-label="Mover canal para baixo"><span class="material-symbols-rounded">keyboard_arrow_down</span></button><button type="button" data-action="edit-channel" data-channel-edit="${c.id}" title="Editar canal" aria-label="Editar canal"><span class="material-symbols-rounded">edit</span></button><button type="button" data-action="delete-channel" data-channel-delete="${c.id}" title="Excluir canal" aria-label="Excluir canal"><span class="material-symbols-rounded">delete</span></button></span>` : ''}</div>`).join('') || '<div class="channel-empty-hint">Nenhum canal de texto</div>'}</div>
      <div class="channel-sidebar-title channel-group-heading voice-channel-heading"><span><span class="material-symbols-rounded">headphones</span> CANAIS DE VOZ</span>${canManageChannels(space) ? '<button type="button" data-action="create-channel" data-channel-kind="voice" title="Criar canal de voz" aria-label="Criar canal de voz">＋</button>' : ''}</div>
      <div class="channel-list sidebar-channel-list voice-channel-list">${state.channels.filter(c => c.kind === 'voice').map(c => `<div class="channel-entry-row"><button class="channel-entry ${c.id === state.activeChannel?.id ? 'active' : ''}" data-channel-id="${c.id}"><span class="material-symbols-rounded channel-type-icon">volume_up</span><span class="channel-entry-name">${escapeHTML(c.name)}</span></button>${canManageChannels(space) ? `<span class="channel-entry-actions"><button type="button" data-action="move-channel-up" data-move-channel="${c.id}" title="Mover canal para cima" aria-label="Mover canal para cima"><span class="material-symbols-rounded">keyboard_arrow_up</span></button><button type="button" data-action="move-channel-down" data-move-channel="${c.id}" title="Mover canal para baixo" aria-label="Mover canal para baixo"><span class="material-symbols-rounded">keyboard_arrow_down</span></button><button type="button" data-action="edit-channel" data-channel-edit="${c.id}" title="Editar canal" aria-label="Editar canal"><span class="material-symbols-rounded">edit</span></button><button type="button" data-action="delete-channel" data-channel-delete="${c.id}" title="Excluir canal" aria-label="Excluir canal"><span class="material-symbols-rounded">delete</span></button></span>` : ''}</div>`).join('') || '<div class="channel-empty-hint">Nenhum canal de voz</div>'}</div>
`;
  }
  const search = $('#spaceSearch').value.trim().toLowerCase();
  const filtered = state.spaces.filter(space => !search || space.name.toLowerCase().includes(search));
  $('#spaceList').innerHTML = filtered.length ? filtered.map(space => `
    <button class="space-entry ${state.activeSpace?.id === space.id ? 'active' : ''}" data-space-id="${space.id}" title="${escapeHTML(space.name)}">
      <span class="space-entry-icon ${space.image_url ? 'has-space-photo' : ''}">${spacePhotoContent(space)}</span><span class="space-entry-copy"><strong>${escapeHTML(space.name)}</strong><small>${state.activeSpace?.id === space.id ? 'Espaço selecionado' : 'Abrir espaço'}</small></span>
    </button>`).join('') : `<div class="space-list-empty"><span>✳</span>${state.user ? 'Nenhum espaço encontrado.' : 'Entre para ver seus espaços.'}<br><button data-action="create-space">Criar um espaço</button></div>`;
  $('#spaceRail').innerHTML = state.spaces.slice(0, 6).map(space => `<button class="rail-space ${state.activeSpace?.id === space.id ? 'active' : ''} ${space.image_url ? 'has-space-photo' : ''}" data-space-id="${space.id}" title="${escapeHTML(space.name)}">${spacePhotoContent(space)}</button>`).join('');
  $('#spaceCount').textContent = state.spaces.length;
}

function renderHome() {
  $('.main-panel').classList.remove('workspace-mode'); $('.app-shell').classList.remove('workspace-mode','inbox-mode');
  $('#crumbParent').textContent = 'LUMI'; $('#crumbCurrent').textContent = 'Início';
  $('#pageContent').innerHTML = `
    <section class="welcome-row"><div><div class="eyebrow"><span class="eyebrow-dot"></span> SEU CANTINHO NA INTERNET</div><h1>Um lugar para <span>se encontrar.</span></h1><p>Converse, compartilhe ideias e construa comunidades do seu jeito.</p><div class="welcome-actions"><button class="primary-button" data-action="create-space">＋ Criar um espaço</button><button class="secondary-button" data-action="discover">Explorar espaços <span>↗</span></button></div></div><div class="hero-art" aria-hidden="true"><div class="sun-orbit orbit-one"></div><div class="sun-orbit orbit-two"></div><div class="sun-core"><span>l</span></div><span class="spark spark-one">✳</span><span class="spark spark-two">✦</span><span class="spark spark-three">·</span></div></section>
    <section class="section-block"><div class="section-title-row"><div><div class="eyebrow">SEU MUNDO</div><h2>Continue de onde parou</h2></div><button class="text-button" data-action="discover">Ver todos <span>→</span></button></div><div id="homeSpaces" class="space-cards">${homeSpacesHTML()}</div></section>
    <section class="section-block discovery-block"><div class="section-title-row"><div><div class="eyebrow">PRA VOCÊ</div><h2>Ideias para se conectar</h2></div></div><div class="feature-grid"><article class="feature-card feature-yellow"><div class="feature-symbol">✳</div><div><span class="feature-tag">CRIE</span><h3>Seu espaço, suas regras.</h3><p>Junte pessoas em torno do que vocês amam.</p></div><button class="round-arrow" data-action="create-space" aria-label="Criar espaço">↗</button></article><article class="feature-card feature-white"><div class="feature-symbol symbol-chat">☷</div><div><span class="feature-tag">CONVERSE</span><h3>Uma conversa de cada vez.</h3><p>Canais organizados para as ideias fluírem.</p></div><button class="round-arrow" data-action="show-inbox" aria-label="Abrir mensagens">↗</button></article></div></section>`;
  renderSpaceNav();
}
function spacePhotoContent(space) {
  const url = typeof space?.image_url === 'string'
    ? space.image_url.trim()
    : '';

  if (url && /^https?:\/\/\S+$/i.test(url)) {
    return `<img class="space-photo-image" src="${escapeHTML(url)}" alt="" loading="lazy">`;
  }

  return escapeHTML(space?.symbol || '✳');
}

function homeSpacesHTML() {
  if (!state.user) return `<div class="empty-card"><div class="empty-illustration">✳</div><strong>Seu próximo lugar favorito começa aqui</strong><p>Entre na sua conta para criar espaços, conhecer pessoas e conversar.</p><button class="secondary-button" data-action="auth">Entrar ou criar conta</button></div>`;
  if (!state.spaces.length) return `<div class="empty-card"><div class="empty-illustration">✳</div><strong>Seus espaços começam aqui</strong><p>Crie um espaço ou entre em um para encontrar sua galera.</p><button class="secondary-button" data-action="create-space">Criar meu primeiro espaço</button><button class="text-button" data-action="discover">Tenho um código de convite</button></div>`;
  return state.spaces.slice(0,3).map(space => `<article class="space-card" data-open-space="${space.id}" tabindex="0" role="button"><div class="space-card-top"><span class="space-card-icon ${space.image_url ? 'has-space-photo' : ''}">${spacePhotoContent(space)}</span><span class="space-card-arrow">↗</span></div><h3>${escapeHTML(space.name)}</h3><p>${escapeHTML(space.description || 'Um espaço para compartilhar e conversar.')}</p><div class="space-card-foot"><span class="member-dots"><i></i><i></i><i></i></span><span>Comunidade LUMI</span></div></article>`).join('');
}

async function loadSpaces() {
  if (!state.user) { state.spaces = []; state.activeSpace = null; renderSpaceNav(); return; }
  const { data, error } = await supabase.from('space_members').select('space_id, role, spaces(id,name,description,symbol,image_url,invite_code,owner_id,created_at)').eq('user_id', state.user.id).order('joined_at', { ascending: false });
  if (error) { console.error(error); toast('Não consegui carregar seus espaços. Confira se executou o SQL do LUMI.', 'error'); return; }
  state.spaces = (data || []).map(row => ({...row.spaces, role:row.role})).filter(Boolean);
  if (state.activeSpace && !state.spaces.some(s => s.id === state.activeSpace.id)) state.activeSpace = null;
  renderSpaceNav();
  if (state.page === 'home') renderHome();
}

async function loadProfile() {
  if (!state.user) { state.profile = null; updateIdentity(); return; }
  let { data, error } = await supabase.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
  if (!data && !error) {
    const emailName = (state.user.email || 'pessoa').split('@')[0];
    const username = `user_${state.user.id.replaceAll('-', '').slice(0, 12)}`;
    const created = await supabase.from('profiles').insert({id:state.user.id, username, display_name:state.user.user_metadata?.display_name || emailName}).select('*').single();
    data = created.data; error = created.error;
  }
  if (error) console.warn('Perfil:', error.message);
  state.profile = data || { display_name: state.user.user_metadata?.display_name || state.user.email?.split('@')[0], username: '' };
  updateIdentity();
}

function validateSpacePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    toast('Use uma imagem PNG, JPG, WEBP ou GIF.', 'error');
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast('A foto do espaço precisa ter no máximo 5 MB.', 'error');
    return false;
  }
  return true;
}

async function uploadSpacePhotoFile(spaceId, file) {
  const ext = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
  }[file.type];

  if (!ext) return {url: null, error: 'Formato não aceito.'};

  const path = `${state.user.id}/${spaceId}/${crypto.randomUUID()}.${ext}`;
  const {error: uploadError} = await supabase.storage.from('space-photos')
    .upload(path, file, {upsert: false, contentType: file.type, cacheControl: '3600'});

  if (uploadError) {
    console.error(uploadError);
    return {url: null, error: uploadError.message};
  }

  const {data: publicData} = supabase.storage.from('space-photos').getPublicUrl(path);
  const imageUrl = publicData?.publicUrl;
  if (!imageUrl) return {url: null, error: 'Não consegui obter a URL da foto.'};

  const {error} = await supabase.from('spaces')
    .update({image_url: imageUrl}).eq('id', spaceId);

  if (error) {
    console.error(error);
    return {url: null, error: error.message};
  }
  return {url: imageUrl, error: null};
}

async function createSpace(event) {
  event.preventDefault();
  if (!requireAuth()) return;

  const name = $('#spaceName').value.trim();
  const description = $('#spaceDescription').value.trim();
  const symbol = $('#spaceEmoji').value || '✳';
  const photo = $('#spacePhoto')?.files?.[0] || null;

  if (name.length < 2) {
    toast('O nome precisa ter pelo menos 2 caracteres.', 'error');
    return;
  }
  if (photo && !validateSpacePhoto(photo)) return;

  const button = $('#spaceForm button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Criando...';

  const {data, error} = await supabase.from('spaces')
    .insert({name, description, symbol, owner_id: state.user.id})
    .select().single();

  if (error) {
    button.disabled = false;
    button.innerHTML = 'Criar espaço <span>→</span>';
    console.error(error);
    toast(`Não foi possível criar o espaço: ${error.message}`, 'error');
    return;
  }

  const result = photo
    ? await uploadSpacePhotoFile(data.id, photo)
    : {url: null, error: null};

  button.disabled = false;
  button.innerHTML = 'Criar espaço <span>→</span>';
  closeModal('spaceModal');
  $('#spaceForm').reset();
  $('#spaceEmoji').value = '✳';
  $$('.symbol-choice').forEach((el, i) => el.classList.toggle('selected', i === 0));

  await loadSpaces();
  state.activeSpace = state.spaces.find(s => s.id === data.id)
    || {...data, image_url: result.url, role: 'owner'};
  await loadWorkspace(data.id);

  if (photo && result.error) {
    toast(`Espaço criado, mas a foto não foi salva: ${result.error}`, 'error');
  } else {
    toast('Espaço criado! Sua comunidade já tem um canal #geral.', 'success');
  }
}

async function editActiveSpace() {
  const space = state.activeSpace;
  if (!state.user || !space) return;
  if (space.owner_id !== state.user.id) {
    toast('Somente o dono pode editar este espaço.', 'error');
    return;
  }

  const name = prompt('Novo nome do espaço (2 a 48 caracteres):', space.name);
  if (name === null) return;
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 48) {
    toast('O nome deve ter entre 2 e 48 caracteres.', 'error');
    return;
  }

  const description = prompt('Nova descrição do espaço (opcional):', space.description || '');
  if (description === null) return;
  const cleanDescription = description.trim();
  if (cleanDescription.length > 500) {
    toast('A descrição deve ter no máximo 500 caracteres.', 'error');
    return;
  }

  const { data, error } = await supabase.from('spaces')
    .update({ name: cleanName, description: cleanDescription })
    .eq('id', space.id)
    .eq('owner_id', state.user.id)
    .select('*')
    .single();

  if (error || !data) {
    console.error('Falha ao editar espaço:', error);
    toast('Não consegui editar o espaço. Verifique as permissões do Supabase.', 'error');
    return;
  }

  state.activeSpace = { ...space, ...data };
  state.spaces = state.spaces.map(item => item.id === space.id ? { ...item, ...data } : item);
  renderSpaceNav();
  if (state.page === 'space') renderWorkspace();
  else if (state.page === 'home') renderHome();
  else if (state.page === 'discover') await renderDiscover();
  toast('Espaço atualizado!', 'success');
}

async function deleteActiveSpace() {
  const space = state.activeSpace;
  if (!state.user || !space) return;
  if (space.owner_id !== state.user.id) {
    toast('Somente o dono pode apagar este espaço.', 'error');
    return;
  }
  const confirmation = prompt(`Para apagar "${space.name}", digite APAGAR:`);
  if (confirmation !== 'APAGAR') {
    if (confirmation !== null) toast('Exclusão cancelada: o texto não corresponde.', 'error');
    return;
  }
  const { error } = await supabase.from('spaces').delete().eq('id', space.id).eq('owner_id', state.user.id);
  if (error) {
    console.error('Falha ao apagar espaço:', error);
    toast('Não consegui apagar. Verifique as permissões do Supabase e tente novamente.', 'error');
    return;
  }
  state.spaces = state.spaces.filter(item => item.id !== space.id);
  state.activeSpace = null;
  state.channels = [];
  state.activeChannel = null;
  state.messages = [];
  await loadSpaces();
  setPage('home');
  toast('Espaço apagado.', 'success');
}

async function changeSpacePhoto(file) {
  const space = state.activeSpace;
  if (!file || !state.user || !space) return;
  if (space.owner_id !== state.user.id) {
    toast('Somente o dono pode trocar a foto.', 'error');
    return;
  }
  if (!validateSpacePhoto(file)) return;

  const result = await uploadSpacePhotoFile(space.id, file);
  if (!result.url) {
    toast(`Não consegui salvar a foto: ${result.error}`, 'error');
    return;
  }

  const local = state.spaces.find(s => s.id === space.id);
  if (local) local.image_url = result.url;
  state.activeSpace.image_url = result.url;
  renderSpaceNav();
  if (state.page === 'home') renderHome();
  else if (state.page === 'discover') await renderDiscover();
  toast('Foto do espaço atualizada!', 'success');
}

async function loadWorkspace(spaceId, preferredChannel = null) {
  const space = state.spaces.find(s => s.id === spaceId) || state.activeSpace;
  if (!space) return;
  state.activeSpace = space;
  const {data, error} = await supabase.from('channels').select('*').eq('space_id', spaceId).order('position').order('created_at');
  if (error) { console.error(error); toast('Não consegui carregar os canais. Confira as políticas do Supabase.', 'error'); return; }
  state.channels = data || []; state.channelCount = state.channels.length; $('#channelCount').textContent = state.channelCount;
  state.activeChannel = state.channels.find(c => c.id === preferredChannel) || state.channels.find(c => c.id === state.activeChannel?.id) || state.channels[0] || null;
  await loadMessages(); setPage('space');
}

async function loadMessages() {
  if (!state.activeChannel) { state.messages = []; renderWorkspace(); return; }
  const {data,error} = await supabase.from('messages').select('id,content,created_at,author_id,attachment_path,attachment_name,attachment_type,attachment_size,edited_at,reply_to,profiles(display_name,username,avatar_url,vip_purchased)').eq('channel_id',state.activeChannel.id).order('created_at',{ascending:true}).limit(100);
  if (error) { console.error(error); toast('Não consegui carregar as mensagens deste canal.', 'error'); state.messages = []; }
  else state.messages = await signSpaceMedia(data || []);
  if(state.messages.length){const {data:rx}=await supabase.from('message_reactions').select('message_id,user_id,emoji').in('message_id',state.messages.map(m=>m.id));state.spaceReactions=rx||[];}else state.spaceReactions=[];
  state.messageCount = state.messages.length; $('#messageCount').textContent = state.messageCount;
  renderWorkspace(); subscribeMessages();
}

function subscribeMessages() {
  if (state.realtime) { supabase.removeChannel(state.realtime); state.realtime = null; }
  if (!state.activeChannel) return;
  state.realtime = supabase.channel(`lumi-channel-${state.activeChannel.id}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:`channel_id=eq.${state.activeChannel.id}`},async payload=>{
      if (payload.eventType === 'DELETE') { state.messages = state.messages.filter(m=>m.id!==payload.old.id); renderMessages(); return; }
      const {data} = await supabase.from('messages').select('id,content,created_at,author_id,attachment_path,attachment_name,attachment_type,attachment_size,edited_at,reply_to,profiles(display_name,username,avatar_url,vip_purchased)').eq('id',payload.new.id).maybeSingle();
      if (data) { const signed=(data.attachment_path?await signSpaceMedia([data]):[data])[0]; const i=state.messages.findIndex(m=>m.id===signed.id); if(i>=0) state.messages[i]=signed; else state.messages.push(signed); state.messages.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)); state.messageCount = state.messages.length; const count=$('#messageCount'); if(count)count.textContent=state.messageCount; if (state.page === 'space') renderMessages(); }
    }).on('postgres_changes',{event:'*',schema:'public',table:'message_reactions'},async payload=>{const ids=state.messages.map(m=>m.id);if(!ids.length)return;const {data}=await supabase.from('message_reactions').select('message_id,user_id,emoji').in('message_id',ids);state.spaceReactions=data||[];if(state.page==='space')renderMessages();}).subscribe();
}


// LUMI_GROUP_VOICE_V1
// Sala de voz em grupo: conexões WebRTC independentes por participante.
state.groupVoice = state.groupVoice || {
  channel: null, channelId: null, localStream: null,
  peers: new Map(), muted: false, joining: false, localSpeaking: false, localMeterTimer: null, localMeterContext: null
};

async function leaveGroupVoice() {
  const v = state.groupVoice;
  if (v.channel) {
    try { await v.channel.untrack(); } catch {}
    try { await supabase.removeChannel(v.channel); } catch {}
  }
  for (const peer of v.peers.values()) {
    try { peer.pc.close(); } catch {}
    clearInterval(peer.meterTimer); peer.meterContext?.close().catch(()=>{});
  }
  clearInterval(v.localMeterTimer); v.localMeterTimer=null; v.localMeterContext?.close().catch(()=>{}); v.localMeterContext=null; v.localSpeaking=false;
  v.peers.clear();
  if (v.localStream) v.localStream.getTracks().forEach(t => t.stop());
  v.channel = null;
  v.channelId = null;
  v.localStream = null;
  v.joining = false;
  v.muted = false;
  const area = document.querySelector('#voiceAudios');
  if (area) area.innerHTML = '';
}

function monitorGroupVoice(item, userId) {
  if (!item?.stream || item.meterTimer) return;
  try { const Ctx=window.AudioContext||window.webkitAudioContext; if(!Ctx)return; item.meterContext=new Ctx(); const analyser=item.meterContext.createAnalyser(); analyser.fftSize=512; item.meterContext.createMediaStreamSource(item.stream).connect(analyser); const samples=new Uint8Array(analyser.fftSize); item.meterTimer=setInterval(()=>{if(!state.groupVoice?.peers.has(userId)){clearInterval(item.meterTimer);return;}analyser.getByteTimeDomainData(samples);let sum=0;for(const n of samples){const x=(n-128)/128;sum+=x*x;}const next=Math.sqrt(sum/samples.length)>0.055;if(next!==item.speaking){item.speaking=next;renderGroupVoiceMembers();}},130); } catch(error){console.debug('Medidor de voz indisponível',error);}
}
function monitorLocalGroupVoice() {
  const v=state.groupVoice;if(!v.localStream||v.localMeterTimer)return;
  try{const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;v.localMeterContext=new Ctx();const analyser=v.localMeterContext.createAnalyser();analyser.fftSize=512;v.localMeterContext.createMediaStreamSource(v.localStream).connect(analyser);const samples=new Uint8Array(analyser.fftSize);v.localMeterTimer=setInterval(()=>{analyser.getByteTimeDomainData(samples);let sum=0;for(const n of samples){const x=(n-128)/128;sum+=x*x;}const next=Math.sqrt(sum/samples.length)>0.055&&!v.muted;if(next!==v.localSpeaking){v.localSpeaking=next;renderGroupVoiceMembers();}},130);}catch(error){console.debug('Medidor local indisponível',error);}
}

function renderGroupVoiceMembers() {
  const v = state.groupVoice;
  const list = document.querySelector('#voiceMemberList');
  if (!list) return;

  const members = [...v.peers.entries()];

  function voiceAvatar(url, name) {
    const safeName = escapeHTML(name || 'Participante');
    const safeUrl = typeof url === 'string' ? url.trim() : '';

    // Só aceita endereços de imagem HTTP(S).
    if (safeUrl && /^https?:\/\/\S+$/i.test(safeUrl)) {
      return `<img class="voice-member-avatar"
        src="${escapeHTML(safeUrl)}"
        alt="${safeName}"
        referrerpolicy="no-referrer"
        onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'material-symbols-rounded',textContent:'account_circle'}))">`;
    }

    return '<span class="material-symbols-rounded">account_circle</span>';
  }

  const myName = state.profile?.display_name || 'Você';
  const myAvatar = state.profile?.avatar_url
    || state.profile?.avatar
    || state.profile?.photo_url
    || state.profile?.picture
    || '';

  list.innerHTML = `<div class="voice-member self">
    ${voiceAvatar(myAvatar, myName)}
    <span>${escapeHTML(myName)}</span>
    <small class="voice-member-status"><span class="voice-mic-indicator ${v.localSpeaking && !v.muted ? 'is-speaking' : ''}"><span class="material-symbols-rounded">${v.muted ? 'mic_off' : 'mic'}</span></span>${v.muted ? 'Microfone desligado' : (v.localSpeaking ? 'Você está falando' : 'Microfone ligado')}</small>
  </div>` + members.map(([id, item]) => {
    const name = item.name || 'Participante';
    const avatar = item.avatar_url || item.avatar || item.photo_url || item.picture || '';

    return `<div class="voice-member ${item.speaking ? 'is-speaking' : ''}">
      ${voiceAvatar(avatar, name)}
      <span>${escapeHTML(name)}</span>
      <small class="voice-member-status"><span class="voice-mic-indicator ${item.speaking ? 'is-speaking' : ''}"><span class="material-symbols-rounded">${item.speaking ? 'graphic_eq' : 'mic'}</span></span>${item.speaking ? 'Está falando' : (item.pc.connectionState === 'connected' ? 'Conectado' : 'Conectando…')}</small>
    </div>`;
  }).join('');

  const audioArea = document.querySelector('#voiceAudios');
  if (audioArea) {
    for (const [id, item] of members) {
      if (!item.stream) continue;
      let audio = audioArea.querySelector(`[data-voice-audio="${id}"]`);
      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        audio.playsInline = true;
        audio.dataset.voiceAudio = id;
        audioArea.appendChild(audio);
      }
      if (audio.srcObject !== item.stream) audio.srcObject = item.stream;
      audio.play().catch(() => {});
    }
  }
}

async function groupVoiceSignal(to, kind, data) {
  const v = state.groupVoice;
  if (!v.channel) return;
  await v.channel.send({
    type: 'broadcast',
    event: 'voice-signal',
    payload: { from: state.user.id, to, kind, data }
  });
}

async function createGroupVoicePeer(userId, name, initiator, avatar_url = '') {
  const v = state.groupVoice;
  if (v.peers.has(userId) || !v.localStream) return;
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  const item = {
    pc,
    name: name && name !== 'Participante' ? name : '',
    avatar_url: avatar_url || '',
    stream: new MediaStream(), speaking: false, meterTimer: null, meterContext: null
  };
  v.peers.set(userId, item);

  // Recupera o nome e a foto reais do perfil.
  if (!item.name || !item.avatar_url) {
    supabase.from('profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data || !v.peers.has(userId)) return;
        const current = v.peers.get(userId);
        if (!current) return;
        current.name = data.display_name || current.name || 'Participante';
        current.avatar_url = current.avatar_url || data.avatar_url || '';
        renderGroupVoiceMembers();
      })
      .catch(console.error);
  }

  v.localStream.getTracks().forEach(track => pc.addTrack(track, v.localStream));

  pc.ontrack = event => {
    const stream = event.streams?.[0];
    if (stream) {
      item.stream = stream;
    } else if (!item.stream.getTracks().some(t => t.id === event.track.id)) {
      item.stream.addTrack(event.track);
    }
    monitorGroupVoice(item, userId);
    renderGroupVoiceMembers();
  };

  pc.onicecandidate = event => {
    if (event.candidate) {
      groupVoiceSignal(userId, 'ice', event.candidate.toJSON()).catch(console.warn);
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      try { pc.close(); } catch {}
      v.peers.delete(userId);
      renderGroupVoiceMembers();
    } else {
      renderGroupVoiceMembers();
    }
  };

  renderGroupVoiceMembers();

  if (initiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await groupVoiceSignal(userId, 'offer', pc.localDescription.toJSON());
  }
}

async function handleGroupVoiceSignal(payload) {
  const v = state.groupVoice;
  if (!v.channel || !payload || payload.to !== state.user?.id ||
      payload.from === state.user?.id || !v.localStream) return;

  try {
    let item = v.peers.get(payload.from);

    if (payload.kind === 'offer') {
      if (item) {
        try { item.pc.close(); } catch {}
        v.peers.delete(payload.from);
      }
      await createGroupVoicePeer(payload.from, payload.name || 'Participante', false, payload.avatar_url || '');
      item = v.peers.get(payload.from);
      if (!item) return;
      await item.pc.setRemoteDescription(new RTCSessionDescription(payload.data));
      const answer = await item.pc.createAnswer();
      await item.pc.setLocalDescription(answer);
      await groupVoiceSignal(payload.from, 'answer', item.pc.localDescription.toJSON());
    } else if (payload.kind === 'answer' && item) {
      if (item.pc.signalingState === 'have-local-offer') {
        await item.pc.setRemoteDescription(new RTCSessionDescription(payload.data));
      }
    } else if (payload.kind === 'ice' && item && payload.data) {
      await item.pc.addIceCandidate(new RTCIceCandidate(payload.data));
    }
  } catch (error) {
    console.warn('Sinal de voz não processado:', error);
  }
}

async function joinGroupVoice() {
  const v = state.groupVoice;
  const channel = state.activeChannel;
  if (!requireAuth() || !channel || channel.kind !== 'voice' || v.joining) return;

  if (v.channelId === channel.id && v.channel) return;
  v.joining = true;
  const joinButton = document.querySelector('#joinGroupVoice');
  if (joinButton) { joinButton.disabled = true; joinButton.textContent = 'Conectando…'; }

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('O navegador não disponibilizou o microfone. Use HTTPS ou localhost.');
    }

    await leaveGroupVoice();
    v.joining = true;
    v.localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
    const voiceRole = state.activeSpace?.role || 'member';
    const voiceAllowed = (channel.speak_roles || ['owner','admin','moderator','developer','member','newcomer']).includes(voiceRole) || ['owner','admin'].includes(voiceRole);
    v.muted = !voiceAllowed;
    if (!voiceAllowed) v.localStream.getAudioTracks().forEach(track => track.enabled = false);
    v.channelId = channel.id;
    monitorLocalGroupVoice();

    const room = supabase.channel(`lumi-group-voice-${channel.id}`, {
      config: {
        presence: { key: state.user.id },
        broadcast: { self: false }
      }
    });

    v.channel = room;

    room.on('broadcast', { event: 'voice-signal' }, ({ payload }) => {
      handleGroupVoiceSignal(payload);
    });

    room.on('presence', { event: 'sync' }, async () => {
      const presence = room.presenceState();
      for (const [key, entries] of Object.entries(presence)) {
        if (key === state.user.id || v.peers.has(key)) continue;
        const other = entries?.[0];
        if (!other) continue;
        // Só um lado inicia a oferta para cada par.
        if (String(state.user.id) < String(key)) {
          await createGroupVoicePeer(key, other.name || 'Participante', true, other.avatar_url || '');
        }
      }
      renderGroupVoiceMembers();
    });

    room.on('presence', { event: 'join' }, async ({ key, newPresences }) => {
      if (key === state.user.id || v.peers.has(key)) return;
      const other = newPresences?.[0];
      if (String(state.user.id) < String(key)) {
        await createGroupVoicePeer(key, other?.name || 'Participante', true, other?.avatar_url || '');
      }
    });

    room.on('presence', { event: 'leave' }, ({ key }) => {
      const item = v.peers.get(key);
      if (item) {
        try { item.pc.close(); } catch {}
        v.peers.delete(key);
        renderGroupVoiceMembers();
      }
    });

    const status = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Tempo esgotado ao conectar à sala.')), 12000);
      room.subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timer);
          try {
            await room.track({
              user_id: state.user.id,
              name: state.profile?.display_name || 'Participante',
              avatar_url: state.profile?.avatar_url || '',
              joined_at: new Date().toISOString()
            });
            resolve(status);
          } catch (error) {
            clearTimeout(timer);
            reject(error);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timer);
          reject(new Error('O Supabase não conseguiu conectar à sala de voz.'));
        }
      });
    });

    v.joining = false;
    renderWorkspace();
    toast('Você entrou no canal de voz!', 'success');
  } catch (error) {
    console.error('LUMI voice:', error);
    await leaveGroupVoice();
    renderWorkspace();
    toast(error.message || 'Não foi possível entrar no canal de voz.', 'error');
  }
}

function toggleGroupVoiceMute() {
  const v = state.groupVoice;
  if (!v.localStream) return;
  const role=state.activeSpace?.role||'member';
  const allowed=(state.activeChannel?.speak_roles||['owner','admin','moderator','developer','member','newcomer']).includes(role)||['owner','admin'].includes(role);
  if(v.muted&&!allowed){toast('Seu cargo está em modo ouvinte neste canal.','error');return;}
  v.muted = !v.muted;
  v.localStream.getAudioTracks().forEach(track => track.enabled = !v.muted);
  renderGroupVoiceMembers();
  const button = document.querySelector('#toggleGroupVoiceMute');
  if (button) button.innerHTML = `<span class="material-symbols-rounded">${v.muted ? 'mic_off' : 'mic'}</span> ${v.muted ? 'Ativar microfone' : 'Silenciar'}`;
}

function renderWorkspace() {
  if (!state.activeSpace) { setPage('home'); return; }
  const space = state.activeSpace; const channel = state.activeChannel;
  if (channel?.kind === 'voice') {
    const joined = state.groupVoice?.channelId === channel.id && !!state.groupVoice?.channel;
    $('#crumbParent').textContent = space.name;
    $('#crumbCurrent').textContent = `Voz · ${channel.name}`;
    $('#pageContent').innerHTML = `<section class="workspace-chat-view voice-room-view">
      <header class="channel-chat-head"><div>
        <h2><span class="material-symbols-rounded">headphones</span> ${escapeHTML(channel.name)}</h2>
        <p>${escapeHTML(channel.topic || 'Entre para conversar por voz com as pessoas deste espaço.')}</p>
      </div><div class="chat-head-actions">${channelManageActionsHTML(channel)}<button class="icon-button" data-action="manage-members" title="Ver membros" aria-label="Ver membros"><span class="material-symbols-rounded">group</span></button></div></header>
      <div class="voice-room-card">
        <div class="voice-room-symbol"><span class="material-symbols-rounded">graphic_eq</span></div>
        <h3>${joined ? 'Você está na sala' : 'Sala de voz'}</h3>
        <p>${joined ? 'Seu microfone está conectado à sala.' : 'Entre na sala para conversar em tempo real.'}</p>
        <div class="voice-presence-header"><span class="material-symbols-rounded">graphic_eq</span><div><strong>Quem está falando</strong><small>O indicador acende quando detecta voz no microfone.</small></div><span class="voice-live-pill"><i></i> AO VIVO</span></div>
        <div id="voiceMemberList" class="voice-member-list"></div>
        <div id="voiceAudios" hidden></div>
        <div class="voice-room-controls">
          ${joined ? `<button class="secondary-button" id="toggleGroupVoiceMute"><span class="material-symbols-rounded">${state.groupVoice.muted ? 'mic_off' : 'mic'}</span> ${state.groupVoice.muted ? 'Ativar microfone' : 'Silenciar'}</button><button class="primary-button" id="leaveGroupVoice"><span class="material-symbols-rounded">call_end</span> Sair da sala</button>` : `<button class="primary-button" id="joinGroupVoice" ${state.groupVoice?.joining ? 'disabled' : ''}><span class="material-symbols-rounded">headphones</span> ${state.groupVoice?.joining ? 'Conectando…' : 'Entrar na sala'}</button>`}
        </div>
      </div>
    </section>`;
    renderSpaceNav();
    if (joined) renderGroupVoiceMembers();
    return;
  }
  if (state.groupVoice?.channel && state.groupVoice.channelId !== channel?.id) leaveGroupVoice();
  const canSpeak = !channel || (channel.speak_roles || ['owner','admin','moderator','developer','member','newcomer']).includes(space.role || 'member') || ['owner','admin'].includes(space.role);
  $('#crumbParent').textContent = space.name; $('#crumbCurrent').textContent = channel ? `# ${channel.name}` : 'Espaço';
  $('#pageContent').innerHTML = `<section class="workspace-chat-view"><header class="channel-chat-head"><div><h2>${channel ? `<span class="chat-hash material-symbols-rounded">tag</span> ${escapeHTML(channel.name)}` : 'Nenhum canal ainda'}</h2><p>${escapeHTML(channel?.topic || (channel ? 'Esse é o começo de uma boa conversa.' : 'Crie um canal para começar a conversar.'))}</p></div><div class="chat-head-actions">${channelManageActionsHTML(channel)}<button class="icon-button" data-action="manage-members" title="Ver membros" aria-label="Ver membros"><span class="material-symbols-rounded">group</span></button><button class="icon-button" data-action="invite" title="Convidar pessoas" aria-label="Convidar pessoas"><span class="material-symbols-rounded">person_add</span></button></div></header><div class="chat-message-list" id="chatMessageList">${messagesHTML()}</div>${channel ? `<form class="message-composer" id="messageForm"><input id="spaceFileInput" type="file" accept="image/*,video/*" hidden><button class="dm-attach-button" type="button" id="spaceAttachButton" title="Enviar foto ou vídeo"><span class="material-symbols-rounded">add_photo_alternate</span></button><textarea id="messageInput" maxlength="4000" rows="1" ${canSpeak ? '' : 'disabled'} placeholder="${canSpeak ? `Mensagem em #${escapeHTML(channel.name)}` : 'Seu cargo não pode falar neste canal'}" aria-label="Escreva uma mensagem"></textarea><button class="send-button" type="submit" title="Enviar mensagem" ${canSpeak ? '' : 'disabled'}><span class="material-symbols-rounded">send</span></button></form>${state.spaceReplyTo?`<div class="space-reply-banner">Respondendo a uma mensagem <button type="button" data-space-reply-cancel aria-label="Cancelar resposta">×</button></div>`:''}` : ''}</section>`;
  renderSpaceNav();
}
function messagesHTML() {
  if (!state.activeChannel) return `<div class="chat-empty"><div class="chat-empty-icon">#</div><strong>Crie seu primeiro canal</strong><p>Organize as conversas por assunto para sua comunidade ficar fácil de acompanhar.</p></div>`;
  if (!state.messages.length) return `<div class="chat-empty"><div class="chat-empty-icon">✳</div><strong>É aqui que tudo começa.</strong><p>Este canal está quietinho por enquanto. Mande a primeira mensagem!</p></div>`;
  return state.messages.map(message=>{
    const name=message.profiles?.display_name || (message.author_id===state.user?.id ? state.profile?.display_name : 'Pessoa LUMI') || 'Pessoa LUMI';
    const mine=message.author_id===state.user?.id;
    const fileUrl=message.attachment_path ? message.attachment_url : null;
    const isImage=message.attachment_type?.startsWith('image/');
    const isVideo=message.attachment_type?.startsWith('video/');
    const media=fileUrl?(isImage?`<a class="space-media-link" href="${escapeHTML(fileUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHTML(fileUrl)}" loading="lazy" alt="${escapeHTML(message.attachment_name||'Foto compartilhada')}"></a>`:isVideo?`<video class="space-video" controls preload="metadata" src="${escapeHTML(fileUrl)}"></video>`:`<a href="${escapeHTML(fileUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(message.attachment_name||'Abrir arquivo')}</a>`):message.attachment_path?`<div class="space-media-unavailable"><span class="material-symbols-rounded">attach_file</span><span><strong>${escapeHTML(message.attachment_name||'Mídia anexada')}</strong><small>Não foi possível carregar a mídia. Atualize o canal para tentar novamente.</small></span></div>`:'';
    const reply=message.reply_to?state.messages.find(m=>m.id===message.reply_to):null; const reactions=state.spaceReactions.filter(r=>r.message_id===message.id); const reactionHTML=reactions.length?`<div class="space-reactions">${[...new Set(reactions.map(r=>r.emoji))].map(emoji=>`<button type="button" data-space-react="${message.id}" data-emoji="${escapeHTML(emoji)}" class="space-reaction">${escapeHTML(emoji)} <small>${reactions.filter(r=>r.emoji===emoji).length}</small></button>`).join('')}</div>`:'';
    return `<article class="message-item space-message-item" data-message-id="${message.id}"><div class="message-avatar">${message.profiles?.avatar_url?`<img class="avatar-image" src="${escapeHTML(message.profiles.avatar_url)}" alt="">`:escapeHTML(initials(name))}</div><div class="message-content"><div class="message-meta"><strong>${escapeHTML(name)}</strong> ${accountBadges(message.author_id,message.profiles?.vip_purchased)}<time>${shortDate(message.created_at)}</time>${message.edited_at?'<small class="message-edited">editada</small>':''}</div>${reply?`<div class="space-reply-preview">↳ ${escapeHTML(reply.content||reply.attachment_name||'mídia')}</div>`:''}${message.content?`<div class="message-text">${escapeHTML(message.content)}</div>`:''}${media}${reactionHTML}<div class="space-message-actions"><button type="button" data-space-reply="${message.id}" title="Responder"><span class="material-symbols-rounded">reply</span></button>${mine?`<button type="button" data-space-edit="${message.id}" title="Editar"><span class="material-symbols-rounded">edit</span></button><button type="button" data-space-delete="${message.id}" title="Excluir"><span class="material-symbols-rounded">delete</span></button>`:''}<button type="button" data-space-react="${message.id}" title="Reagir"><span class="material-symbols-rounded">add_reaction</span></button></div></div></article>`;
  }).join('');
}
async function signSpaceMedia(messages) {
  return Promise.all(messages.map(async m=>{
    if(m.attachment_path){const {data,error}=await supabase.storage.from('space-attachments').createSignedUrl(m.attachment_path,3600);m.attachment_url=error?null:data?.signedUrl||null;}
    return m;
  }));
}
async function refreshSpaceMedia(){state.messages=await signSpaceMedia(state.messages);renderMessages();}
function renderMessages() { const list = $('#chatMessageList'); if (!list) return; const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 120; list.innerHTML = messagesHTML(); if (nearBottom || state.messages.length <= 1) list.scrollTop = list.scrollHeight; }
async function sendMessage(event) {
  event.preventDefault(); if (!requireAuth() || !state.activeChannel) return;
  const role = state.activeSpace?.role || 'member';
  const allowedRoles = state.activeChannel?.speak_roles || ['owner','admin','moderator','developer','member','newcomer'];
  if (!allowedRoles.includes(role) && !['owner','admin'].includes(role)) { toast('Seu cargo pode ler este canal, mas não pode enviar mensagens.', 'error'); return; }
  const input = $('#messageInput'); const fileInput=$('#spaceFileInput'); const file=fileInput?.files?.[0]||null; const content = input.value.trim(); if (!content&&!file) return;
  if(file && file.size>30*1024*1024){toast('Cada arquivo deve ter no máximo 30 MB.','error');return;}
  if(file && !/^(image\/|video\/)/.test(file.type)){toast('Nos Espaços, envie fotos ou vídeos.','error');return;}
  input.disabled = true; const send=$('#messageForm button[type="submit"]');if(send)send.disabled=true;
  let attachment_path=null;
  if(file){const safeName=(file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]/g,'_').replace(/_+/g,'_').slice(-100)||'midia');attachment_path=`${state.activeChannel.id}/${state.user.id}/${crypto.randomUUID()}-${safeName}`;const {error:uploadError}=await supabase.storage.from('space-attachments').upload(attachment_path,file,{contentType:file.type,upsert:false});if(uploadError){toast(`Falha no envio da mídia: ${uploadError.message}. Confira as permissões do Supabase.`, 'error');input.disabled=false;if(send)send.disabled=false;return;}}
  const payload={channel_id:state.activeChannel.id,author_id:state.user.id,content:content||'',attachment_path,attachment_name:file?.name||null,attachment_type:file?.type||null,attachment_size:file?.size||null,reply_to:state.spaceReplyTo?.id||null};
  const {data,error} = await supabase.from('messages').insert(payload).select('id,content,created_at,author_id,attachment_path,attachment_name,attachment_type,attachment_size,edited_at,reply_to,profiles(display_name,username,avatar_url,vip_purchased)').single();
  input.disabled = false;if(send)send.disabled=false;
  if (error) { if (attachment_path) { const cleanup = await supabase.storage.from('space-attachments').remove([attachment_path]); if (cleanup.error) console.warn('Não consegui remover o anexo enviado sem mensagem:', cleanup.error); } console.error(error); toast(`Não foi possível enviar: ${error.message}`, 'error'); return; }
  if(data.attachment_path){const signed=await signSpaceMedia([data]);Object.assign(data,signed[0]);}
  if (!state.messages.some(m=>m.id===data.id)) state.messages.push(data);
  input.value = '';if(fileInput)fileInput.value='';state.spaceReplyTo=null;state.messageCount = state.messages.length;const count=$('#messageCount');if(count)count.textContent=state.messageCount;renderWorkspace();input.focus();
}
async function editSpaceMessage(id){const msg=state.messages.find(m=>m.id===id);if(!msg||msg.author_id!==state.user?.id)return;const next=prompt('Edite sua mensagem:',msg.content||'');if(next===null)return;const content=next.trim();if(!content&&!msg.attachment_path){toast('A mensagem não pode ficar vazia.','error');return;}const {error}=await supabase.from('messages').update({content,edited_at:new Date().toISOString()}).eq('id',id).eq('author_id',state.user.id);if(error){toast(`Não foi possível editar: ${error.message}`,'error');return;}const item=state.messages.find(m=>m.id===id);if(item){item.content=content;item.edited_at=new Date().toISOString();}renderMessages();toast('Mensagem editada!','success');}
async function deleteSpaceMessage(id){const msg=state.messages.find(m=>m.id===id);if(!msg||msg.author_id!==state.user?.id)return;if(!confirm('Excluir esta mensagem? Essa ação não pode ser desfeita.'))return;const {error}=await supabase.from('messages').delete().eq('id',id).eq('author_id',state.user.id);if(!error&&msg.attachment_path)await supabase.storage.from('space-attachments').remove([msg.attachment_path]);if(error){toast(`Não foi possível excluir: ${error.message}`,'error');return;}state.messages=state.messages.filter(m=>m.id!==id);renderMessages();toast('Mensagem excluída.','success');}
function replyToSpaceMessage(id){const msg=state.messages.find(m=>m.id===id);if(!msg)return;state.spaceReplyTo=msg;renderWorkspace();$('#messageInput')?.focus();}
async function reactToSpaceMessage(id,chosen=null){const msg=state.messages.find(m=>m.id===id);if(!msg)return;const reaction=chosen||prompt('Digite uma reação (por exemplo: 💛 🎉 😂 👍):','💛');if(!reaction)return;const existing=state.spaceReactions.find(r=>r.message_id===id&&r.user_id===state.user.id&&r.emoji===reaction);if(existing){const {error}=await supabase.from('message_reactions').delete().eq('message_id',id).eq('user_id',state.user.id).eq('emoji',reaction);if(error){toast(`Não foi possível remover reação: ${error.message}`,'error');return;}state.spaceReactions=state.spaceReactions.filter(r=>r!==existing);}else{const {data,error}=await supabase.from('message_reactions').insert({message_id:id,user_id:state.user.id,emoji:reaction}).select().single();if(error){toast(`Não foi possível reagir: ${error.message}`,'error');return;}state.spaceReactions.push(data);}renderMessages();}

async function moveChannel(id, direction) {
  if (!canManageChannels()) { toast('Somente o dono ou um administrador pode reorganizar canais.', 'error'); return; }
  const ordered = [...state.channels].sort((a,b)=>(a.position||0)-(b.position||0));
  const index = ordered.findIndex(channel => channel.id === id), targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;
  const [item] = ordered.splice(index, 1); ordered.splice(targetIndex, 0, item);
  for (let i=0; i<ordered.length; i++) {
    const {error} = await supabase.from('channels').update({position:i}).eq('id', ordered[i].id).eq('space_id', state.activeSpace.id);
    if (error) { toast('Não consegui reorganizar os canais. Confira as permissões do Supabase.', 'error'); await loadWorkspace(state.activeSpace.id, state.activeChannel?.id); return; }
  }
  state.channels = ordered.map((channel, position)=>({...channel, position}));
  renderWorkspace(); toast('Ordem dos canais atualizada!', 'success');
}

function resetChannelModal() {
  state.editingChannelId = null;
  $('#channelForm')?.reset();
  const title = $('#channelModal h2'); if (title) title.textContent = 'Novo canal';
  const submit = $('#channelForm button[type="submit"]'); if (submit) submit.innerHTML = 'Criar canal <span>→</span>';
  const kindSelect = $('#channelKind'); if (kindSelect) { kindSelect.disabled = false; kindSelect.value = 'text'; window.lumiSyncChannelSelect?.('text'); }
}
function openEditChannel(id) {
  const channel = state.channels.find(item => item.id === id);
  if (!channel || !canManageChannels()) { toast('Somente o dono ou um administrador pode editar canais.', 'error'); return; }
  state.editingChannelId = channel.id;
  $('#channelName').value = channel.name || '';
  $('#channelTopic').value = channel.topic || '';
  if ($('#channelCategory')) $('#channelCategory').value = channel.category || 'Geral';
  if ($('#channelSpeakRoles')) [...$('#channelSpeakRoles').options].forEach(option => option.selected = (channel.speak_roles || ['owner','admin','moderator','developer','member','newcomer']).includes(option.value));
  const kindSelect = $('#channelKind');
  if (kindSelect) { kindSelect.value = channel.kind === 'voice' ? 'voice' : 'text'; kindSelect.disabled = true; window.lumiSyncChannelSelect?.(kindSelect.value); }
  const title = $('#channelModal h2'); if (title) title.textContent = 'Editar canal';
  const submit = $('#channelForm button[type="submit"]'); if (submit) submit.innerHTML = 'Salvar alterações <span>→</span>';
  openModal('channelModal');
}
async function deleteChannel(id) {
  const channel = state.channels.find(item => item.id === id);
  if (!channel || !canManageChannels()) { toast('Somente o dono ou um administrador pode excluir canais.', 'error'); return; }
  const kindLabel = channel.kind === 'voice' ? 'canal de voz' : 'canal de texto';
  if (!confirm(`Excluir o ${kindLabel} “${channel.name}”? As mensagens e os arquivos associados podem ser removidos e esta ação não pode ser desfeita.`)) return;
  const previousChannelId = state.activeChannel?.id;
  const {data: attachments} = await supabase.from('messages').select('attachment_path').eq('channel_id', channel.id).not('attachment_path', 'is', null);
  const {error} = await supabase.from('channels').delete().eq('id', channel.id).eq('space_id', state.activeSpace.id);
  if (error) { console.error(error); toast(`Não foi possível excluir o canal: ${error.message}`, 'error'); return; }
  const paths = (attachments || []).map(item => item.attachment_path).filter(Boolean);
  if (paths.length) {
    const {error: storageError} = await supabase.storage.from('space-attachments').remove(paths);
    if (storageError) console.warn('LUMI: não foi possível limpar todos os anexos do canal excluído.', storageError);
  }
  const nextChannel = state.channels.find(item => item.id !== channel.id);
  if (state.groupVoice?.channelId === channel.id) await leaveGroupVoice();
  await loadWorkspace(state.activeSpace.id, previousChannelId === channel.id ? nextChannel?.id || null : previousChannelId);
  toast('Canal excluído.', 'success');
}
async function createChannel(event) {
  event.preventDefault(); if (!requireAuth() || !state.activeSpace) return;
  if (!canManageChannels()) { toast('Somente o dono ou um administrador pode gerenciar canais.', 'error'); return; }
  const name = $('#channelName').value.trim().toLowerCase().replace(/\s+/g,'-');
  const topic = $('#channelTopic').value.trim();
  const category = ($('#channelCategory')?.value || 'Geral').trim().slice(0,40) || 'Geral';
  const speak_roles = [...($('#channelSpeakRoles')?.selectedOptions || [])].map(option => option.value);
  const kind = $('#channelKind')?.value === 'voice' ? 'voice' : 'text';
  if (!name) return;
  let data, error;
  if (state.editingChannelId) {
    const result = await supabase.from('channels').update({name,topic,category,speak_roles}).eq('id',state.editingChannelId).eq('space_id',state.activeSpace.id).select().single();
    data = result.data; error = result.error;
  } else {
    const result = await supabase.from('channels').insert({space_id:state.activeSpace.id,name,topic,category,speak_roles,kind,created_by:state.user.id,position:state.channels.length}).select().single();
    data = result.data; error = result.error;
  }
  if (error) { console.error(error); toast(error.code === '42501' ? 'Somente administradores podem gerenciar canais neste espaço.' : `Não foi possível salvar o canal: ${error.message}`, 'error'); return; }
  const editing = !!state.editingChannelId;
  closeModal('channelModal'); resetChannelModal();
  await loadWorkspace(state.activeSpace.id,data.id);
  toast(editing ? 'Canal atualizado!' : 'Canal criado!', 'success');
}

async function renderDiscover() {
  $('.main-panel').classList.remove('workspace-mode'); $('.app-shell').classList.remove('workspace-mode','inbox-mode'); $('#crumbParent').textContent='LUMI';$('#crumbCurrent').textContent='Descobrir';
  $('#pageContent').innerHTML = `<section class="page-placeholder"><div class="eyebrow">ENCONTRE SUA GALERA</div><h1>Descobrir espaços</h1><p>Conheça comunidades novas ou entre em uma usando um código de convite.</p><div class="discover-search"><input id="discoverQuery" placeholder="Buscar por nome ou assunto..." value="${escapeHTML(state.search)}"><button class="primary-button" data-action="search-spaces">Buscar</button></div><div class="discover-results" id="discoverResults"><div class="empty-card"><strong>Carregando espaços...</strong></div></div><div class="notice-box">Tem um código de convite? <button class="text-button" data-action="invite">Use seu código →</button></div></section>`;
  if (!state.user) { $('#discoverResults').innerHTML = `<div class="empty-card"><strong>Entre para descobrir espaços</strong><p>Faça login para explorar e participar de comunidades.</p><button class="primary-button" data-action="auth">Entrar</button></div>`; return; }
  const {data,error} = await supabase.from('spaces').select('id,name,description,symbol,image_url,invite_code,owner_id').order('created_at',{ascending:false}).limit(60);
  if (error) { $('#discoverResults').innerHTML = `<div class="empty-card"><strong>Não foi possível carregar</strong><p>${escapeHTML(error.message)}</p></div>`; return; }
  state.discoverSpaces = data || []; const joined = new Set(state.spaces.map(s=>s.id)); const results = (data||[]).filter(s=>!joined.has(s.id) && (`${s.name} ${s.description}`.toLowerCase().includes(state.search.toLowerCase())));
  $('#discoverResults').innerHTML = results.length ? results.map(s=>`<article class="space-card"><div class="space-card-top"><span class="space-card-icon ${s.image_url ? 'has-space-photo' : ''}">${spacePhotoContent(s)}</span><span class="space-card-arrow">↗</span></div><h3>${escapeHTML(s.name)}</h3><p>${escapeHTML(s.description||'Uma comunidade LUMI.')}</p><button class="join-space-button" data-join-code="${escapeHTML(s.invite_code)}">Entrar no espaço +</button></article>`).join('') : `<div class="empty-card"><div class="empty-illustration">✳</div><strong>${state.search?'Nenhum espaço encontrado':'Você já está por dentro!'}</strong><p>${state.search?'Tente buscar por outro nome ou assunto.':'Crie um espaço e convide sua galera com um código.'}</p><button class="secondary-button" data-action="create-space">Criar espaço</button></div>`;
}

async function joinSpaceById(id) {
  if (!requireAuth()) return;
  const target = state.discoverSpaces?.find(s=>s.id===id);
  if (!target?.invite_code) { toast('Não encontrei o convite deste espaço. Atualize a página.', 'error'); return; }
  await joinSpaceByCode(target.invite_code);
}

async function joinSpaceByCode(code) {
  if (!requireAuth()) return;
  const normalized = code.trim().toUpperCase(); if (!normalized) { toast('Digite um código de convite.', 'error'); return; }
  const {data,error} = await supabase.rpc('join_space_by_code',{p_code:normalized});
  if (error || !data) { toast(`Não foi possível entrar: ${error?.message || 'código inválido'}`, 'error'); return; }
  closeModal('inviteModal'); $('#joinCode').value=''; await loadSpaces(); await loadWorkspace(data); toast('Você entrou no espaço!','success');
}

async function manageMembers() {
  if (!state.activeSpace || !requireAuth()) return;
  const {data,error}=await supabase.from('space_members').select('user_id,role,profiles(display_name,username)').eq('space_id',state.activeSpace.id).order('joined_at');
  if(error){toast(`Não foi possível carregar membros: ${error.message}`,'error');return;}
  let dialog=$('#membersModal');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='membersModal';dialog.className='modal';document.body.append(dialog);}
  const canManage=state.activeSpace.owner_id===state.user.id;
  dialog.innerHTML=`<div class="modal-card"><button class="modal-close" type="button" data-close="membersModal" aria-label="Fechar">×</button><div class="eyebrow">SUA COMUNIDADE</div><h2>Membros do espaço</h2><p class="modal-subtitle">O fundador pode atribuir cargos. As permissões específicas de cada cargo ainda serão configuradas separadamente.</p><div class="member-manager-list">${(data||[]).map(m=>{const name=m.profiles?.display_name||m.profiles?.username||'Pessoa LUMI';const isSelf=m.user_id===state.user.id;const manageable=canManage&&!isSelf&&m.role!=='owner';const roleNames={owner:'Fundador',admin:'Administrador',moderator:'Moderador',developer:'Desenvolvedor',member:'Membro',newcomer:'Novato'};return `<div class="member-manager-row"><div><strong>${escapeHTML(name)}${isSelf?' (você)':''}</strong><small>${escapeHTML(m.profiles?.username?'@'+m.profiles.username:m.role)}</small></div><span class="member-role">${roleNames[m.role]||'Membro'}</span>${manageable?`<select class="form-input member-role-select" data-member-role="${m.user_id}"><option value="member" ${m.role==='member'?'selected':''}>Membro</option><option value="newcomer" ${m.role==='newcomer'?'selected':''}>Novato</option><option value="moderator" ${m.role==='moderator'?'selected':''}>Moderador</option><option value="developer" ${m.role==='developer'?'selected':''}>Desenvolvedor</option><option value="admin" ${m.role==='admin'?'selected':''}>Administrador</option></select><button class="secondary-button" data-save-role="${m.user_id}">Salvar cargo</button>`:''}</div>`}).join('')}</div></div>`;
  if(!dialog.open)dialog.showModal();
}

async function renderInbox() {
  $('.main-panel').classList.add('workspace-mode');
  $('.app-shell').classList.add('workspace-mode','inbox-mode');
  $('#crumbParent').textContent='LUMI'; $('#crumbCurrent').textContent='Mensagens';
  renderSpaceNav();
  if (!state.user) {
    $('#pageContent').innerHTML = `<section class="dm-chat-panel"><div class="dm-empty-state"><span class="material-symbols-rounded dm-empty-symbol">forum</span><strong>Entre para conversar em particular</strong><p>Suas conversas e arquivos ficam ligados à sua conta.</p><button class="primary-button" data-action="auth">Entrar no LUMI</button></div></section>`;
    return;
  }
  $('#pageContent').innerHTML = `
    <section id="dmMobileInbox" class="dm-mobile-inbox">
      <div class="dm-mobile-title">Mensagens</div>
      <div class="dm-mobile-search-row">
        <input id="dmMobilePeopleSearch" type="search" placeholder="Buscar pessoas" autocomplete="off" aria-label="Buscar pessoas">
        <button id="dmMobileSearchButton" type="button" aria-label="Buscar"><span class="material-symbols-rounded">search</span></button>
      </div>
      <div id="dmMobileSearchResults" class="dm-search-results"></div>
      <div class="dm-mobile-list-label">SUAS CONVERSAS</div>
      <div id="dmMobileConversationList" class="dm-conversation-list">
        <div class="dm-empty-small">Carregando conversas…</div>
      </div>
    </section>
    <section id="dmChatPanel" class="dm-chat-panel dm-chat-full">
      <div class="dm-empty-state">
        <span class="material-symbols-rounded dm-empty-symbol">forum</span>
        <strong>Suas conversas, do seu jeito</strong>
        <p>Escolha uma conversa ou busque alguém para começar.</p>
      </div>
    </section>`;
  renderSpaceNav();
  await loadConversations();
  if (state.activeConversation) await openConversation(state.activeConversation.id, false);
}

async function loadConversations() {
  if (!state.user) return;
  const { data, error } = await supabase.from('conversation_members').select('conversation_id, conversations(id,created_at,conversation_members(user_id,profiles(id,username,display_name,avatar_url,vip_purchased)))').eq('user_id', state.user.id).order('joined_at', {ascending:false});
  if (error) { console.error(error); $('#dmConversationList').innerHTML = `<div class="dm-empty-small">Não consegui carregar. Execute o SQL de DMs.</div>`; return; }
  state.conversations = (data || []).map(row => {
    const c = row.conversations; if (!c) return null;
    const member = (c.conversation_members || []).find(m => m.user_id !== state.user.id);
    const other = member?.profiles;
    return {
      ...c,
      otherUser: {
        id: member?.user_id || other?.id,
        display_name: other?.display_name || other?.username || 'Pessoa LUMI',
        username: other?.username || 'lumi-user',
        avatar_url: other?.avatar_url || '',
        vip_purchased: Boolean(other?.vip_purchased)
      }
    };
  }).filter(Boolean);
  renderConversationList();
}
function renderConversationList() {
  const html = state.conversations.length
    ? state.conversations.map(c => `<button class="dm-conversation-entry ${state.activeConversation?.id===c.id?'active':''}" data-open-dm="${c.id}">${avatarMarkup(c.otherUser.display_name || c.otherUser.username || '?',c.otherUser.avatar_url,'dm-avatar')}<span class="dm-conversation-copy"><strong>${escapeHTML(c.otherUser.display_name || c.otherUser.username || 'Pessoa LUMI')} ${accountBadges(c.otherUser.id,c.otherUser.vip_purchased)}</strong><small>@${escapeHTML(c.otherUser.username || 'lumi-user')}</small></span><span class="dm-entry-arrow material-symbols-rounded">chevron_right</span></button>`).join('')
    : `<div class="dm-empty-small"><span>✉</span><strong>Nenhuma conversa ainda</strong><p>Busque uma pessoa para mandar a primeira mensagem.</p></div>`;
  ['#dmConversationList', '#dmMobileConversationList'].forEach(selector => {
    const host = $(selector);
    if (host) host.innerHTML = html;
  });
}
async function searchDMPeople() {
  if (!requireAuth()) return;
  const mobileInput = $('#dmMobilePeopleSearch');
  const desktopInput = $('#dmPeopleSearch');
  const q = (mobileInput && mobileInput.value.trim() ? mobileInput.value : desktopInput?.value || '').trim().replace(/^@/,'');
  if (!q || q.length < 2) {
    toast('Digite pelo menos 2 caracteres para buscar.');
    return;
  }
  ['#dmSearchResults', '#dmMobileSearchResults'].forEach(s => {
    const host = $(s);
    if (host) host.innerHTML = `<div class="dm-search-loading">Buscando pessoas…</div>`;
  });
  const clean = q.replace(/[,%()]/g,'');
  const {data,error} = await supabase.from('profiles')
    .select('id,username,display_name,avatar_url')
    .neq('id',state.user.id)
    .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
    .limit(12);
  if (error) {
    console.error(error);
    ['#dmSearchResults', '#dmMobileSearchResults'].forEach(s => {
      const host = $(s);
      if (host) host.innerHTML = `<div class="dm-empty-small">Não consegui buscar pessoas: ${escapeHTML(error.message)}</div>`;
    });
    return;
  }
  state.dmSearchResults = data || [];
  const html = state.dmSearchResults.length
    ? state.dmSearchResults.map(u => `<div class="dm-person-result">${avatarMarkup(u.display_name||u.username||'?',u.avatar_url,'dm-avatar')}<span class="dm-conversation-copy"><strong>${escapeHTML(u.display_name||u.username||'Pessoa LUMI')} ${accountBadges(u.id,u.vip_purchased)}</strong><small>@${escapeHTML(u.username||'lumi-user')}</small></span><button class="dm-start-button" data-start-dm="${u.id}" title="Enviar mensagem"><span class="material-symbols-rounded">chat</span></button></div>`).join('')
    : `<div class="dm-empty-small">Não encontrei ninguém com esse nome.</div>`;
  ['#dmSearchResults', '#dmMobileSearchResults'].forEach(s => {
    const host = $(s);
    if (host) host.innerHTML = html;
  });
}
async function startDirectMessage(userId) {
  if (!requireAuth() || userId===state.user.id) return;
  const {data,error} = await supabase.rpc('start_direct_conversation',{p_user_id:userId});
  if (error) { console.error(error); toast(`Não consegui iniciar a DM: ${error.message}. Confira o SQL de DMs.`, 'error'); return; }
  await loadConversations();
  const id = typeof data === 'string' ? data : data?.conversation_id || data?.id;
  if (id) await openConversation(id);
  ['#dmSearchResults','#dmMobileSearchResults'].forEach(s=>{const results=$(s);if(results)results.innerHTML='';});
}
async function openConversation(id, refreshList = true) {
  const conversation = state.conversations.find(c=>c.id===id) || state.activeConversation;
  if (!conversation || !id) return;
  state.activeConversation = conversation;
  $('.app-shell')?.classList.add('mobile-chat-open');
  if (state.dmRealtime) { await supabase.removeChannel(state.dmRealtime); state.dmRealtime = null; }
  const panel = $('#dmChatPanel'); if (!panel) return;
  panel.innerHTML = `<header class="dm-chat-head"><button type="button" class="dm-mobile-back" data-dm-back aria-label="Voltar para conversas"><span class="material-symbols-rounded">arrow_back</span></button>${avatarMarkup(conversation.otherUser.display_name||conversation.otherUser.username||'?',conversation.otherUser.avatar_url,'dm-avatar')}<div class="dm-head-identity"><strong>${escapeHTML(conversation.otherUser.display_name||conversation.otherUser.username||'Pessoa LUMI')} ${accountBadges(conversation.otherUser.id,conversation.otherUser.vip_purchased)}</strong><small>@${escapeHTML(conversation.otherUser.username||'lumi-user')}</small></div><div class="dm-call-actions"><button class="icon-button" type="button" data-share-contact title="Compartilhar cartão de contato" aria-label="Compartilhar cartão de contato"><span class="material-symbols-rounded">contact_page</span></button><button class="icon-button" type="button" data-block-user="${conversation.otherUser.id}" title="Bloquear ou desbloquear pessoa" aria-label="Bloquear ou desbloquear pessoa"><span class="material-symbols-rounded">block</span></button><button class="icon-button dm-call-button" type="button" data-call="audio" title="Ligar por voz" aria-label="Ligar por voz"><span class="material-symbols-rounded">call</span></button><button class="icon-button dm-call-button" type="button" data-call="video" title="Ligar por vídeo" aria-label="Ligar por vídeo"><span class="material-symbols-rounded">videocam</span></button></div></header><div id="dmCallStage" class="dm-call-stage" hidden><div class="dm-call-participants">
  <div class="dm-call-person-card" id="dmRemotePerson">
    <div class="dm-call-person-avatar" id="dmRemoteAvatar"></div>
    <video id="dmRemoteVideo" autoplay playsinline></video>
    <div class="dm-call-person-name" id="dmRemoteName"></div>
  </div>
  <div class="dm-call-person-card" id="dmLocalPerson">
    <div class="dm-call-person-avatar" id="dmLocalAvatar"></div>
    <video id="dmLocalVideo" autoplay playsinline muted></video>
    <div class="dm-call-person-name" id="dmLocalName"></div>
  </div>
</div><div class="dm-call-voice-presence"><span id="dmRemoteSpeaking" class="dm-speaking-chip"><span class="material-symbols-rounded">graphic_eq</span><span data-speaking-label>Ouvindo</span></span><span id="dmLocalSpeaking" class="dm-speaking-chip"><span class="material-symbols-rounded">mic</span><span data-speaking-label>Microfone ligado</span></span></div><div class="dm-call-status" id="dmCallStatus">Preparando chamada…</div><div class="dm-call-controls"><button type="button" class="icon-button" data-call-control="mute" title="Microfone"><span class="material-symbols-rounded">mic</span></button><button type="button" class="icon-button" data-call-control="camera" title="Câmera"><span class="material-symbols-rounded">videocam</span></button><button type="button" class="icon-button" data-call-control="screen" title="Compartilhar tela"><span class="material-symbols-rounded">screen_share</span></button><button type="button" class="icon-button dm-hangup" data-call-control="hangup" title="Encerrar chamada"><span class="material-symbols-rounded">call_end</span></button></div></div><div id="dmMessageList" class="dm-message-list"><div class="dm-search-loading">Carregando mensagens…</div></div><form id="dmMessageForm" class="dm-composer"><input id="dmFileInput" type="file" class="visually-hidden-file"><button class="dm-attach-button" type="button" id="dmAttachButton" title="Anexar arquivo" aria-label="Anexar arquivo"><span class="material-symbols-rounded">attach_file</span></button><button class="dm-attach-button" type="button" id="dmRecordAudio" title="Gravar mensagem de áudio" aria-label="Gravar mensagem de áudio"><span class="material-symbols-rounded">mic</span></button><textarea id="dmMessageInput" maxlength="4000" rows="1" placeholder="Mensagem para ${escapeHTML(conversation.otherUser.display_name||conversation.otherUser.username||'essa pessoa')}…" aria-label="Mensagem direta"></textarea><button class="send-button" type="submit" title="Enviar"><span class="material-symbols-rounded">send</span></button></form><div class="dm-attachment-hint">Arquivos de até 20 MB · imagens, documentos, áudio e outros arquivos</div>`;
  if (refreshList) renderConversationList();
  const {data,error} = await supabase.from('direct_messages').select('id,conversation_id,sender_id,content,attachment_path,attachment_name,attachment_type,attachment_size,created_at,profiles(display_name,username,avatar_url,vip_purchased)').eq('conversation_id',id).order('created_at',{ascending:true}).limit(150);
  if (error) { console.error(error); $('#dmMessageList').innerHTML=`<div class="dm-empty-small">Não consegui carregar as mensagens: ${escapeHTML(error.message)}</div>`; return; }
  state.dmMessages = await signDMFileUrls(data||[]); renderDMMessages();
  state.dmRealtime = supabase.channel(`lumi-dm-${id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages',filter:`conversation_id=eq.${id}`},async payload=>{
    if (state.dmMessages.some(m=>m.id===payload.new.id)) return;
    const {data:msg} = await supabase.from('direct_messages').select('id,conversation_id,sender_id,content,attachment_path,attachment_name,attachment_type,attachment_size,created_at,profiles(display_name,username,avatar_url,vip_purchased)').eq('id',payload.new.id).maybeSingle();
    if (msg && state.activeConversation?.id===id) { state.dmMessages.push(...await signDMFileUrls([msg])); renderDMMessages(); if(msg.sender_id!==state.user?.id&&document.hidden&&'Notification' in window&&Notification.permission==='granted'){try{const n=new Notification(msg.profiles?.display_name||'Nova mensagem no LUMI',{body:msg.content||'Enviou um arquivo'});n.onclick=()=>window.focus();}catch{}} }
  }).subscribe();
}
// Chamadas WebRTC (voz/vídeo) com sinalização pelo Supabase.
function ensureCallSignalSubscription() {
  if (!state.user || state.callRealtime) return;
  state.callRealtime = supabase.channel(`lumi-call-signals-${state.user.id}`)
    .on('postgres_changes', {event:'INSERT', schema:'public', table:'call_signals', filter:`recipient_id=eq.${state.user.id}`}, payload => handleCallSignal(payload.new))
    .subscribe(status => { if (status === 'CHANNEL_ERROR') console.warn('Canal de chamadas indisponível. Confira o SQL de chamadas.'); });
}
async function sendCallSignal(recipientId, conversationId, type, payload={}) {
  const {error} = await supabase.from('call_signals').insert({conversation_id:conversationId, sender_id:state.user.id, recipient_id:recipientId, signal_type:type, payload});
  if (error) throw error;
  if (type === 'offer') {
    const {error: pushError} = await supabase.functions.invoke('send-call-push', {
      body: { recipient_id: recipientId, conversation_id: conversationId, mode: payload.mode || 'audio' }
    });
    if (pushError) console.warn('Notificação push de chamada não enviada:', pushError.message);
  }
}
function callStatus(text) { const el=$('#dmCallStatus'); if(el) el.textContent=text; }
function ensureCallAvatarStyles() {
  if ($('#lumiCallAvatarStyles')) return;

  const style = document.createElement('style');
  style.id = 'lumiCallAvatarStyles';
  style.textContent = `
    #dmCallStage .dm-call-participants {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      width: 100%;
      padding: 12px 0;
      box-sizing: border-box;
    }

    #dmCallStage .dm-call-person-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      min-width: 0;
      min-height: 205px;
      overflow: hidden;
      box-sizing: border-box;
      border: 1px solid var(--line, rgba(255,255,255,.14));
      border-radius: 22px;
      background: radial-gradient(ellipse at center,
        rgba(255,216,61,.15), rgba(28,29,34,.98) 72%);
    }

    #dmCallStage .dm-call-person-avatar {
      position: relative;
      z-index: 2;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: clamp(68px, 10vw, 100px);
      height: clamp(68px, 10vw, 100px);
      overflow: hidden;
      border: 3px solid var(--yellow, #ffd83d);
      border-radius: 50%;
      background: linear-gradient(135deg, #43434a, #222229);
      color: white;
      font-size: 27px;
      font-weight: 800;
      box-shadow: 0 8px 26px rgba(0,0,0,.28);
      transition: opacity .2s, transform .2s;
    }

    #dmCallStage .dm-call-person-avatar img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    #dmCallStage .dm-call-person-card video {
      position: absolute;
      z-index: 1;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      background: #18181d;
      transition: opacity .2s;
    }

    #dmCallStage .dm-call-person-card.has-video video {
      opacity: 1;
    }

    #dmCallStage .dm-call-person-card.has-video .dm-call-person-avatar {
      opacity: 0;
      transform: scale(.94);
    }

    #dmCallStage .dm-call-person-name {
      position: relative;
      z-index: 3;
      max-width: calc(100% - 20px);
      overflow: hidden;
      color: var(--text, #fff);
      font-size: 13px;
      font-weight: 650;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #dmCallStage .dm-call-person-card.has-video .dm-call-person-name {
      position: absolute;
      right: 10px;
      bottom: 10px;
      left: 10px;
      max-width: none;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(12,12,15,.72);
      color: #fff;
    }

    @media (max-width: 420px) {
      #dmCallStage .dm-call-participants { gap: 8px; }
      #dmCallStage .dm-call-person-card {
        min-height: 155px;
        border-radius: 17px;
      }
      #dmCallStage .dm-call-person-avatar {
        width: 68px;
        height: 68px;
        font-size: 22px;
      }
    }
  `;
  document.head.appendChild(style);
}

function callInitials(name) {
  return String(name || '?').trim().split(/\\s+/)
    .filter(Boolean).slice(0, 2)
    .map(part => Array.from(part)[0] || '')
    .join('').toUpperCase() || '?';
}

function setCallAvatar(element, name, url) {
  if (!element) return;
  element.replaceChildren();

  const safeUrl = typeof url === 'string' ? url.trim() : '';
  if (safeUrl && /^https?:\/\/\S+$/i.test(safeUrl)) {
    const img = document.createElement('img');
    img.src = safeUrl;
    img.alt = name || 'Foto de perfil';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => {
      img.remove();
      element.textContent = callInitials(name);
    };
    element.appendChild(img);
  } else {
    element.textContent = callInitials(name);
  }
}

function renderCallParticipants() {
  const other = state.activeConversation?.otherUser || {};
  const remoteName = other.display_name || other.username || 'Seu contato';
  const localName = state.profile?.display_name
    || state.user?.email?.split('@')[0] || 'Você';

  const remoteLabel = $('#dmRemoteName');
  const localLabel = $('#dmLocalName');
  if (remoteLabel) remoteLabel.textContent = remoteName;
  if (localLabel) localLabel.textContent = localName;

  setCallAvatar(
    $('#dmRemoteAvatar'), remoteName,
    other.avatar_url || other.avatar || other.photo_url || other.picture || ''
  );

  setCallAvatar(
    $('#dmLocalAvatar'), localName,
    state.profile?.avatar_url || state.profile?.avatar
      || state.profile?.photo_url || state.profile?.picture || ''
  );
}

function updateCallVideoCards() {
  const videoMode = state.callMode === 'video';
  const localVideo = $('#dmLocalVideo');
  const remoteVideo = $('#dmRemoteVideo');

  const localTrack = state.callLocalStream?.getVideoTracks()
    .some(track => track.enabled && track.readyState === 'live');

  const remoteTrack = state.callRemoteStream?.getVideoTracks()
    .some(track => track.enabled && track.readyState === 'live');

  $('#dmLocalPerson')?.classList.toggle(
    'has-video',
    Boolean(videoMode && localTrack && localVideo?.videoWidth > 0)
  );

  $('#dmRemotePerson')?.classList.toggle(
    'has-video',
    Boolean(videoMode && remoteTrack && remoteVideo?.videoWidth > 0)
  );
}

function showCallStage() {
  const stage = $('#dmCallStage');
  if (!stage) return;

  ensureCallAvatarStyles();
  renderCallParticipants();
  updateCallVideoCards();
  stage.hidden = false;
}
let dmVoiceMeter = { context: null, timer: null, local: null, remote: null };
function monitorDMCallVoice() {
  const local=state.callLocalStream, remote=state.callRemoteStream;
  if(!local && !remote)return;
  clearInterval(dmVoiceMeter.timer); dmVoiceMeter.context?.close().catch(()=>{});
  dmVoiceMeter={context:null,timer:null,local,remote};
  try { const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;const ctx=dmVoiceMeter.context=new Ctx();const meters=[];for(const [key,stream] of [['local',local],['remote',remote]])if(stream?.getAudioTracks().length){const analyser=ctx.createAnalyser();analyser.fftSize=512;ctx.createMediaStreamSource(stream).connect(analyser);meters.push({key,analyser,samples:new Uint8Array(analyser.fftSize)});}dmVoiceMeter.timer=setInterval(()=>{for(const meter of meters){meter.analyser.getByteTimeDomainData(meter.samples);let sum=0;for(const n of meter.samples){const x=(n-128)/128;sum+=x*x;}const speaking=Math.sqrt(sum/meter.samples.length)>0.055;const node=document.getElementById(meter.key==='remote'?'dmRemoteSpeaking':'dmLocalSpeaking');if(node){node.classList.toggle('is-speaking',speaking);const label=node.querySelector('[data-speaking-label]');if(label)label.textContent=speaking?'Falando agora':(meter.key==='remote'?'Ouvindo':'Microfone ligado');}}},130); } catch(error){console.debug('Medidor de voz da chamada indisponível',error);}
}
function attachCallMedia() {
  const local = $('#dmLocalVideo');
  const remote = $('#dmRemoteVideo');

  if (local && state.callLocalStream) {
    if (local.srcObject !== state.callLocalStream) local.srcObject = state.callLocalStream;
    local.classList.toggle('audio-only', state.callMode === 'audio');
    local.onloadedmetadata = updateCallVideoCards;
    local.onplaying = updateCallVideoCards;
  }

  if (remote && state.callRemoteStream) {
    if (remote.srcObject !== state.callRemoteStream) remote.srcObject = state.callRemoteStream;
    remote.classList.toggle('audio-only', state.callMode === 'audio');
    remote.onloadedmetadata = updateCallVideoCards;
    remote.onplaying = updateCallVideoCards;
  }

  updateCallVideoCards();
  monitorDMCallVoice();
}
async function createCallPeer(recipientId, conversationId, mode) {
  state.callPeerId=recipientId; state.callConversationId=conversationId; state.callMode=mode; state.callSeenSignals=new Set(); state.pendingIceSignals=[];
  state.callRemoteStream=new MediaStream();
  state.callPC=new RTCPeerConnection({iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}]});
  state.callPC.ontrack=e=>{ e.streams[0]?.getTracks().forEach(t=>{if(!state.callRemoteStream.getTracks().some(x=>x.id===t.id))state.callRemoteStream.addTrack(t);}); attachCallMedia(); };
  state.callPC.onicecandidate=e=>{ if(e.candidate && state.callPeerId && state.callConversationId) sendCallSignal(state.callPeerId,state.callConversationId,'ice',e.candidate.toJSON()).catch(err=>console.warn('ICE:',err.message)); };
  state.callPC.onconnectionstatechange=()=>{const status=state.callPC?.connectionState;if(status==='connected')stopLumiCallTone();if(status==='failed')stopLumiCallTone();if(status==='connected')callStatus(state.callMode==='video'?'Chamada de vídeo conectada':'Chamada de voz conectada');else if(status==='failed')callStatus('A conexão falhou. Tente novamente ou use a mesma rede.');else if(status==='disconnected')callStatus('Reconectando…');};
  state.callLocalStream=await navigator.mediaDevices.getUserMedia({audio:true,video:mode==='video'});
  state.callLocalStream.getTracks().forEach(track=>state.callPC.addTrack(track,state.callLocalStream));
  attachCallMedia(); showCallStage();
}

async function isUserBlocked(userId) {
  if(!state.user||!userId)return false;
  const {data,error}=await supabase.from('user_blocks').select('blocked_id').eq('blocker_id',state.user.id).eq('blocked_id',userId).maybeSingle();
  if(error){if(!error.message?.toLowerCase().includes('does not exist'))console.warn('Verificação de bloqueio:',error.message);return false;}
  return Boolean(data);
}
async function toggleBlockUser(userId) {
  if(!requireAuth()||!userId||userId===state.user.id)return;
  const blocked=await isUserBlocked(userId);
  if(blocked){
    const {error}=await supabase.from('user_blocks').delete().eq('blocker_id',state.user.id).eq('blocked_id',userId);
    if(error){toast('Não consegui desbloquear. Execute database/lumi-feature-pack.sql no Supabase.','error');return;}
    toast('Pessoa desbloqueada.','success');
  } else {
    const {error}=await supabase.from('user_blocks').insert({blocker_id:state.user.id,blocked_id:userId});
    if(error){toast('Não consegui bloquear. Execute database/lumi-feature-pack.sql no Supabase.','error');return;}
    toast('Pessoa bloqueada.','success');
  }
  const button=$('[data-block-user]');
  if(button){button.title=blocked?'Bloquear pessoa':'Desbloquear pessoa';button.querySelector('.material-symbols-rounded').textContent=blocked?'block':'person_check';}
}
async function shareContactCard() {
  if(!state.activeConversation||!state.user)return;
  const p=state.profile||{};
  const content='LUMI_CONTACT:'+JSON.stringify({name:p.display_name||state.user.email?.split('@')[0]||'Pessoa LUMI',username:p.username||'',bio:p.bio||''});
  const {error}=await supabase.from('direct_messages').insert({conversation_id:state.activeConversation.id,sender_id:state.user.id,content});
  if(error){toast('Não consegui compartilhar o contato: '+error.message,'error');return;}
  toast('Cartão de contato enviado!','success');
}
async function recordDMVoice() {
  if(!requireAuth()||!state.activeConversation)return;
  const button=$('#dmRecordAudio'), input=$('#dmFileInput');
  if(state.dmRecorder?.state==='recording'){state.dmRecorder.stop();return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Este navegador não suporta gravação de áudio.','error');return;}
  try {
    state.dmRecordStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
    state.dmRecordChunks=[];
    const mime=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
    state.dmRecorder=new MediaRecorder(state.dmRecordStream,mime?{mimeType:mime}:{});
    state.dmRecorder.ondataavailable=e=>{if(e.data?.size)state.dmRecordChunks.push(e.data);};
    state.dmRecorder.onstop=async()=>{
      const blob=new Blob(state.dmRecordChunks,{type:state.dmRecorder?.mimeType||'audio/webm'});
      state.dmRecordStream?.getTracks().forEach(t=>t.stop());state.dmRecordStream=null;
      if(button){button.classList.remove('recording');button.title='Gravar mensagem de áudio';button.querySelector('.material-symbols-rounded').textContent='mic';}
      if(blob.size>20*1024*1024){toast('O áudio passou de 20 MB. Grave uma mensagem menor.','error');return;}
      if(!blob.size)return;
      const ext=blob.type.includes('ogg')?'ogg':'webm';
      const file=new File([blob],'lumi-audio-'+Date.now()+'.'+ext,{type:blob.type||'audio/webm'});
      try{const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;sendDM({preventDefault(){}});}catch(error){toast('Não consegui preparar o áudio para envio.','error');}
    };
    state.dmRecorder.start();
    if(button){button.classList.add('recording');button.title='Parar e enviar áudio';button.querySelector('.material-symbols-rounded').textContent='stop';}
    toast('Gravando áudio… clique no microfone para parar.','success');
  }catch(error){state.dmRecordStream?.getTracks().forEach(t=>t.stop());state.dmRecordStream=null;toast('Não consegui acessar o microfone: '+error.message,'error');}
}


function scheduleCallRetry() {
  clearTimeout(state.callRetryTimer);
  state.callRetryTimer=setTimeout(async()=>{
    if(state.callStatus!=='calling'||!state.callPeerId||!state.activeConversation)return;
    if(getDoNotDisturb()){toast('Retorno automático cancelado: seu Não Perturbe está ativado.');await cleanupCall(false);return;}
    const targetId=state.callPeerId, mode=state.callMode;
    const {data:preferences,error}=await supabase.from('profiles').select('do_not_disturb').eq('id',targetId).maybeSingle();
    if(!error&&preferences?.do_not_disturb){toast('Retorno automático interrompido: a pessoa ativou Não Perturbe.','success');await cleanupCall(false);return;}
    if(await isUserBlocked(targetId)){await cleanupCall(false);toast('Retorno automático interrompido porque a pessoa foi bloqueada.');return;}
    await cleanupCall(false);
    if(state.activeConversation?.otherUser?.id===targetId)state.callRetryTimer=setTimeout(()=>{state.callRetryTimer=null;if(state.callStatus==='idle')startCall(mode);},250);
  },5000);
}

let lumiCallToneContext = null;
let lumiCallToneTimer = null;
let lumiCallToneOscillators = [];
let customCallToneUrl = null;
let customCallToneAudio = null;
let customCallTonePreview = null;

function lumiToneDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lumi-local-preferences', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('media')) request.result.createObjectStore('media');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function loadCustomCallTone() {
  try {
    const db = await lumiToneDB();
    const blob = await new Promise((resolve, reject) => {
      const request = db.transaction('media').objectStore('media').get('outgoing-call-tone');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    setCustomCallTone(blob);
  } catch (error) { console.warn('Não foi possível carregar o toque personalizado.', error); }
}
function setCustomCallTone(blob) {
  if (customCallToneUrl) URL.revokeObjectURL(customCallToneUrl);
  customCallToneUrl = blob ? URL.createObjectURL(blob) : null;
  const status = document.getElementById('callToneStatus');
  if (status) status.textContent = blob ? 'Toque personalizado salvo neste navegador.' : 'Toque padrão do LUMI';
}
async function chooseCustomCallTone(file) {
  if (!file) return;
  if (!file.type.startsWith('audio/')) { toast('Escolha um arquivo de áudio.', 'error'); return; }
  if (file.size > 8 * 1024 * 1024) { toast('O áudio precisa ter no máximo 8 MB.', 'error'); return; }
  try {
    const db = await lumiToneDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      tx.objectStore('media').put(file, 'outgoing-call-tone');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    setCustomCallTone(file);
    toast('Toque de chamada salvo!', 'success');
  } catch (error) { console.error(error); toast('Não consegui salvar o áudio neste navegador.', 'error'); }
}
function previewCustomCallTone() {
  if (!customCallToneUrl) { toast('Escolha um áudio primeiro.', 'error'); return; }
  if (customCallTonePreview) { customCallTonePreview.pause(); customCallTonePreview = null; }
  const audio = new Audio(customCallToneUrl);
  audio.volume = 0.85;
  customCallTonePreview = audio;
  audio.onended = () => { if (customCallTonePreview === audio) customCallTonePreview = null; };
  audio.play().catch(() => toast('Não consegui reproduzir esse áudio. Tente outro formato.', 'error'));
}
async function removeCustomCallTone() {
  try {
    const db = await lumiToneDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      tx.objectStore('media').delete('outgoing-call-tone');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    if (customCallToneAudio) customCallToneAudio.pause();
    if (customCallTonePreview) customCallTonePreview.pause();
    customCallToneAudio = customCallTonePreview = null;
    setCustomCallTone(null);
    toast('Toque padrão restaurado.', 'success');
  } catch (error) { console.error(error); toast('Não consegui remover o toque personalizado.', 'error'); }
}

function stopLumiCallTone() {
  if (lumiCallToneTimer) clearInterval(lumiCallToneTimer);
  lumiCallToneTimer = null;
  if (customCallToneAudio) { customCallToneAudio.pause(); try { customCallToneAudio.currentTime = 0; } catch {} customCallToneAudio = null; }
  for (const oscillator of lumiCallToneOscillators) {
    try { oscillator.stop(); } catch {}
  }
  lumiCallToneOscillators = [];
  if (lumiCallToneContext) {
    const context = lumiCallToneContext;
    lumiCallToneContext = null;
    context.close().catch(() => {});
  }
}

function playLumiCallTonePulse() {
  const context = lumiCallToneContext;
  if (!context || context.state === "closed") return;
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, context.currentTime);
    oscillator.frequency.setValueAtTime(480, context.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.04);
    gain.gain.setValueAtTime(0.055, context.currentTime + 0.36);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.44);
    lumiCallToneOscillators.push(oscillator);
    oscillator.onended = () => {
      lumiCallToneOscillators = lumiCallToneOscillators.filter(item => item !== oscillator);
      try { oscillator.disconnect(); gain.disconnect(); } catch {}
    };
  } catch (error) {
    console.warn("Não foi possível reproduzir o toque da chamada:", error);
    stopLumiCallTone();
  }
}

function startLumiCallTone() {
  stopLumiCallTone();
  if (customCallToneUrl) {
    const audio = new Audio(customCallToneUrl);
    audio.loop = true;
    audio.volume = 0.8;
    customCallToneAudio = audio;
    audio.play().catch(error => {
      console.warn('Toque personalizado bloqueado; usando o toque padrão.', error);
      if (customCallToneAudio === audio) customCallToneAudio = null;
      audio.pause();
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      try {
        lumiCallToneContext = new AudioContextClass();
        lumiCallToneContext.resume().catch(() => {});
        playLumiCallTonePulse();
        lumiCallToneTimer = setInterval(playLumiCallTonePulse, 1800);
      } catch (fallbackError) { console.warn(fallbackError); }
    });
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    lumiCallToneContext = new AudioContextClass();
    lumiCallToneContext.resume().catch(() => {});
    playLumiCallTonePulse();
    lumiCallToneTimer = setInterval(playLumiCallTonePulse, 1800);
  } catch (error) {
    console.warn("Não foi possível iniciar o toque da chamada:", error);
    stopLumiCallTone();
  }
}

async function startCall(mode) {
  if(!requireAuth())return;
  const conversation=state.activeConversation;
  if(!conversation){toast('Abra uma conversa antes de ligar.');return;}
  if(await isUserBlocked(conversation.otherUser.id)){toast('Você bloqueou essa pessoa. Desbloqueie para ligar.','error');return;}
  const {data:targetPrefs,error:prefError}=await supabase.from('profiles').select('do_not_disturb').eq('id',conversation.otherUser.id).maybeSingle();
  if(!prefError&&targetPrefs?.do_not_disturb){toast('Essa pessoa ativou Não Perturbe.','error');return;}
  if(!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection){toast('Este navegador não permite chamadas. Tente no Chrome/Firefox ou no app desktop atualizado.','error');return;}
  if(state.callStatus!=='idle'){toast('Já existe uma chamada ativa.');return;}
  ensureCallSignalSubscription();
  try {
    state.callStatus='calling'; startLumiCallTone(); await createCallPeer(conversation.otherUser.id,conversation.id,mode);
    callStatus(`Chamando ${conversation.otherUser.display_name||conversation.otherUser.username||'seu contato'}…`);
    const offer=await state.callPC.createOffer(); await state.callPC.setLocalDescription(offer);
    await sendCallSignal(state.callPeerId,state.callConversationId,'offer',{sdp:offer.sdp,mode,retryMessage:getCallRetryMessage()});
    scheduleCallRetry();
    toast(mode==='video'?'Ligação de vídeo iniciada.':'Ligação de voz iniciada.','success');
    await navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => stream.getTracks().forEach(track => track.stop()));
} catch(error) {
  console.error(error);

  toast(
    `Erro: ${error.name || 'Desconhecido'} — ${error.message || error}`,
    'error'
  );

  await cleanupCall(false); toast(`Não consegui iniciar a chamada: ${error.message||error}. Confira a permissão do microfone/câmera e execute o SQL de chamadas.`, 'error'); }
}
async function checkPendingIncomingCall() {
  if (!state.user || state.callStatus !== 'idle') return;
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const {data,error} = await supabase.from('call_signals').select('*')
    .eq('recipient_id',state.user.id).eq('signal_type','offer')
    .gte('created_at',since).order('created_at',{ascending:false}).limit(5);
  if(error||!data?.length)return;
  for(const offer of data){
    const {data:ended}=await supabase.from('call_signals').select('id')
      .eq('conversation_id',offer.conversation_id).eq('signal_type','end')
      .eq('sender_id',state.user.id).eq('recipient_id',offer.sender_id)
      .gt('created_at',offer.created_at).limit(1);
    if(!ended?.length){await handleCallSignal(offer);return;}
  }
}
async function handleCallSignal(signal) {
  if(!signal || signal.sender_id===state.user?.id)return;
  if(signal.signal_type==='ice' && state.pendingCallOffer?.conversation_id===signal.conversation_id && !state.callPC){state.pendingIceSignals.push(signal.payload);return;}
  if(signal.signal_type==='offer') {
    const blocked=await isUserBlocked(signal.sender_id);
    const {data:myPrefs}=await supabase.from('profiles').select('do_not_disturb').eq('id',state.user.id).maybeSingle();
    if(blocked||getDoNotDisturb()||myPrefs?.do_not_disturb){try{await sendCallSignal(signal.sender_id,signal.conversation_id,'end',{reason:blocked?'blocked':'do_not_disturb'});}catch{}return;}
    if(state.callStatus!=='idle') { try{await sendCallSignal(signal.sender_id,signal.conversation_id,'busy',{});}catch{} return; }
    if(!state.conversations.some(c=>c.id===signal.conversation_id)) await loadConversations();
    const conversation=state.conversations.find(c=>c.id===signal.conversation_id);
    if(!conversation || conversation.otherUser.id!==signal.sender_id) return;
    state.pendingCallOffer=signal;
    const caller=conversation.otherUser.display_name||conversation.otherUser.username||'Seu contato';
    showIncomingCall(caller,signal.payload?.mode==='video'?'video':'audio',signal.payload?.retryMessage||'');
    return;
  }
  if(signal.signal_type==='busy' && state.callPeerId===signal.sender_id){callStatus('A pessoa já está em outra chamada.');setTimeout(()=>cleanupCall(false),1800);return;}
  if(signal.conversation_id!==state.callConversationId || signal.sender_id!==state.callPeerId || !state.callPC)return;
  try {
    if(signal.signal_type==='answer' && state.callPC.signalingState==='have-local-offer') { clearTimeout(state.callRetryTimer); state.callRetryTimer=null; await state.callPC.setRemoteDescription(new RTCSessionDescription(signal.payload)); await flushPendingIce(); }
    else if(signal.signal_type==='ice' && signal.payload) { if(!state.callPC.remoteDescription){state.pendingIceSignals.push(signal.payload);}else{try{await state.callPC.addIceCandidate(new RTCIceCandidate(signal.payload));}catch(err){console.warn('Candidato ICE ignorado:',err.message);}} }
    else if(signal.signal_type==='end') await cleanupCall(false);
  } catch(error) { console.error(error); callStatus('Erro ao conectar a chamada.'); }
}
function showIncomingCall(name,mode,message='') {
  let layer=$('#lumiIncomingCall'); if(!layer){layer=document.createElement('div');layer.id='lumiIncomingCall';layer.className='lumi-incoming-call';document.body.append(layer);}
  layer.innerHTML=`<div class="lumi-incoming-card"><div class="lumi-incoming-icon"><span class="material-symbols-rounded">${mode==='video'?'videocam':'call'}</span></div><small>CHAMADA RECEBIDA</small><h3>${escapeHTML(name)}</h3><p>${mode==='video'?'está chamando por vídeo':'está chamando por voz'}</p>${message ? `<div class="lumi-call-custom-message">${escapeHTML(message)}</div>` : ''}<div class="lumi-incoming-actions"><button type="button" data-incoming-call="decline" class="dm-hangup"><span class="material-symbols-rounded">call_end</span> Recusar</button><button type="button" data-incoming-call="accept"><span class="material-symbols-rounded">call</span> Atender</button></div></div>`;
  layer.hidden=false;
  if(document.hidden&&'Notification' in window&&Notification.permission==='granted'){try{const n=new Notification('Chamada recebida no LUMI',{body:(name||'Seu contato')+' está chamando por '+(mode==='video'?'vídeo':'voz')+'.'});n.onclick=()=>window.focus();}catch{}}
}
async function acceptIncomingCall() {
  const offer=state.pendingCallOffer; if(!offer)return;
  const layer=$('#lumiIncomingCall'); if(layer)layer.hidden=true;
  const conversation=state.conversations.find(c=>c.id===offer.conversation_id); if(conversation){state.activeConversation=conversation; if(state.page!=='inbox')setPage('inbox'); await openConversation(conversation.id);}
  try {
    state.callStatus='connecting'; await createCallPeer(offer.sender_id,offer.conversation_id,offer.payload?.mode==='video'?'video':'audio');
    await state.callPC.setRemoteDescription(new RTCSessionDescription({type:'offer',sdp:offer.payload.sdp})); await flushPendingIce();
    const answer=await state.callPC.createAnswer(); await state.callPC.setLocalDescription(answer);
    await sendCallSignal(offer.sender_id,offer.conversation_id,'answer',{type:answer.type,sdp:answer.sdp});
    callStatus('Conectando…'); state.pendingCallOffer=null;
  } catch(error) { console.error(error); await cleanupCall(false); toast(`Não consegui atender: ${error.message||error}. Verifique as permissões e o SQL de chamadas.`, 'error'); }
}
async function flushPendingIce() {
  if(!state.callPC?.remoteDescription || !state.pendingIceSignals.length)return;
  const candidates=state.pendingIceSignals.splice(0);
  for(const candidate of candidates){try{await state.callPC.addIceCandidate(new RTCIceCandidate(candidate));}catch(error){console.warn('Candidato ICE pendente ignorado:',error.message);}}
}
async function declineIncomingCall() {
  const offer=state.pendingCallOffer; const layer=$('#lumiIncomingCall'); if(layer)layer.hidden=true;
  if(offer)try{await sendCallSignal(offer.sender_id,offer.conversation_id,'end',{});}catch{}
  state.pendingCallOffer=null;
}
async function cleanupCall(notifyPeer=true) {
  stopLumiCallTone();
  clearTimeout(state.callRetryTimer);state.callRetryTimer=null;
  if(notifyPeer && state.callPeerId && state.callConversationId)try{await sendCallSignal(state.callPeerId,state.callConversationId,'end',{});}catch{}
  if(state.callPC){state.callPC.onicecandidate=null;state.callPC.ontrack=null;state.callPC.close();}
  state.callScreenStream?.getTracks().forEach(t=>t.stop()); state.callScreenStream=null;
  state.callLocalStream?.getTracks().forEach(t=>t.stop()); state.callRemoteStream?.getTracks().forEach(t=>t.stop());
  clearInterval(dmVoiceMeter.timer); dmVoiceMeter.context?.close().catch(()=>{}); dmVoiceMeter={context:null,timer:null,local:null,remote:null};
  state.callPC=null;state.callLocalStream=null;state.callRemoteStream=null;state.callPeerId=null;state.callConversationId=null;state.callStatus='idle';state.pendingIceSignals=[];state.callMuted=false;state.callVideoEnabled=true;state.pendingCallOffer=null;
  const stage=$('#dmCallStage'); if(stage)stage.hidden=true;
  const local=$('#dmLocalVideo'),remote=$('#dmRemoteVideo');if(local)local.srcObject=null;if(remote)remote.srcObject=null;
  const layer=$('#lumiIncomingCall');if(layer)layer.hidden=true;
}
async function toggleCallControl(control) {
  if(control==='hangup'){await cleanupCall(true);return;}
  if(control==='screen'){
    if(state.callScreenStream){state.callScreenStream.getTracks().forEach(t=>t.stop());state.callScreenStream=null;const sender=state.callPC?.getSenders().find(s=>s.track?.kind==='video');const camera=state.callLocalStream?.getVideoTracks()[0];if(sender&&camera)await sender.replaceTrack(camera).catch(()=>{});return;}
    if(state.callMode!=='video'){toast('Compartilhamento de tela precisa de uma chamada de vídeo ativa.','error');return;}
    if(!navigator.mediaDevices?.getDisplayMedia){toast('Este navegador não oferece compartilhamento de tela.','error');return;}
    try{const stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});const track=stream.getVideoTracks()[0];const sender=state.callPC?.getSenders().find(s=>s.track?.kind==='video');if(!sender){stream.getTracks().forEach(t=>t.stop());toast('Não encontrei a faixa de vídeo da chamada.','error');return;}state.callScreenStream=stream;await sender.replaceTrack(track);track.onended=async()=>{if(state.callScreenStream){state.callScreenStream=null;const camera=state.callLocalStream?.getVideoTracks()[0];if(camera)await sender.replaceTrack(camera).catch(()=>{});}};toast('Compartilhamento de tela ativado.','success');}catch(error){if(error.name!=='NotAllowedError')toast('Não consegui compartilhar a tela: '+error.message,'error');}return;
  }
  if(control==='mute' && state.callLocalStream){state.callMuted=!state.callMuted;state.callLocalStream.getAudioTracks().forEach(t=>t.enabled=!state.callMuted);const b=$('[data-call-control="mute"]');if(b){b.classList.toggle('is-off',state.callMuted);b.querySelector('.material-symbols-rounded').textContent=state.callMuted?'mic_off':'mic';}}
  if(control==='camera' && state.callLocalStream){const tracks=state.callLocalStream.getVideoTracks();if(!tracks.length){toast('Esta chamada é só por voz.','');return;}state.callVideoEnabled=!state.callVideoEnabled;tracks.forEach(t=>t.enabled=state.callVideoEnabled);const b=$('[data-call-control="camera"]');if(b){b.classList.toggle('is-off',!state.callVideoEnabled);b.querySelector('.material-symbols-rounded').textContent=state.callVideoEnabled?'videocam':'videocam_off';}}
}

async function signDMFileUrls(messages) {
  return Promise.all(messages.map(async m=>{
    if (m.attachment_path) { const {data,error}=await supabase.storage.from('dm-attachments').createSignedUrl(m.attachment_path,3600); m.attachment_url=error?null:data?.signedUrl||null; }
    return m;
  }));
}
function formatFileSize(bytes=0) { if(bytes<1024)return `${bytes} B`; if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`; return `${(bytes/1024/1024).toFixed(1)} MB`; }
function dmMessagesHTML() {
  if (!state.dmMessages.length) return '<div class="dm-empty-state"><div class="chat-empty-icon">✦</div><strong>Essa conversa começou agora</strong><p>Mande uma mensagem ou compartilhe um arquivo.</p></div>';
  return state.dmMessages.map(m => {
    const name = m.profiles?.display_name || (m.sender_id === state.user.id ? state.profile?.display_name : state.activeConversation?.otherUser?.display_name) || 'Pessoa LUMI';
    let contactCard = '';
    if (m.content?.startsWith('LUMI_CONTACT:')) {
      try {
        const card = JSON.parse(m.content.slice('LUMI_CONTACT:'.length));
        contactCard = '<div class="lumi-contact-card"><div class="lumi-contact-icon">' + escapeHTML(initials(card.name || 'LUMI')) + '</div><div class="lumi-contact-details"><strong>' + escapeHTML(card.name || 'Contato LUMI') + '</strong><small>@' + escapeHTML(card.username || 'lumi-user') + '</small>' + (card.bio ? '<p>' + escapeHTML(card.bio) + '</p>' : '') + '<button type="button" class="lumi-contact-copy" data-copy-contact="' + escapeHTML(card.username || '') + '" ' + (card.username ? '' : 'disabled') + '>Copiar usuário</button></div></div>';
      } catch {}
    }
    const image = m.attachment_type?.startsWith('image/') && m.attachment_url ? '<a class="dm-image-link" href="' + escapeHTML(m.attachment_url) + '" target="_blank" rel="noopener noreferrer"><img src="' + escapeHTML(m.attachment_url) + '" alt="' + escapeHTML(m.attachment_name || 'Imagem compartilhada') + '"></a>' : '';
    const audio = m.attachment_type?.startsWith('audio/') && m.attachment_url ? '<audio class="dm-audio-player" controls preload="metadata" src="' + escapeHTML(m.attachment_url) + '"></audio>' : '';
    const attachment = m.attachment_name ? '<div class="dm-file-card"><span class="dm-file-icon">' + (m.attachment_type?.startsWith('image/') ? '▧' : m.attachment_type?.startsWith('audio/') ? 'mic' : '↧') + '</span><div><strong>' + escapeHTML(m.attachment_name) + '</strong><small>' + formatFileSize(m.attachment_size) + '</small></div>' + (m.attachment_url ? '<a href="' + escapeHTML(m.attachment_url) + '" target="_blank" rel="noopener noreferrer" download="' + escapeHTML(m.attachment_name) + '">Abrir</a>' : '<span class="dm-file-unavailable">Indisponível</span>') + '</div>' : '';
    return '<article class="dm-message-item ' + (m.sender_id === state.user.id ? 'mine' : '') + '">' + avatarMarkup(name, m.profiles?.avatar_url, 'dm-avatar') + '<div class="dm-message-body"><div class="dm-message-meta"><strong>' + escapeHTML(name) + '</strong>' + accountBadges(m.sender_id,m.profiles?.vip_purchased) + '<time>' + shortDate(m.created_at) + '</time></div>' + (m.content && !contactCard ? '<div class="dm-message-text">' + escapeHTML(m.content) + '</div>' : '') + contactCard + image + audio + attachment + '</div></article>';
  }).join('');
}
function renderDMMessages() { const list=$('#dmMessageList'); if(!list)return; const nearBottom=list.scrollHeight-list.scrollTop-list.clientHeight<120; list.innerHTML=dmMessagesHTML(); if(nearBottom)list.scrollTop=list.scrollHeight; }
async function sendDM(event) {
  event.preventDefault(); if(!requireAuth()||!state.activeConversation)return;
  if(await isUserBlocked(state.activeConversation.otherUser.id)){toast('Você bloqueou essa pessoa. Desbloqueie para enviar mensagens.','error');return;}
  const input=$('#dmMessageInput'); const fileInput=$('#dmFileInput'); const content=input.value.trim(); const file=fileInput.files?.[0]; if(!content&&!file)return;
  if(file && file.size>20*1024*1024){toast('O arquivo precisa ter no máximo 20 MB.','error');return;}
  const submit=$('#dmMessageForm button[type="submit"]'); if(submit)submit.disabled=true;
  let attachment_path=null;
  if(file){ const safeName=file.name.replace(/[^\p{L}\p{N}._ -]/gu,'_').slice(-120)||'arquivo'; attachment_path=`${state.activeConversation.id}/${state.user.id}/${crypto.randomUUID()}-${safeName}`; const {error:uploadError}=await supabase.storage.from('dm-attachments').upload(attachment_path,file,{contentType:file.type||'application/octet-stream',upsert:false}); if(uploadError){if(submit)submit.disabled=false;toast(`Não consegui enviar o arquivo: ${uploadError.message}. Confira o SQL de anexos.`, 'error');return;} }
  const payload={conversation_id:state.activeConversation.id,sender_id:state.user.id,content,attachment_path,attachment_name:file?.name||null,attachment_type:file?.type||null,attachment_size:file?.size||null};
  const {data,error}=await supabase.from('direct_messages').insert(payload).select('id,conversation_id,sender_id,content,attachment_path,attachment_name,attachment_type,attachment_size,created_at,profiles(display_name,username,avatar_url,vip_purchased)').single();
  if(submit)submit.disabled=false;
  if(error){console.error(error);toast(`Não consegui enviar: ${error.message}`,'error');return;}
  state.dmMessages.push(...await signDMFileUrls([data])); input.value='';fileInput.value='';renderDMMessages();input.focus();
}

function applyTheme(theme) {
  const selected = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = selected;
  document.documentElement.style.colorScheme = selected;
  try { localStorage.setItem('lumi-theme', selected); } catch {}
}
function getDoNotDisturb() {
  try { return localStorage.getItem('lumi-do-not-disturb') === 'true'; } catch { return false; }
}
function getCallRetryMessage() {
  try { return (localStorage.getItem('lumi-call-retry-message') || '').trim().slice(0,160); } catch { return ''; }
}
async function setDoNotDisturb(enabled) {
  const next = Boolean(enabled);
  const previous = getDoNotDisturb();
  try { localStorage.setItem('lumi-do-not-disturb', String(next)); } catch {}
  document.documentElement.dataset.doNotDisturb = String(next);
  if (!state.user) return true;
  const { error } = await supabase.from('profiles').update({ do_not_disturb: next }).eq('id', state.user.id);
  if (error) {
    try { localStorage.setItem('lumi-do-not-disturb', String(previous)); } catch {}
    document.documentElement.dataset.doNotDisturb = String(previous);
    if (state.profile) state.profile.do_not_disturb = previous;
    console.error('Não Perturbe não sincronizado:', error.message);
    toast('Não consegui salvar Não Perturbe na conta. Confira sua conexão e tente novamente.', 'error');
    return false;
  }
  if (state.profile) state.profile.do_not_disturb = next;
  return true;
}
function applyAccent(accent) {
  const allowed = state.profile?.vip_purchased ? ['yellow','blue','green','purple'] : ['yellow'];
  const selected = allowed.includes(accent) ? accent : 'yellow';
  document.documentElement.dataset.accent = selected;
  try { localStorage.setItem('lumi-accent', selected); } catch {}
}
function renderSettings() {
  $('.main-panel').classList.remove('workspace-mode');
  $('.app-shell').classList.remove('workspace-mode','inbox-mode','mobile-chat-open');
  $('#crumbParent').textContent='LUMI'; $('#crumbCurrent').textContent='Configurações';
  const theme = document.documentElement.dataset.theme || 'light';
  const accent = document.documentElement.dataset.accent || 'yellow';
  const dnd = getDoNotDisturb();
  const retryMessage = getCallRetryMessage();
  const isVip = Boolean(state.profile?.vip_purchased);
  $('#pageContent').innerHTML = `
    <section class="page-placeholder settings-page">
      <div class="eyebrow">DO SEU JEITO</div><h1>Configurações</h1>
      <p>Personalize sua experiência e cuide da sua conta.</p>
      <section class="settings-card"><div class="settings-card-icon material-symbols-rounded">keyboard</div><div class="settings-card-content"><h2>Envio de mensagens</h2><p>Escolha como enviar mensagens nos Espaços e nas conversas diretas.</p><label class="settings-toggle"><input id="lumiEnterToSend" type="checkbox" ${localStorage.getItem('lumi-enter-to-send') !== 'false' ? 'checked' : ''}><span class="settings-toggle-track"></span><span><strong>Enter envia a mensagem</strong><small>Ativado: Enter envia e Shift + Enter quebra a linha. Desativado: Enter quebra a linha e Ctrl + Enter envia.</small></span></label></div></section>
      <section class="settings-card"><div class="settings-card-icon material-symbols-rounded">palette</div><div class="settings-card-content"><h2>Aparência</h2><p>Escolha como o LUMI aparece neste navegador.</p><label class="field-label" for="lumiTheme">Tema</label><select class="form-input" id="lumiTheme"><option value="light" ${theme==='light'?'selected':''}>Claro</option><option value="dark" ${theme==='dark'?'selected':''}>Escuro</option></select></div></section>
      <section class="settings-card"><div class="settings-card-icon material-symbols-rounded">color_lens</div><div class="settings-card-content"><h2>Identidade visual</h2><p>${isVip ? 'Como membro LUMI INFINITY, você pode escolher uma cor exclusiva.' : 'O amarelo é a identidade oficial do LUMI. As outras paletas são exclusivas do LUMI INFINITY.'}</p><label class="field-label" for="lumiAccent">Cor de destaque</label><select class="form-input" id="lumiAccent"><option value="yellow" ${accent==='yellow'?'selected':''}>Amarelo LUMI</option><option value="blue" ${isVip?'':'disabled'} ${accent==='blue'?'selected':''}>Azul${isVip?'':' — INFINITY'}</option><option value="green" ${isVip?'':'disabled'} ${accent==='green'?'selected':''}>Verde${isVip?'':' — INFINITY'}</option><option value="purple" ${isVip?'':'disabled'} ${accent==='purple'?'selected':''}>Roxo${isVip?'':' — INFINITY'}</option></select></div></section>
      <section class="settings-card"><div class="settings-card-icon material-symbols-rounded">notifications_off</div><div class="settings-card-content"><h2>Não Perturbe</h2><p>Quando ativado, o LUMI recusa chamadas recebidas e interrompe retornos automáticos. Você pode desativá-lo quando quiser.</p><label class="settings-toggle"><input id="lumiDnd" type="checkbox" ${dnd?'checked':''}><span class="settings-toggle-track"></span><span><strong>Ativar Não Perturbe</strong><small>Preferência salva neste navegador.</small></span></label></div></section>
      <section class="settings-card"><div class="settings-card-icon material-symbols-rounded">music_note</div><div class="settings-card-content"><h2>Toque de chamada</h2><p>Escolha um áudio para tocar enquanto você liga. O arquivo fica salvo neste navegador.</p><input id="lumiCallToneFile" type="file" accept="audio/*" hidden><div class="settings-inline-actions"><button class="secondary-button" id="chooseCallTone" type="button">Escolher áudio</button><button class="secondary-button" id="previewCallTone" type="button">Ouvir toque</button><button class="text-button" id="removeCallTone" type="button">Usar toque padrão</button></div><small class="settings-help" id="callToneStatus">Toque padrão do LUMI</small></div></section>
      <section class="settings-card"><div class="settings-card-icon material-symbols-rounded">chat</div><div class="settings-card-content"><h2>Mensagem nas chamadas</h2><p>Escreva uma mensagem curta que aparecerá para a pessoa quando você ligar. Ela será reutilizada nas tentativas automáticas.</p><label class="field-label" for="lumiCallRetryMessage">Mensagem (opcional)</label><input class="form-input" id="lumiCallRetryMessage" maxlength="160" value="${escapeHTML(retryMessage)}" placeholder="Ex.: Opa, me atende quando puder!"><small class="settings-help">Até 160 caracteres. Salva neste navegador.</small></div></section>
      <section class="settings-card lumi-infinity-card"><div class="settings-card-icon material-symbols-rounded">workspace_premium</div><div class="settings-card-content"><div class="lumi-infinity-eyebrow">EDIÇÃO ESPECIAL</div><h2>LUMI INFINITY</h2><p>Um pagamento único de <strong>R$ 10,00</strong>. Sem assinatura, mensalidade ou renovação automática.</p><ul class="lumi-infinity-perks"><li><span class="material-symbols-rounded">palette</span><span><strong>Paletas exclusivas</strong><small>Azul, verde e roxo para personalizar sua experiência.</small></span></li><li><span class="material-symbols-rounded">auto_awesome</span><span><strong>Mais identidade</strong><small>Novos detalhes de personalização planejados para o INFINITY.</small></span></li></ul><p>${isVip ? "Seu perfil já tem LUMI INFINITY ativado." : "A compra ainda não está disponível: estamos preparando um checkout seguro."}</p><button class="secondary-button" type="button" disabled>${isVip ? "INFINITY ativado" : "Compra em breve"}</button></div></section>
      <section class="settings-card"><div class="settings-card-icon material-symbols-rounded">person_off</div><div class="settings-card-content"><h2>Pessoas bloqueadas</h2><p>Veja quem você bloqueou e desbloqueie alguém quando quiser voltar a conversar.</p><div id="lumiBlockedUsers" class="lumi-blocked-users"><p class="settings-help">Carregando lista…</p></div></div></section>
      <section class="settings-card"><div class="settings-card-icon material-symbols-rounded">lock</div><div class="settings-card-content"><h2>Alterar senha</h2><p>Confirme sua senha atual antes de escolher uma nova.</p><form id="passwordChangeForm"><label class="field-label" for="currentPassword">Senha atual</label><input class="form-input" id="currentPassword" type="password" autocomplete="current-password" required><label class="field-label" for="newPassword">Nova senha</label><input class="form-input" id="newPassword" type="password" minlength="6" autocomplete="new-password" required><label class="field-label" for="confirmPassword">Confirmar nova senha</label><input class="form-input" id="confirmPassword" type="password" minlength="6" autocomplete="new-password" required><button class="primary-button" type="submit">Atualizar senha</button></form></div></section>
      <p class="settings-help">Tema e cor de destaque ficam neste navegador. O Não Perturbe é sincronizado com sua conta quando você está conectado.</p>
    </section>`;
  const accentSelect = $('#lumiAccent'); if (accentSelect) accentSelect.value = accent;
  loadBlockedUsers();
}
async function changeAccountPassword(event) {
  event.preventDefault();
  if (!state.user?.email) { toast('Entre na sua conta para alterar a senha.','error'); return; }
  const current = $('#currentPassword').value;
  const next = $('#newPassword').value;
  const confirm = $('#confirmPassword').value;
  if (next.length < 6) { toast('A nova senha precisa ter pelo menos 6 caracteres.','error'); return; }
  if (next !== confirm) { toast('A confirmação da nova senha não corresponde.','error'); return; }
  if (current === next) { toast('Escolha uma senha diferente da atual.','error'); return; }
  const button = $('#passwordChangeForm button[type="submit"]');
  button.disabled = true; button.textContent = 'Verificando…';
  const verified = await supabase.auth.signInWithPassword({email:state.user.email,password:current});
  if (verified.error) { button.disabled=false; button.textContent='Atualizar senha'; toast('A senha atual está incorreta.','error'); return; }
  const changed = await supabase.auth.updateUser({password:next});
  button.disabled=false; button.textContent='Atualizar senha';
  if (changed.error) { toast(`Não foi possível alterar a senha: ${changed.error.message}`,'error'); return; }
  $('#passwordChangeForm').reset(); toast('Senha alterada com sucesso!','success');
}

function renderProfile() {
  $('.main-panel').classList.remove('workspace-mode');
  $('.app-shell').classList.remove('workspace-mode','inbox-mode','mobile-chat-open');
  $('#crumbParent').textContent='LUMI'; $('#crumbCurrent').textContent='Perfil';
  const name=state.profile?.display_name || state.user?.email?.split('@')[0] || 'Visitante';
  const photo = state.profile?.avatar_url;
  $('#pageContent').innerHTML = `<section class="page-placeholder profile-page"><div class="eyebrow">SUA IDENTIDADE</div><h1>Seu perfil</h1><p>Personalize como as pessoas vão conhecer você no LUMI.</p><div class="inbox-layout profile-layout"><div class="inbox-note profile-preview-card"><div class="profile-photo-preview">${photo?`<img class="avatar-image" src="${escapeHTML(photo)}" alt="Sua foto de perfil">`:`<span>${escapeHTML(initials(name))}</span>`}</div><strong>${escapeHTML(name)} ${accountBadges(state.user?.id,state.profile?.vip_purchased)}</strong><p>Escolha uma foto para deixar seu perfil com a sua cara.</p><div class="profile-bio-preview" style="--profile-highlight:${escapeHTML(state.profile?.profile_color||'#ffd83d')}">${state.profile?.pronouns ? `<span class="profile-pronouns">${escapeHTML(state.profile.pronouns)}</span><br>` : ''}${state.profile?.bio ? escapeHTML(state.profile.bio) : ""}${state.profile?.status_text ? "<br><strong>Status:</strong> " + escapeHTML(state.profile.status_text) : ""}${state.profile?.activity_text ? "<br><strong>Atividade:</strong> " + escapeHTML(state.profile.activity_text) : ""}</div><label class="secondary-button upload-photo-button" for="profilePhoto">Escolher foto</label><input id="profilePhoto" class="visually-hidden-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></div><form id="profileForm" class="profile-form"><label class="field-label" for="profileDisplayName">Nome de exibição</label><input class="form-input" id="profileDisplayName" maxlength="40" value="${escapeHTML(name)}" required><label class="field-label" for="profilePronouns">Pronomes <span class="optional">OPCIONAL</span></label><input class="form-input" id="profilePronouns" maxlength="32" value="${escapeHTML(state.profile?.pronouns||'')}" placeholder="Ex.: ele/dele, ela/dela, elu/delu"><label class="field-label" for="profileColor">Cor do perfil</label><select class="form-input" id="profileColor"><option value="#ffd83d" ${(state.profile?.profile_color||'#ffd83d')==='#ffd83d'?'selected':''}>Amarelo LUMI</option><option value="#8ec5ff" ${state.profile?.profile_color==='#8ec5ff'?'selected':''}>Azul céu</option><option value="#a7e6b5" ${state.profile?.profile_color==='#a7e6b5'?'selected':''}>Verde suave</option><option value="#d8b4fe" ${state.profile?.profile_color==='#d8b4fe'?'selected':''}>Lilás</option><option value="#ffb4c8" ${state.profile?.profile_color==='#ffb4c8'?'selected':''}>Rosa</option><option value="#ffffff" ${state.profile?.profile_color==='#ffffff'?'selected':''}>Branco</option></select><label class="field-label" for="profileBio">BIO <span class="optional">OPCIONAL</span></label><textarea class="form-input textarea" id="profileBio" maxlength="160" placeholder="Conte um pouquinho sobre você">${escapeHTML(state.profile?.bio || '')}</textarea><p class="settings-help">Até 160 caracteres. Evite compartilhar informações pessoais sensíveis.</p><label class="field-label" for="profileStatus">Status <span class="optional">OPCIONAL</span></label><input class="form-input" id="profileStatus" maxlength="80" value="${escapeHTML(state.profile?.status_text || "")}" placeholder="Ex.: disponível, estudando..."><label class="field-label" for="profileActivity">O que estou jogando/fazendo <span class="optional">OPCIONAL</span></label><input class="form-input" id="profileActivity" maxlength="100" value="${escapeHTML(state.profile?.activity_text || "")}" placeholder="Ex.: Minecraft, criando um projeto..."><p class="settings-help">A atividade é informada por você; o site ainda não detecta automaticamente outros aplicativos.</p><button class="primary-button full-button" type="submit">Salvar perfil <span>→</span></button><button class="secondary-button full-button" type="button" data-action="signout">Sair da conta</button></form></div><div class="notice-box">Os selos de verificação e de dono são atribuídos oficialmente pela configuração do LUMI, não pelo próprio usuário.</div></section>`;
}
async function saveProfile(event) {
  event.preventDefault(); if (!state.user) return;
  const display_name=$('#profileDisplayName').value.trim(); if (!display_name) return;
  const bio=$('#profileBio')?.value.trim() || '';
  const pronouns=$('#profilePronouns')?.value.trim().slice(0,32) || '';
  const profile_color=$('#profileColor')?.value || '#ffd83d';
  const status_text=$('#profileStatus')?.value.trim() || '';
  const activity_text=$('#profileActivity')?.value.trim() || '';
  const {error}=await supabase.from('profiles').update({display_name,bio,pronouns,profile_color,status_text,activity_text}).eq('id',state.user.id);
  if(error){toast(error.message.toLowerCase().includes('bio') ? 'Execute database/profile-settings.sql no SQL Editor do Supabase e tente novamente.' : `Não foi possível salvar: ${error.message}`,'error');return;}
  state.profile.display_name=display_name; state.profile.bio=bio; state.profile.pronouns=pronouns; state.profile.profile_color=profile_color; state.profile.status_text=status_text; state.profile.activity_text=activity_text; updateIdentity(); renderProfile(); toast('Perfil atualizado!','success');
}
async function uploadProfilePhoto(file) {
  if (!state.user || !file) return;
  if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) { toast('Use uma imagem PNG, JPG, WEBP ou GIF.','error'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('A foto precisa ter no máximo 5 MB.','error'); return; }
  const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type];
  const path = `${state.user.id}/avatar.${ext}`;
  const {error:uploadError} = await supabase.storage.from('profile-photos').upload(path,file,{upsert:true,contentType:file.type,cacheControl:'3600'});
  if (uploadError) { toast(`Não consegui enviar a foto: ${uploadError.message}. Confira o SQL de fotos no Supabase.`, 'error'); return; }
  const {data:{publicUrl}} = supabase.storage.from('profile-photos').getPublicUrl(path);
  const avatar_url = `${publicUrl}?v=${Date.now()}`;
  const {error} = await supabase.from('profiles').update({avatar_url}).eq('id',state.user.id);
  if (error) { toast(`Foto enviada, mas não consegui salvar o perfil: ${error.message}`, 'error'); return; }
  state.profile.avatar_url=avatar_url; updateIdentity(); renderProfile(); toast('Foto de perfil atualizada!','success');
}

async function handleAuth(event) {
  event.preventDefault(); const email=$('#authEmail').value.trim(); const password=$('#authPassword').value; const display_name=$('#authDisplayName').value.trim(); const errorBox=$('#authError'); const button=$('#authSubmit');
  errorBox.textContent='';button.disabled=true;button.textContent=state.authMode==='signup'?'Criando conta...':'Entrando...';
  let result;
  if(state.authMode==='signup') result=await supabase.auth.signUp({email,password,options:{data:{display_name:display_name||email.split('@')[0]}}});
  else result=await supabase.auth.signInWithPassword({email,password});
  button.disabled=false;button.innerHTML=state.authMode==='signup'?'Criar conta <span>→</span>':'Entrar <span>→</span>';
  if(result.error){errorBox.textContent=authErrorMessage(result.error);return;}
  if(state.authMode==='signup' && !result.data.session){errorBox.textContent='Conta criada! Confira seu e-mail para confirmar o cadastro e depois entre no LUMI.';return;}
  state.user=result.data.user;closeModal('authModal');await onSessionChange(state.user);toast(state.authMode==='signup'?'Sua conta LUMI está pronta!':'Que bom ter você de volta!','success');
}
async function requestPasswordRecovery() {
  const email = $('#authEmail').value.trim();
  const errorBox = $('#authError');
  const button = $('#forgotPasswordButton');
  if (!email) { errorBox.textContent = 'Digite seu e-mail primeiro para receber o link de recuperação.'; $('#authEmail').focus(); return; }
  if (state.authMode === 'signup') setAuthMode('signin');
  button.disabled = true; button.textContent = 'Enviando link...'; errorBox.textContent = '';
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  button.disabled = false; button.textContent = 'Esqueci minha senha';
  if (error) { errorBox.textContent = 'Não consegui enviar o link. Confira o e-mail e as URLs permitidas nas configurações de autenticação do Supabase.'; console.error('Falha ao solicitar recuperação de senha:', error.message); return; }
  errorBox.textContent = 'Se esse e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Confira também o spam.';
}
async function saveRecoveredPassword(event) {
  event.preventDefault();
  const password = $('#recoveryNewPassword').value;
  const confirmation = $('#recoveryConfirmPassword').value;
  const errorBox = $('#recoveryPasswordError');
  const button = $('#passwordRecoveryForm button[type="submit"]');
  errorBox.textContent = '';
  if (password.length < 6) { errorBox.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
  if (password !== confirmation) { errorBox.textContent = 'As senhas não correspondem.'; return; }
  button.disabled = true; button.textContent = 'Salvando...';
  const { error } = await supabase.auth.updateUser({ password });
  button.disabled = false; button.innerHTML = 'Salvar nova senha <span>→</span>';
  if (error) { errorBox.textContent = 'Não consegui alterar a senha. Solicite um novo link de recuperação e tente novamente.'; console.error('Falha ao salvar a senha recuperada:', error.message); return; }
  $('#passwordRecoveryForm').reset(); closeModal('passwordRecoveryModal'); closeModal('authModal');
  toast('Senha alterada! Você já pode entrar na sua conta.', 'success');
}
function authErrorMessage(error){const msg=error.message||'';if(msg.includes('Invalid login credentials'))return 'E-mail ou senha incorretos.';if(msg.includes('already registered'))return 'Este e-mail já tem uma conta. Tente entrar.';if(msg.includes('Password should be'))return 'A senha precisa ter pelo menos 6 caracteres.';return msg;}
async function onSessionChange(user) {
  if (state.user?.id && state.user.id !== user?.id) { if(state.callRealtime){await supabase.removeChannel(state.callRealtime);state.callRealtime=null;} await cleanupCall(false); }
  state.user=user;
  if(state.realtime){await supabase.removeChannel(state.realtime);state.realtime=null;}
  if(!user){if(state.callRealtime){await supabase.removeChannel(state.callRealtime);state.callRealtime=null;}state.profile=null;applyAccent('yellow');state.spaces=[];state.activeSpace=null;state.channels=[];state.activeChannel=null;state.messages=[];updateIdentity();renderSpaceNav();renderHome();return;}
  ensureCallSignalSubscription();
  await loadProfile();
  applyAccent(localStorage.getItem('lumi-accent') || 'yellow');
  if(typeof state.profile?.do_not_disturb==='boolean'){try{localStorage.setItem('lumi-do-not-disturb',String(state.profile.do_not_disturb));}catch{}document.documentElement.dataset.doNotDisturb=String(state.profile.do_not_disturb);}
  await loadSpaces();updateIdentity();if(state.page==='home')renderHome();checkPendingIncomingCall();
}
async function signOut(){await supabase.auth.signOut();state.activeSpace=null;state.activeChannel=null;toast('Você saiu da sua conta.');}

async function copyInvite(){if(!state.activeSpace)return;const code=state.activeSpace.invite_code;try{await navigator.clipboard.writeText(code);toast('Código copiado!','success');}catch{const temp=document.createElement('textarea');temp.value=code;document.body.append(temp);temp.select();document.execCommand('copy');temp.remove();toast('Código copiado!','success');}}
function showInvite(){if(!requireAuth())return;if(!state.activeSpace){openModal('inviteModal');$('#inviteCode').textContent='ENTRE COM UM CÓDIGO';return;}$('#inviteCode').textContent=state.activeSpace.invite_code;openModal('inviteModal');}

// Navegação e ações globais.

// LUMI: menu de canais para telas pequenas
(() => {
  const button = document.getElementById('mobileChannelsButton');
  const panel = document.getElementById('mobileChannelsPanel');
  const list = document.getElementById('mobileChannelsList');
  const close = document.getElementById('mobileChannelsClose');
  const source = document.getElementById('activeSpaceNav');

  if (!button || !panel || !list) return;

  function refreshMobileChannels() {
    if (source && source.innerHTML.trim()) {
      list.innerHTML = source.innerHTML;
    } else {
      list.innerHTML =
        '<div class="sidebar-loading">Entre em um espaço para ver os canais.</div>';
    }
  }

  function setOpen(open) {
    refreshMobileChannels();
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  }

  button.addEventListener('click', () => setOpen(panel.hidden));
  close?.addEventListener('click', () => setOpen(false));

  document.addEventListener('click', event => {
    const channel = event.target.closest('#mobileChannelsList [data-channel-id]');
    if (channel) setOpen(false);

    if (!panel.hidden &&
        !event.target.closest('#mobileChannelsPanel') &&
        !event.target.closest('#mobileChannelsButton')) {
      // Não fecha ao clicar em controles que ficam dentro do próprio painel.
      if (!event.target.closest('[data-channel-id]')) setOpen(false);
    }
  });

  // Mantém a lista atualizada quando o espaço ou os canais mudam.
  const observer = source ? new MutationObserver(() => {
    if (!panel.hidden) refreshMobileChannels();
  }) : null;

  if (source && observer) {
    observer.observe(source, { childList: true, subtree: true, attributes: true });
  }
})();

document.addEventListener('click', async event=>{
  const pageButton = event.target.closest('.rail-button[data-page]');
  if (pageButton) { setPage(pageButton.dataset.page); return; }
  const action=event.target.closest('[data-action]')?.dataset.action;
  const spaceButton=event.target.closest('[data-space-id]'); const openSpace=event.target.closest('[data-open-space]'); const channelButton=event.target.closest('[data-channel-id]'); const openDM=event.target.closest('[data-open-dm]'); const startDM=event.target.closest('[data-start-dm]'); const joinButton=event.target.closest('[data-join-space]'); const joinCodeButton=event.target.closest('[data-join-code]'); const saveRoleButton=event.target.closest('[data-save-role]');
  if(spaceButton){const id=spaceButton.dataset.spaceId;await loadWorkspace(id);return;}
  if(event.target.closest('[data-dm-back]')){$('.app-shell')?.classList.remove('mobile-chat-open');return;}
  if(openDM){await openConversation(openDM.dataset.openDm);return;}
  if(startDM){await startDirectMessage(startDM.dataset.startDm);return;}
  if(openSpace){await loadWorkspace(openSpace.dataset.openSpace);return;}
  if(channelButton){const channel=state.channels.find(c=>c.id===channelButton.dataset.channelId);if(channel){state.activeChannel=channel;await loadMessages();}return;}
  if(joinButton){await joinSpaceById(joinButton.dataset.joinSpace);return;}
  if(joinCodeButton){await joinSpaceByCode(joinCodeButton.dataset.joinCode);return;}
  if(saveRoleButton){const select=$(`[data-member-role="${saveRoleButton.dataset.saveRole}"]`);if(!select||state.activeSpace?.owner_id!==state.user?.id){toast('Somente o fundador pode alterar cargos.', 'error');return;}const {data,error}=await supabase.from('space_members').update({role:select.value}).eq('space_id',state.activeSpace.id).eq('user_id',saveRoleButton.dataset.saveRole).neq('role','owner').select('user_id').maybeSingle();if(error){toast(`Não foi possível alterar o cargo: ${error.message}`,'error');return;}if(!data){toast('Esse membro não pode receber esse cargo.', 'error');return;}toast('Cargo do membro atualizado!', 'success');await manageMembers();return;}
  if(event.target.closest('[data-close]')){closeModal(event.target.closest('[data-close]').dataset.close);return;}
  if(!action)return;
  if(action==='create-space'){if(requireAuth())openModal('spaceModal');}
  else if(action==='auth'){setAuthMode('signin');openModal('authModal');}
  else if(action==='discover')setPage('discover');
  else if(action==='home')setPage('home');
  else if(action==='show-inbox')setPage('inbox');
  else if(action==='create-channel'){if(requireAuth()&&state.activeSpace){resetChannelModal();openModal('channelModal');}else if(!state.activeSpace)toast('Abra um espaço primeiro.');}
  else if(action==='edit-channel')openEditChannel(event.target.closest('[data-channel-edit]')?.dataset.channelEdit);
  else if(action==='move-channel-up')await moveChannel(event.target.closest('[data-move-channel]')?.dataset.moveChannel,-1);
  else if(action==='move-channel-down')await moveChannel(event.target.closest('[data-move-channel]')?.dataset.moveChannel,1);
  else if(action==='delete-channel')await deleteChannel(event.target.closest('[data-channel-delete]')?.dataset.channelDelete);
  else if(action==='invite')showInvite();
  else if(action==='edit-space')await editActiveSpace();
  else if(action==='delete-space')await deleteActiveSpace();
  else if(action==='manage-members')await manageMembers();
  else if(action==='search-spaces'){state.search=$('#discoverQuery')?.value.trim()||'';renderDiscover();}
  else if(action==='signout')await signOut();
});

$('#authForm').addEventListener('submit',handleAuth);
$('#forgotPasswordButton')?.addEventListener('click', requestPasswordRecovery);
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-copy-contact]');
  if (!button) return;
  const username = button.dataset.copyContact;
  if (!username) return;
  try {
    await navigator.clipboard.writeText('@' + username);
    toast('Usuário copiado!', 'success');
  } catch {
    const field = document.createElement('textarea');
    field.value = '@' + username;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    toast(copied ? 'Usuário copiado!' : 'Não consegui copiar o usuário.', copied ? 'success' : 'error');
  }
});
$('#passwordRecoveryForm')?.addEventListener('submit', saveRecoveredPassword);
document.addEventListener('change',async e=>{if(e.target.id==='lumiEnterToSend'){try{localStorage.setItem('lumi-enter-to-send',String(e.target.checked));toast(e.target.checked?'Enter envia as mensagens.':'Enter quebra a linha.','success');}catch{toast('Não foi possível salvar essa preferência.','error');}}if(e.target.id==='lumiTheme'){applyTheme(e.target.value);toast(e.target.value==='dark'?'Tema escuro ativado.':'Tema claro ativado.','success');}if(e.target.id==='lumiAccent'){applyAccent(e.target.value);toast('Cor de destaque atualizada.','success');}if(e.target.id==='lumiCallRetryMessage'){try{localStorage.setItem('lumi-call-retry-message',e.target.value.slice(0,160));}catch{};}if(e.target.id==='lumiDnd'){const toggle=e.target;toggle.disabled=true;const ok=await setDoNotDisturb(toggle.checked);toggle.disabled=false;if(ok)toast(toggle.checked?'Não Perturbe ativado.':'Não Perturbe desativado.','success');else toggle.checked=!toggle.checked;}});
document.addEventListener('submit',e=>{if(e.target.id==='passwordChangeForm')changeAccountPassword(e);});
$('#authSwitch').addEventListener('click',()=>setAuthMode(state.authMode==='signin'?'signup':'signin'));
$('#spaceForm').addEventListener('submit',createSpace);
$('#channelForm').addEventListener('submit',createChannel);
$('#channelModal')?.addEventListener('close',resetChannelModal);
$('#inviteForm').addEventListener('submit',async e=>{e.preventDefault();await joinSpaceByCode($('#joinCode').value);});
$('#copyInvite').addEventListener('click',copyInvite);
$('#spaceSearch').addEventListener('input',renderSpaceNav);
$('#messageForm')?.addEventListener('submit',sendMessage);
document.addEventListener('submit',e=>{if(e.target.id==='dmMessageForm')sendDM(e);});
document.addEventListener('click',e=>{const channelCreate=e.target.closest('[data-action="create-channel"][data-channel-kind]');if(channelCreate){const kindSelect=$('#channelKind');if(kindSelect){kindSelect.value=channelCreate.dataset.channelKind;kindSelect.dispatchEvent(new Event('change',{bubbles:true}));window.lumiSyncChannelSelect?.(kindSelect.value);}const nameInput=$('#channelName');if(nameInput)nameInput.placeholder=channelCreate.dataset.channelKind==='voice'?'Ex.: sala-de-voz':'Ex.: papo-geral';}const edit=e.target.closest('[data-space-edit]');if(edit){editSpaceMessage(edit.dataset.spaceEdit);return;}const del=e.target.closest('[data-space-delete]');if(del){deleteSpaceMessage(del.dataset.spaceDelete);return;}const reply=e.target.closest('[data-space-reply]');if(reply){replyToSpaceMessage(reply.dataset.spaceReply);return;}const react=e.target.closest('[data-space-react]');if(react){reactToSpaceMessage(react.dataset.spaceReact,react.dataset.emoji||null);return;}if(e.target.closest('[data-space-reply-cancel]')){state.spaceReplyTo=null;renderWorkspace();return;}if(e.target.closest('#spaceAttachButton')){$('#spaceFileInput')?.click();return;}if(e.target.closest('#dmSearchButton'))searchDMPeople();if(e.target.closest('#dmMobileSearchButton'))searchDMPeople();if(e.target.closest('#dmRefreshButton'))loadConversations();if(e.target.closest('#dmAttachButton'))$('#dmFileInput')?.click();});
document.addEventListener('click',e=>{const call=e.target.closest('[data-call]');if(call){startCall(call.dataset.call);return;}const control=e.target.closest('[data-call-control]');if(control){toggleCallControl(control.dataset.callControl);return;}const incoming=e.target.closest('[data-incoming-call]');if(incoming){if(incoming.dataset.incomingCall==='accept')acceptIncomingCall();else declineIncomingCall();}});
document.addEventListener('keydown',e=>{if((e.target.id==='dmPeopleSearch'||e.target.id==='dmMobilePeopleSearch')&&e.key==='Enter'){e.preventDefault();searchDMPeople();return;}if((e.target.id==='messageInput'||e.target.id==='dmMessageInput')&&e.key==='Enter'&&!e.isComposing){const enterSends=localStorage.getItem('lumi-enter-to-send')!=='false';const shouldSend=enterSends?(!e.shiftKey):((e.ctrlKey||e.metaKey)&&!e.shiftKey);if(shouldSend){e.preventDefault();const form=e.target.form;if(form&&typeof form.requestSubmit==='function')form.requestSubmit();}}});
document.addEventListener('submit',e=>{if(e.target.id==='messageForm')sendMessage(e);if(e.target.id==='profileForm')saveProfile(e);});
document.addEventListener('change',e=>{if(e.target.id==='spaceFileInput'&&e.target.files?.length){const file=e.target.files[0];if(!/^(image\/|video\/)/.test(file.type)){toast('Escolha uma foto ou vídeo.','error');e.target.value='';return;}const input=$('#messageInput');if(input&&!input.value.trim())input.placeholder=`Enviar ${file.name}`;}if(e.target.id==='profilePhoto' && e.target.files?.[0]) uploadProfilePhoto(e.target.files[0]);});
$('#spaceForm').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT')e.preventDefault();});
$('#symbolPicker').addEventListener('click',e=>{const button=e.target.closest('[data-symbol]');if(!button)return;$('#spaceEmoji').value=button.dataset.symbol;$$('.symbol-choice').forEach(el=>el.classList.toggle('selected',el===button));});
$('#homeButton').addEventListener('click',()=>setPage('home'));
$('#createSpaceTop').addEventListener('click',()=>{if(requireAuth())openModal('spaceModal');});
$('#createSpaceInline').addEventListener('click',()=>{if(requireAuth())openModal('spaceModal');});
$('#railCreateSpace').addEventListener('click',()=>{if(requireAuth())openModal('spaceModal');});
$('#createSpaceHero').addEventListener('click',()=>{if(requireAuth())openModal('spaceModal');});
$('#discoverHero').addEventListener('click',()=>setPage('discover'));
$('#viewAllSpaces').addEventListener('click',()=>setPage('discover'));
$('#emptyCreateSpace').addEventListener('click',()=>{if(requireAuth())openModal('spaceModal');});
$('#accountButton').addEventListener('click',()=>{if(state.user)setPage('profile');else{setAuthMode('signin');openModal('authModal');}});
$('#topAvatar').addEventListener('click',()=>{if(state.user)setPage('profile');else{setAuthMode('signin');openModal('authModal');}});
$('#userAvatar').addEventListener('click',()=>{if(state.user)setPage('profile');else{setAuthMode('signin');openModal('authModal');}});
$('#profileButton').addEventListener('click',()=>{if(state.user)setPage('profile');else{setAuthMode('signin');openModal('authModal');}});
$('#notificationsButton').addEventListener('click',async()=>{if(!('Notification' in window)){toast('Este navegador não oferece notificações.','error');return;}const permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;if(permission==='granted'){try{new Notification('LUMI',{body:'Notificações ativadas enquanto o site estiver aberto.'});}catch{}toast('Notificações ativadas!','success');}else toast('Permissão de notificações negada no navegador.','error');});
$('#rightPanelMenu').addEventListener('click',()=>toast('Mais opções de perfil chegam em breve.'));
$('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){state.search=e.target.value.trim();setPage('discover');}});
document.addEventListener('keydown',e=>{const target=e.target;const typing=target instanceof HTMLElement&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus();}else if(e.key==='/'&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!document.querySelector('.modal[open]')){e.preventDefault();$('#globalSearch').focus();}if(e.key==='Escape'){$('.modal[open]').forEach(d=>d.close());}});

// Preferências locais do LUMI: tema e Não Perturbe.
try { applyTheme(localStorage.getItem('lumi-theme') || 'light'); applyAccent(localStorage.getItem('lumi-accent') || 'yellow'); } catch { applyTheme('light'); applyAccent('yellow'); }
setDoNotDisturb(getDoNotDisturb());
loadCustomCallTone();

// Reage à sessão existente e a login/logout em outras abas.
const {data:{session}}=await supabase.auth.getSession();
await onSessionChange(session?.user || null);
if (state.user) ensureCallSignalSubscription();
supabase.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY')queueMicrotask(()=>openModal('passwordRecoveryModal'));if(session?.user?.id!==state.user?.id)queueMicrotask(()=>onSessionChange(session?.user||null));});
if(!state.user){setAuthMode('signin');}


// Controles da sala de voz em grupo.
document.addEventListener('click', event => {
  if (event.target.closest('#joinGroupVoice')) {
    joinGroupVoice();
  } else if (event.target.closest('#leaveGroupVoice')) {
    leaveGroupVoice().then(() => {
      renderWorkspace();
      toast('Você saiu da sala de voz.', 'success');
    });
  } else if (event.target.closest('#toggleGroupVoiceMute')) {
    toggleGroupVoiceMute();
  }
});

window.addEventListener('beforeunload', () => {
  const v = state.groupVoice;
  if (v?.localStream) v.localStream.getTracks().forEach(track => track.stop());
  if (v) for (const item of v.peers.values()) {
    try { item.pc.close(); } catch {}
  }
});

// LUMI_SPACE_PHOTOS_V1
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action="change-space-photo"]');
  if (!button) return;
  event.preventDefault();

  if (!state.user || state.activeSpace?.owner_id !== state.user.id) {
    toast('Somente o dono pode trocar a foto.', 'error');
    return;
  }

  const input = document.querySelector('#spacePhotoChange');
  if (input) {
    input.value = '';
    input.click();
  }
});

document.addEventListener('change', event => {
  if (event.target.id === 'spacePhotoChange' && event.target.files?.[0]) {
    changeSpacePhoto(event.target.files[0]);
  }
});

document.addEventListener('click',event=>{
  const block=event.target.closest('[data-block-user]');
  if(block){event.preventDefault();toggleBlockUser(block.dataset.blockUser);return;}
  if(event.target.closest('[data-share-contact]')){event.preventDefault();shareContactCard();return;}
  if(event.target.closest('#dmRecordAudio')){event.preventDefault();recordDMVoice();return;}
});

document.addEventListener('click', event => {
  if (event.target.closest('#chooseCallTone')) document.getElementById('lumiCallToneFile')?.click();
  else if (event.target.closest('#previewCallTone')) previewCustomCallTone();
  else if (event.target.closest('#removeCallTone')) removeCustomCallTone();
});
document.addEventListener('change', event => {
  if (event.target?.id === 'lumiCallToneFile' && event.target.files?.[0]) {
    chooseCustomCallTone(event.target.files[0]);
    event.target.value = '';
  }
});
document.addEventListener('change',event=>{if(event.target.id==='lumiAccent'){applyAccent(event.target.value);toast('Cor de destaque atualizada.','success');}});


async function loadBlockedUsers() {
  const host = $('#lumiBlockedUsers');
  if (!host) return;
  if (!state.user) {
    host.innerHTML = '<p class="settings-help">Entre na sua conta para gerenciar pessoas bloqueadas.</p>';
    return;
  }
  host.innerHTML = '<p class="settings-help">Carregando lista…</p>';
  const { data: blocks, error } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', state.user.id);
  if (error) {
    host.innerHTML = '<p class="settings-help">Não foi possível carregar a lista. Confira se o SQL de bloqueios do LUMI foi executado no Supabase.</p>';
    console.warn('Lista de bloqueios:', error.message);
    return;
  }
  const ids = [...new Set((blocks || []).map(row => row.blocked_id).filter(Boolean))];
  if (!ids.length) {
    host.innerHTML = '<div class="lumi-blocked-empty"><span class="material-symbols-rounded">check_circle</span><span><strong>Ninguém bloqueado</strong><small>Sua lista está vazia.</small></span></div>';
    return;
  }
  const { data: people, error: peopleError } = await supabase
    .from('profiles')
    .select('id,display_name,username,avatar_url')
    .in('id', ids);
  if (peopleError) {
    host.innerHTML = '<p class="settings-help">Os bloqueios foram encontrados, mas não consegui carregar os perfis.</p>';
    return;
  }
  const byId = new Map((people || []).map(person => [person.id, person]));
  host.innerHTML = ids.map(id => {
    const person = byId.get(id) || {};
    const name = person.display_name || person.username || 'Pessoa do LUMI';
    const avatar = person.avatar_url
      ? '<img src="' + escapeHTML(person.avatar_url) + '" alt="" class="lumi-blocked-avatar">'
      : '<span class="lumi-blocked-avatar lumi-blocked-avatar-fallback">' + escapeHTML(initials(name)) + '</span>';
    return '<div class="lumi-blocked-row">' + avatar
      + '<span class="lumi-blocked-person"><strong>' + escapeHTML(name) + '</strong>'
      + (person.username ? '<small>@' + escapeHTML(person.username) + '</small>' : '')
      + '</span><button type="button" class="secondary-button" data-unblock-user="' + escapeHTML(id) + '">Desbloquear</button></div>';
  }).join('');
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-unblock-user]');
  if (!button) return;
  const userId = button.dataset.unblockUser;
  if (!userId || button.disabled) return;
  button.disabled = true;
  button.textContent = 'Desbloqueando…';
  await toggleBlockUser(userId);
  await loadBlockedUsers();
});


// LUMI — navegação por teclado em menus de mensagens, reações e notificações
(() => {
  const menuSelector = [
    '[role="menu"]',
    '.space-message-actions',
    '.message-actions',
    '.reaction-picker',
    '.emoji-picker',
    '.notification-panel',
    '.dropdown-menu',
    '.context-menu',
    '.search-results'
  ].join(',');

  const itemSelector = 'button:not([disabled]), [role="menuitem"]:not([aria-disabled="true"]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  document.addEventListener('keydown', event => {
    const target = event.target;
    const menu = target?.closest?.(menuSelector);
    if (!menu || menu.hidden || menu.getAttribute('aria-hidden') === 'true') return;

    // Não intercepta as setas enquanto a pessoa está digitando ou escolhendo texto.
    if (target.matches?.('input, textarea, select, [contenteditable="true"]')) {
      if (event.key !== 'Escape') return;
    }

    const items = [...menu.querySelectorAll(itemSelector)].filter(item =>
      !item.hidden && item.getAttribute('aria-hidden') !== 'true' &&
      item.getClientRects().length > 0
    );
    if (!items.length) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const current = items.indexOf(document.activeElement);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = current < 0
        ? (step > 0 ? 0 : items.length - 1)
        : (current + step + items.length) % items.length;
      items[next].focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      items[event.key === 'Home' ? 0 : items.length - 1].focus();
    } else if (event.key === 'Escape') {
      const close = menu.querySelector('[data-close], [aria-label*="Fechar" i], [title*="Fechar" i], .close-button');
      if (close && close !== target) {
        event.preventDefault();
        close.click();
      } else if (menu.matches('.notification-panel, .dropdown-menu, .context-menu, .reaction-picker, .emoji-picker')) {
        event.preventDefault();
        menu.hidden = true;
        menu.setAttribute('aria-hidden', 'true');
        if (target instanceof HTMLElement) target.blur();
      }
    }
  });
})();

// A tela de carregamento só fecha quando a inicialização principal termina sem erro.
window.dispatchEvent(new Event('lumi:app-ready'));
