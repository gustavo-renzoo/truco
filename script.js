const ranks = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

let gameMode = '1v1';
let scoreUs = 0;
let scoreThem = 0;

let deck = [];
let vira = null;
let hands = {};

let playersOrder = [];
let currentTurnIndex = 0;
let handStarterIndex = 0;
let playedCardsThisRound = [];
let roundWinners = [];
let isProcessingTurn = false;

let handValue = 1;
let lastTrucoTeam = null;
let pendingTrucoRequest = null;

function log(message) {
  const logBox = document.getElementById('log');
  logBox.innerHTML += `<div>> ${message}</div>`;
  logBox.scrollTop = logBox.scrollHeight;
}

function createDeck() {
  const suitsList = ['Ouros', 'Espadas', 'Copas', 'Paus'];
  const naipeIcones = { 'Ouros': '♦', 'Espadas': '♠', 'Copas': '♥', 'Paus': '♣' };
  let newDeck = [];

  ranks.forEach((rank, rankIndex) => {
    suitsList.forEach(suit => {
      newDeck.push({
        rank: rank,
        suit: suit,
        icon: naipeIcones[suit],
        value: rankIndex
      });
    });
  });
  return newDeck.sort(() => Math.random() - 0.5);
}

function startGame() {
  gameMode = document.getElementById('mode').value;
  scoreUs = 0;
  scoreThem = 0;
  handStarterIndex = 0;

  document.getElementById('score-us').innerText = scoreUs;
  document.getElementById('score-them').innerText = scoreThem;
  document.getElementById('log').innerHTML = '';
  
  const sidePlayers = document.getElementById('side-players');
  if (gameMode === '2v2') {
    sidePlayers.style.display = 'flex';
    playersOrder = ['user', 'left', 'top', 'right'];
  } else {
    sidePlayers.style.display = 'none';
    playersOrder = ['user', 'top'];
  }

  log(`Jogo iniciado: <b>Truco Paulista (${gameMode})</b>`);
  startHand();
}

function startHand() {
  deck = createDeck();
  roundWinners = [];
  isProcessingTurn = false;

  handValue = 1;
  lastTrucoTeam = null;
  pendingTrucoRequest = null;
  updateTrucoButtons();

  currentTurnIndex = handStarterIndex;
  handStarterIndex = (handStarterIndex + 1) % playersOrder.length;

  hands = {};
  playersOrder.forEach(p => {
    hands[p] = [deck.pop(), deck.pop(), deck.pop()];
  });

  vira = deck.pop();
  renderVira();

  const manilhaRankIndex = (ranks.indexOf(vira.rank) + 1) % ranks.length;
  const manilhaRank = ranks[manilhaRankIndex];
  const suitPowerPaulista = { 'Paus': 140, 'Copas': 130, 'Espadas': 120, 'Ouros': 110 };

  playersOrder.forEach(p => {
    hands[p].forEach(card => {
      if (card.rank === manilhaRank) {
        card.isManilha = true;
        card.effectiveValue = suitPowerPaulista[card.suit];
      } else {
        card.isManilha = false;
        card.effectiveValue = card.value;
      }
    });
  });

  renderHands();
  startNewRound();
}

function startNewRound() {
  playedCardsThisRound = [];
  document.getElementById('played-cards').innerHTML = '';
  isProcessingTurn = false;

  const roundNum = roundWinners.length + 1;
  log(`--- <b>${roundNum}ª Rodada (Valendo ${handValue} ${handValue === 1 ? 'ponto' : 'pontos'})</b> ---`);
  
  if (playersOrder[currentTurnIndex] === 'user') {
    log("<b>Sua vez de jogar!</b>");
  } else {
    log(`Vez do ${getPlayerName(playersOrder[currentTurnIndex])}...`);
    setTimeout(botTurnLogic, 1000);
  }
}

function getNextTrucoValue(current) {
  if (current === 1) return 3;
  if (current === 3) return 6;
  if (current === 6) return 9;
  if (current === 9) return 12;
  return 12;
}

function getTrucoLabel(value) {
  switch(value) {
    case 3: return "TRUCO";
    case 6: return "SEIS";
    case 9: return "NOVE";
    case 12: return "DOZE";
    default: return "";
  }
}

function updateTrucoButtons() {
  const btnTruco = document.getElementById('btn-truco');
  const trucoResponses = document.getElementById('truco-responses');
  const btnRaise = document.getElementById('btn-raise');

  if (pendingTrucoRequest) {
    btnTruco.style.display = 'none';
    if (pendingTrucoRequest.requesterTeam === 'them') {
      trucoResponses.style.display = 'block';
      const nextVal = getNextTrucoValue(pendingTrucoRequest.targetValue);
      btnRaise.style.display = (pendingTrucoRequest.targetValue < 12) ? 'inline-block' : 'none';
      if (nextVal <= 12) btnRaise.innerText = `Pedir ${getTrucoLabel(nextVal)}!`;
    } else {
      trucoResponses.style.display = 'none';
    }
  } else {
    trucoResponses.style.display = 'none';
    btnTruco.style.display = 'inline-block';
    
    const nextVal = getNextTrucoValue(handValue);
    if (handValue === 12 || lastTrucoTeam === 'us') {
      btnTruco.disabled = true;
      btnTruco.innerText = handValue === 12 ? "Mão de 12!" : "Aguardando Oponente";
    } else {
      btnTruco.disabled = false;
      btnTruco.innerText = `Pedir ${getTrucoLabel(nextVal)}!`;
    }
  }
}

function askTruco() {
  if (isProcessingTurn || pendingTrucoRequest) return;

  const targetValue = getNextTrucoValue(handValue);
  log(`<b style='color:#ffb703;'>Você pediu ${getTrucoLabel(targetValue)}!</b>`);

  pendingTrucoRequest = { requesterTeam: 'us', targetValue: targetValue };
  lastTrucoTeam = 'us';
  isProcessingTurn = true;
  updateTrucoButtons();

  setTimeout(botRespondTruco, 1200);
}

function botRespondTruco() {
  const currentBotKey = playersOrder[currentTurnIndex];
  const botHand = hands[currentBotKey] || [];
  
  const strongCards = botHand.filter(c => c.isManilha || c.value >= 7).length;
  const rand = Math.random();

  if (strongCards >= 2 || (strongCards >= 1 && rand > 0.4)) {
    if (strongCards === 3 && pendingTrucoRequest.targetValue < 12 && rand > 0.6) {
      const raiseValue = getNextTrucoValue(pendingTrucoRequest.targetValue);
      log(`<b style='color:#ff4d4d;'>Os Bots AUMENTARAM para ${getTrucoLabel(raiseValue)}!</b>`);
      pendingTrucoRequest = { requesterTeam: 'them', targetValue: raiseValue };
      lastTrucoTeam = 'them';
      isProcessingTurn = false;
      updateTrucoButtons();
      return;
    }

    log(`<b>Os Bots ACEITARAM o pedido! A mão agora vale ${pendingTrucoRequest.targetValue} pontos.</b>`);
    handValue = pendingTrucoRequest.targetValue;
    pendingTrucoRequest = null;
    isProcessingTurn = false;
    updateTrucoButtons();
    
    if (playersOrder[currentTurnIndex] !== 'user') {
      setTimeout(botPlayCard, 800);
    }
  } else {
    log("<b style='color:#70e000;'>Os Bots CORRERAM! Você venceu a mão.</b>");
    finishHand('us');
  }
}

function respondTruco(action) {
  if (!pendingTrucoRequest || pendingTrucoRequest.requesterTeam !== 'them') return;

  if (action === 'accept') {
    handValue = pendingTrucoRequest.targetValue;
    log(`<b>Você aceitou! A mão agora vale ${handValue} pontos.</b>`);
    pendingTrucoRequest = null;
    isProcessingTurn = false;
    updateTrucoButtons();

    if (playersOrder[currentTurnIndex] !== 'user') {
      setTimeout(botPlayCard, 800);
    }
  } else if (action === 'refuse') {
    log("<b style='color:#ff4d4d;'>Você correu do pedido!</b>");
    finishHand('them');
  } else if (action === 'raise') {
    const raiseValue = getNextTrucoValue(pendingTrucoRequest.targetValue);
    log(`<b style='color:#ffb703;'>Você AUMENTOU para ${getTrucoLabel(raiseValue)}!</b>`);
    pendingTrucoRequest = { requesterTeam: 'us', targetValue: raiseValue };
    lastTrucoTeam = 'us';
    isProcessingTurn = true;
    updateTrucoButtons();

    setTimeout(botRespondTruco, 1200);
  }
}

function renderVira() {
  const container = document.getElementById('vira-card');
  const isRed = vira.suit === 'Ouros' || vira.suit === 'Copas';
  container.innerHTML = `
    <div class="card ${isRed ? 'red' : ''}">
      <span>${vira.rank}</span>
      <span>${vira.icon}</span>
    </div>
  `;
}

function renderHands() {
  playersOrder.forEach(p => {
    const container = document.getElementById(p === 'user' ? 'hand-user' : `hand-${p}`);
    container.innerHTML = '';

    hands[p].forEach((card, index) => {
      const cardElement = document.createElement('div');
      if (p === 'user') {
        const isRed = card.suit === 'Ouros' || card.suit === 'Copas';
        cardElement.className = `card ${isRed ? 'red' : ''}`;
        cardElement.innerHTML = `<span>${card.rank}</span><span>${card.icon}</span>`;
        cardElement.onclick = () => playHumanCard(index);
      } else {
        cardElement.className = 'card back';
      }
      container.appendChild(cardElement);
    });
  });
}

function playHumanCard(cardIndex) {
  if (isProcessingTurn || pendingTrucoRequest) return;

  if (playersOrder[currentTurnIndex] !== 'user') {
    log("<span style='color: #ff4d4d;'>Aguarde a sua vez de jogar!</span>");
    return;
  }

  const card = hands['user'].splice(cardIndex, 1)[0];
  playCard('Você', card);
  renderHands();
  nextTurn();
}

function playCard(playerLabel, card) {
  playedCardsThisRound.push({ 
    playerKey: playersOrder[currentTurnIndex], 
    playerLabel: playerLabel, 
    card: card 
  });

  const table = document.getElementById('played-cards');
  const isRed = card.suit === 'Ouros' || card.suit === 'Copas';
  
  const cardEl = document.createElement('div');
  cardEl.className = `card ${isRed ? 'red' : ''}`;
  cardEl.innerHTML = `<span>${card.rank}</span><span>${card.icon}</span>`;
  table.appendChild(cardEl);

  log(`${playerLabel} jogou ${card.rank} de ${card.suit}`);
}

function nextTurn() {
  currentTurnIndex = (currentTurnIndex + 1) % playersOrder.length;

  if (playedCardsThisRound.length === playersOrder.length) {
    isProcessingTurn = true;
    setTimeout(evaluateRound, 1200);
  } else if (playersOrder[currentTurnIndex] !== 'user') {
    isProcessingTurn = true;
    setTimeout(botTurnLogic, 1000);
  } else {
    isProcessingTurn = false;
    log("<b>Sua vez de jogar!</b>");
  }
}

function botTurnLogic() {
  if (pendingTrucoRequest) return;

  const currentBotKey = playersOrder[currentTurnIndex];
  const botHand = hands[currentBotKey] || [];
  
  const strongCards = botHand.filter(c => c.isManilha || c.value >= 7).length;
  if (strongCards >= 2 && lastTrucoTeam !== 'them' && handValue < 12 && Math.random() < 0.35) {
    const targetValue = getNextTrucoValue(handValue);
    log(`<b style='color:#ff4d4d;'>${getPlayerName(currentBotKey)} pediu ${getTrucoLabel(targetValue)}!</b>`);
    pendingTrucoRequest = { requesterTeam: 'them', targetValue: targetValue };
    lastTrucoTeam = 'them';
    updateTrucoButtons();
    return;
  }

  botPlayCard();
}

function botPlayCard() {
  const currentBotKey = playersOrder[currentTurnIndex];
  const botHand = hands[currentBotKey];

  if (!botHand || botHand.length === 0) return;

  const playedCard = botHand.shift();
  playCard(getPlayerName(currentBotKey), playedCard);
  renderHands();
  nextTurn();
}

function evaluateRound() {
  let sortedPlays = [...playedCardsThisRound].sort((a, b) => b.card.effectiveValue - a.card.effectiveValue);
  
  let winnerPlayed = sortedPlays[0];
  let isTie = false;

  if (sortedPlays.length > 1 && sortedPlays[0].card.effectiveValue === sortedPlays[1].card.effectiveValue) {
    const team1 = getTeam(sortedPlays[0].playerKey);
    const team2 = getTeam(sortedPlays[1].playerKey);
    if (team1 !== team2) isTie = true;
  }

  if (isTie) {
    log("<b style='color: #f1c40f;'>A rodada empatou (Cangou)!</b>");
    roundWinners.push('tie');
  } else {
    const winnerTeam = getTeam(winnerPlayed.playerKey);
    roundWinners.push(winnerTeam);
    log(`<b>${winnerPlayed.playerLabel} venceu a rodada!</b>`);
    currentTurnIndex = playersOrder.indexOf(winnerPlayed.playerKey);
  }

  const handWinner = checkHandWinnerPaulista();

  if (handWinner) {
    finishHand(handWinner);
  } else {
    setTimeout(startNewRound, 1000);
  }
}

function checkHandWinnerPaulista() {
  const r = roundWinners;
  const usWins = r.filter(w => w === 'us').length;
  const themWins = r.filter(w => w === 'them').length;

  if (usWins === 2) return 'us';
  if (themWins === 2) return 'them';

  if (r.length === 1 && r[0] === 'tie') return null;

  if (r.length === 2) {
    if (r[0] === 'tie' && r[1] !== 'tie') return r[1];
    if (r[0] !== 'tie' && r[1] === 'tie') return r[0];
  }

  if (r.length === 3) {
    if (r[0] === 'tie' && r[1] === 'tie' && r[2] !== 'tie') return r[2];
    if (r[2] === 'tie' && r[0] !== 'tie') return r[0];
    if (r[0] === 'tie' && r[1] === 'tie' && r[2] === 'tie') return 'none';
  }

  return null;
}

function finishHand(winnerTeam) {
  pendingTrucoRequest = null;

  if (winnerTeam === 'us') {
    scoreUs += handValue;
    log(`<b style='color:#70e000;'>Sua dupla venceu a mão (+${handValue} ${handValue === 1 ? 'ponto' : 'pontos'})!</b>`);
  } else if (winnerTeam === 'them') {
    scoreThem += handValue;
    log(`<b style='color:#ff4d4d;'>Os bots venceram a mão (+${handValue} ${handValue === 1 ? 'ponto' : 'pontos'})!</b>`);
  } else {
    log("<b>Mão empatada em todas as rodadas! Ninguém pontua.</b>");
  }

  document.getElementById('score-us').innerText = scoreUs;
  document.getElementById('score-them').innerText = scoreThem;

  setTimeout(() => {
    if (scoreUs >= 12 || scoreThem >= 12) {
      alert(scoreUs >= 12 ? "🏆 Parabéns! Sua dupla venceu o jogo!" : "❌ Fim de jogo, os bots venceram!");
      startGame();
    } else {
      startHand();
    }
  }, 1500);
}

function getTeam(playerKey) {
  return (playerKey === 'user' || playerKey === 'right') ? 'us' : 'them';
}

function getPlayerName(key) {
  switch(key) {
    case 'user': return 'Você';
    case 'top': return 'Bot Oponente';
    case 'left': return 'Bot Oponente (Esq)';
    case 'right': return 'Bot Parceiro';
    default: return 'Bot';
  }
}