self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{};}catch{data={title:'Chamada no LUMI',body:'Alguém está tentando falar com você.'};}
  const title=data.title||'Chamada no LUMI';
  const options={body:data.body||'Abra o LUMI para atender.',icon:'./logo.png',badge:'./logo.png',tag:data.tag||'lumi-incoming-call',renotify:true,data:{url:data.url||'./',conversation_id:data.conversation_id||null},actions:[{action:'open',title:'Abrir LUMI'}]};
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'./',self.location.origin).href;
  event.waitUntil((async()=>{
    const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clientsList){
      if('focus'in client){await client.focus();if('navigate'in client)await client.navigate(target);return;}
    }
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
