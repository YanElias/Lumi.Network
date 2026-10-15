import { supabase } from './database/supabase.js';


const $ = (s, root=document) => root.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let currentUser = null;
let assistantOpen = false;
let gifPanelOpen = false;
let assistantBusy = false;

function toast(message, error=false) {
  const region = $('#toastRegion');
  if (!region) return;
  const node = document.createElement('div');
  node.className = 'toast' + (error ? ' error' : ' success');
  node.textContent = message;
  region.append(node);
  setTimeout(() => node.remove(), 3500);
}

function installStyles() {
  if ($('#lumiExtrasStyles')) return;
  const style = document.createElement('style');
  style.id = 'lumiExtrasStyles';
  style.textContent = `
    .lumi-extras-fab{position:fixed;left:22px;bottom:22px;z-index:8000;width:48px;height:48px;border:1px solid var(--line,rgba(0,0,0,.12));border-radius:17px;background:var(--surface,#fff);color:var(--text,#222);box-shadow:0 8px 30px #0002;font-size:20px;cursor:pointer}
    .lumi-assistant{position:fixed;left:22px;bottom:80px;z-index:8000;width:min(360px,calc(100vw - 32px));max-height:min(520px,70vh);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line,rgba(0,0,0,.12));border-radius:20px;background:var(--surface,#fff);color:var(--text,#222);box-shadow:0 20px 60px #0003}
    .lumi-assistant[hidden],.lumi-gif-panel[hidden]{display:none!important}
    .lumi-assistant-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--line,rgba(0,0,0,.1));font-weight:700}
    .lumi-assistant-head small{display:block;font-weight:400;opacity:.65;font-size:11px;margin-top:3px}
    .lumi-assistant-log{padding:14px;overflow:auto;display:flex;flex-direction:column;gap:9px;min-height:150px}
    .lumi-assistant-msg{padding:10px 12px;border-radius:13px;background:var(--panel,#f3f3f3);font-size:13px;line-height:1.45;max-width:95%;overflow-wrap:anywhere}
    .lumi-assistant-msg.mine{align-self:flex-end;background:var(--accent-soft,#fff4bf)}
    .lumi-assistant-actions{display:flex;gap:7px;flex-wrap:wrap}
    .lumi-assistant-actions button,.lumi-gif-panel button{border:1px solid var(--line,rgba(0,0,0,.12));background:var(--surface,#fff);color:inherit;border-radius:10px;padding:8px 10px;cursor:pointer;font-size:12px}
    .lumi-assistant-form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line,rgba(0,0,0,.1))}
    .lumi-assistant-form input,.lumi-gif-search{min-width:0;flex:1;border:1px solid var(--line,rgba(0,0,0,.14));border-radius:11px;padding:10px;background:var(--surface,#fff);color:inherit}
    .lumi-assistant-form button,.lumi-gif-search-button{border:0;border-radius:11px;padding:0 13px;background:var(--accent,#ffd83d);color:#191919;font-weight:700;cursor:pointer}
    .lumi-gif-button{flex:0 0 auto;border:1px solid var(--line,rgba(0,0,0,.14));border-radius:12px;background:var(--surface,#fff);color:inherit;padding:0 11px;cursor:pointer;font-weight:800}
    #dmMessageForm{position:relative}.lumi-gif-panel{position:absolute;bottom:calc(100% + 10px);left:8px;width:min(340px,calc(100vw - 48px));max-height:360px;overflow:auto;padding:12px;border:1px solid var(--line,rgba(0,0,0,.15));border-radius:16px;background:var(--surface,#fff);color:var(--text,#222);box-shadow:0 12px 35px #0003;z-index:30}
    .lumi-gif-panel form{display:flex;gap:7px;margin:9px 0}
    .lumi-gif-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .lumi-gif-results button{padding:3px;overflow:hidden}
    .lumi-gif-results img{display:block;width:100%;height:92px;object-fit:cover;border-radius:8px}
    .lumi-gif-hint{font-size:11px;opacity:.7;line-height:1.4}
    .lumi-gif-tabs{display:flex;gap:5px;margin:10px 0;flex-wrap:wrap}
    .lumi-gif-tabs button{flex:1;min-width:0;padding:7px 8px;border-radius:9px;font-size:11px}
    .lumi-gif-tabs button.active{background:var(--accent,#ffd83d);border-color:var(--accent,#ffd83d);color:#222;font-weight:800}
    .lumi-gif-browser-results{margin-top:8px}
    .lumi-gif-results-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
    .lumi-gif-results-grid button{padding:3px;min-width:0;overflow:hidden}
    .lumi-gif-results-grid img{display:block;width:100%;height:82px;object-fit:cover;border-radius:8px}
    .lumi-gif-category-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
    .lumi-gif-category{position:relative;min-height:66px;overflow:hidden;padding:0!important;text-align:left;background:#222!important;color:#fff!important}
    .lumi-gif-category img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.72}
    .lumi-gif-category span{position:relative;display:block;padding:10px;font-size:11px;font-weight:800;text-shadow:0 1px 4px #000}
    .lumi-space-gif-panel [data-tenor-search-form]{display:flex;gap:7px;margin:9px 0}
    .lumi-space-gif-panel [data-tenor-search-form] input{min-width:0;flex:1}

    .dm-message-gif{display:block;max-width:min(320px,65vw);max-height:260px;object-fit:contain;border-radius:12px;margin-top:6px}
    .lumi-assistant-person{display:flex;align-items:center;gap:9px;padding:9px 0;border-top:1px solid var(--line,rgba(0,0,0,.08))}
    .lumi-assistant-person img,.lumi-assistant-avatar{width:32px;height:32px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:var(--panel,#eee)}
    .lumi-assistant-person div{min-width:0;flex:1}.lumi-assistant-person strong{display:block;font-size:12px}.lumi-assistant-person small{display:block;opacity:.7;font-size:11px}
    @media(max-width:600px){.lumi-extras-fab{left:12px;bottom:12px}.lumi-assistant{left:12px;bottom:68px}}
    html[data-theme="dark"] .lumi-assistant-msg.mine{background:rgba(255,216,61,.17);color:var(--text,#f4f4f4)}
  `;
  document.head.append(style);
}

function installAssistant() {
  if ($('#lumiAssistantFab')) return;
  const fab = document.createElement('button');
  fab.id = 'lumiAssistantFab'; fab.className = 'lumi-extras-fab';
  fab.type = 'button'; fab.title = 'Abrir LUMI Assist'; fab.setAttribute('aria-label','Abrir LUMI Assist');
  fab.textContent = '✦';
  fab.addEventListener('click', () => {
    const panel = $('#lumiAssistantPanel');
    panel.hidden = !panel.hidden;
    assistantOpen = !panel.hidden;
    if (assistantOpen) $('#lumiAssistantInput')?.focus();
  });
  const panel = document.createElement('section');
  panel.id = 'lumiAssistantPanel'; panel.className = 'lumi-assistant'; panel.hidden = true;
  panel.innerHTML = `
    <header class="lumi-assistant-head"><div>LUMI Assist<small>Ajuda rápida e sugestões de pessoas</small></div><button type="button" data-assistant-close aria-label="Fechar">×</button></header>
    <div class="lumi-assistant-log" id="lumiAssistantLog"><div class="lumi-assistant-msg">Oi! Posso ajudar a encontrar pessoas com interesses parecidos, explicar recursos do LUMI ou te dar dicas de uso.</div><div class="lumi-assistant-actions"><button type="button" data-assistant-action="people">Encontrar pessoas parecidas</button><button type="button" data-assistant-action="help">O que você faz?</button></div></div>
    <form class="lumi-assistant-form" id="lumiAssistantForm"><input id="lumiAssistantInput" maxlength="300" placeholder="Pergunte alguma coisa…" autocomplete="off"><button type="submit">Enviar</button></form>`;
  document.body.append(fab,panel);
  panel.addEventListener('click', async event => {
    if (event.target.closest('[data-assistant-close]')) { panel.hidden = true; assistantOpen = false; return; }
    const action = event.target.closest('[data-assistant-action]')?.dataset.assistantAction;
    if (action === 'people') await recommendPeople();
    if (action === 'help') addAssistantMessage('Consigo dar dicas rápidas e sugerir pessoas com base nos interesses informados nos perfis. Ainda não sou uma IA generativa conectada a um modelo externo.');
    const start = event.target.closest('[data-assistant-start-dm]')?.dataset.assistantStartDm;
    if (start) await startConversation(start);
  });
  $('#lumiAssistantForm').addEventListener('submit', event => {
    event.preventDefault();
    const input = $('#lumiAssistantInput');
    const value = input.value.trim();
    if (!value) return;
    input.value = '';
    addAssistantMessage(value, true);
    respondToAssistant(value);
  });
}

function addAssistantMessage(message, mine=false) {
  const log = $('#lumiAssistantLog');
  if (!log) return;
  const node = document.createElement('div');
  node.className = 'lumi-assistant-msg' + (mine ? ' mine' : '');
  node.textContent = message;
  log.append(node); log.scrollTop = log.scrollHeight;
}
function assistantActions(html) {
  const log = $('#lumiAssistantLog');
  const node = document.createElement('div'); node.className = 'lumi-assistant-actions'; node.innerHTML = html;
  log.append(node); log.scrollTop = log.scrollHeight;
}
async function respondToAssistant(message) {
  const q = message.toLowerCase();
  if (/amig|pessoa|interesse|conhecer|encontrar/.test(q)) { await recommendPeople(); return; }
  if (/chamad|lig|web.?rtc/.test(q)) {
    addAssistantMessage('Para atender, deixe o LUMI aberto, permita microfone/câmera e clique em Atender assim que o cartão aparecer. Se a chamada ficar em “conectando”, a rede pode precisar de um servidor TURN — STUN sozinho não resolve todos os roteadores.');
    return;
  }
  if (/gif/.test(q)) {
    addAssistantMessage('Nas mensagens diretas, use o botão GIF ao lado do campo de mensagem. A busca de GIF precisa de uma chave de API do Tenor configurada por você.');
    return;
  }
  if (/privacidade|streamer/.test(q)) {
    addAssistantMessage('Ative Modo streamer em Configurações para ocultar visualmente nomes e selos. Para privacidade real durante uma live, use uma conta de teste e evite mostrar conversas privadas.');
    return;
  }
  if (/obrigad|valeu/.test(q)) { addAssistantMessage('De nada! ✨'); return; }
  addAssistantMessage('Ainda não tenho uma resposta pronta para isso. Posso ajudar com chamadas, GIFs, amizades e privacidade.');
  assistantActions('<button type="button" data-assistant-action="people">Encontrar pessoas parecidas</button><button type="button" data-assistant-action="help">Ajuda</button>');
}
async function recommendPeople() {
  if (!currentUser) { addAssistantMessage('Entre na sua conta para eu procurar pessoas.'); return; }
  if (assistantBusy) return;
  assistantBusy = true;
  addAssistantMessage('Vou procurar perfis com atividades ou descrições parecidas com as suas…');
  try {
    const {data: me} = await supabase.from('profiles').select('bio,activity_text,status_text').eq('id',currentUser.id).maybeSingle();
    const ownText = [me?.bio,me?.activity_text,me?.status_text].filter(Boolean).join(' ').toLowerCase();
    const tokens = [...new Set(ownText.split(/[^\p{L}\p{N}]+/u).filter(word=>word.length>2))].slice(0,12);
    const {data,error} = await supabase.from('profiles').select('id,username,display_name,avatar_url,bio,activity_text').neq('id',currentUser.id).limit(80);
    if (error) throw error;
    const people = (data||[]).map(person => {
      const text = [person.bio,person.activity_text].filter(Boolean).join(' ').toLowerCase();
      const score = tokens.reduce((total,token)=>total+(text.includes(token)?1:0),0);
      return {...person,score};
    }).filter(person=>person.score>0).sort((a,b)=>b.score-a.score).slice(0,5);
    const log = $('#lumiAssistantLog');
    if (!people.length) {
      addAssistantMessage(tokens.length ? 'Ainda não achei perfis com interesses parecidos. Adicione seus jogos e interesses na bio/atividade do perfil para melhorar as sugestões.' : 'Adicione uma bio ou atividade ao seu perfil primeiro. Assim consigo comparar interesses de forma simples.');
      return;
    }
    const host = document.createElement('div');
    host.innerHTML = people.map(person => `<div class="lumi-assistant-person">${person.avatar_url?'<img src="'+esc(person.avatar_url)+'" alt="">':'<span class="lumi-assistant-avatar">'+esc((person.display_name||person.username||'?').slice(0,1).toUpperCase())+'</span>'}<div><strong>${esc(person.display_name||person.username||'Pessoa LUMI')}</strong><small>${esc(person.activity_text||person.bio||'Interesses parecidos')}</small></div><button type="button" data-assistant-start-dm="${esc(person.id)}">Conversar</button></div>`).join('');
    log.append(host); log.scrollTop=log.scrollHeight;
  } catch (error) {
    addAssistantMessage('Não consegui carregar sugestões agora. ' + (error.message || 'Tente novamente mais tarde.'));
  } finally { assistantBusy = false; }
}
async function startConversation(userId) {
  if (!currentUser || !userId || userId === currentUser.id) return;
  const {data,error} = await supabase.rpc('start_direct_conversation',{p_user_id:userId});
  if (error) { toast('Não consegui abrir a conversa: '+error.message,true); return; }
  const id = typeof data === 'string' ? data : data?.conversation_id || data?.id;
  const url = new URL(window.location.href);
  url.searchParams.set('lumi_open_conversation',id);
  window.history.replaceState({},'',url);
  window.dispatchEvent(new CustomEvent('lumi:open-conversation',{detail:{id}}));
  toast('Conversa preparada. Abra Mensagens para continuar.');
}


function tenorApiUrl(endpoint, params={}) {
  const key = localStorage.getItem('lumi-tenor-api-key') || '';
  return 'https://tenor.googleapis.com/v2/' + endpoint + '?' + new URLSearchParams({
    key, client_key:'lumi_network', locale:'pt_BR', country:'BR',
    contentfilter:'medium', ...params
  });
}
function normalizeTenorGifs(data, fallback='GIF') {
  return (data.results || []).map(item => ({
    url: item.media_formats?.gif?.url || item.media_formats?.mediumgif?.url || item.media_formats?.tinygif?.url,
    preview: item.media_formats?.tinygif?.url || item.media_formats?.nanogif?.url || item.media_formats?.gif?.url,
    alt: item.content_description || item.title || fallback
  })).filter(gif => gif.url && /^https:\/\/(media\.tenor\.com|tenor\.com)\//i.test(gif.url));
}
async function fetchTenorJson(endpoint, params={}) {
  const key = localStorage.getItem('lumi-tenor-api-key') || '';
  if (!key) throw new Error('Configure sua chave de API do Tenor no seletor de GIF das mensagens diretas.');
  const response = await fetch(tenorApiUrl(endpoint, params));
  if (!response.ok) throw new Error('O Tenor respondeu com erro ' + response.status + '.');
  return response.json();
}
function installTenorBrowser(panel, results, queryInput, onSelect) {
  let nextPos = '';
  let activeMode = 'featured';
  let activeQuery = '';
  let requestId = 0;
  const load = async (mode, query='', append=false) => {
    if (!append) { activeMode = mode; activeQuery = query; nextPos = ''; }
    const thisRequest = ++requestId;
    const key = localStorage.getItem('lumi-tenor-api-key') || '';
    if (!key) {
      results.innerHTML = '<p class="lumi-gif-hint">Configure sua chave de API do Tenor para carregar GIFs.</p>';
      return;
    }
    if (!append) results.innerHTML = '<p class="lumi-gif-hint">Carregando GIFs…</p>';
    else results.querySelector('[data-tenor-more]')?.remove();
    try {
      if (mode === 'categories') {
        const data = await fetchTenorJson('categories', {type:'featured'});
        const categories = (data.tags || []).slice(0,18).map(item => ({
          name: item.name || item.searchterm || 'GIF',
          term: item.searchterm || item.name || '',
          image: item.image || item.image_url || item.gif?.url || ''
        })).filter(item => item.term);
        if (!categories.length) {
          results.innerHTML = '<p class="lumi-gif-hint">As categorias não estão disponíveis agora.</p>';
          return;
        }
        results.innerHTML = '<div class="lumi-gif-category-grid">' + categories.map((item,index) =>
          '<button type="button" class="lumi-gif-category" data-tenor-category="' + index + '">' +
          (item.image && /^https:\/\//i.test(item.image) ? '<img loading="lazy" src="' + esc(item.image) + '" alt="">' : '') +
          '<span>' + esc(item.name) + '</span></button>'
        ).join('') + '</div>';
        results._categories = categories;
        results._gifs = [];
        return;
      }
      const endpoint = mode === 'search' ? 'search' : 'featured';
      const params = mode === 'search'
        ? {q:query, limit:'18', media_filter:'gif,tinygif', ...(append && nextPos ? {pos:nextPos} : {})}
        : {limit:'18', media_filter:'gif,tinygif', ...(append && nextPos ? {pos:nextPos} : {})};
      const data = await fetchTenorJson(endpoint, params);
      if (thisRequest !== requestId) return;
      nextPos = data.next || '';
      const gifs = normalizeTenorGifs(data, query || 'Em alta');
      if (!gifs.length) {
        if (append && results._gifs?.length) {
          results.innerHTML = '<div class="lumi-gif-results-grid">' + results._gifs.map((gif,index) => '<button type="button" data-gif-index="' + index + '" title="' + esc(gif.alt) + '"><img loading="lazy" src="' + esc(gif.preview) + '" alt="' + esc(gif.alt) + '"></button>').join('') + '</div><p class="lumi-gif-hint">Não há mais GIFs para carregar.</p>';
        } else results.innerHTML = '<p class="lumi-gif-hint">Nenhum GIF encontrado. Tente outra busca.</p>';
        return;
      }
      if (append) results._gifs = [...(results._gifs || []), ...gifs];
      else results._gifs = gifs;
      const grid = '<div class="lumi-gif-results-grid">' + results._gifs.map((gif,index) =>
        '<button type="button" data-gif-index="' + index + '" title="' + esc(gif.alt) + '">' +
        '<img loading="lazy" src="' + esc(gif.preview) + '" alt="' + esc(gif.alt) + '"></button>'
      ).join('') + '</div>';
      results.innerHTML = grid + (nextPos ? '<button type="button" data-tenor-more style="width:100%;margin-top:8px">Carregar mais GIFs</button>' : '');
      results._categories = [];
    } catch (error) {
      if (thisRequest !== requestId) return;
      if (append && results._gifs?.length) {
        results.insertAdjacentHTML('beforeend', '<p class="lumi-gif-hint">' + esc(error.message || 'Não consegui carregar mais GIFs.') + '</p>');
      } else results.innerHTML = '<p class="lumi-gif-hint">' + esc(error.message || 'Não consegui carregar os GIFs.') + '</p>';
    }
  };
  panel.querySelectorAll('[data-tenor-tab]').forEach(tab => tab.addEventListener('click', () => {
    panel.querySelectorAll('[data-tenor-tab]').forEach(item => item.classList.toggle('active', item === tab));
    const mode = tab.dataset.tenorTab;
    if (mode === 'search') {
      queryInput?.focus();
      if (queryInput?.value.trim()) load('search', queryInput.value.trim());
      else results.innerHTML = '<p class="lumi-gif-hint">Digite algo na busca para encontrar GIFs.</p>';
    } else load(mode);
  }));
  const searchForm = panel.querySelector('[data-tenor-search-form]');
  searchForm?.addEventListener('submit', event => {
    event.preventDefault();
    const query = queryInput?.value.trim() || '';
    if (!query) return;
    panel.querySelectorAll('[data-tenor-tab]').forEach(item => item.classList.toggle('active', item.dataset.tenorTab === 'search'));
    load('search', query);
  });
  results.addEventListener('click', event => {
    if (event.target.closest('[data-tenor-more]')) {
      load(activeMode, activeQuery, true);
      return;
    }
    const categoryButton = event.target.closest('[data-tenor-category]');
    if (categoryButton) {
      const category = results._categories?.[Number(categoryButton.dataset.tenorCategory)];
      if (category) {
        if (queryInput) queryInput.value = category.term;
        panel.querySelectorAll('[data-tenor-tab]').forEach(item => item.classList.toggle('active', item.dataset.tenorTab === 'search'));
        load('search', category.term);
      }
      return;
    }
    const gifButton = event.target.closest('[data-gif-index]');
    if (gifButton) {
      const gif = results._gifs?.[Number(gifButton.dataset.gifIndex)];
      if (gif) onSelect(gif.url);
    }
  });
  load('featured');
}

function installGifButton() {
  const form = $('#dmMessageForm');
  const spaceFormObserver = new MutationObserver(() => installSpaceGifPicker());
  if ($('#activeSpaceNav')) spaceFormObserver.observe($('#activeSpaceNav'), {childList:true,subtree:true});
  const mainObserver = new MutationObserver(() => installSpaceGifPicker());
  if ($('.main-panel')) mainObserver.observe($('.main-panel'), {childList:true,subtree:true});
  if (!form || form.querySelector('#lumiGifButton')) return;
  const attach = $('#dmAttachButton',form);
  const button = document.createElement('button');
  button.id = 'lumiGifButton'; button.type='button'; button.className='lumi-gif-button';
  button.textContent='GIF'; button.title='Buscar GIFs'; button.setAttribute('aria-label','Buscar GIFs');
  const panel = document.createElement('section');
  panel.id='lumiGifPanel'; panel.className='lumi-gif-panel'; panel.hidden=true;
  panel.innerHTML = '<strong>Enviar um GIF</strong><p class="lumi-gif-hint">Em alta, categorias e busca do Tenor. Sua chave fica salva neste navegador.</p>' +
    '<label class="lumi-gif-hint" for="lumiTenorKey">Chave de API do Tenor</label><input id="lumiTenorKey" class="lumi-gif-search" placeholder="Cole sua chave de API" autocomplete="off">' +
    '<div class="lumi-gif-tabs"><button type="button" data-tenor-tab="featured" class="active">Em alta</button><button type="button" data-tenor-tab="categories">Categorias</button><button type="button" data-tenor-tab="search">Buscar</button></div>' +
    '<form data-tenor-search-form><input id="lumiGifQuery" class="lumi-gif-search" placeholder="Buscar GIFs…"><button class="lumi-gif-search-button" type="submit">Buscar</button></form>' +
    '<div class="lumi-gif-browser-results" id="lumiGifResults"></div>';
  const wrap = document.createElement('div'); wrap.style='position:relative;display:flex;align-items:center;';
  wrap.append(button,panel);
  if (attach?.nextSibling) form.insertBefore(wrap,attach.nextSibling); else form.prepend(wrap);
  const keyInput = $('#lumiTenorKey', panel);
  const queryInput = $('#lumiGifQuery', panel);
  const results = $('#lumiGifResults', panel);
  keyInput.value = localStorage.getItem('lumi-tenor-api-key') || '';
  keyInput.addEventListener('change', event => {
    localStorage.setItem('lumi-tenor-api-key', event.target.value.trim());
    if (!panel.hidden) {
      const active = panel.querySelector('[data-tenor-tab].active')?.dataset.tenorTab || 'featured';
      if (active === 'search' && queryInput.value.trim()) panel.querySelector('[data-tenor-search-form]')?.requestSubmit();
      else panel.querySelector('[data-tenor-tab="' + (active === 'search' ? 'featured' : active) + '"]')?.click();
    }
  });
  let browserReady = false;
  button.addEventListener('click', () => {
    panel.hidden = !panel.hidden; gifPanelOpen = !panel.hidden;
    if (!panel.hidden) {
      if (!browserReady) { installTenorBrowser(panel, results, queryInput, url => sendGif(url)); browserReady = true; }
      queryInput.focus();
    }
  });
  // Defer the browser setup until the panel is first opened, but keep the key field available.
  keyInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); keyInput.blur(); } });
}

async function sendGif(url) {
  if (!currentUser) {toast('Entre para enviar GIFs.',true);return;}
  const conversationId = window.lumiActiveConversationId || document.querySelector('#dmChatPanel')?.dataset.conversationId;
  if (!conversationId) {toast('Abra uma conversa antes de enviar GIF.',true);return;}
  if (!/^https:\/\/(media\.tenor\.com|tenor\.com)\//i.test(url)) {toast('Esse endereço de GIF não é aceito.',true);return;}
  const {error} = await supabase.from('direct_messages').insert({
    conversation_id:conversationId,sender_id:currentUser.id,content:'LUMI_GIF:'+url,
    attachment_path:null,attachment_name:null,attachment_type:null,attachment_size:null
  });
  if(error){toast('Não consegui enviar o GIF: '+error.message,true);return;}
  $('#lumiGifPanel').hidden=true;
  toast('GIF enviado! ✨');
}

async function processNotificationReply() {
  const url = new URL(window.location.href);
  const text = url.searchParams.get('lumi_reply');
  const conversationId = url.searchParams.get('conversation_id');
  if (!text || !conversationId || !currentUser) return;
  url.searchParams.delete('lumi_reply');
  url.searchParams.delete('conversation_id');
  window.history.replaceState({},'',url.pathname+url.search+url.hash);
  const content = text.trim().slice(0,4000);
  if (!content) return;
  const {error} = await supabase.from('direct_messages').insert({
    conversation_id:conversationId,sender_id:currentUser.id,content,
    attachment_path:null,attachment_name:null,attachment_type:null,attachment_size:null
  });
  if (error) toast('A resposta da notificação não foi enviada. Abra a conversa para tentar novamente.',true);
  else toast('Resposta enviada pela notificação!');
}


function installSpaceGifPicker() {
  const form = $('#messageForm');
  if (!form || form.dataset.lumiSpaceGifReady === 'true') return;
  const input = $('#messageInput');
  const attach = $('#spaceAttachButton');
  if (!input || !attach) return;
  form.dataset.lumiSpaceGifReady = 'true';
  const wrap = document.createElement('div');
  wrap.className = 'lumi-space-gif-wrap';
  wrap.style.cssText = 'position:relative;display:flex;align-items:center;';
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'dm-attach-button'; button.title = 'Enviar GIF';
  button.setAttribute('aria-label','Enviar GIF');
  button.innerHTML = '<span class="material-symbols-rounded">gif</span>';
  const panel = document.createElement('div');
  panel.className = 'lumi-gif-panel lumi-space-gif-panel'; panel.hidden = true;
  panel.style.cssText = 'position:absolute;left:0;bottom:calc(100% + 10px);width:min(360px,calc(100vw - 48px));max-height:390px;overflow:auto;padding:12px;border:1px solid var(--line,#ddd);border-radius:14px;background:var(--surface,#fff);box-shadow:0 12px 35px #0002;z-index:100;';
  panel.innerHTML = '<strong>GIFs para o Espaço</strong><p class="lumi-gif-hint">Em alta, categorias e busca. Usa a mesma chave Tenor das mensagens diretas.</p>' +
    '<div class="lumi-gif-tabs"><button type="button" data-tenor-tab="featured" class="active">Em alta</button><button type="button" data-tenor-tab="categories">Categorias</button><button type="button" data-tenor-tab="search">Buscar</button></div>' +
    '<form data-tenor-search-form><input class="lumi-gif-search lumi-space-gif-query" placeholder="Buscar GIFs…"><button class="lumi-gif-search-button" type="submit">Buscar</button></form>' +
    '<div class="lumi-gif-browser-results lumi-space-gif-results"></div>';
  wrap.append(button,panel);
  attach.insertAdjacentElement('afterend',wrap);
  const queryInput = panel.querySelector('.lumi-space-gif-query');
  const results = panel.querySelector('.lumi-space-gif-results');
  let browserReady = false;
  button.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      if (!browserReady) {
        installTenorBrowser(panel, results, queryInput, url => {
          if (!/^https:\/\/(media\.tenor\.com|tenor\.com)\//i.test(url)) return;
          input.value = 'LUMI_GIF:' + url;
          panel.hidden = true;
          form.requestSubmit();
        });
        browserReady = true;
      }
      queryInput.focus();
    }
  });
}

function install() {
  installStyles();
  installAssistant();
  installGifButton();
  installSpaceGifPicker();
  const form = $('#dmMessageForm');
  if (form) {
    const panel = $('#lumiGifPanel');
    if (panel && !form.contains(panel)) form.append(panel);
  }
}
const observer = new MutationObserver(() => install());
observer.observe(document.body,{childList:true,subtree:true});
install();
supabase.auth.getSession().then(({data})=>{
  currentUser=data?.session?.user||null;
  processNotificationReply();
});
supabase.auth.onAuthStateChange((_event,session)=>{
  currentUser=session?.user||null;
  if(currentUser)processNotificationReply();
});
document.addEventListener('lumi:open-conversation',event=>{
  if(event.detail?.id) {
    document.querySelector('[data-page="inbox"]')?.click();
    setTimeout(()=>document.querySelector('[data-open-dm="'+CSS.escape(event.detail.id)+'"]')?.click(),250);
  }
});
