import { supabase } from './database/supabase.js';

const $ = (selector, root=document) => root.querySelector(selector);
let user = null;
let requests = [];
let searchResults = [];
let loading = false;

function esc(value='') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function avatar(person={}) {
  const name=person.display_name||person.username||'Pessoa';
  return person.avatar_url
    ? `<img class="lumi-friend-avatar" src="${esc(person.avatar_url)}" alt="">`
    : `<span class="lumi-friend-avatar lumi-friend-avatar-fallback">${esc(name.trim().slice(0,1).toUpperCase()||'?')}</span>`;
}
function personRow(person, action='') {
  return `<div class="lumi-friend-row">${avatar(person)}<span class="lumi-friend-person"><strong>${esc(person.display_name||person.username||'Pessoa LUMI')}</strong><small>@${esc(person.username||'lumi-user')}</small></span>${action}</div>`;
}
function getRelationship(id) {
  return requests.find(r => (r.sender_id===id&&r.recipient_id===user?.id)||(r.sender_id===user?.id&&r.recipient_id===id));
}
function renderSearch() {
  const host=$('#lumiFriendSearchResults');
  if(!host)return;
  if(!searchResults.length){host.innerHTML='<p class="lumi-friend-muted">Busque pelo nome ou @usuário para encontrar pessoas.</p>';return;}
  host.innerHTML=searchResults.map(person=>{
    const rel=getRelationship(person.id);
    let action='<button class="secondary-button" data-friend-add="'+esc(person.id)+'">Adicionar</button>';
    if(rel?.status==='accepted')action='<span class="lumi-friend-state">Amigos</span>';
    else if(rel?.status==='pending')action='<span class="lumi-friend-state">'+(rel.sender_id===user.id?'Pendente':'Enviou solicitação')+'</span>';
    return personRow(person,action);
  }).join('');
}
function renderLists() {
  const incoming=requests.filter(r=>r.status==='pending'&&r.recipient_id===user?.id);
  const outgoing=requests.filter(r=>r.status==='pending'&&r.sender_id===user?.id);
  const friends=requests.filter(r=>r.status==='accepted').map(r=>({request:r,person:r.sender_id===user?.id?r.recipient:r.sender}));
  $('#lumiFriendRequests').innerHTML = incoming.length ? incoming.map(r=>personRow(r.sender,`<div class="lumi-friend-actions"><button class="primary-button" data-friend-respond="${r.id}" data-accept="true">Aceitar</button><button class="secondary-button" data-friend-respond="${r.id}" data-accept="false">Recusar</button></div>`)).join('') : '<p class="lumi-friend-muted">Nenhuma solicitação recebida.</p>';
  $('#lumiFriendOutgoing').innerHTML = outgoing.length ? outgoing.map(r=>personRow(r.recipient,'<span class="lumi-friend-state">Pendente</span>')).join('') : '<p class="lumi-friend-muted">Nenhuma solicitação enviada.</p>';
  $('#lumiFriendList').innerHTML = friends.length ? friends.map(({request,person})=>personRow(person,`<div class="lumi-friend-actions"><button class="secondary-button" data-friend-message="${esc(person?.id||'')}">Mensagem</button><button class="secondary-button" data-friend-remove="${request.id}">Remover</button></div>`)).join('') : '<p class="lumi-friend-muted">Suas amizades aparecerão aqui.</p>';
  renderSearch();
}
async function loadRequests() {
  if(!user)return;
  const {data,error}=await supabase.from('friend_requests').select('id,sender_id,recipient_id,status,created_at,sender:profiles!friend_requests_sender_id_fkey(id,username,display_name,avatar_url),recipient:profiles!friend_requests_recipient_id_fkey(id,username,display_name,avatar_url)').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at',{ascending:false}).limit(200);
  if(error){console.error(error);$('#lumiFriendRequests').innerHTML='<p class="lumi-friend-muted">Não foi possível carregar amizades. Confira o SQL de amizades no Supabase.</p>';return;}
  requests=data||[];
  renderLists();
}
async function searchPeople() {
  if(!user){showToast('Entre na sua conta para adicionar amigos.');return;}
  const q=$('#lumiFriendSearch').value.trim().replace(/^@/,'');
  if(q.length<2){$('#lumiFriendSearchResults').innerHTML='<p class="lumi-friend-muted">Digite pelo menos 2 caracteres.</p>';return;}
  $('#lumiFriendSearchResults').innerHTML='<p class="lumi-friend-muted">Buscando pessoas…</p>';
  const clean=q.replace(/[,%()]/g,'');
  const {data,error}=await supabase.from('profiles').select('id,username,display_name,avatar_url').neq('id',user.id).or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`).limit(12);
  if(error){$('#lumiFriendSearchResults').innerHTML='<p class="lumi-friend-muted">Não foi possível buscar pessoas.</p>';return;}
  searchResults=data||[];
  renderSearch();
}
async function addFriend(id) {
  if(!user||id===user.id)return;
  const rel=getRelationship(id);
  if(rel?.status==='accepted'){showToast('Vocês já são amigos.');return;}
  if(rel?.status==='pending'){showToast('Já existe uma solicitação entre vocês.');return;}
  const {error}=await supabase.from('friend_requests').insert({sender_id:user.id,recipient_id:id,status:'pending'});
  if(error){showToast(error.code==='23505'?'Já existe uma solicitação entre vocês.':'Não foi possível enviar a solicitação. Confira a conexão e tente novamente.');return;}
  showToast('Solicitação de amizade enviada!');
  await loadRequests();
}
async function respond(id,accept) {
  const {data,error}=await supabase.rpc('respond_to_friend_request',{p_request_id:id,p_accept:accept});
  if(error){showToast('Não foi possível responder à solicitação.');return;}
  showToast(data?(accept?'Amizade adicionada!':'Solicitação recusada.'):'Essa solicitação já não está pendente.');
  await loadRequests();
}
async function removeFriend(id) {
  if(!confirm('Remover esta amizade?'))return;
  const {error}=await supabase.from('friend_requests').delete().eq('id',id);
  if(error){showToast('Não foi possível remover a amizade.');return;}
  showToast('Amizade removida.');
  await loadRequests();
}
function showToast(message) {
  const region=$('#toastRegion');
  if(region){const item=document.createElement('div');item.className='toast';item.textContent=message;region.append(item);setTimeout(()=>item.remove(),3200);}
  else alert(message);
}
function openPanel() {
  if(!user){showToast('Entre na sua conta para usar as amizades.');return;}
  $('#lumiFriendsDialog').showModal();
  loadRequests();
}
function installUI() {
  if($('#lumiFriendsOpen'))return;
  const rail=$('.rail-bottom');
  if(rail){
    const button=document.createElement('button');
    button.id='lumiFriendsOpen';button.className='rail-button';button.type='button';button.title='Amizades';button.setAttribute('aria-label','Amizades');
    button.innerHTML='<span class="icon material-symbols-rounded">group</span><small>Amizades</small>';
    const inbox=rail.querySelector('[data-page="inbox"]');
    rail.insertBefore(button,inbox||rail.firstChild);
    button.addEventListener('click',openPanel);
  }
  const dialog=document.createElement('dialog');
  dialog.id='lumiFriendsDialog';dialog.className='modal lumi-friends-dialog';
  dialog.innerHTML=`<section class="modal-card lumi-friends-card"><button class="modal-close" type="button" data-friends-close aria-label="Fechar">×</button><div class="eyebrow">SUA GALERA</div><h2>Amizades</h2><p class="modal-subtitle">Encontre pessoas, envie solicitações e mantenha sua galera por perto.</p><form id="lumiFriendSearchForm" class="lumi-friend-search"><input id="lumiFriendSearch" class="form-input" placeholder="Buscar por nome ou @usuário" autocomplete="off" minlength="2"><button class="primary-button" type="submit">Buscar</button></form><div id="lumiFriendSearchResults" class="lumi-friend-list"></div><div class="lumi-friend-section"><h3>Solicitações recebidas</h3><div id="lumiFriendRequests" class="lumi-friend-list"></div></div><div class="lumi-friend-section"><h3>Solicitações enviadas</h3><div id="lumiFriendOutgoing" class="lumi-friend-list"></div></div><div class="lumi-friend-section"><h3>Seus amigos</h3><div id="lumiFriendList" class="lumi-friend-list"></div></div></section>`;
  document.body.append(dialog);
  dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('[data-friends-close]'))dialog.close();});
  $('#lumiFriendSearchForm').addEventListener('submit',e=>{e.preventDefault();searchPeople();});
  dialog.addEventListener('click',async e=>{
    const add=e.target.closest('[data-friend-add]');if(add){await addFriend(add.dataset.friendAdd);return;}
    const response=e.target.closest('[data-friend-respond]');if(response){await respond(response.dataset.friendRespond,response.dataset.accept==='true');return;}
    const remove=e.target.closest('[data-friend-remove]');if(remove){await removeFriend(remove.dataset.friendRemove);return;}
    const message=e.target.closest('[data-friend-message]');if(message){dialog.close();document.querySelector('[data-page="inbox"]')?.click();setTimeout(()=>{const input=$('#dmMobilePeopleSearch')||$('#dmPeopleSearch');if(input){input.value='';input.focus();} },150);}
  });
}
installUI();
supabase.auth.getSession().then(({data})=>{user=data.session?.user||null;});
supabase.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;if(user&&$('#lumiFriendsDialog')?.open)loadRequests();});
