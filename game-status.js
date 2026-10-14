// Sugestões rápidas de jogos para o campo de atividade do perfil.
// O navegador não consegue detectar jogos locais sozinho; a atividade é escolhida pelo usuário.
const games = [
  'Minecraft','Roblox','Friday Night Funkin\'','Hytale','Fortnite','Free Fire',
  'Valorant','League of Legends','Genshin Impact','Stardew Valley','Terraria',
  'Geometry Dash','Among Us','PK XD','Outro jogo'
];
function enhanceGameActivity() {
  const field=document.querySelector('#profileActivity');
  if(!field||field.dataset.gameSuggestionsReady==='true')return;
  field.dataset.gameSuggestionsReady='true';
  field.setAttribute('list','lumiGameSuggestions');
  field.setAttribute('autocomplete','off');
  let list=document.querySelector('#lumiGameSuggestions');
  if(!list){
    list=document.createElement('datalist');list.id='lumiGameSuggestions';
    list.innerHTML=games.map(game=>'<option value="'+game.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"></option>').join('');
    document.body.append(list);
  }
  const helper=document.createElement('p');
  helper.className='settings-help lumi-game-status-help';
  helper.textContent='Escolha um jogo da lista ou escreva sua própria atividade. Seus amigos poderão ver esse status.';
  field.insertAdjacentElement('afterend',helper);
}
const observer=new MutationObserver(enhanceGameActivity);
observer.observe(document.body,{childList:true,subtree:true});
enhanceGameActivity();
