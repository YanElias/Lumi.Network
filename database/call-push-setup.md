# Notificações push de chamadas do LUMI

A estrutura foi adicionada, mas o envio real exige configurar chaves VAPID no projeto Supabase.

1. Gere um par de chaves VAPID com `npx web-push generate-vapid-keys` em um computador com Node.js.
2. No Supabase, abra **Project Settings → Edge Functions → Secrets** e adicione:
   - `VAPID_PUBLIC_KEY`: chave pública gerada.
   - `VAPID_PRIVATE_KEY`: chave privada gerada (não coloque no GitHub).
   - `VAPID_SUBJECT`: um contato `mailto:` válido.
3. Copie a chave pública para a constante `VAPID_PUBLIC_KEY` em `push-notifications.js`.
4. Faça commit e publique o site em HTTPS. O service worker não funciona em HTTP comum (exceto localhost).
5. Entre no LUMI, abra Configurações e clique em **Ativar notificações de chamadas**.

A função `send-call-push` verifica a sessão do usuário e exige uma oferta de chamada recente antes de enviar notificações. Ao clicar no aviso, o navegador abre o LUMI; o app consulta ofertas recentes para apresentar a chamada recebida.
