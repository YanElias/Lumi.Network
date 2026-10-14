import { supabase } from './database/supabase.js';

// Replace this with the public key generated alongside VAPID_PRIVATE_KEY in Supabase Edge Function secrets.
const VAPID_PUBLIC_KEY = 'CONFIGURE_VAPID_PUBLIC_KEY';
const urlBase64ToUint8Array = value => {
  const padding='='.repeat((4-value.length%4)%4);
  const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');
  return Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
};
function toast(message){
  const region=document.querySelector('#toastRegion');
  if(region){const el=document.createElement('div');el.className='toast';el.textContent=message;region.append(el);setTimeout(()=>el.remove(),3500);}
  else alert(message);
}
async function enablePush(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.user){toast('Entre na sua conta para ativar as notificações.');return;}
  if(!('serviceWorker'in navigator)||!('PushManager'in window)){toast('Este navegador não oferece notificações push.');return;}
  if(!VAPID_PUBLIC_KEY||VAPID_PUBLIC_KEY==='CONFIGURE_VAPID_PUBLIC_KEY'){
    toast('A estrutura está pronta, mas falta configurar a chave pública VAPID do servidor.');
    return;
  }
  const permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;
  if(permission!=='granted'){toast('Permita notificações nas configurações do navegador.');return;}
  try{
    const registration=await navigator.serviceWorker.register('./sw.js');
    let subscription=await registration.pushManager.getSubscription();
    if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY)});
    const json=subscription.toJSON();
    const {error}=await supabase.from('push_subscriptions').upsert({
      user_id:session.user.id,endpoint:json.endpoint,p256dh:json.keys?.p256dh,auth:json.keys?.auth,updated_at:new Date().toISOString()
    },{onConflict:'endpoint'});
    if(error)throw error;
    toast('Notificações de chamadas ativadas neste navegador!');
    const status=document.querySelector('#lumiPushStatus');if(status)status.textContent='Ativado neste navegador.';
  }catch(error){console.error(error);toast('Não consegui ativar as notificações push: '+(error.message||error));}
}
function installPushSettings(){
  const page=document.querySelector('.settings-page');
  if(!page||document.querySelector('#lumiPushCard'))return;
  const card=document.createElement('section');card.className='settings-card lumi-push-card';card.id='lumiPushCard';
  card.innerHTML='<div class="settings-card-icon material-symbols-rounded">notifications_active</div><div class="settings-card-content"><h2>Chamadas fora do LUMI</h2><p>Receba um aviso quando alguém ligar, mesmo com a aba fechada, neste navegador.</p><button class="primary-button" type="button" id="lumiEnablePush">Ativar notificações de chamadas</button><p class="lumi-push-status" id="lumiPushStatus">Requer permissão do navegador e configuração VAPID do servidor.</p></div>';
  const target=page.querySelector('.settings-card');page.insertBefore(card,target||null);
  card.querySelector('#lumiEnablePush').addEventListener('click',enablePush);
}
const observer=new MutationObserver(installPushSettings);
observer.observe(document.body,{childList:true,subtree:true});
installPushSettings();
