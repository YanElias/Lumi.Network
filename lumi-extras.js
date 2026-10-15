import { supabase } from './database/supabase.js';


const $ = (s, root=document) => root.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let currentUser = null;
let gifPanelOpen = false;

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
    .lumi-gif-button{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:42px;height:40px;padding:0 11px;border:1px solid var(--line,rgba(0,0,0,.12));border-radius:13px;background:var(--panel,#f6f6f6);color:var(--text,#333);cursor:pointer;font:700 12px/1 inherit;letter-spacing:.02em;transition:background .16s ease,border-color .16s ease,transform .16s ease,box-shadow .16s ease}
    .lumi-gif-button .material-symbols-rounded{font-size:21px;line-height:1}
    .lumi-gif-button:hover{background:var(--accent-soft,rgba(255,216,61,.18));border-color:var(--accent,#ffd83d);box-shadow:0 3px 10px #0000000d}
    .lumi-gif-button:active{transform:scale(.96)}
    .lumi-gif-button:focus-visible{outline:2px solid var(--accent,#ffd83d);outline-offset:2px}
    html[data-theme="dark"] .lumi-gif-button{background:var(--lumi-dark-raised,#252525);border-color:var(--lumi-dark-line,#393939);color:var(--text,#f1f1f3)}
    @media(max-width:600px){.lumi-gif-button{height:38px;min-width:38px;padding:0 9px}}
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
    .lumi-space-gif-panel [data-klipy-search-form]{display:flex;gap:7px;margin:9px 0}
    .lumi-space-gif-panel [data-klipy-search-form] input{min-width:0;flex:1}

    .dm-message-gif{display:block;max-width:min(320px,65vw);max-height:260px;object-fit:contain;border-radius:12px;margin-top:6px}
  `;
  document.head.append(style);
}

function isKlipyMediaUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && /(^|\.)klipy\.com$/i.test(url.hostname);
  } catch { return false; }
}
function klipyAppKey() {
  return (localStorage.getItem('lumi-klipy-app-key') || '').trim();
}
function klipyApiUrl(endpoint, params={}) {
  const key = klipyAppKey();
  const url = new URL('https://api.klipy.com/api/v1/' + encodeURIComponent(key) + '/gifs/' + endpoint);
  Object.entries(params).forEach(([name,value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(name, String(value));
  });
  return url.toString();
}
function normalizeKlipyGifs(payload, fallback='GIF') {
  const items = payload?.data?.data || payload?.data?.results || [];
  return items.map(item => {
    const files = item.file || {};
    const url = files.hd?.gif?.url || files.md?.gif?.url || files.sm?.gif?.url || files.xs?.gif?.url;
    const preview = files.md?.webp?.url || files.sm?.webp?.url || files.xs?.webp?.url ||
      files.md?.gif?.url || files.sm?.gif?.url || files.xs?.gif?.url || url;
    return {url, preview, alt:item.title || item.slug || fallback, slug:item.slug || ''};
  }).filter(gif => gif.url && isKlipyMediaUrl(gif.url));
}
async function fetchKlipyJson(endpoint, params={}) {
  const key = klipyAppKey();
  if (!key) throw new Error('Cole sua App Key do KLIPY no campo acima para carregar GIFs.');
  const response = await fetch(klipyApiUrl(endpoint, params), {headers:{Accept:'application/json'}});
  let payload;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok || payload?.result === false) {
    const detail = payload?.message || payload?.error || ('erro ' + response.status);
    throw new Error('O KLIPY respondeu com ' + detail + '.');
  }
  return payload;
}
function installKlipyBrowser(panel, results, queryInput, onSelect) {
  let activeMode = 'trending';
  let activeQuery = '';
  let currentPage = 1;
  let requestId = 0;
  const perPage = 24;
  const renderGifs = (gifs, append=false, canLoadMore=false) => {
    results._gifs = append ? [...(results._gifs || []), ...gifs] : gifs;
    const all = results._gifs;
    const grid = '<div class="lumi-gif-results-grid">' + all.map((gif,index) =>
      '<button type="button" data-gif-index="' + index + '" title="' + esc(gif.alt) + '">' +
      '<img loading="lazy" src="' + esc(gif.preview) + '" alt="' + esc(gif.alt) + '"></button>'
    ).join('') + '</div>';
    results.innerHTML = grid + (canLoadMore ? '<button type="button" data-klipy-more style="width:100%;margin-top:8px">Carregar mais GIFs</button>' : '');
  };
  const load = async (mode, query='', append=false) => {
    if (!append) {
      activeMode = mode;
      activeQuery = query;
      currentPage = 1;
    } else {
      currentPage += 1;
    }
    const thisRequest = ++requestId;
    if (!klipyAppKey()) {
      results.innerHTML = '<p class="lumi-gif-hint">Adicione sua App Key do KLIPY acima para carregar GIFs.</p>';
      return;
    }
    if (!append) results.innerHTML = '<p class="lumi-gif-hint">Carregando GIFs…</p>';
    else results.querySelector('[data-klipy-more]')?.remove();
    try {
      if (mode === 'categories') {
        const payload = await fetchKlipyJson('categories', {locale:'pt_BR'});
        if (thisRequest !== requestId) return;
        const categories = (payload?.data?.categories || []).map(item => ({
          name: item.category || item.name || item.query || 'GIF',
          term: item.query || item.category || item.name || '',
          image: item.preview_url || ''
        })).filter(item => item.term);
        if (!categories.length) {
          results.innerHTML = '<p class="lumi-gif-hint">As categorias não estão disponíveis agora.</p>';
          return;
        }
        results._categories = categories;
        results._gifs = [];
        results.innerHTML = '<div class="lumi-gif-category-grid">' + categories.map((item,index) =>
          '<button type="button" class="lumi-gif-category" data-klipy-category="' + index + '">' +
          (item.image && isKlipyMediaUrl(item.image) ? '<img loading="lazy" src="' + esc(item.image) + '" alt="">' : '') +
          '<span>' + esc(item.name.replace(/[_-]+/g,' ')) + '</span></button>'
        ).join('') + '</div>';
        return;
      }
      const endpoint = mode === 'search' ? 'search' : 'trending';
      const params = {
        page:currentPage,
        per_page:perPage,
        locale:'BR',
        content_filter:'medium',
        format_filter:'gif',
        ...(mode === 'search' ? {q:query} : {})
      };
      const payload = await fetchKlipyJson(endpoint, params);
      if (thisRequest !== requestId) return;
      const gifs = normalizeKlipyGifs(payload, query || 'Em alta');
      if (!gifs.length) {
        if (append && results._gifs?.length) {
          results.innerHTML += '<p class="lumi-gif-hint">Não há mais GIFs para carregar.</p>';
        } else {
          results._gifs = [];
          results.innerHTML = '<p class="lumi-gif-hint">Nenhum GIF encontrado. Tente outra busca.</p>';
        }
        return;
      }
      const pagination = payload?.data?.pagination || payload?.data?.meta || {};
      const totalPages = Number(pagination.total_pages || pagination.last_page || payload?.data?.last_page || 0);
      const canLoadMore = totalPages ? currentPage < totalPages : gifs.length >= perPage;
      renderGifs(gifs, append, canLoadMore);
      results._categories = [];
    } catch (error) {
      if (thisRequest !== requestId) return;
      if (append && results._gifs?.length) {
        results.insertAdjacentHTML('beforeend', '<p class="lumi-gif-hint">' + esc(error.message || 'Não consegui carregar mais GIFs.') + '</p>');
      } else results.innerHTML = '<p class="lumi-gif-hint">' + esc(error.message || 'Não consegui carregar os GIFs.') + '</p>';
    }
  };
  panel.querySelectorAll('[data-klipy-tab]').forEach(tab => tab.addEventListener('click', () => {
    panel.querySelectorAll('[data-klipy-tab]').forEach(item => item.classList.toggle('active', item === tab));
    const mode = tab.dataset.klipyTab;
    if (mode === 'search') {
      queryInput?.focus();
      if (queryInput?.value.trim()) load('search', queryInput.value.trim());
      else results.innerHTML = '<p class="lumi-gif-hint">Search KLIPY</p>';
    } else load(mode);
  }));
  const searchForm = panel.querySelector('[data-klipy-search-form]');
  searchForm?.addEventListener('submit', event => {
    event.preventDefault();
    const query = queryInput?.value.trim() || '';
    if (!query) return;
    panel.querySelectorAll('[data-klipy-tab]').forEach(item => item.classList.toggle('active', item.dataset.klipyTab === 'search'));
    load('search', query);
  });
  results.addEventListener('click', event => {
    if (event.target.closest('[data-klipy-more]')) {
      load(activeMode, activeQuery, true);
      return;
    }
    const categoryButton = event.target.closest('[data-klipy-category]');
    if (categoryButton) {
      const category = results._categories?.[Number(categoryButton.dataset.klipyCategory)];
      if (category) {
        if (queryInput) queryInput.value = category.term;
        panel.querySelectorAll('[data-klipy-tab]').forEach(item => item.classList.toggle('active', item.dataset.klipyTab === 'search'));
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
  load('trending');
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
  button.innerHTML='<span class="material-symbols-rounded" aria-hidden="true">gif_box</span><span>GIF</span>'; button.title='Buscar GIFs'; button.setAttribute('aria-label','Buscar GIFs');
  const panel = document.createElement('section');
  panel.id='lumiGifPanel'; panel.className='lumi-gif-panel'; panel.hidden=true;
  panel.innerHTML = '<strong>Enviar um GIF</strong><p class="lumi-gif-hint">Em alta, categorias e busca do KLIPY. Sua chave fica salva neste navegador.</p>' +
    '<label class="lumi-gif-hint" for="lumiKlipyKey">App Key do KLIPY</label><input id="lumiKlipyKey" class="lumi-gif-search" placeholder="Cole sua chave de API" autocomplete="off">' +
    '<div class="lumi-gif-tabs"><button type="button" data-klipy-tab="featured" class="active">Em alta</button><button type="button" data-klipy-tab="categories">Categorias</button><button type="button" data-klipy-tab="search">Buscar</button></div>' +
    '<form data-klipy-search-form><input id="lumiGifQuery" class="lumi-gif-search" placeholder="Search KLIPY"><button class="lumi-gif-search-button" type="submit">Buscar</button></form>' +
    '<div class="lumi-gif-browser-results" id="lumiGifResults"></div>';
  const wrap = document.createElement('div'); wrap.style='position:relative;display:flex;align-items:center;';
  wrap.append(button,panel);
  if (attach?.nextSibling) form.insertBefore(wrap,attach.nextSibling); else form.prepend(wrap);
  const keyInput = $('#lumiKlipyKey', panel);
  const queryInput = $('#lumiGifQuery', panel);
  const results = $('#lumiGifResults', panel);
  keyInput.value = localStorage.getItem('lumi-klipy-app-key') || '';
  keyInput.addEventListener('change', event => {
    localStorage.setItem('lumi-klipy-app-key', event.target.value.trim());
    if (!panel.hidden) {
      const active = panel.querySelector('[data-klipy-tab].active')?.dataset.klipyTab || 'featured';
      if (active === 'search' && queryInput.value.trim()) panel.querySelector('[data-klipy-search-form]')?.requestSubmit();
      else panel.querySelector('[data-klipy-tab="' + (active === 'search' ? 'featured' : active) + '"]')?.click();
    }
  });
  let browserReady = false;
  button.addEventListener('click', () => {
    panel.hidden = !panel.hidden; gifPanelOpen = !panel.hidden;
    if (!panel.hidden) {
      if (!browserReady) { installKlipyBrowser(panel, results, queryInput, url => sendGif(url)); browserReady = true; }
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
  if (!isKlipyMediaUrl(url)) {toast('Esse endereço de GIF não é aceito.',true);return;}
  const {data,error} = await supabase.from('direct_messages').insert({
    conversation_id:conversationId,sender_id:currentUser.id,content:'LUMI_GIF:'+url,
    attachment_path:null,attachment_name:null,attachment_type:null,attachment_size:null
  }).select('id,conversation_id,sender_id,content,attachment_path,attachment_name,attachment_type,attachment_size,created_at,profiles(display_name,username,avatar_url,vip_purchased)').single();
  if(error){toast('Não consegui enviar o GIF: '+error.message,true);return;}
  if (data) window.dispatchEvent(new CustomEvent('lumi:gif-sent', {detail:{message:data}}));
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
  panel.innerHTML = '<strong>GIFs para o Espaço</strong><p class="lumi-gif-hint">Em alta, categorias e busca. Usa a mesma chave KLIPY das mensagens diretas.</p>' +
    '<div class="lumi-gif-tabs"><button type="button" data-klipy-tab="featured" class="active">Em alta</button><button type="button" data-klipy-tab="categories">Categorias</button><button type="button" data-klipy-tab="search">Buscar</button></div>' +
    '<form data-klipy-search-form><input class="lumi-gif-search lumi-space-gif-query" placeholder="Search KLIPY"><button class="lumi-gif-search-button" type="submit">Buscar</button></form>' +
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
        installKlipyBrowser(panel, results, queryInput, url => {
          if (!isKlipyMediaUrl(url)) return;
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
