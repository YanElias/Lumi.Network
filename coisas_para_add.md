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
- [ ] Detectar jogos automaticamente como Rich Presence (exige componente local externo)
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
- [x] Testar edição e exclusão real de espaço com uma comunidade de teste (confirmado pelo usuário)
- [x] Normalizar nomes de arquivos anexados (acentos e caracteres especiais) antes do envio ao Storage
- [x] Testar envio e visualização de fotos/vídeos com duas contas em espaços diferentes (confirmado pelo usuário)
- [x] Refinar contraste e superfícies de componentes adicionais do modo escuro (menus, busca, notificações, anexos e controles)
- [ ] Revisar visualmente todos os componentes do modo escuro em desktop e celular (ainda há superfícies brancas; CSS atualizado, falta conferência visual)


### Gerenciamento de canais
- [x] Editar nome e descrição dos canais de texto e voz (donos e administradores)
- [x] Mostrar ações de editar/excluir também no cabeçalho do canal ativo
- [x] Exibir os controles de gerenciamento sem depender de passar o mouse e dar suporte ao dono mesmo se o papel carregado estiver inconsistente
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
- [ ] **Chamadas fora do app:** a interface de atendimento por push foi adicionada; ainda é necessário configurar VAPID e testar em HTTPS com a aba fechada.


### Configurações avançadas de canais e cargos
- [x] Adicionar categoria aos canais e salvar junto com nome/descrição
- [x] Adicionar controles para mover canais para cima/baixo e salvar a ordem no banco
- [ ] Agrupar visualmente canais por categoria na barra lateral
- [ ] Configurar permissões específicas por canal (visualizar, escrever, anexar, reagir e conectar à voz), com validação segura no banco
- [x] Adicionar cargos de Fundador, Administrador, Moderador, Desenvolvedor, Membro e Novato, com alteração segura de cargo pelo fundador
- [ ] Criar permissões granulares por cargo (moderação, anexos, voz, mensagens e gestão de canais)
- [ ] Permitir configurar modo somente leitura, limite de envio e limite de participantes em voz
- [ ] Testar a gestão de canais em desktop, celular e tema escuro


### Perfil, INFINITY e experiência de voz
- [x] Exibir selo LUMI INFINITY ao lado dos nomes de contas com o benefício ativado
- [x] Adicionar campos de pronomes e cor de destaque ao perfil (UI e banco)
- [x] Configurar cargos que podem falar em cada canal de texto e validar a regra na política RLS do banco
- [ ] Adicionar medidor visual de voz ativa em salas e chamadas de DM e testar com duas contas/dispositivos
- [ ] Adicionar banner de perfil e opções de privacidade para status/atividade
- [ ] Revisar todos os componentes do tema escuro em desktop e celular
- [ ] Agrupar canais visualmente por categoria e testar permissões em canais existentes

- [x] Adicionar medidor visual de voz ativa nas salas de voz em grupo (precisa de teste real com duas contas/dispositivos)

- [x] Incluir estado de medição de voz local/remota na sala de voz

- [x] Adicionar indicador visual de voz ativa na chamada de DM; falta teste real com duas contas/dispositivos

- [x] Desativar a caixa de envio para cargos sem permissão de falar no canal

- [x] Aplicar modo ouvinte aos cargos sem permissão de falar em salas de voz (validar com contas reais)


## Novidades — outubro de 2026

- [x] Corrigir o recebimento de candidatos ICE que chegam antes da oferta WebRTC e filtrar candidatos pela conversa/remetente
- [x] Remover solicitação duplicada de microfone ao iniciar chamada
- [x] Manter um mini-controle de chamada visível ao navegar para fora da DM, com botão para voltar e desligar
- [x] Iniciar chamadas de voz/vídeo diretamente pelos resultados da busca de pessoas, sem abrir a conversa manualmente
- [x] Adicionar ação **Atender** às notificações push de chamadas (depende de VAPID e de teste real no navegador)
- [x] Adicionar modo streamer para desfocar visualmente nomes/selos
- [x] Adicionar configuração local de atividade **LUMI Orbit**
- [x] Preparar suporte ao selo de criador de conteúdo (IDs de criadores ainda precisam ser aprovados e adicionados)
- [ ] Testar chamadas WebRTC com duas contas, redes diferentes, áudio/vídeo, recusa, queda e encerramento
- [ ] Configurar credenciais reais de servidor TURN (suporte para credenciais configuráveis adicionado) e testar redes restritivas
- [ ] Configurar chave pública/privada VAPID e validar atendimento por notificação com a aba fechada
- [x] Adicionar ação de resposta às notificações de mensagens enquanto o LUMI está aberto (suporte depende do navegador; testar no dispositivo)
- [ ] Testar resposta por notificação com o site em segundo plano/fechado e confirmar suporte à ação de texto no navegador
- [x] Implementar busca e envio de GIF nas DMs via Tenor (requer chave de API configurada pelo usuário)
- [x] GIFs também nos Espaços — implementado com a mesma chave Tenor das DMs
- [x] Adicionar LUMI Assist com ajuda rápida e recomendações de perfis baseadas em interesses/bio (regras locais, sem modelo generativo externo)
- [ ] Criar componente local do LUMI Orbit para detectar jogos/aplicativos; o status atual ainda é manual e local ao navegador
- [ ] Refinar paletas e revisar o tema escuro em todos os painéis e tamanhos de tela


### Melhorias técnicas — outubro de 2026
- [x] Evitar ofertas recebidas duplicadas com o mesmo ID e preservar candidatos ICE que chegam antes da descrição remota
- [x] Melhorar a captura de microfone com cancelamento de eco, supressão de ruído e controle automático de ganho
- [x] Adicionar mais servidores STUN e suporte opcional para credenciais TURN configuradas localmente
- [x] Melhorar mensagens de estado e tratamento de erros durante a negociação WebRTC
- [x] Adicionar LUMI Assist e sugestões locais de perfis com interesses parecidos
- [x] Adicionar busca/envio de GIFs Tenor nas DMs, com chave API informada pelo usuário
- [x] Adicionar suporte a resposta em notificações de mensagens (precisa teste real em navegadores compatíveis)
- [ ] Testar chamadas com duas contas em redes diferentes; STUN sozinho não garante conexão em todas as redes
