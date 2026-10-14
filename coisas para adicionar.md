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
  - [x] Ampliar a cobertura CSS de cartões aninhados, diálogos, campos e painéis dinâmicos no tema escuro
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
- [x] Acessibilidade: respeitar a preferência do sistema por reduzir animações e transições
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


### Próximas tarefas para finalizar

- [ ] Revisar visualmente o modo escuro em desktop e celular; o tema claro continua sendo o preferido para uso diário
- [ ] Revisar a barra lateral em desktop e celular
- [ ] Fazer uma revisão final das telas e avisos em inglês e espanhol
- [ ] Confirmar o envio real do e-mail de recuperação e a URL autorizada nas configurações de autenticação do Supabase


- [x] Identidade visual amarela para contas comuns; paletas azul, verde e roxa disponíveis para contas LUMI INFINITY
- [x] Ação de apagar espaço exclusiva para o dono, com confirmação digitada
- [x] Política de exclusão do dono confirmada no Supabase; canais, mensagens e membros relacionados usam exclusão em cascata
- [x] Edição do nome e da descrição do espaço exclusiva para o dono
- [x] Testar edição e exclusão real de espaço com uma comunidade de teste (confirmado pelo usuário)
- [x] Normalizar nomes de arquivos anexados (acentos e caracteres especiais) antes do envio ao Storage
- [x] Testar envio e visualização de fotos/vídeos com duas contas em espaços diferentes (confirmado pelo usuário)
- [x] Refinar contraste e superfícies de componentes adicionais do modo escuro (menus, busca, notificações, anexos e controles)
- [ ] Revisar visualmente todos os componentes do modo escuro em desktop e celular (ainda há superfícies brancas; CSS atualizado, falta conferência visual)


### Gerenciamento de canais
- [x] Editar nome e descrição dos canais de texto e voz (donos e administradores)
- [x] Excluir canais de texto e voz com confirmação, atualizar a seleção e tentar limpar anexos associados
- [ ] Permitir reorganizar canais por arrastar e soltar
- [ ] Confirmar visualmente as ações de editar/excluir em desktop, celular e modo escuro

### Melhorias de navegação
- [x] Adicionar seletor personalizado de tipo de canal com ícones, descrições, teclado e compatibilidade com a criação de canais
- [x] Atalho `/` para focar a busca global quando o usuário não estiver digitando em um campo; `Ctrl+K` continua disponível
- [x] Mostrar uma dica ao passar o mouse sobre a busca global explicando o atalho `/`
- [x] Adicionar navegação por teclado (setas, Home/End e Escape) aos menus de mensagens, reações e notificações


### Organização da barra lateral
- [x] Agrupar ações do espaço em um painel recolhível para liberar espaço para os canais
- [x] Remover o botão duplicado de criar canal (os botões junto aos títulos já fazem isso)
- [x] Compactar detalhes da barra lateral em janelas com pouca altura
- [ ] Revisar visualmente a barra lateral em desktop e celular


## Em breve

Itens planejados para uma etapa futura, porque precisam de integração externa, configuração adicional ou decisão de produto:

- [ ] **Rich Presence:** detectar automaticamente os jogos abertos; o status de jogo manual continua disponível.
- [ ] **LUMI INFINITY — R$ 10,00, pagamento único:** integrar um provedor de pagamento e validar a compra no backend antes de liberar o VIP permanentemente. Sem assinatura ou renovação automática.
- [ ] **Chamadas fora do app:** avaliar depois notificações push de chamadas com configuração VAPID e testes em HTTPS. Por enquanto, a notificação dentro do LUMI é suficiente.
