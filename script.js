
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
const state = { user: null, profile: null, spaces: [], activeSpace: null, channels: [], activeChannel: null, messages: [], realtime: null, spaceReplyTo: null, spaceCallChannel: null, spaceReactions: [], authMode: 'signin', page: 'home', search: '', channelCount: 0, messageCount: 0, conversations: [], activeConversation: null, dmMessages: [], dmRealtime: null, dmSearchResults: [], callRealtime: null, callPC: null, callLocalStream: null, callRemoteStream: null, callPeerId: null, callConversationId: null, callMode: 'audio', callStatus: 'idle', pendingCallOffer: null, callSeenSignals: new Set(), callMuted: false, callVideoEnabled: true, pendingIceSignals: [] };
const symbols = ['✳','🎮','🎨','☕','✦','🌙'];
// Configure os selos oficiais aqui. Use IDs de usuários obtidos no Supabase Auth.
const APP_OWNER_USER_ID = '222eba63-627c-4cc9-bf49-09da8cb7550d'; // conta dona do LUMI
const VERIFIED_USER_IDS = ['66fbb608-8672-40d7-aedc-7e7645726ebf']; // UUIDs de contas verificadas, aprovadas por você
function accountBadges(userId) {
  if (!userId) return '';
  const owner = userId === APP_OWNER_USER_ID && APP_OWNER_USER_ID.length > 0;
  const verified = owner || VERIFIED_USER_IDS.includes(userId);
  return `${verified ? '<span class="lumi-badge verified-badge" title="Conta verificada" aria-label="Conta verificada">✓</span>' : ''}${owner ? '<span class="lumi-badge owner-badge" title="Dono do LUMI" aria-label="Dono do LUMI">✦</span>' : ''}`;
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
  $('#accountName').innerHTML = `${escapeHTML(name)} ${accountBadges(state.user?.id)}`;
  $('#accountStatus').textContent = state.user ? `@${state.profile?.username || 'lumi-user'}` : 'Entre para continuar';
  $('#profileName').innerHTML = `${state.user ? escapeHTML(name) : 'Boas-vindas!'} ${accountBadges(state.user?.id)}`;
  $('#profileHandle').textContent = state.user ? `@${state.profile?.username || 'lumi-user'}` : 'Entre para personalizar seu perfil';
  $('#accountButton').title = state.user ? 'Abrir opções da conta' : 'Entrar ou criar conta';
}

function setPage(page) {
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
  renderHome();
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
      <div class="active-space-actions"><button type="button" data-action="invite"><span>↗</span> Convidar</button><button type="button" data-action="manage-members"><span>♙</span> Membros</button>${space.owner_id === state.user?.id ? '<button type="button" data-action="change-space-photo"><span class="material-symbols-rounded">image</span> Foto</button>' : ''}</div>
      <div class="channel-sidebar-title"><span>CANAIS DE TEXTO</span>${['owner','admin'].includes(space.role) ? '<button data-action="create-channel" title="Criar canal" aria-label="Criar canal">＋</button>' : ''}</div>
      <div class="channel-list sidebar-channel-list">${state.channels.length ? state.channels.map(c => `<button class="channel-entry ${c.id === state.activeChannel?.id ? 'active' : ''}" data-channel-id="${c.id}"><span>#</span>${escapeHTML(c.name)}</button>`).join('') : `<div class="space-list-empty">Ainda não há canais.${['owner','admin'].includes(space.role) ? '<br><button data-action="create-channel">Criar canal</button>' : ''}</div>`}</div>
      ${['owner','admin'].includes(space.role) ? '<button class="sidebar-create-channel" data-action="create-channel">＋ Criar canal</button>' : ''}`;
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
  const {data,error} = await supabase.from('messages').select('id,content,created_at,author_id,attachment_path,attachment_name,attachment_type,attachment_size,edited_at,reply_to,profiles(display_name,username,avatar_url)').eq('channel_id',state.activeChannel.id).order('created_at',{ascending:true}).limit(100);
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
      const {data} = await supabase.from('messages').select('id,content,created_at,author_id,attachment_path,attachment_name,attachment_type,attachment_size,edited_at,reply_to,profiles(display_name,username,avatar_url)').eq('id',payload.new.id).maybeSingle();
      if (data) { const signed=(data.attachment_path?await signSpaceMedia([data]):[data])[0]; const i=state.messages.findIndex(m=>m.id===signed.id); if(i>=0) state.messages[i]=signed; else state.messages.push(signed); state.messages.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)); state.messageCount = state.messages.length; const count=$('#messageCount'); if(count)count.textContent=state.messageCount; if (state.page === 'space') renderMessages(); }
    }).on('postgres_changes',{event:'*',schema:'public',table:'message_reactions'},async payload=>{const ids=state.messages.map(m=>m.id);if(!ids.length)return;const {data}=await supabase.from('message_reactions').select('message_id,user_id,emoji').in('message_id',ids);state.spaceReactions=data||[];if(state.page==='space')renderMessages();}).subscribe();
}


// LUMI_GROUP_VOICE_V1
// Sala de voz em grupo: conexões WebRTC independentes por participante.
state.groupVoice = state.groupVoice || {
  channel: null, channelId: null, localStream: null,
  peers: new Map(), muted: false, joining: false
};

async function leaveGroupVoice() {
  const v = state.groupVoice;
  if (v.channel) {
    try { await v.channel.untrack(); } catch {}
    try { await supabase.removeChannel(v.channel); } catch {}
  }
  for (const peer of v.peers.values()) {
    try { peer.pc.close(); } catch {}
  }
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
    <small>Você${v.muted ? ' · Microfone desligado' : ''}</small>
  </div>` + members.map(([id, item]) => {
    const name = item.name || 'Participante';
    const avatar = item.avatar_url || item.avatar || item.photo_url || item.picture || '';

    return `<div class="voice-member">
      ${voiceAvatar(avatar, name)}
      <span>${escapeHTML(name)}</span>
      <small>${item.pc.connectionState === 'connected' ? 'Conectado' : 'Conectando…'}</small>
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
    stream: new MediaStream()
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
    v.channelId = channel.id;

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
      </div><div class="chat-head-actions"><button class="icon-button" data-action="manage-members" title="Ver membros" aria-label="Ver membros"><span class="material-symbols-rounded">group</span></button></div></header>
      <div class="voice-room-card">
        <div class="voice-room-symbol"><span class="material-symbols-rounded">graphic_eq</span></div>
        <h3>${joined ? 'Você está na sala' : 'Sala de voz'}</h3>
        <p>${joined ? 'Seu microfone está conectado à sala.' : 'Entre na sala para conversar em tempo real.'}</p>
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
  $('#crumbParent').textContent = space.name; $('#crumbCurrent').textContent = channel ? `# ${channel.name}` : 'Espaço';
  $('#pageContent').innerHTML = `<section class="workspace-chat-view"><header class="channel-chat-head"><div><h2>${channel ? `<span class="chat-hash material-symbols-rounded">tag</span> ${escapeHTML(channel.name)}` : 'Nenhum canal ainda'}</h2><p>${escapeHTML(channel?.topic || (channel ? 'Esse é o começo de uma boa conversa.' : 'Crie um canal para começar a conversar.'))}</p></div><div class="chat-head-actions"><button class="icon-button" data-action="manage-members" title="Ver membros" aria-label="Ver membros"><span class="material-symbols-rounded">group</span></button><button class="icon-button" data-action="invite" title="Convidar pessoas" aria-label="Convidar pessoas"><span class="material-symbols-rounded">person_add</span></button></div></header><div class="chat-message-list" id="chatMessageList">${messagesHTML()}</div>${channel ? `<form class="message-composer" id="messageForm"><input id="spaceFileInput" type="file" accept="image/*,video/*" hidden><button class="dm-attach-button" type="button" id="spaceAttachButton" title="Enviar foto ou vídeo"><span class="material-symbols-rounded">add_photo_alternate</span></button><textarea id="messageInput" maxlength="4000" rows="1" placeholder="Mensagem em #${escapeHTML(channel.name)}" aria-label="Escreva uma mensagem"></textarea><button class="send-button" type="submit" title="Enviar mensagem"><span class="material-symbols-rounded">send</span></button></form>${state.spaceReplyTo?`<div class="space-reply-banner">Respondendo a uma mensagem <button type="button" data-space-reply-cancel aria-label="Cancelar resposta">×</button></div>`:''}` : ''}</section>`;
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
    const media=fileUrl?(isImage?`<a class="space-media-link" href="${escapeHTML(fileUrl)}" target="_blank" rel="noopener"><img src="${escapeHTML(fileUrl)}" loading="lazy" alt="${escapeHTML(message.attachment_name||'Foto compartilhada')}"></a>`:isVideo?`<video class="space-video" controls preload="metadata" src="${escapeHTML(fileUrl)}"></video>`:`<a href="${escapeHTML(fileUrl)}" target="_blank" rel="noopener">${escapeHTML(message.attachment_name||'Abrir arquivo')}</a>`):'';
    const reply=message.reply_to?state.messages.find(m=>m.id===message.reply_to):null; const reactions=state.spaceReactions.filter(r=>r.message_id===message.id); const reactionHTML=reactions.length?`<div class="space-reactions">${[...new Set(reactions.map(r=>r.emoji))].map(emoji=>`<button type="button" data-space-react="${message.id}" data-emoji="${escapeHTML(emoji)}" class="space-reaction">${escapeHTML(emoji)} <small>${reactions.filter(r=>r.emoji===emoji).length}</small></button>`).join('')}</div>`:'';
    return `<article class="message-item space-message-item" data-message-id="${message.id}"><div class="message-avatar">${message.profiles?.avatar_url?`<img class="avatar-image" src="${escapeHTML(message.profiles.avatar_url)}" alt="">`:escapeHTML(initials(name))}</div><div class="message-content"><div class="message-meta"><strong>${escapeHTML(name)}</strong> ${accountBadges(message.author_id)}<time>${shortDate(message.created_at)}</time>${message.edited_at?'<small class="message-edited">editada</small>':''}</div>${reply?`<div class="space-reply-preview">↳ ${escapeHTML(reply.content||reply.attachment_name||'mídia')}</div>`:''}${message.content?`<div class="message-text">${escapeHTML(message.content)}</div>`:''}${media}${reactionHTML}<div class="space-message-actions"><button type="button" data-space-reply="${message.id}" title="Responder"><span class="material-symbols-rounded">reply</span></button>${mine?`<button type="button" data-space-edit="${message.id}" title="Editar"><span class="material-symbols-rounded">edit</span></button><button type="button" data-space-delete="${message.id}" title="Excluir"><span class="material-symbols-rounded">delete</span></button>`:''}<button type="button" data-space-react="${message.id}" title="Reagir"><span class="material-symbols-rounded">add_reaction</span></button></div></div></article>`;
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
  const input = $('#messageInput'); const fileInput=$('#spaceFileInput'); const file=fileInput?.files?.[0]||null; const content = input.value.trim(); if (!content&&!file) return;
  if(file && file.size>30*1024*1024){toast('Cada arquivo deve ter no máximo 30 MB.','error');return;}
  if(file && !/^(image\/|video\/)/.test(file.type)){toast('Nos Espaços, envie fotos ou vídeos.','error');return;}
  input.disabled = true; const send=$('#messageForm button[type="submit"]');if(send)send.disabled=true;
  let attachment_path=null;
  if(file){const safeName=file.name.replace(/[^\p{L}\p{N}._ -]/gu,'_').slice(-100)||'midia';attachment_path=`${state.activeChannel.id}/${state.user.id}/${crypto.randomUUID()}-${safeName}`;const {error:uploadError}=await supabase.storage.from('space-attachments').upload(attachment_path,file,{contentType:file.type,upsert:false});if(uploadError){toast(`Falha no envio da mídia: ${uploadError.message}. Execute o SQL da atualização.`, 'error');input.disabled=false;if(send)send.disabled=false;return;}}
  const payload={channel_id:state.activeChannel.id,author_id:state.user.id,content:content||'',attachment_path,attachment_name:file?.name||null,attachment_type:file?.type||null,attachment_size:file?.size||null,reply_to:state.spaceReplyTo?.id||null};
  const {data,error} = await supabase.from('messages').insert(payload).select('id,content,created_at,author_id,attachment_path,attachment_name,attachment_type,attachment_size,edited_at,reply_to,profiles(display_name,username,avatar_url)').single();
  input.disabled = false;if(send)send.disabled=false;
  if (error) { console.error(error); toast(`Não foi possível enviar: ${error.message}`, 'error'); return; }
  if(data.attachment_path){const signed=await signSpaceMedia([data]);Object.assign(data,signed[0]);}
  if (!state.messages.some(m=>m.id===data.id)) state.messages.push(data);
  input.value = '';if(fileInput)fileInput.value='';state.spaceReplyTo=null;state.messageCount = state.messages.length;const count=$('#messageCount');if(count)count.textContent=state.messageCount;renderWorkspace();input.focus();
}
async function editSpaceMessage(id){const msg=state.messages.find(m=>m.id===id);if(!msg||msg.author_id!==state.user?.id)return;const next=prompt('Edite sua mensagem:',msg.content||'');if(next===null)return;const content=next.trim();if(!content&&!msg.attachment_path){toast('A mensagem não pode ficar vazia.','error');return;}const {error}=await supabase.from('messages').update({content,edited_at:new Date().toISOString()}).eq('id',id).eq('author_id',state.user.id);if(error){toast(`Não foi possível editar: ${error.message}`,'error');return;}const item=state.messages.find(m=>m.id===id);if(item){item.content=content;item.edited_at=new Date().toISOString();}renderMessages();toast('Mensagem editada!','success');}
async function deleteSpaceMessage(id){const msg=state.messages.find(m=>m.id===id);if(!msg||msg.author_id!==state.user?.id)return;if(!confirm('Excluir esta mensagem? Essa ação não pode ser desfeita.'))return;const {error}=await supabase.from('messages').delete().eq('id',id).eq('author_id',state.user.id);if(!error&&msg.attachment_path)await supabase.storage.from('space-attachments').remove([msg.attachment_path]);if(error){toast(`Não foi possível excluir: ${error.message}`,'error');return;}state.messages=state.messages.filter(m=>m.id!==id);renderMessages();toast('Mensagem excluída.','success');}
function replyToSpaceMessage(id){const msg=state.messages.find(m=>m.id===id);if(!msg)return;state.spaceReplyTo=msg;renderWorkspace();$('#messageInput')?.focus();}
async function reactToSpaceMessage(id,chosen=null){const msg=state.messages.find(m=>m.id===id);if(!msg)return;const reaction=chosen||prompt('Digite uma reação (por exemplo: 💛 🎉 😂 👍):','💛');if(!reaction)return;const existing=state.spaceReactions.find(r=>r.message_id===id&&r.user_id===state.user.id&&r.emoji===reaction);if(existing){const {error}=await supabase.from('message_reactions').delete().eq('message_id',id).eq('user_id',state.user.id).eq('emoji',reaction);if(error){toast(`Não foi possível remover reação: ${error.message}`,'error');return;}state.spaceReactions=state.spaceReactions.filter(r=>r!==existing);}else{const {data,error}=await supabase.from('message_reactions').insert({message_id:id,user_id:state.user.id,emoji:reaction}).select().single();if(error){toast(`Não foi possível reagir: ${error.message}`,'error');return;}state.spaceReactions.push(data);}renderMessages();}

async function createChannel(event) {
  event.preventDefault(); if (!requireAuth() || !state.activeSpace) return;
  const name = $('#channelName').value.trim().toLowerCase().replace(/\s+/g,'-'); const topic = $('#channelTopic').value.trim();
  const kind = $('#channelKind')?.value === 'voice' ? 'voice' : 'text';
  if (!name) return;
  const {data,error} = await supabase.from('channels').insert({space_id:state.activeSpace.id,name,topic,kind,created_by:state.user.id,position:state.channels.length}).select().single();
  if (error) { console.error(error); toast(error.code === '42501' ? 'Somente administradores podem criar canais neste espaço.' : `Não foi possível criar o canal: ${error.message}`, 'error'); return; }
  closeModal('channelModal'); $('#channelForm').reset(); await loadWorkspace(state.activeSpace.id,data.id); toast('Canal criado!', 'success');
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
  const canManage=['owner','admin'].includes(state.activeSpace.role);
  dialog.innerHTML=`<div class="modal-card"><button class="modal-close" type="button" data-close="membersModal" aria-label="Fechar">×</button><div class="eyebrow">SUA COMUNIDADE</div><h2>Membros do espaço</h2><p class="modal-subtitle">Donos e administradores podem organizar os papéis dos membros.</p><div class="member-manager-list">${(data||[]).map(m=>{const name=m.profiles?.display_name||m.profiles?.username||'Pessoa LUMI';const isSelf=m.user_id===state.user.id;const manageable=canManage&&!isSelf&&m.role!=='owner'&&(state.activeSpace.role==='owner'||m.role==='member');return `<div class="member-manager-row"><div><strong>${escapeHTML(name)}${isSelf?' (você)':''}</strong><small>${escapeHTML(m.profiles?.username?'@'+m.profiles.username:m.role)}</small></div><span class="member-role">${m.role==='owner'?'Dono':m.role==='admin'?'Administrador':'Membro'}</span>${manageable?`<select class="form-input member-role-select" data-member-role="${m.user_id}"><option value="member" ${m.role==='member'?'selected':''}>Membro</option><option value="admin" ${m.role==='admin'?'selected':''}>Administrador</option></select><button class="secondary-button" data-save-role="${m.user_id}">Salvar</button>`:''}</div>`}).join('')}</div></div>`;
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
  const { data, error } = await supabase.from('conversation_members').select('conversation_id, conversations(id,created_at,conversation_members(user_id,profiles(id,username,display_name,avatar_url)))').eq('user_id', state.user.id).order('joined_at', {ascending:false});
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
        avatar_url: other?.avatar_url || ''
      }
    };
  }).filter(Boolean);
  renderConversationList();
}
function renderConversationList() {
  const html = state.conversations.length
    ? state.conversations.map(c => `<button class="dm-conversation-entry ${state.activeConversation?.id===c.id?'active':''}" data-open-dm="${c.id}">${avatarMarkup(c.otherUser.display_name || c.otherUser.username || '?',c.otherUser.avatar_url,'dm-avatar')}<span class="dm-conversation-copy"><strong>${escapeHTML(c.otherUser.display_name || c.otherUser.username || 'Pessoa LUMI')}</strong><small>@${escapeHTML(c.otherUser.username || 'lumi-user')}</small></span><span class="dm-entry-arrow material-symbols-rounded">chevron_right</span></button>`).join('')
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
    ? state.dmSearchResults.map(u => `<div class="dm-person-result">${avatarMarkup(u.display_name||u.username||'?',u.avatar_url,'dm-avatar')}<span class="dm-conversation-copy"><strong>${escapeHTML(u.display_name||u.username||'Pessoa LUMI')} ${accountBadges(u.id)}</strong><small>@${escapeHTML(u.username||'lumi-user')}</small></span><button class="dm-start-button" data-start-dm="${u.id}" title="Enviar mensagem"><span class="material-symbols-rounded">chat</span></button></div>`).join('')
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
  panel.innerHTML = `<header class="dm-chat-head"><button type="button" class="dm-mobile-back" data-dm-back aria-label="Voltar para conversas"><span class="material-symbols-rounded">arrow_back</span></button>${avatarMarkup(conversation.otherUser.display_name||conversation.otherUser.username||'?',conversation.otherUser.avatar_url,'dm-avatar')}<div class="dm-head-identity"><strong>${escapeHTML(conversation.otherUser.display_name||conversation.otherUser.username||'Pessoa LUMI')} ${accountBadges(conversation.otherUser.id)}</strong><small>@${escapeHTML(conversation.otherUser.username||'lumi-user')}</small></div><div class="dm-call-actions"><button class="icon-button dm-call-button" type="button" data-call="audio" title="Ligar por voz" aria-label="Ligar por voz"><span class="material-symbols-rounded">call</span></button><button class="icon-button dm-call-button" type="button" data-call="video" title="Ligar por vídeo" aria-label="Ligar por vídeo"><span class="material-symbols-rounded">videocam</span></button></div></header><div id="dmCallStage" class="dm-call-stage" hidden><div class="dm-call-participants">
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
</div><div class="dm-call-status" id="dmCallStatus">Preparando chamada…</div><div class="dm-call-controls"><button type="button" class="icon-button" data-call-control="mute" title="Microfone"><span class="material-symbols-rounded">mic</span></button><button type="button" class="icon-button" data-call-control="camera" title="Câmera"><span class="material-symbols-rounded">videocam</span></button><button type="button" class="icon-button dm-hangup" data-call-control="hangup" title="Encerrar chamada"><span class="material-symbols-rounded">call_end</span></button></div></div><div id="dmMessageList" class="dm-message-list"><div class="dm-search-loading">Carregando mensagens…</div></div><form id="dmMessageForm" class="dm-composer"><input id="dmFileInput" type="file" class="visually-hidden-file"><button class="dm-attach-button" type="button" id="dmAttachButton" title="Anexar arquivo" aria-label="Anexar arquivo"><span class="material-symbols-rounded">attach_file</span></button><textarea id="dmMessageInput" maxlength="4000" rows="1" placeholder="Mensagem para ${escapeHTML(conversation.otherUser.display_name||conversation.otherUser.username||'essa pessoa')}…" aria-label="Mensagem direta"></textarea><button class="send-button" type="submit" title="Enviar"><span class="material-symbols-rounded">send</span></button></form><div class="dm-attachment-hint">Arquivos de até 20 MB · imagens, documentos, áudio e outros arquivos</div>`;
  if (refreshList) renderConversationList();
  const {data,error} = await supabase.from('direct_messages').select('id,conversation_id,sender_id,content,attachment_path,attachment_name,attachment_type,attachment_size,created_at,profiles(display_name,username,avatar_url)').eq('conversation_id',id).order('created_at',{ascending:true}).limit(150);
  if (error) { console.error(error); $('#dmMessageList').innerHTML=`<div class="dm-empty-small">Não consegui carregar as mensagens: ${escapeHTML(error.message)}</div>`; return; }
  state.dmMessages = await signDMFileUrls(data||[]); renderDMMessages();
  state.dmRealtime = supabase.channel(`lumi-dm-${id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages',filter:`conversation_id=eq.${id}`},async payload=>{
    if (state.dmMessages.some(m=>m.id===payload.new.id)) return;
    const {data:msg} = await supabase.from('direct_messages').select('id,conversation_id,sender_id,content,attachment_path,attachment_name,attachment_type,attachment_size,created_at,profiles(display_name,username,avatar_url)').eq('id',payload.new.id).maybeSingle();
    if (msg && state.activeConversation?.id===id) { state.dmMessages.push(...await signDMFileUrls([msg])); renderDMMessages(); }
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
}
async function createCallPeer(recipientId, conversationId, mode) {
  state.callPeerId=recipientId; state.callConversationId=conversationId; state.callMode=mode; state.callSeenSignals=new Set(); state.pendingIceSignals=[];
  state.callRemoteStream=new MediaStream();
  state.callPC=new RTCPeerConnection({iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}]});
  state.callPC.ontrack=e=>{ e.streams[0]?.getTracks().forEach(t=>{if(!state.callRemoteStream.getTracks().some(x=>x.id===t.id))state.callRemoteStream.addTrack(t);}); attachCallMedia(); };
  state.callPC.onicecandidate=e=>{ if(e.candidate && state.callPeerId && state.callConversationId) sendCallSignal(state.callPeerId,state.callConversationId,'ice',e.candidate.toJSON()).catch(err=>console.warn('ICE:',err.message)); };
  state.callPC.onconnectionstatechange=()=>{const status=state.callPC?.connectionState;if(status==='connected')callStatus(state.callMode==='video'?'Chamada de vídeo conectada':'Chamada de voz conectada');else if(status==='failed')callStatus('A conexão falhou. Tente novamente ou use a mesma rede.');else if(status==='disconnected')callStatus('Reconectando…');};
  state.callLocalStream=await navigator.mediaDevices.getUserMedia({audio:true,video:mode==='video'});
  state.callLocalStream.getTracks().forEach(track=>state.callPC.addTrack(track,state.callLocalStream));
  attachCallMedia(); showCallStage();
}
async function startCall(mode) {
  if(!requireAuth())return;
  const conversation=state.activeConversation;
  if(!conversation){toast('Abra uma conversa antes de ligar.');return;}
  if(!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection){toast('Este navegador não permite chamadas. Tente no Chrome/Firefox ou no app desktop atualizado.','error');return;}
  if(state.callStatus!=='idle'){toast('Já existe uma chamada ativa.');return;}
  ensureCallSignalSubscription();
  try {
    state.callStatus='calling'; await createCallPeer(conversation.otherUser.id,conversation.id,mode);
    callStatus(`Chamando ${conversation.otherUser.display_name||conversation.otherUser.username||'seu contato'}…`);
    const offer=await state.callPC.createOffer(); await state.callPC.setLocalDescription(offer);
    await sendCallSignal(state.callPeerId,state.callConversationId,'offer',{sdp:offer.sdp,mode});
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
async function handleCallSignal(signal) {
  if(!signal || signal.sender_id===state.user?.id)return;
  if(signal.signal_type==='ice' && state.pendingCallOffer?.conversation_id===signal.conversation_id && !state.callPC){state.pendingIceSignals.push(signal.payload);return;}
  if(signal.signal_type==='offer') {
    if(state.callStatus!=='idle') { try{await sendCallSignal(signal.sender_id,signal.conversation_id,'busy',{});}catch{} return; }
    if(!state.conversations.some(c=>c.id===signal.conversation_id)) await loadConversations();
    const conversation=state.conversations.find(c=>c.id===signal.conversation_id);
    if(!conversation || conversation.otherUser.id!==signal.sender_id) return;
    state.pendingCallOffer=signal;
    const caller=conversation.otherUser.display_name||conversation.otherUser.username||'Seu contato';
    showIncomingCall(caller,signal.payload?.mode==='video'?'video':'audio');
    return;
  }
  if(signal.signal_type==='busy' && state.callPeerId===signal.sender_id){callStatus('A pessoa já está em outra chamada.');setTimeout(()=>cleanupCall(false),1800);return;}
  if(signal.conversation_id!==state.callConversationId || signal.sender_id!==state.callPeerId || !state.callPC)return;
  try {
    if(signal.signal_type==='answer' && state.callPC.signalingState==='have-local-offer') { await state.callPC.setRemoteDescription(new RTCSessionDescription(signal.payload)); await flushPendingIce(); }
    else if(signal.signal_type==='ice' && signal.payload) { if(!state.callPC.remoteDescription){state.pendingIceSignals.push(signal.payload);}else{try{await state.callPC.addIceCandidate(new RTCIceCandidate(signal.payload));}catch(err){console.warn('Candidato ICE ignorado:',err.message);}} }
    else if(signal.signal_type==='end') await cleanupCall(false);
  } catch(error) { console.error(error); callStatus('Erro ao conectar a chamada.'); }
}
function showIncomingCall(name,mode) {
  let layer=$('#lumiIncomingCall'); if(!layer){layer=document.createElement('div');layer.id='lumiIncomingCall';layer.className='lumi-incoming-call';document.body.append(layer);}
  layer.innerHTML=`<div class="lumi-incoming-card"><div class="lumi-incoming-icon"><span class="material-symbols-rounded">${mode==='video'?'videocam':'call'}</span></div><small>CHAMADA RECEBIDA</small><h3>${escapeHTML(name)}</h3><p>${mode==='video'?'está chamando por vídeo':'está chamando por voz'}</p><div class="lumi-incoming-actions"><button type="button" data-incoming-call="decline" class="dm-hangup"><span class="material-symbols-rounded">call_end</span> Recusar</button><button type="button" data-incoming-call="accept"><span class="material-symbols-rounded">call</span> Atender</button></div></div>`;
  layer.hidden=false;
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
  if(notifyPeer && state.callPeerId && state.callConversationId)try{await sendCallSignal(state.callPeerId,state.callConversationId,'end',{});}catch{}
  if(state.callPC){state.callPC.onicecandidate=null;state.callPC.ontrack=null;state.callPC.close();}
  state.callLocalStream?.getTracks().forEach(t=>t.stop()); state.callRemoteStream?.getTracks().forEach(t=>t.stop());
  state.callPC=null;state.callLocalStream=null;state.callRemoteStream=null;state.callPeerId=null;state.callConversationId=null;state.callStatus='idle';state.pendingIceSignals=[];state.callMuted=false;state.callVideoEnabled=true;state.pendingCallOffer=null;
  const stage=$('#dmCallStage'); if(stage)stage.hidden=true;
  const local=$('#dmLocalVideo'),remote=$('#dmRemoteVideo');if(local)local.srcObject=null;if(remote)remote.srcObject=null;
  const layer=$('#lumiIncomingCall');if(layer)layer.hidden=true;
}
async function toggleCallControl(control) {
  if(control==='hangup'){await cleanupCall(true);return;}
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
  if (!state.dmMessages.length) return `<div class="dm-empty-state"><div class="chat-empty-icon">✦</div><strong>Essa conversa começou agora</strong><p>Mande uma mensagem ou compartilhe um arquivo.</p></div>`;
  return state.dmMessages.map(m=>{const name=m.profiles?.display_name || (m.sender_id===state.user.id?state.profile?.display_name:state.activeConversation?.otherUser?.display_name) || 'Pessoa LUMI'; const attachment=m.attachment_name?`<div class="dm-file-card"><span class="dm-file-icon">${m.attachment_type?.startsWith('image/')?'▧':'↧'}</span><div><strong>${escapeHTML(m.attachment_name)}</strong><small>${formatFileSize(m.attachment_size)}</small></div>${m.attachment_url?`<a href="${escapeHTML(m.attachment_url)}" target="_blank" rel="noopener noreferrer" download="${escapeHTML(m.attachment_name)}">Abrir</a>`:`<span class="dm-file-unavailable">Indisponível</span>`}</div>`:''; const image=m.attachment_type?.startsWith('image/')&&m.attachment_url?`<a class="dm-image-link" href="${escapeHTML(m.attachment_url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHTML(m.attachment_url)}" alt="${escapeHTML(m.attachment_name||'Imagem compartilhada')}"></a>`:'';return `<article class="dm-message-item ${m.sender_id===state.user.id?'mine':''}">${avatarMarkup(name,m.profiles?.avatar_url,'dm-avatar')}<div class="dm-message-body"><div class="dm-message-meta"><strong>${escapeHTML(name)}</strong>${accountBadges(m.sender_id)}<time>${shortDate(m.created_at)}</time></div>${m.content?`<div class="dm-message-text">${escapeHTML(m.content)}</div>`:''}${image}${attachment}</div></article>`;}).join('');
}
function renderDMMessages() { const list=$('#dmMessageList'); if(!list)return; const nearBottom=list.scrollHeight-list.scrollTop-list.clientHeight<120; list.innerHTML=dmMessagesHTML(); if(nearBottom)list.scrollTop=list.scrollHeight; }
async function sendDM(event) {
  event.preventDefault(); if(!requireAuth()||!state.activeConversation)return;
  const input=$('#dmMessageInput'); const fileInput=$('#dmFileInput'); const content=input.value.trim(); const file=fileInput.files?.[0]; if(!content&&!file)return;
  if(file && file.size>20*1024*1024){toast('O arquivo precisa ter no máximo 20 MB.','error');return;}
  const submit=$('#dmMessageForm button[type="submit"]'); if(submit)submit.disabled=true;
  let attachment_path=null;
  if(file){ const safeName=file.name.replace(/[^\p{L}\p{N}._ -]/gu,'_').slice(-120)||'arquivo'; attachment_path=`${state.activeConversation.id}/${state.user.id}/${crypto.randomUUID()}-${safeName}`; const {error:uploadError}=await supabase.storage.from('dm-attachments').upload(attachment_path,file,{contentType:file.type||'application/octet-stream',upsert:false}); if(uploadError){if(submit)submit.disabled=false;toast(`Não consegui enviar o arquivo: ${uploadError.message}. Confira o SQL de anexos.`, 'error');return;} }
  const payload={conversation_id:state.activeConversation.id,sender_id:state.user.id,content,attachment_path,attachment_name:file?.name||null,attachment_type:file?.type||null,attachment_size:file?.size||null};
  const {data,error}=await supabase.from('direct_messages').insert(payload).select('id,conversation_id,sender_id,content,attachment_path,attachment_name,attachment_type,attachment_size,created_at,profiles(display_name,username,avatar_url)').single();
  if(submit)submit.disabled=false;
  if(error){console.error(error);toast(`Não consegui enviar: ${error.message}`,'error');return;}
  state.dmMessages.push(...await signDMFileUrls([data])); input.value='';fileInput.value='';renderDMMessages();input.focus();
}
function renderProfile() {
  $('.main-panel').classList.remove('workspace-mode'); $('.app-shell').classList.remove('workspace-mode','inbox-mode'); $('#crumbParent').textContent='LUMI';$('#crumbCurrent').textContent='Perfil';
  const name=state.profile?.display_name || state.user?.email?.split('@')[0] || 'Visitante';
  const photo = state.profile?.avatar_url;
  $('#pageContent').innerHTML = `<section class="page-placeholder"><div class="eyebrow">SUA IDENTIDADE</div><h1>Seu perfil</h1><p>Personalize como as pessoas vão conhecer você no LUMI.</p><div class="inbox-layout"><div class="inbox-note"><div class="profile-photo-preview">${photo?`<img class="avatar-image" src="${escapeHTML(photo)}" alt="Sua foto de perfil">`:`<span>${escapeHTML(initials(name))}</span>`}</div><strong>${escapeHTML(name)} ${accountBadges(state.user?.id)}</strong><p>Escolha uma foto para deixar seu perfil com a sua cara.</p><label class="secondary-button upload-photo-button" for="profilePhoto">Escolher foto</label><input id="profilePhoto" class="visually-hidden-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></div><form id="profileForm" class="modal-card" style="width:100%;max-width:none;border:1px solid var(--line);box-shadow:none"><label class="field-label" for="profileDisplayName">Nome de exibição</label><input class="form-input" id="profileDisplayName" maxlength="40" value="${escapeHTML(name)}" required><button class="primary-button full-button" type="submit">Salvar perfil <span>→</span></button><button class="secondary-button full-button" type="button" data-action="signout">Sair da conta</button></form></div><div class="notice-box">Os selos de verificação e de dono são atribuídos oficialmente pela configuração do LUMI, não pelo próprio usuário.</div></section>`;
}
async function saveProfile(event) {
  event.preventDefault(); if (!state.user) return;
  const display_name=$('#profileDisplayName').value.trim(); if (!display_name) return;
  const {error}=await supabase.from('profiles').update({display_name}).eq('id',state.user.id);
  if(error){toast(`Não foi possível salvar: ${error.message}`,'error');return;}
  state.profile.display_name=display_name; updateIdentity(); renderProfile(); toast('Perfil atualizado!','success');
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
function authErrorMessage(error){const msg=error.message||'';if(msg.includes('Invalid login credentials'))return 'E-mail ou senha incorretos.';if(msg.includes('already registered'))return 'Este e-mail já tem uma conta. Tente entrar.';if(msg.includes('Password should be'))return 'A senha precisa ter pelo menos 6 caracteres.';return msg;}
async function onSessionChange(user) {
  if (state.user?.id && state.user.id !== user?.id) { if(state.callRealtime){await supabase.removeChannel(state.callRealtime);state.callRealtime=null;} await cleanupCall(false); }
  state.user=user;
  if(state.realtime){await supabase.removeChannel(state.realtime);state.realtime=null;}
  if(!user){if(state.callRealtime){await supabase.removeChannel(state.callRealtime);state.callRealtime=null;}state.profile=null;state.spaces=[];state.activeSpace=null;state.channels=[];state.activeChannel=null;state.messages=[];updateIdentity();renderSpaceNav();renderHome();return;}
  ensureCallSignalSubscription();
  await loadProfile();await loadSpaces();updateIdentity();if(state.page==='home')renderHome();
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
  if(saveRoleButton){const select=$(`[data-member-role="${saveRoleButton.dataset.saveRole}"]`);const {error}=await supabase.rpc('set_space_member_role',{p_space_id:state.activeSpace.id,p_user_id:saveRoleButton.dataset.saveRole,p_role:select.value});if(error){toast(`Não foi possível alterar o papel: ${error.message}`,'error');return;}toast('Papel do membro atualizado!','success');await manageMembers();return;}
  if(event.target.closest('[data-close]')){closeModal(event.target.closest('[data-close]').dataset.close);return;}
  if(!action)return;
  if(action==='create-space'){if(requireAuth())openModal('spaceModal');}
  else if(action==='auth'){setAuthMode('signin');openModal('authModal');}
  else if(action==='discover')setPage('discover');
  else if(action==='home')setPage('home');
  else if(action==='show-inbox')setPage('inbox');
  else if(action==='create-channel'){if(requireAuth()&&state.activeSpace)openModal('channelModal');else if(!state.activeSpace)toast('Abra um espaço primeiro.');}
  else if(action==='invite')showInvite();
  else if(action==='manage-members')await manageMembers();
  else if(action==='search-spaces'){state.search=$('#discoverQuery')?.value.trim()||'';renderDiscover();}
  else if(action==='signout')await signOut();
});

$('#authForm').addEventListener('submit',handleAuth);
$('#authSwitch').addEventListener('click',()=>setAuthMode(state.authMode==='signin'?'signup':'signin'));
$('#spaceForm').addEventListener('submit',createSpace);
$('#channelForm').addEventListener('submit',createChannel);
$('#inviteForm').addEventListener('submit',async e=>{e.preventDefault();await joinSpaceByCode($('#joinCode').value);});
$('#copyInvite').addEventListener('click',copyInvite);
$('#spaceSearch').addEventListener('input',renderSpaceNav);
$('#messageForm')?.addEventListener('submit',sendMessage);
document.addEventListener('submit',e=>{if(e.target.id==='dmMessageForm')sendDM(e);});
document.addEventListener('click',e=>{const edit=e.target.closest('[data-space-edit]');if(edit){editSpaceMessage(edit.dataset.spaceEdit);return;}const del=e.target.closest('[data-space-delete]');if(del){deleteSpaceMessage(del.dataset.spaceDelete);return;}const reply=e.target.closest('[data-space-reply]');if(reply){replyToSpaceMessage(reply.dataset.spaceReply);return;}const react=e.target.closest('[data-space-react]');if(react){reactToSpaceMessage(react.dataset.spaceReact,react.dataset.emoji||null);return;}if(e.target.closest('[data-space-reply-cancel]')){state.spaceReplyTo=null;renderWorkspace();return;}if(e.target.closest('#spaceAttachButton')){$('#spaceFileInput')?.click();return;}if(e.target.closest('#dmSearchButton'))searchDMPeople();if(e.target.closest('#dmMobileSearchButton'))searchDMPeople();if(e.target.closest('#dmRefreshButton'))loadConversations();if(e.target.closest('#dmAttachButton'))$('#dmFileInput')?.click();});
document.addEventListener('click',e=>{const call=e.target.closest('[data-call]');if(call){startCall(call.dataset.call);return;}const control=e.target.closest('[data-call-control]');if(control){toggleCallControl(control.dataset.callControl);return;}const incoming=e.target.closest('[data-incoming-call]');if(incoming){if(incoming.dataset.incomingCall==='accept')acceptIncomingCall();else declineIncomingCall();}});
document.addEventListener('keydown',e=>{if((e.target.id==='dmPeopleSearch'||e.target.id==='dmMobilePeopleSearch')&&e.key==='Enter'){e.preventDefault();searchDMPeople();}});
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
$('#notificationsButton').addEventListener('click',()=>toast('Notificações entram na próxima etapa do LUMI.'));
$('#rightPanelMenu').addEventListener('click',()=>toast('Mais opções de perfil chegam em breve.'));
$('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){state.search=e.target.value.trim();setPage('discover');}});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus();}if(e.key==='Escape'){$$('.modal[open]').forEach(d=>d.close());}});

// Reage à sessão existente e a login/logout em outras abas.
const {data:{session}}=await supabase.auth.getSession();
await onSessionChange(session?.user || null);
if (state.user) ensureCallSignalSubscription();
supabase.auth.onAuthStateChange((_event,session)=>{if(session?.user?.id!==state.user?.id)queueMicrotask(()=>onSessionChange(session?.user||null));});
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
