"use strict";

const WORDS = [
  {one:"arm",many:"arms",regular:true},{one:"foot",many:"feet",regular:false},
  {one:"man",many:"men",regular:false},{one:"hand",many:"hands",regular:true},
  {one:"sheep",many:"sheep",regular:false},{one:"toe",many:"toes",regular:true},
  {one:"woman",many:"women",regular:false},{one:"child",many:"children",regular:false},
  {one:"leg",many:"legs",regular:true},{one:"car",many:"cars",regular:true},
  {one:"mouse",many:"mice",regular:false},{one:"tooth",many:"teeth",regular:false},
  {one:"head",many:"heads",regular:true},{one:"nose",many:"noses",regular:true},
  {one:"fish",many:"fish",regular:false},{one:"ear",many:"ears",regular:true},
  {one:"eye",many:"eyes",regular:true}
];
const WINS=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const cells=$$(".cell"), modalLayer=$("#modalLayer"), startModal=$("#startModal"), instructionsModal=$("#instructionsModal"), resultModal=$("#resultModal"), exitModal=$("#exitModal"), challenge=$("#challenge"), input=$("#answerInput"), feedback=$("#feedback"), statusEl=$("#turnStatus");

let board,player,computer,active,selected,currentWord,usedWords,lastWasRegular,moves,mistakes;
let audioCtx,musicTimer,muted=false;

function showOnly(modal){[startModal,instructionsModal,resultModal,exitModal].forEach(m=>m.hidden=m!==modal);modalLayer.classList.toggle("clear",!modal);modalLayer.style.display=modal?"grid":"none";}
function buttonSound(){tone(360,.06,"square",.05);setTimeout(()=>tone(520,.045,"sine",.035),55)}
function tone(freq,duration,type="sine",volume=.08,delay=0){if(muted)return;ensureAudio();const now=audioCtx.currentTime+delay,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(g).connect(audioCtx.destination);o.start(now);o.stop(now+duration)}
function ensureAudio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume()}
function clickSound(){tone(170,.07,"triangle",.08);tone(105,.09,"sine",.05,.025)}
function correctSound(){[660,880,1100].forEach((n,i)=>tone(n,.16,"sine",.08,i*.07))}
function wrongSound(){tone(190,.22,"sawtooth",.045);tone(145,.24,"square",.03,.1)}
function fanfare(){[523,659,784,1047].forEach((n,i)=>tone(n,.4,"triangle",.09,i*.12))}
function musicBeat(){if(muted||!active)return;const scale=[196,220,262,294,330,262];const n=scale[Math.floor(Math.random()*scale.length)];tone(n,.18,"triangle",.018);if(Math.random()>.55)tone(n*2,.08,"sine",.012,.08)}
function startMusic(){clearInterval(musicTimer);musicTimer=setInterval(musicBeat,520)}

function newGame(){
  board=Array(9).fill(null);player=Math.random()<.5?"X":"O";computer=player==="X"?"O":"X";active=true;selected=null;currentWord=null;usedWords=[];lastWasRegular=null;moves=0;mistakes=0;
  cells.forEach(c=>{c.innerHTML="";c.disabled=false;c.className="cell"});challenge.hidden=true;feedback.textContent="";
  $("#playerIcon").src=player==="X"?"cross.png":"null.png";$("#playerIcon").alt=player;updateStats();showOnly(null);startMusic();
  if(player==="X")setStatus(`You are ${player} — your turn!`);else{setStatus(`You are ${player} — monkey is thinking…`);lockBoard(true);setTimeout(computerMove,700)}
}
function setStatus(text){statusEl.textContent=text}
function lockBoard(lock){cells.forEach((c,i)=>c.disabled=lock||!!board[i])}
function updateStats(){$("#moveCount").textContent=moves;$("#mistakeCount").textContent=mistakes}
function getWord(){
  let pool=WORDS.filter(w=>!usedWords.includes(w.one));
  if(!pool.length){usedWords=[];pool=[...WORDS]}
  if(lastWasRegular&&Math.random()<.78){const irregular=pool.filter(w=>!w.regular);if(irregular.length)pool=irregular}
  const word=pool[Math.floor(Math.random()*pool.length)];usedWords.push(word.one);lastWasRegular=word.regular;return word;
}
function chooseCell(index){if(!active||board[index]||!challenge.hidden)return;clickSound();selected=index;currentWord=getWord();cells[index].classList.add("selected");lockBoard(true);$("#challengeWord").textContent=currentWord.one;input.value="";feedback.textContent="";feedback.className="feedback";challenge.hidden=false;setStatus("Solve the word to place your piece");setTimeout(()=>input.focus(),100)}
function place(index,mark){board[index]=mark;const img=document.createElement("img");img.className="piece";img.src=mark==="X"?"cross.png":"null.png";img.alt=mark;cells[index].append(img);cells[index].disabled=true}
function checkWinner(mark){return WINS.find(line=>line.every(i=>board[i]===mark))}
function finish(type,line){active=false;clearInterval(musicTimer);lockBoard(true);if(line)line.forEach(i=>cells[i].classList.add("winner"));setTimeout(()=>showResult(type),650)}
function submitAnswer(event){
  event.preventDefault();if(!active||challenge.hidden)return;const value=input.value.trim().toLowerCase();if(!value){feedback.textContent="Type a word first!";feedback.className="feedback error";wrongSound();return}
  moves++;cells[selected].classList.remove("selected");challenge.hidden=true;
  if(value===currentWord.many){correctSound();place(selected,player);updateStats();const win=checkWinner(player);if(win){finish("win",win);return}if(board.every(Boolean)){finish("draw");return}setStatus("Correct! Monkey is thinking…")}
  else{mistakes++;wrongSound();feedback.textContent=`The answer is ${currentWord.many}`;updateStats();setStatus(`Not quite — ${currentWord.one} → ${currentWord.many}`)}
  selected=null;lockBoard(true);setTimeout(computerMove,850)
}
function free(){return board.map((v,i)=>v?null:i).filter(v=>v!==null)}
function winningMove(mark){return free().find(i=>{board[i]=mark;const result=!!checkWinner(mark);board[i]=null;return result})}
function computerMove(){
  if(!active)return;const options=free();if(!options.length){finish("draw");return}let pick;
  const win=winningMove(computer),block=winningMove(player);
  if(win!==undefined&&Math.random()<.65)pick=win;else if(block!==undefined&&Math.random()<.55)pick=block;
  else{const weighted=[];options.forEach(i=>{const n=i===4?4:[0,2,6,8].includes(i)?2:1;for(let j=0;j<n;j++)weighted.push(i)});pick=weighted[Math.floor(Math.random()*weighted.length)]}
  place(pick,computer);clickSound();const line=checkWinner(computer);if(line){finish("lose",line);return}if(board.every(Boolean)){finish("draw");return}lockBoard(false);setStatus(`Your turn — you are ${player}`)
}
function showResult(type){
  const title=$("#resultTitle"),eyebrow=$("#resultEyebrow"),message=$("#resultMessage"),score=$("#scoreCard");
  if(type==="win"){eyebrow.textContent="AMAZING WORK!";title.textContent="You won!";message.textContent="Your jungle word power is growing!";score.hidden=false;fanfare();celebrate()}
  else if(type==="draw"){eyebrow.textContent="SO CLOSE!";title.textContent="It’s a draw!";message.textContent="The monkey wants another round. Shall we try again?";score.hidden=true;wrongSound()}
  else{eyebrow.textContent="GOOD TRY!";title.textContent="Monkey won this one!";message.textContent="Every word makes you stronger. Ready for another game?";score.hidden=true;wrongSound()}
  $("#finalMoves").textContent=moves;$("#finalMistakes").textContent=mistakes;$("#finalScore").textContent=Math.max(100,1200-moves*65-mistakes*140);showOnly(resultModal)
}
function celebrate(){const icons=["❌","⭕","🍌","🌿","⭐","🦜","🌺"];const box=$("#celebration");box.innerHTML="";for(let i=0;i<34;i++){const el=document.createElement("span");el.className="confetti";el.textContent=icons[i%icons.length];el.style.left=`${Math.random()*96}%`;el.style.animationDuration=`${3.5+Math.random()*3}s`;el.style.animationDelay=`${Math.random()*1.8}s`;box.append(el)}setTimeout(()=>box.innerHTML="",8500)}

cells.forEach(c=>c.addEventListener("click",()=>chooseCell(Number(c.dataset.index))));
$("#answerForm").addEventListener("submit",submitAnswer);
$("#playButton").addEventListener("click",()=>{buttonSound();newGame()});
$("#instructionsButton").addEventListener("click",()=>{buttonSound();showOnly(instructionsModal)});
$("#instructionsOk").addEventListener("click",()=>{buttonSound();showOnly(startModal)});
$("#againButton").addEventListener("click",()=>{buttonSound();newGame()});
$("#exitButton").addEventListener("click",()=>{buttonSound();$("#celebration").innerHTML="";showOnly(exitModal)});
$("#returnButton").addEventListener("click",()=>{buttonSound();showOnly(startModal)});
$("#soundToggle").addEventListener("click",e=>{muted=!muted;e.currentTarget.classList.toggle("muted",muted);e.currentTarget.textContent=muted?"×":"♪";e.currentTarget.setAttribute("aria-label",muted?"Turn sound on":"Mute sound");if(!muted)buttonSound()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!challenge.hidden){challenge.hidden=true;cells[selected]?.classList.remove("selected");selected=null;lockBoard(false);setStatus(`Your turn — you are ${player}`)}});
