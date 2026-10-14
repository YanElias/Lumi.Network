import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const url=Deno.env.get("SUPABASE_URL")||"";
  const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const vapidPublic=Deno.env.get("VAPID_PUBLIC_KEY")||"";
  const vapidPrivate=Deno.env.get("VAPID_PRIVATE_KEY")||"";
  const vapidSubject=Deno.env.get("VAPID_SUBJECT")||"mailto:admin@example.com";
  if(!vapidPublic||!vapidPrivate)return json({error:"VAPID is not configured"},503);
  const authHeader=req.headers.get("Authorization")||"";
  const authClient=createClient(url,anon,{global:{headers:{Authorization:authHeader}}});
  const {data:{user},error:authError}=await authClient.auth.getUser();
  if(authError||!user)return json({error:"Unauthorized"},401);
  let body;
  try{body=await req.json();}catch{return json({error:"Invalid JSON"},400);}
  const recipient=String(body.recipient_id||"");
  const conversation=String(body.conversation_id||"");
  if(!recipient||!conversation||recipient===user.id)return json({error:"Invalid call target"},400);
  const admin=createClient(url,service);
  const cutoff=new Date(Date.now()-90_000).toISOString();
  const {data:offer,error:offerError}=await admin.from("call_signals").select("id,created_at,signal_type")
    .eq("sender_id",user.id).eq("recipient_id",recipient).eq("conversation_id",conversation).eq("signal_type","offer")
    .gte("created_at",cutoff).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(offerError||!offer)return json({error:"No recent call offer found"},403);
  const {data:subs,error:subsError}=await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id",recipient);
  if(subsError)return json({error:"Could not load subscriptions"},500);
  if(!subs?.length)return json({sent:0});
  webpush.setVapidDetails(vapidSubject,vapidPublic,vapidPrivate);
  const payload=JSON.stringify({title:"Chamada recebida no LUMI",body:body.mode==="video"?"Alguém está ligando por vídeo.":"Alguém está ligando por voz.",tag:"lumi-call-"+conversation,conversation_id:conversation,url:"./"});
  let sent=0;
  await Promise.all(subs.map(async sub=>{
    try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload);sent++;}
    catch(error){if(error?.statusCode===404||error?.statusCode===410)await admin.from("push_subscriptions").delete().eq("id",sub.id);else console.error("Web push failed",error?.message||error);}
  }));
  return json({sent});
});