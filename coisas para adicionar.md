## Resolver bugs

- [x] Espaços no celular
- [x] Erro das reações
- [x] Ligações não aparecem nos espaços
- [x] Foto de perfil das pessoas na chamada
- [x] Fotos nos espaços
- [x] Corrigida a leitura dos anexos privados nos Espaços: apenas membros podem abrir arquivos do canal
- [x] Remoção do anexo quando o envio da mensagem falha, evitando arquivos órfãos
- [x] Fotos de perfil respeitam o tamanho dos quadros
- [x] Avatares nas mensagens diretas não esticam com o tamanho da mensagem
- [x] Canais não aparecem no mobile
- [x] Espaços não aparecem no mobile
- [ ] Modo escuro completo + colorações
  - [x] Padronizar superfícies de cartões, resultados e controles dinâmicos no tema escuro
  - [x] Usar DM Sans como fonte padrão em toda a interface, preservando a fonte dos ícones
- [x] Modo escuro completo no mobile
- [x] Cartão de contato funcional com botão para copiar o nome de usuário

## Funcionalidades para adicionar

### Comunicação e chamadas
- [x] Compartilhamento de tela
- [x] Mensagens de áudio — sugestão de Fabrício (tester)
- [x] Notificações no navegador enquanto o LUMI está aberto
- [x] Notificação de chamada enquanto o LUMI está aberto (atender fora do app não é necessário por enquanto)
- [x] Toque sonoro enquanto uma chamada de saída está chamando (toque simples gerado pelo navegador)
- [x] Música personalizada ao iniciar uma chamada (arquivo de áudio escolhido pelo usuário, salvo neste navegador)
- [x] Retorno automático de chamada: se a pessoa não atender em 5 segundos, tentar chamar novamente e permitir personalizar a mensagem — sugestão de Paulo Vitor
  - [x] O retorno automático para quando a pessoa atende ou quando o usuário cancela as tentativas.
  - [x] Se o modo **Não Perturbe** estiver ativado, não fazer retorno automático nem insistir em chamadas.

### Perfil e contatos
- [x] Bloquear e desbloquear pessoas
- [x] Adicionar BIO ao perfil
- [x] Adicionar status
- [x] Card de contato
- [x] Mostrar a atividade/jogo informado no perfil para amigos
- [ ] Detectar jogos automaticamente como Rich Presence (exige integração externa)
- [x] Sistema de amizades: buscar pessoas, enviar/aceitar/recusar solicitações e remover amigos

### Configurações e personalização
- [x] Adicionar uma aba de configurações
- [x] Modo claro e modo escuro
- [x] Temas personalizados (cores de destaque)
- [ ] Revisar e completar a tradução de toda a interface para inglês e espanhol (mensagens escritas pelos usuários permanecem no idioma original)
  - [x] Seletor de idioma: português (Brasil), inglês e espanhol
  - [x] Salvar a preferência de idioma neste navegador
  - [x] Ampliar traduções das telas, botões, amizades, status de jogos, configurações e perfil
  - [ ] Revisão visual final de todas as telas e avisos em inglês e espanhol
- [x] Alterar senha
- [x] Recuperar conta por e-mail e definir uma nova senha após abrir o link

### Comunidade e VIP
- [x] Selos de Tester e Staff
- [ ] LUMI INFINITY por **R$ 10,00, pago uma única vez** 
  - [x] Nome escolhido: **LUMI INFINITY**
  - Sem assinatura, mensalidade ou renovação automática.
  - A compra deve liberar o VIP permanentemente para a conta.
  - Poderá cancelar se quiser colocar em outra conta ou perder a antiga conta


### Limitações que ainda precisam de integração
- [ ] Chamadas fora do app: service worker, tabela de inscrições push e Edge Function já estão preparados; falta configurar as chaves VAPID e testar em HTTPS com duas contas.
- O pagamento do LUMI INFINITY por R$ 10,00 ainda precisa de um provedor de pagamento e validação segura no backend; o botão continua desativado até isso existir. Paletas azul, verde e roxa já ficam disponíveis para contas com VIP ativo.
- A atividade/jogo do perfil é manual e aparece na lista de amizades; detectar jogos automaticamente como Rich Presence exige integração externa.
- Música personalizada ao iniciar chamadas já está disponível: a pessoa escolhe um arquivo de áudio salvo neste navegador.
- A tradução da interface começou em português (Brasil), inglês e espanhol. As traduções de amizades e atividade foram ampliadas, mas ainda é necessário revisar todas as telas e avisos.
- A recuperação de senha depende do envio de e-mail e da URL do site permitida nas configurações de autenticação do Supabase.

- [x] Identidade visual amarela para contas comuns; paletas azul, verde e roxa disponíveis para contas LUMI INFINITY
- [x] Ação de apagar espaço exclusiva para o dono, com confirmação digitada
- [x] Política de exclusão do dono confirmada no Supabase; canais, mensagens e membros relacionados usam exclusão em cascata
- [x] Edição do nome e da descrição do espaço exclusiva para o dono
- [ ] Testar edição e exclusão real de espaço com uma comunidade de teste
- [x] Normalizar nomes de arquivos anexados (acentos e caracteres especiais) antes do envio ao Storage
- [ ] Testar envio e visualização de fotos/vídeos com duas contas em espaços diferentes
- [x] Refinar contraste e superfícies de componentes adicionais do modo escuro (menus, busca, notificações, anexos e controles)
- [ ] Revisar visualmente todos os componentes do modo escuro em desktop e celular


### Melhorias de navegação
- [x] Atalho `/` para focar a busca global quando o usuário não estiver digitando em um campo; `Ctrl+K` continua disponível
- [ ] Mostrar uma dica visual do atalho `/` ao passar o mouse sobre a busca global
- [ ] Adicionar navegação completa por teclado aos menus de mensagens, reações e notificações
