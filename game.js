(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const palette = {
    red:    { name: 'Red',    color: '#ef6269', tint: '#ffeded', pale: '#fff8f8', start: 51, home: [0, 0], lane: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], yard: [[80, 80], [160, 80], [80, 160], [160, 160]], finish: [270, 300] },
    green:  { name: 'Green',  color: '#38b981', tint: '#e5f8ef', pale: '#f7fffb', start: 38, home: [0, 360], lane: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], yard: [[80, 440], [160, 440], [80, 520], [160, 520]], finish: [300, 330] },
    yellow: { name: 'Yellow', color: '#efb93f', tint: '#fff4d8', pale: '#fffdf7', start: 25, home: [360, 360], lane: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], yard: [[440, 440], [520, 440], [440, 520], [520, 520]], finish: [330, 300] },
    blue:   { name: 'Blue',   color: '#6877ed', tint: '#e9ebff', pale: '#f9f9ff', start: 12, home: [360, 0], lane: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], yard: [[440, 80], [520, 80], [440, 160], [520, 160]], finish: [300, 270] }
  };
  const order = ['red', 'green', 'yellow', 'blue'];
  const safeIndices = new Set([5, 12, 18, 25, 31, 38, 44, 51]);
  const track = [
    [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
    [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],
    [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
    [14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],
    [8,0],[7,0],[6,0]
  ];

  const board = document.getElementById('board');
  const rollButton = document.getElementById('roll-button');
  const skipButton = document.getElementById('skip-button');
  const die = document.getElementById('die');
  let playerCount = 4;
  let state;

  function svg(tag, attrs = {}) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  }

  function add(parent, tag, attrs = {}) {
    const node = svg(tag, attrs);
    parent.appendChild(node);
    return node;
  }

  function cell(parent, row, col, fill, extraClass = '', stroke = '#e8e9ef') {
    return add(parent, 'rect', {
      x: col * 40 + 1, y: row * 40 + 1, width: 38, height: 38, rx: 2,
      fill, stroke, 'stroke-width': 1.25, class: `board-cell ${extraClass}`.trim()
    });
  }

  function coordKey(row, col) { return `${row},${col}`; }

  function drawBoard() {
    board.replaceChildren();
    add(board, 'rect', { x: 0, y: 0, width: 600, height: 600, fill: '#fff' });

    for (const key of order) {
      const p = palette[key];
      const [x, y] = p.home;
      add(board, 'rect', { x, y, width: 240, height: 240, rx: 8, fill: p.tint });
      add(board, 'rect', { x: x + 36, y: y + 36, width: 168, height: 168, rx: 18, fill: '#fff', stroke: p.color, 'stroke-width': 2.5 });
      for (const [cx, cy] of p.yard) {
        add(board, 'circle', { cx, cy, r: 22, class: 'yard-ring', stroke: p.color, opacity: '.9' });
        add(board, 'circle', { cx, cy, r: 15, class: 'yard-center' });
      }
    }

    track.forEach(([row, col], index) => {
      const startOwner = order.find(key => palette[key].start === index);
      if (startOwner) {
        const p = palette[startOwner];
        cell(board, row, col, p.tint, 'start-cell', p.color);
        add(board, 'circle', { cx: col * 40 + 20, cy: row * 40 + 20, r: 8, fill: p.color, opacity: '.88' });
        return;
      }
      const safe = safeIndices.has(index);
      cell(board, row, col, safe ? '#f1f2fa' : '#fff', safe ? 'safe-cell' : 'path-cell');
      if (safe) add(board, 'text', { x: col * 40 + 20, y: row * 40 + 21, class: 'star-label' }).textContent = '★';
    });

    for (const key of order) {
      const p = palette[key];
      p.lane.forEach(([row, col]) => cell(board, row, col, p.tint, 'lane-cell', p.color));
    }

    // Four colored paths meet at the finish square.
    const centerX = 300, centerY = 300;
    add(board, 'rect', { x: 240, y: 240, width: 120, height: 120, rx: 4, fill: '#fff', stroke: '#e8e9ef', 'stroke-width': 1.5 });
    add(board, 'path', { d: 'M240 240 L240 360 L300 300 Z', fill: palette.red.color });
    add(board, 'path', { d: 'M240 360 L360 360 L300 300 Z', fill: palette.green.color });
    add(board, 'path', { d: 'M360 360 L360 240 L300 300 Z', fill: palette.yellow.color });
    add(board, 'path', { d: 'M360 240 L240 240 L300 300 Z', fill: palette.blue.color });
    add(board, 'circle', { cx: centerX, cy: centerY, r: 17, class: 'center-ring' });
    add(board, 'circle', { cx: centerX, cy: centerY, r: 5, fill: '#f1f1f8' });

    drawTokens();
  }

  function tokenLocation(playerKey, tokenIndex) {
    const player = palette[playerKey];
    const progress = state.tokens[playerKey][tokenIndex];
    if (progress < 0) {
      const [x, y] = player.yard[tokenIndex];
      return { x, y, key: `yard-${playerKey}-${tokenIndex}` };
    }
    if (progress <= 51) {
      const index = (player.start + progress) % 52;
      const [row, col] = track[index];
      return { x: col * 40 + 20, y: row * 40 + 20, key: `track-${index}` };
    }
    if (progress < 57) {
      const [row, col] = player.lane[progress - 52];
      return { x: col * 40 + 20, y: row * 40 + 20, key: `lane-${playerKey}-${progress}` };
    }
    return { x: player.finish[0], y: player.finish[1], key: `finish-${playerKey}` };
  }

  function drawTokens() {
    const locations = [];
    for (const key of state.players) {
      for (let i = 0; i < 4; i++) locations.push({ key, i, location: tokenLocation(key, i) });
    }
    const piles = new Map();
    for (const item of locations) {
      if (!piles.has(item.location.key)) piles.set(item.location.key, []);
      piles.get(item.location.key).push(item);
    }
    const shifts = [[-9, -9], [9, -9], [-9, 9], [9, 9]];
    for (const item of locations) {
      const { key, i, location } = item;
      const pile = piles.get(location.key);
      const offset = pile.length > 1 ? shifts[pile.indexOf(item) % shifts.length] : [0, 0];
      const selectable = state.phase === 'move' && state.current === key && state.legal.includes(i);
      const token = add(board, 'g', {
        class: `token ${selectable ? 'selectable' : 'not-selectable'}`,
        transform: `translate(${location.x + offset[0]} ${location.y + offset[1]})`,
        role: selectable ? 'button' : 'img',
        tabindex: selectable ? '0' : '-1',
        'aria-label': `${palette[key].name} piece ${i + 1}${selectable ? ', selectable' : ''}`,
        'data-player': key, 'data-token': i
      });
      add(token, 'circle', { class: 'token-body', r: 14, fill: palette[key].color });
      add(token, 'circle', { cx: -4.5, cy: -5, r: 3.3, fill: '#ffffff', opacity: '.34' });
      const label = add(token, 'text', { y: .5 });
      label.textContent = String(i + 1);
      if (selectable) {
        token.addEventListener('click', () => moveToken(key, i));
        token.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); moveToken(key, i); }
        });
      }
    }
  }

  function newGame(count = playerCount) {
    playerCount = Number(count);
    const players = playerCount === 2 ? ['red', 'yellow'] : order.slice(0, playerCount);
    state = { players, current: players[0], phase: 'roll', roll: null, legal: [], tokens: {}, message: 'Roll the dice to get started.', bonus: false, winner: null };
    for (const key of players) state.tokens[key] = [-1, -1, -1, -1];
    drawBoard();
    renderPanel();
    document.querySelectorAll('[data-player-count]').forEach(button => button.setAttribute('aria-pressed', Number(button.dataset.playerCount) === playerCount ? 'true' : 'false'));
  }

  function possibleMoves(key, roll) {
    return state.tokens[key].map((progress, index) => {
      if (progress < 0) return roll === 6 ? index : -1;
      return progress + roll <= 56 ? index : -1;
    }).filter(index => index >= 0);
  }

  function rollDice() {
    if (state.phase !== 'roll') return;
    const result = Math.floor(Math.random() * 6) + 1;
    state.roll = result;
    state.legal = possibleMoves(state.current, result);
    die.classList.remove('rolling');
    void die.offsetWidth;
    die.classList.add('rolling');
    if (state.legal.length) {
      state.phase = 'move';
      state.message = state.legal.length === 1 ? `You rolled ${result}. Choose your piece.` : `You rolled ${result}. Choose a piece to move.`;
    } else {
      state.phase = 'blocked';
      state.message = `You rolled ${result}, but no pieces can move. Pass the turn.`;
    }
    drawBoard();
    renderPanel();
  }

  function moveToken(key, index) {
    if (state.phase !== 'move' || key !== state.current || !state.legal.includes(index)) return;
    let progress = state.tokens[key][index];
    progress = progress < 0 ? 0 : progress + state.roll;
    state.tokens[key][index] = progress;

    let captured = 0;
    if (progress <= 51) {
      const landingIndex = (palette[key].start + progress) % 52;
      if (!safeIndices.has(landingIndex)) {
        for (const rival of state.players) {
          if (rival === key) continue;
          state.tokens[rival] = state.tokens[rival].map(rivalProgress => {
            if (rivalProgress >= 0 && rivalProgress <= 51 && (palette[rival].start + rivalProgress) % 52 === landingIndex) {
              captured++;
              return -1;
            }
            return rivalProgress;
          });
        }
      }
    }

    if (state.tokens[key].every(value => value === 56)) {
      state.phase = 'won';
      state.winner = key;
      state.roll = null;
      state.message = `All four pieces are home. ${palette[key].name} wins!`;
    } else if (state.roll === 6) {
      state.phase = 'roll';
      state.roll = null;
      state.legal = [];
      state.bonus = true;
      state.message = captured ? `Piece ${index + 1} bumped a rival home. Roll again for your bonus turn!` : `Piece ${index + 1} moved. Roll again for your bonus turn!`;
    } else {
      state.message = captured ? `Piece ${index + 1} bumped a rival home.` : `Piece ${index + 1} moved.`;
      advanceTurn();
    }
    drawBoard();
    renderPanel();
  }

  function advanceTurn() {
    const currentIndex = state.players.indexOf(state.current);
    state.current = state.players[(currentIndex + 1) % state.players.length];
    state.phase = 'roll';
    state.roll = null;
    state.legal = [];
    state.bonus = false;
  }

  function passTurn() {
    if (state.phase !== 'blocked') return;
    advanceTurn();
    state.message = 'No pieces could move. ' + palette[state.current].name + ' is up next.';
    drawBoard();
    renderPanel();
  }

  function renderDie(value) {
    const faces = {
      1: [4], 2: [0, 8], 3: [0, 4, 8],
      4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
    };
    die.querySelectorAll('.pip').forEach((pip, index) => pip.classList.toggle('on', Boolean(value && faces[value].includes(index))));
    die.setAttribute('aria-label', value ? `Dice showing ${value}` : 'Dice ready to roll');
  }

  function renderPanel() {
    const current = palette[state.current];
    document.getElementById('current-player').textContent = state.phase === 'won' ? `${palette[state.winner].name} wins!` : `${current.name}'s turn`;
    const avatar = document.getElementById('current-avatar');
    avatar.textContent = state.phase === 'won' ? '★' : current.name[0];
    avatar.style.background = current.color;
    document.getElementById('turn-message').textContent = state.message;
    const indicator = document.getElementById('turn-indicator');
    indicator.querySelector('.turn-dot').style.background = current.color;
    indicator.lastElementChild.textContent = state.phase === 'won' ? 'Game over' : state.phase === 'move' ? 'Choose a piece' : state.phase === 'blocked' ? 'No moves' : state.bonus ? 'Bonus turn' : 'Your turn';
    rollButton.disabled = state.phase !== 'roll';
    rollButton.innerHTML = `${state.bonus ? 'Roll again' : 'Roll dice'} <span class="button-arrow" aria-hidden="true">↗</span>`;
    skipButton.hidden = state.phase !== 'blocked';
    renderDie(state.roll);

    const list = document.getElementById('players-list');
    list.replaceChildren();
    for (const key of state.players) {
      const p = palette[key];
      const row = document.createElement('div');
      row.className = `player-row ${key === state.current && state.phase !== 'won' ? 'active' : ''}`;
      const swatch = document.createElement('span');
      swatch.className = 'player-swatch';
      swatch.style.background = p.color;
      swatch.textContent = p.name[0];
      const info = document.createElement('span');
      info.className = 'player-info';
      const name = document.createElement('span');
      name.className = 'player-name';
      name.textContent = p.name;
      const descriptor = document.createElement('span');
      descriptor.className = 'player-state';
      const home = state.tokens[key].filter(value => value === 56).length;
      const out = state.tokens[key].filter(value => value >= 0 && value < 56).length;
      descriptor.textContent = home === 4 ? 'All pieces home' : `${out} on the board · ${home} home`;
      info.append(name, descriptor);
      const count = document.createElement('span');
      count.className = key === state.current && state.phase !== 'won' ? 'active-pill' : 'piece-count';
      count.textContent = key === state.current && state.phase !== 'won' ? 'UP NEXT' : `${home}/4 home`;
      row.append(swatch, info, count);
      list.appendChild(row);
    }
    document.getElementById('player-count-label').textContent = `${state.players.length} playing`;
  }

  rollButton.addEventListener('click', rollDice);
  skipButton.addEventListener('click', passTurn);
  document.getElementById('new-game').addEventListener('click', () => newGame(playerCount));
  document.querySelectorAll('[data-player-count]').forEach(button => button.addEventListener('click', () => newGame(Number(button.dataset.playerCount))));

  newGame(4);
})();
