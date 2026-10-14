## Resolver bugs

- [x] Espaços no celular
- [x] Erro das reações
- [x] Ligações não aparecem nos espaços
- [x] Foto de perfil das pessoas na chamada
- [x] Fotos nos espaços
- [x] Fotos de perfil respeitam o tamanho dos quadros
- [x] Avatares nas mensagens diretas não esticam com o tamanho da mensagem
- [x] Canais não aparecem no mobile
- [x] Espaços não aparecem no mobile
- [ ] Modo escuro completo + colorações
- [x] Modo escuro completo no mobile
- [ ] Card de contato funcionais

## Funcionalidades para adicionar

### Comunicação e chamadas
- [x] Compartilhamento de tela
- [x] Mensagens de áudio — sugestão de Fabrício (tester)
- [x] Notificações no navegador enquanto o LUMI está aberto
- [ ] Poder atender chamadas fora do app
- [x] Toque sonoro enquanto uma chamada de saída está chamando (toque simples gerado pelo navegador)
- [ ] Música personalizada ao iniciar uma chamada
- [x] Retorno automático de chamada: se a pessoa não atender em 5 segundos, tentar chamar novamente e permitir personalizar a mensagem — sugestão de Paulo Vitor
  - [x] O retorno automático para quando a pessoa atende ou quando o usuário cancela as tentativas.
  - [x] Se o modo **Não Perturbe** estiver ativado, não fazer retorno automático nem insistir em chamadas.

### Perfil e contatos
- [x] Bloquear e desbloquear pessoas
- [x] Adicionar BIO ao perfil
- [x] Adicionar status
- [x] Card de contato
- [ ] Mostrar qual jogo a pessoa está jogando, como o Discord Rich Presence
- [ ] Adicionar Amizade
- [ ] 

### Configurações e personalização
- [x] Adicionar uma aba de configurações
- [x] Modo claro e modo escuro
- [x] Temas personalizados (cores de destaque)
- [ ] Tradução completa da interface para outros idiomas (mensagens escritas pelos usuários permanecem no idioma original)
  - [x] Seletor de idioma: português (Brasil), inglês e espanhol
  - [x] Salvar a preferência de idioma neste navegador
  - [ ] Completar as traduções das telas, botões e avisos restantes
- [x] Alterar senha
- [ ] Recuperar conta

### Comunidade e VIP
- [x] Selos de Tester e Staff
- [ ] VIP por **R$ 10,00, pago uma única vez** 
  - O vip será chamado de "LUMI (Eu não sei eu to falando sério, troca isso por algo INSANO que consiga agradar as pessoas)"
  - Sem assinatura, mensalidade ou renovação automática.
  - A compra deve liberar o VIP permanentemente para a conta.
  - Poderá cancelar se quiser colocar em outra conta ou perder a antiga conta


### Limitações que ainda precisam de integração
- Notificações de chamada só chegam enquanto o navegador/site está em execução; atender com o site fechado precisa de push, service worker e sinalização no servidor.
- O pagamento VIP de R$ 10,00 precisa de um provedor de pagamento e validação segura no backend; o botão continua desativado até isso existir.
- A atividade do perfil é manual; detectar automaticamente jogos/apps exige integração específica.
- Música personalizada ao iniciar chamadas ainda não está implementada; por enquanto existe um toque simples de chamada.
- A tradução da interface começou em português (Brasil), inglês e espanhol. Mensagens escritas pelos usuários não são traduzidas, e ainda faltam algumas strings das telas e avisos.
