self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{};}catch{data={title:'Chamada no LUMI',body:'Alguém está tentando falar com você.'};}
  const title=data.title||'Chamada no LUMI';
  const options={body:data.body||'Abra o LUMI para atender.',icon:'./logo.png',badge:'./logo.png',tag:data.tag||'lumi-incoming-call',renotify:true,data:{url:data.url||'./',conversation_id:data.conversation_id||null},actions:[{action:'accept',title:'Atender'},{action:'open',title:'Abrir LUMI'}]};
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const targetUrl=new URL(event.notification.data?.url||self.registration.scope,self.registration.scope);
  if(event.action==='accept' && event.notification.data?.conversation_id){
    targetUrl.searchParams.set('lumi_accept_call','1');
    targetUrl.searchParams.set('conversation_id',event.notification.data.conversation_id);
  }
  if(event.action==='reply' && event.notification.data?.conversation_id){
    const reply = String(event.reply || '').trim().slice(0,4000);
    targetUrl.searchParams.set('conversation_id',event.notification.data.conversation_id);
    if(reply) targetUrl.searchParams.set('lumi_reply',reply);
  }
  const target=targetUrl.href;
  event.waitUntil((async()=>{
    const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clientsList){
      if('focus'in client){await client.focus();if('navigate'in client)await client.navigate(target);return;}
    }
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
