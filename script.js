// ----------------------------------------
// script.js
// ----------------------------------------

let cardIdCounter = 0;
let currentRound = 1;
let currentGold = 0;
let roundRevenue = 0;
let refreshCount = 0;
let warningNextRoundShown = false;
let lastPlacement = null;

const rows = [4,5,4,5,4,5,4];
const typeMapping = {
  1:'wasteland', 2:'wasteland', 3:'wasteland', 4:'wasteland',
  5:'wasteland', 6:'slum',      7:'slum',      8:'wasteland',
  9:'river',     10:'slum',     11:'city',     12:'slum',
  13:'river',    14:'slum',     15:'city',     16:'city',
  17:'river',    18:'wasteland',19:'slum',     20:'slum',
  21:'river',    22:'wasteland',23:'wasteland',24:'slum',
  25:'river',    26:'wasteland',27:'wasteland',28:'wasteland',
  29:'river',    30:'wasteland',31:'wasteland'
};

const cardPoolData = [
  { name:'淨水站', rarity:'普通', label:'河流',     baseProduce:4, specialAbility:'回合結束時，有50%機率產出額外+1' ,type:'building' },
  { name:'星軌會館', rarity:'稀有', label:'繁華區',  baseProduce:6, specialAbility:'沒有任何建築相臨時，產出額外+2' ,type:'building' },
  { name:'摩天坊', rarity:'普通', label:'繁華區', baseProduce:5 ,type:'building' },
  { name:'集貧居', rarity:'普通', label:'貧民窟', baseProduce:4 ,type:'building' },
  { name:'廢土站', rarity:'普通', label:'荒原',   baseProduce:3 ,type:'building' },
  { name:'廢材棚', rarity:'普通', label:'荒原',   baseProduce:4 ,type:'building' },
  { name:'社群站', rarity:'普通', label:'貧民窟', baseProduce:4, specialAbility:'當有任何建築相臨時，產出額外+1' ,type:'building' },
  { name:'彈出商亭', rarity:'普通', label:'繁華區', baseProduce:5, specialAbility:'當位於任何邊緣地塊時，產出額外+1' ,type:'building' },
  { name:'地脈節點', rarity:'普通', label:'荒原', baseProduce:6, specialAbility:'當剛好有兩個建築相臨時，產出額外+1' ,type:'building' },
  { name:'匯聚平臺', rarity:'稀有', label:'貧民窟', baseProduce:5, specialAbility:'當相鄰的建築超過2個時，產出額外+2' ,type:'building' },
  { name:'流動站',   rarity:'稀有', label:'河流',   baseProduce:5, specialAbility:'若相鄰的建築位於河流地塊上，該建築產出額外+1' ,type:'building' },
  { name:'焚料方艙', rarity:'稀有', label:'荒原',   baseProduce:8, specialAbility:'若本回合為偶數回合，產出永久−1，最多永久減少4' ,type:'building' },
  { name:'廉租居',     rarity:'普通', baseProduce:3, label:'貧民窟' ,type:'building' },
  { name:'灣岸輸能站', rarity:'普通', baseProduce:6, label:'河流', specialAbility:'若沒有位於河流，每回合產出-1' ,type:'building' },
  { name:'垂直農倉',   rarity:'稀有', baseProduce:6, label:'貧民窟', specialAbility:'每有 1 座垂直農倉相鄰，產出 +1（最多 +2）' ,type:'building' },
  { name:'通訊樞紐',   rarity:'稀有', baseProduce:6, label:'荒原',   specialAbility:'此建築可同時視為擁有所有地塊 tag，能觸發所有地塊 tag 效果（不改變地塊本身）' ,type:'building' },
  { name:'廢物利用', rarity:'普通', baseProduce:0, specialAbility:'荒原地塊能力的產出額外 +1 金幣', type:'tech' },
  { name:'地價升值', rarity:'稀有', baseProduce:0, specialAbility:'繁華區地塊能力的產出額外 +2 金幣', type:'tech' },
];

// ─ 新增：科技卡定義與已用次數 ─
const techDefinitions = {
  '廢物利用': { rarity:'普通', description:'荒原地塊能力的產出額外', perLevel:1, count:0, max:5 },
  '地價升值': { rarity:'稀有', description:'繁華區地塊能力的產出額外', perLevel:2, count:0, max:5 }
};

const labelEffectDesc = {
  "繁華區":"蓋在繁華區時+4",
  "貧民窟":"相鄰貧民窟建築每座+1",
  "河流":"蓋在河流時+3",
  "荒原":"非荒原地塊50%機率不產出"
};

// 在 labelEffectDesc 之後，加入
const tileEffectDesc = {
  city:      '所有建築產出 +2',
  slum:      '若 3 塊（含）以上相連且都有建築，則各額外 +1',
  river:     '建築產出 −1',
  wasteland: '無效果'
};

const directionsEven = [
  {dr:-1,dc:0},{dr:-1,dc:1},{dr:0,dc:-1},
  {dr:0,dc:1},{dr:1,dc:0},{dr:1,dc:1}
];
const directionsOdd = [
  {dr:-1,dc:-1},{dr:-1,dc:0},{dr:0,dc:-1},
  {dr:0,dc:1},{dr:1,dc:-1},{dr:1,dc:0}
];

// ——— 地塊類型中英文對照 ———
const tileTypeNames = {
  city:      '繁華區',
  slum:      '貧民窟',
  river:     '河流',
  wasteland: '荒原'
};

// ——— 支付節點設定 ———
const paymentSchedule = { 5:180, 10:640, 16:1450 };

let tileMap = [];

// 工具函式

// 顯示「遊戲結束」畫面
function showEndScreen(msg) {
  document.getElementById('end-title').innerText = msg;
  document.getElementById('end-screen').style.display = 'flex';
}

// 重置所有狀態並重新開始
function restartGame() {
  // 重設遊戲變數
  currentRound = 1;
  currentGold = 0;
  roundRevenue = 0;
  refreshCount = 0;
  warningNextRoundShown = false;
  lastPlacement = null;

  // 新增：重置科技樹中的已用次數，並更新畫面
  Object.values(techDefinitions).forEach(def => def.count = 0);
  updateTechTree();

  // 重建地圖與手牌
  tileMap = createTileMap31();
  computeAdj();
  initMapArea();
  document.getElementById('hand').innerHTML = '手牌（建築）';

  // 更新 UI
  updateRoundDisplay();
  updateResourceDisplay();
  updateStageBar();

  // 隱藏結束畫面，進入抽卡
  document.getElementById('end-screen').style.display = 'none';
  startDrawPhase();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

//根據回合回傳各稀有度的權重。
function getRarityDistribution(round) {
  if (round <= 5)   return { 普通: 1.0, 稀有: 0.0 };
  if (round <= 10)  return { 普通: 0.85, 稀有: 0.15 };
                     return { 普通: 0.75, 稀有: 0.25 };
}

//從一個 {key: weight, …} 物件隨機選一個 key。
function weightedRandomKey(dist) {
  const sum = Object.values(dist).reduce((a,b)=>a+b, 0);
  let r = Math.random() * sum;
  for (const [k,w] of Object.entries(dist)) {
    if (r < w) return k;
    r -= w;
  }
}
  
//從 cardPoolData 抽一張符合「typeConstraint」與「rarity」，且不在 excludedSet 裡的卡。
function drawOneCard(typeConstraint, rarity, excludedSet) {
  const pool = cardPoolData.filter(c =>
    c.rarity === rarity &&
    (typeConstraint === 'either' || c.type === typeConstraint) &&
    !excludedSet.has(c.name)
    // 排除：科技卡已使用達上限
    && !(c.type==='tech' && techDefinitions[c.name].count >= techDefinitions[c.name].max)                               
  );
  // ── 新增：如果 pool 為空，fallback 回建築卡池，或最終隨機一張 ──
   if (pool.length === 0) {
     // 優先從相同稀有度的建築卡裡抽
     const fallback = cardPoolData.filter(c =>
       c.rarity === rarity &&
       c.type === 'building' &&
       !excludedSet.has(c.name)
     );
     if (fallback.length > 0) {
       const pick2 = fallback[Math.floor(Math.random() * fallback.length)];
       excludedSet.add(pick2.name);
       return pick2;
     }
     // 若還是空，再從所有未抽過的卡隨機取一張
     const anyPool = cardPoolData.filter(c => !excludedSet.has(c.name));
     const pick3 = anyPool[Math.floor(Math.random() * anyPool.length)];
     excludedSet.add(pick3.name);
     return pick3;
   }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  excludedSet.add(pick.name);
  return pick;
}

// 建立地圖資料
function createTileMap31(){
  let map = [];
  let id = 1;
  rows.forEach((count, r) => {
    for (let c = 0; c < count; c++, id++) {
      map.push({
        id, row:r, col:c,
        type:typeMapping[id],
        buildingProduce:0,
        buildingPlaced:false,
        slumBonusGranted:false,
        adjacency:[], x:0, y:0
      });
    }
  });
  return map;
}

// 計算鄰接清單 (odd-r offset)
function computeAdj(){
  tileMap.forEach(tile => {
    const dirs = (tile.row % 2 === 0) ? directionsEven : directionsOdd;
    dirs.forEach(d => {
      const nb = tileMap.find(t => t.row === tile.row + d.dr && t.col === tile.col + d.dc);
      if (nb) tile.adjacency.push(nb.id);
    });
  });
}

// 將地圖渲染到畫面
function initMapArea(){
  const mapArea = document.getElementById('map-area');
  mapArea.innerHTML = '';
  const tileW = 80, tileH = 80, vSpace = tileH * 0.75, offX = tileW/2;
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  tileMap.forEach(t => {
    const shift = (t.row % 2 === 1) ? -offX : 0;
    t.x = t.col * tileW + shift;
    t.y = t.row * vSpace;
    minX = Math.min(minX, t.x);
    maxX = Math.max(maxX, t.x);
    minY = Math.min(minY, t.y);
    maxY = Math.max(maxY, t.y);
  });
  const shapeW = maxX - minX + tileW, shapeH = maxY - minY + tileH;
  const centerX = (mapArea.clientWidth - shapeW)/2;
  const centerY = (mapArea.clientHeight - shapeH)/2;
  const hoverCover = document.getElementById('hcover');

  tileMap.forEach(t => {
    const hex = document.createElement('div');
    hex.className = `hex-tile ${t.type}-tile`;
    hex.dataset.tileId = t.id;
    hex.textContent = '?';
    hex.style.left = (t.x - minX + centerX) + 'px';
    hex.style.top  = (t.y - minY + centerY) + 'px';
    hex.ondragover = e => e.preventDefault();
    hex.ondrop = e => {
      e.preventDefault();
      const cid = e.dataTransfer.getData('cardId');
      const card = document.querySelector(`[data-card-id="${cid}"]`);
      if (!card) return;

      // 如果此地塊已經有建築，先問玩家要不要覆蓋
      if (t.buildingPlaced) {
        const ok = confirm('此地塊已有建築，是否覆蓋?');
        if (!ok) return;
      }

      // 記錄這次放置
      lastPlacement = {
      tileId: t.id,
      building: {
      name: card.querySelector('.card-name').innerText,
      rarity: card.querySelector('.card-rarity').innerText,
      label: card.dataset.label,
      specialAbility: card.querySelector('.card-ability')?.innerText || '',
      baseProduce: parseInt(card.dataset.produce)
      }
     };
     // 啟用撤銷按鈕
     document.getElementById('undo-btn').disabled = false;

      placeBuildingOnTile(t, card);
    };
    
    // 滑鼠移入：顯示懸浮窗
    hex.addEventListener('mouseenter', () => {
      document.querySelectorAll('.hcover-popup').forEach(el => el.remove());

  const tileData = tileMap.find(t => String(t.id) === hex.dataset.tileId);
  const rect = hex.getBoundingClientRect();

  if (!tileData.buildingPlaced) {
    // —— 空地：中英地塊名稱 —— 
    const popup = document.createElement('div');
    popup.className = 'hcover hcover-popup';
    popup.innerHTML =
    `地塊類型：${tileData.type}（${tileTypeNames[tileData.type]}）<br>` +
    `地塊效果：${tileEffectDesc[tileData.type]}`;
    popup.style.top  = `${rect.top}px`;
    popup.style.left = `${rect.right + 5}px`;
    popup.style.display = 'block';
    document.body.appendChild(popup);

    } 
  else {
    // —— 已放建築：三個懸浮框 —— 

    // 1. 完整卡牌
    const cardPopup = document.createElement('div');
    cardPopup.className = 'hcover hcover-popup';
    cardPopup.style.top  = `${rect.top}px`;
    cardPopup.style.left = `${rect.right + 5}px`;
    cardPopup.style.display = 'block';
    cardPopup.innerHTML = `
      <div class="card" style="width:120px;height:220px;">
        <div class="card-gold-output">${tileData.buildingBaseProduce}</div>
        <div class="card-image-area"></div>
        <div class="card-name">${tileData.buildingName}</div>
        <div class="card-rarity">${tileData.buildingRarity}</div>
        <div class="card-label">${tileData.buildingLabel}</div>
        <div class="card-ability">${tileData.buildingSpecialAbility}</div>
      </div>`;
    document.body.appendChild(cardPopup);

    // 2. 標籤能力
    const labelPopup = document.createElement('div');
    labelPopup.className = 'hcover hcover-popup';
    labelPopup.style.display = 'block';
    labelPopup.innerText = `${tileData.buildingLabel}：${labelEffectDesc[tileData.buildingLabel]}`;
    document.body.appendChild(labelPopup);

    // 3. 地塊能力
   const tilePopup = document.createElement('div');
   tilePopup.className = 'hcover hcover-popup';
   tilePopup.innerText = `地塊效果：${tileEffectDesc[tileData.type]}`;
   tilePopup.style.display = 'block';
   document.body.appendChild(tilePopup);

    // 4.新增：科技加成 —— 
    const techBonusPopup = document.createElement('div');
    techBonusPopup.className = 'hcover hcover-popup';
    techBonusPopup.style.display = 'block';
    // 計算「廢物利用」與「地價升值」對這格的加成
    const wulu = techDefinitions['廢物利用'];
    const dijia = techDefinitions['地價升值'];
    const bonusWulu = tileData.type === 'wasteland' ? wulu.perLevel * wulu.count : 0;
    const bonusDijia = tileData.type === 'city'     ? dijia.perLevel * dijia.count : 0;
    const techBonus = bonusWulu + bonusDijia;
    techBonusPopup.innerText = `科技加成：${techBonus}`;
    document.body.appendChild(techBonusPopup);

    // 5. 本回合產出（含剛才算出的 techBonus）
    const producePopup = document.createElement('div');
    producePopup.className = 'hcover hcover-popup';
    producePopup.style.display = 'block';
    // 直接套用之前算好的 techBonus
    const finalProduce = tileData.buildingProduce + techBonus;
    producePopup.innerText = `本回合產出：${finalProduce}`;
    document.body.appendChild(producePopup);

    // —— 統一排列三個彈框 ——
   // 水平偏移統一
   const offsetX = rect.right + 140;
   const spacing = 10;                    // 每個 popup 間距
   let currentTop = rect.top;             // 起始高度

   // 2. 標籤能力
   labelPopup.style.top    = `${currentTop}px`;
   labelPopup.style.left   = `${offsetX}px`;
   labelPopup.style.display= 'block';
   currentTop += labelPopup.offsetHeight + spacing;

   // 3. 地塊效果
   tilePopup.style.top     = `${currentTop}px`;
   tilePopup.style.left    = `${offsetX}px`;
   tilePopup.style.display = 'block';
   currentTop += tilePopup.offsetHeight + spacing;

   // 4. 科技加成
   techBonusPopup.style.top    = `${currentTop}px`;
   techBonusPopup.style.left   = `${offsetX}px`;
   techBonusPopup.style.display= 'block';
   currentTop += techBonusPopup.offsetHeight + spacing;

   // 5. 本回合產出
   producePopup.style.top    = `${currentTop}px`;
   producePopup.style.left   = `${offsetX}px`;
   producePopup.style.display= 'block';
     }
  });

    // 滑鼠移出：隱藏懸浮窗
    hex.addEventListener('mouseleave', () => {
      document.querySelectorAll('.hcover-popup').forEach(el => el.remove());
    });

     mapArea.appendChild(hex);
  });
}

// 更新 UI 顯示
function updateRoundDisplay(){ document.getElementById('round-number').innerText = currentRound; }
function updateResourceDisplay(){
  document.getElementById('gold-amount').innerText = currentGold;
  document.getElementById('round-gold').innerText = roundRevenue;
}
function updateRefreshButton(){
  const cost = 2 * (refreshCount + 1);
  document.getElementById('refresh-btn').textContent = `刷新卡片(${cost} 金幣)`;
}

// 更新右上角「時間軸」文字
function updateStageBar() {
  const bar = document.getElementById('stage-bar');
  const rounds = Object.keys(paymentSchedule).map(n=>+n).sort((a,b)=>a-b);
  // 找出下一個 >= currentRound 的節點回合
  const next = rounds.find(r=>r >= currentRound);
  if (next !== undefined) {
    const cost = paymentSchedule[next], diff = next - currentRound;
    bar.textContent = diff === 0
      ? `本回合結束時將會收取${cost}金幣`
      : `${diff}回合後將會收取${cost}金幣`;
   // 交付金幣的當回合，還沒顯示過，就彈提示
    if (diff === 0 && !warningNextRoundShown) {
      showModal('這個回合結束就需要支付金幣了!');
      warningNextRoundShown = true;
    }
    // 如果差 >0，重置下回合提示開關
    if (diff > 0) warningNextRoundShown = false;
  } else {
    bar.textContent = '';
  }
}

// 建築卡牌生成
function createBuildingCard(info){
  const card = document.createElement('div');
  // 新增：記錄卡片類型 (building 或 tech)
  card.dataset.type = info.type;
  card.className = 'card';
  card.dataset.produce = info.baseProduce;
  card.dataset.cardId = ++cardIdCounter;
  card.dataset.label = info.label;
  card.innerHTML = `
    ${info.type === 'building'
     ? `<div class="card-gold-output">${info.baseProduce}</div>` 
     : ''}
    <div class="card-image-area"></div>
    <div class="card-name">${info.name}</div>
    <div class="card-rarity">${info.rarity}</div>
    ${info.type === 'building'
     ? `<div class="card-label">${info.label}</div>`
     : ''}
    <div class="card-ability">${info.specialAbility||''}</div>
   ${info.type === 'building'
     ? `<div class="tooltip">
         ${info.label}：${labelEffectDesc[info.label]||''}
       </div>`
     : ''}
   <!-- 新增：卡牌類型標示 -->
   <div class="card-type">${info.type === 'tech' ? '科技' : '建築'}</div>`;
  
  // 點選選牌
  card.onclick = () => {
    const pool = document.getElementById('card-pool');
    const selected = pool.querySelectorAll('.card.selected');
    // 如果還沒選中自己，且已經有 2 張被選，阻止第三張
    if (!card.classList.contains('selected') && selected.length >= 2) {
      alert('只能選擇兩張卡！');
      return;
    }
    card.classList.toggle('selected');
  };
  // 拖曳
  card.draggable = true;
  card.addEventListener('dragstart', e => {
  // 1. 設定拖曳資料
  e.dataTransfer.setData('cardId', card.dataset.cardId);
  
  // 1.1 暫時隱藏這張卡牌的 tooltip，以免出現在 drag image 上
  const tip = card.querySelector('.tooltip');
  if (tip) tip.style.display = 'none';

  // 2. 只對「抽卡區」(#card-pool) 隱藏其他卡牌
  const pool = document.getElementById('card-pool');
  if (pool.contains(card)) {
    pool.querySelectorAll('.card').forEach(c => {
      if (c !== card) c.style.visibility = 'hidden';
    });
  }

  // 3. 強制 drag image 使用本體
  e.dataTransfer.setDragImage(card, card.clientWidth/2, card.clientHeight/2);

  // 3.1 拖曳啟動後，延遲隱藏手排中的自己（拿在手上）
  setTimeout(() => {
  const hand = document.getElementById('hand');
  if (hand.contains(card)) {
    card.style.display = 'none';
  }
}, 0);
});

 card.addEventListener('dragend', e => {
  // 先把自身 tooltip 還原
  const tip = card.querySelector('.tooltip');
  if (tip) tip.style.display = '';

  // 只對「抽卡區」的卡，恢復可見
  const pool = document.getElementById('card-pool');
  pool.querySelectorAll('.card').forEach(c => {
    c.style.visibility = 'visible';
  });
   
  // 3.2 拖曳結束後，若自己還在手排，恢復顯示
  const hand = document.getElementById('hand');
  if (hand.contains(card)) {
    card.style.display = '';
  }
 });
  return card;
}

// 抽牌階段
function drawCards(){
  const poolEl = document.getElementById('card-pool');
  poolEl.innerHTML = '';
  
  const pickedNames = new Set();
  const cards = [];
  const probs = getRarityDistribution(currentRound);
  
  // 前 3 張：固定 type = 'building'
  for (let i = 0; i < 3; i++) {
    const rarity = weightedRandomKey(probs);
    cards.push(drawOneCard('building', rarity, pickedNames));
  }
  // 後 2 張：type 50% building / 50% tech
  for (let i = 0; i < 2; i++) {
    const rarity = weightedRandomKey(probs);
    const typeCt = Math.random() < 0.5 ? 'building' : 'tech';
    cards.push(drawOneCard(typeCt, rarity, pickedNames));
  }
  
  // 將選到的 5 張卡渲染到畫面
  cards.forEach(info => {
    poolEl.appendChild(createBuildingCard(info));
  });
}

// 操作按鈕
function refreshCards(){
  const cost = 2*(refreshCount+1);
  if(currentGold < cost){ alert('金幣不足'); return; }
  currentGold -= cost; refreshCount++;
  updateResourceDisplay(); updateRefreshButton();
  drawCards();
}
function skipDraw(){
  currentGold += 10;
  updateResourceDisplay();
  document.getElementById('draw-section').style.display='none';
}
function confirmDraw(){
  const selected = Array.from(document.querySelectorAll('.card.selected'));
   // 嚴格要求「等於 2 張」才能通過
  if (selected.length !== 2) {
    alert('請選擇兩張卡！');
    return;}
   const hand = document.getElementById('hand');
  selected.forEach(c => {
    const name = c.querySelector('.card-name').innerText;
    const type = c.dataset.type;
    if (type === 'tech') {
      // 使用科技卡：計數 +1，更新科技樹
      techDefinitions[name].count = Math.min(
        techDefinitions[name].count + 1,
        techDefinitions[name].max
      );
      updateTechTree();
      // 新增：科技用完後重算本回合產出並更新顯示
      recalcRevenueFromScratch();
    } else {
      // 建築卡 → 加入手牌
      const info = {
        name,
        rarity: c.querySelector('.card-rarity').innerText,
        label: c.dataset.label,
        specialAbility: c.querySelector('.card-ability')?.innerText||'',
        baseProduce: parseInt(c.dataset.produce),
        type: 'building'      // 必帶
      };
      const nc = createBuildingCard(info);
      hand.appendChild(nc);
    }
    c.classList.remove('selected');
  });
  // 關閉抽卡視窗
  document.getElementById('draw-section').style.display = 'none';
}

// 地圖放牌
function placeBuildingOnTile(tile, card){
  // 1. 扣除既有產出
  if(tile.buildingPlaced){
    roundRevenue -= tile.buildingProduce;
    tile.slumBonusGranted = false;
  }
  // 2. 更新 tile 屬性
  tile.buildingBaseProduce = parseInt(card.dataset.produce);
  tile.buildingLabel = card.dataset.label;
  tile.buildingName  = card.querySelector('.card-name').innerText;
  tile.buildingRarity      = card.querySelector('.card-rarity').innerText;
  tile.buildingSpecialAbility = card.querySelector('.card-ability').innerText;
  let pv = tile.buildingBaseProduce;
  if(tile.type==='city'){ pv += 2;
    if(tile.buildingLabel==='繁華區') pv +=4;
  }
  if(tile.type==='river') pv -=1;
  tile.buildingProduce = pv;
  tile.buildingPlaced = true;
  // 3. 移除手牌
  card.remove();
  // 4. 更新地塊顯示
  const hex = document.querySelector(`[data-tile-id="${tile.id}"]`);
  hex.innerHTML = `
      <div class="hex-name">${tile.buildingName}</div>`;
  // 5. 重算收益
  recalcRevenueFromScratch();
}

// 重算整回合產出（含 slum 群聚與相鄰、specialAbility）
function recalcRevenueFromScratch(){
  let total = 0;
  // 前置：重置 slumBonusGranted
  tileMap.forEach(t=>t.slumBonusGranted=false);
  // 1. 基礎計算
  tileMap.forEach(t=>{
    if(!t.buildingPlaced) return;
    let pv = t.buildingBaseProduce;
    if(t.type==='city'){ pv+=2;
      if(t.buildingLabel==='繁華區') pv+=4;
    } else if(t.type==='river'){
      pv-=1;
      if(t.buildingLabel==='河流') pv+=3;
    }
    t.buildingProduce = pv;
  });
  // 2. slum BFS 群聚 +1
  const visited = new Set();
  tileMap.forEach(t=>{
    if(!t.buildingPlaced||t.type!=='slum'||visited.has(t.id)) return;
    const queue=[t.id], cluster=[];
    while(queue.length){
      const id=queue.shift();
      if(visited.has(id)) continue;
      visited.add(id);
      const ct=tileMap.find(x=>x.id===id);
      if(ct&&ct.buildingPlaced&&ct.type==='slum'){ cluster.push(ct);
        ct.adjacency.forEach(nid=>!visited.has(nid)&&queue.push(nid));
      }
    }
    if(cluster.length>=3){
      cluster.forEach(ct=>{ ct.buildingProduce++; ct.slumBonusGranted=true; });
    }
  });
  // 3. slum 相鄰貧民窟 +1（最多+5）
  tileMap.forEach(t=>{
    if(!t.buildingPlaced||t.type!=='slum'||t.buildingLabel!=='貧民窟') return;
    const adjCount = t.adjacency.filter(id=>{
      const nt=tileMap.find(x=>x.id===id);
      return nt&&nt.buildingPlaced;
    }).length;
    t.buildingProduce += Math.min(adjCount,5);
  });
  // 4. specialAbility on water & star
  tileMap.forEach(t=>{
    if(!t.buildingPlaced) return;
    if(t.buildingName==='淨水站'&&Math.random()<0.5) t.buildingProduce++;
    if(t.buildingName==='星軌會館'){
       const hasN = t.adjacency.some(id=>{
        const nt=tileMap.find(x=>x.id===id);
        return nt&&nt.buildingPlaced;
      });
      if(!hasN) t.buildingProduce+=2;
    }
    // 社群站：若與至少 1 座其他建築相鄰，額外 +1
   if(t.buildingName==='社群站'){
       const hasNeighbor = t.adjacency.some(id=>{
       const nt=tileMap.find(x=>x.id===id);
       return nt&&nt.buildingPlaced;
     });
     if(hasNeighbor) t.buildingProduce++;
   }
   // 彈出商亭：若處於地圖邊緣格，額外 +1
   if(t.buildingName==='彈出商亭'){
     const row = t.row, col = t.col;
     const lastRow = rows.length - 1;
     const rowCount = rows[row];
     if(row === 0 || row === lastRow || col === 0 || col === rowCount - 1){
       t.buildingProduce++;
     }
   }
  // 地脈節點：若相鄰建築恰為2，則包含自己在內的3座每座+1
   if(t.buildingName==='地脈節點'){
     const nei = t.adjacency
       .map(id=>tileMap.find(x=>x.id===id))
       .filter(x=>x && x.buildingPlaced);
     if(nei.length===2){
       t.buildingProduce++;
       nei.forEach(x=>x.buildingProduce++);
     }
   }
  // 匯聚平臺：若與3座以上建築相鄰，額外+2
   if(t.buildingName==='匯聚平臺'){
     const cnt = t.adjacency
       .map(id=>tileMap.find(x=>x.id===id))
       .filter(x=>x && x.buildingPlaced)
       .length;
     if(cnt>3) t.buildingProduce+=2;
   }
  // 流動站：若自身在河流上，相鄰且也在河流的建築每座+1
   if(t.buildingName==='流動站' && t.type==='river'){
     t.adjacency.forEach(id=>{
       const x=tileMap.find(y=>y.id===id);
       if(x && x.buildingPlaced && x.type==='river'){
         x.buildingProduce++;
       }
     });
   }
  // 焚料方艙：偶數回合產出−1，下限4
   if(t.buildingName==='焚料方艙'){
     if(currentRound % 2 === 0){
       t.buildingProduce = Math.max(t.buildingProduce - 1, 4);
     }
   }
  // 灣岸輸能站：若不在河流地塊，每回合 −1
  if (t.buildingName === '灣岸輸能站' && t.type !== 'river') {
    t.buildingProduce -= 1;
  }
  // 垂直農倉：每有 1 座鄰接的垂直農倉，+1（金幣），最多 +2
  if (t.buildingName === '垂直農倉') {
    const neiCount = t.adjacency.filter(id => {
      const nt = tileMap.find(x => x.id === id);
      return nt && nt.buildingPlaced && nt.buildingName === '垂直農倉';
    }).length;
    t.buildingProduce += Math.min(neiCount, 2);
  }
  // 通訊樞紐：觸發所有地塊標籤效果（不改變地塊本身的 City/Slum…效果）
  if (t.buildingName === '通訊樞紐') {
    // 繁華區標籤：蓋在繁華區時 +4
    if (t.type === 'city') t.buildingProduce += 4;
    // 貧民窟標籤：蓋在貧民窟時，相鄰每座建築 +1
    if (t.type === 'slum') {
      const adjCount = t.adjacency.filter(id => {
        const nt = tileMap.find(x => x.id === id);
        return nt && nt.buildingPlaced;
      }).length;
      t.buildingProduce += adjCount;
    }
    // 河流標籤：蓋在河流時 +3
    if (t.type === 'river') t.buildingProduce += 3;
    // 荒原標籤的「50% 機率不產出」會在 computeEffectiveRevenue() 階段自動套用
  }
  });
  // 5. 累加
  tileMap.forEach(t => {
    if (!t.buildingPlaced) return;
    // 先拿原本計算好的建築產出
    let val = t.buildingProduce;
    // 「廢物利用」：荒原地塊每等級 + perLevel 金幣
    // 「地價升值」：僅對繁華區地塊，每等級 + perLevel 金幣
    const wuluDef = techDefinitions['廢物利用'];
    const dijiaDef = techDefinitions['地價升值'];
    
    if (wuluDef && t.type === 'wasteland') {
    val += wuluDef.perLevel * wuluDef.count;
    }
    
    if (dijiaDef && t.type === 'city') {
    val += dijiaDef.perLevel * dijiaDef.count;
    }
    total += val;
  });
  roundRevenue = total;
  updateResourceDisplay();
}

function showModal(message) {
  const modal = document.getElementById('warning-modal');
  document.getElementById('warning-text').innerText = message;
  modal.style.display = 'flex';
}
// 關閉按鈕
document.getElementById('warning-close-btn').onclick = () => {
  document.getElementById('warning-modal').style.display = 'none';
};

// 輔助：計算實際入帳（含荒原50%機率不產出 & 科技加成）
function computeEffectiveRevenue(){
  let eff = 0;
  const wuluDef  = techDefinitions['廢物利用'];
  const dijiaDef = techDefinitions['地價升值'];

  tileMap.forEach(t => {
    if (!t.buildingPlaced) return;
    // 1. 基础产出
    let v = t.buildingProduce;
    // 2. 科技加成
    if (wuluDef && t.type === 'wasteland') {
      v += wuluDef.perLevel * wuluDef.count;
    }
    if (dijiaDef && t.type === 'city') {
      v += dijiaDef.perLevel * dijiaDef.count;
    }
    // 3. 荒原标签效果：若建筑标签是「荒原」且放在非荒原地块，则50%机率不产出
     if (t.buildingLabel === '荒原' && t.type !== 'wasteland' && Math.random() < 0.5) {
       v = 0;
     }
    eff += v;
  });

  return eff;
}

// 啟動 Draw
function startDrawPhase(){
  refreshCount = 0;
  updateRefreshButton();
  document.getElementById('draw-section').style.display='flex';
  drawCards();
  updateStageBar();
}

// 顯示科技樹 Modal
function showTechModal() {
  updateTechTree();
  document.getElementById('tech-modal').style.display = 'flex';
}
// 關閉科技樹 Modal
function hideTechModal() {
  document.getElementById('tech-modal').style.display = 'none';
}
// 更新科技樹內容
function updateTechTree() {
  const ul = document.getElementById('tech-list');
  ul.innerHTML = '';
  for (const [name, def] of Object.entries(techDefinitions)) {
    // 如果有 perLevel，則依照等級動態計算「+X 金幣」
    let desc = def.description;
    if (def.perLevel) {
      const total = def.perLevel * def.count;
      desc = `${def.description} +${total} 金幣`;
    }
    const li = document.createElement('li');
    li.innerText = `${name}：${desc}  ${def.count}/${def.max}`;
    ul.appendChild(li);
  }
}

// window.onload 初始化
window.onload = () => {
  // DOM 參考
  const startScreen = document.getElementById('start-screen');
  const startBtn    = document.getElementById('startBtn');
  const endTurnBtn  = document.getElementById('end-turn-btn');
  const undoBtn = document.getElementById('undo-btn');
  undoBtn.disabled = true;  // 初始關閉
  undoBtn.onclick = () => {
  if (!lastPlacement) return;
  // 1. 把地塊上建築移除
  const tile = tileMap.find(x => x.id === lastPlacement.tileId);
  tile.buildingPlaced = false;
  // 額外：清空地塊上的顯示，恢復成「?」
  document.querySelector(`[data-tile-id="${tile.id}"]`).innerHTML = '?';
  // 2. 卡牌回手牌
  const hand = document.getElementById('hand');
  const card = createBuildingCard(lastPlacement.building);
  hand.appendChild(card);
  // 3. 重算收益
  recalcRevenueFromScratch();
  // 4. 關閉撤銷
  lastPlacement = null;
  undoBtn.disabled = true;
  };

  // 建立並渲染地圖
  tileMap = createTileMap31();
  computeAdj();
  initMapArea();

  // 初始顯示
  updateRoundDisplay();
  updateResourceDisplay();
  updateStageBar();

  // 事件
  startBtn.onclick = ()=>{ startScreen.style.display='none'; startDrawPhase(); };
  document.addEventListener('keydown', e=> {
    if(e.key==='Enter'&&startScreen.style.display!=='none'){
      startScreen.style.display='none';
      startDrawPhase();
    }
  });
  // ─ 綁定科技樹 Modal 開關 ─
  document.getElementById('tech-button').onclick    = showTechModal;
  document.getElementById('close-tech-btn').onclick = hideTechModal;
  endTurnBtn.onclick = () => {
  // 1. 計算本回合實際入帳並累加
  currentGold += computeEffectiveRevenue();
  updateResourceDisplay();
  // 2. 更新 UI（金幣 & 回合收益）
  if (paymentSchedule[currentRound]) {
      const cost = paymentSchedule[currentRound];
      if (currentGold < cost) {
        // 根據當前回合顯示不同的失敗訊息
      let msg = '';
      if (currentRound === 5)      msg = '至少也要付一點錢吧●–●!';
      else if (currentRound === 10) msg = '下一把會更好>_<';
      else if (currentRound === 16) msg = '就差一點了，再努力一下 O口O';
      else                          msg = '遊戲結束';
      showEndScreen(msg);
      return;
      }
      // 扣款
      currentGold -= cost;
      updateResourceDisplay();

      showModal('成功支付金幣!');
      // 第16回合支付後即勝利
      if (currentRound === 16) {
        showEndScreen('遊戲勝利!!');
        return;
      }
    }
  // 3. 回合 +1 並更新顯示
  currentRound++;
  updateRoundDisplay();
  // 4. 開始下一輪抽卡
  // 開始新回合時，清除撤銷記錄
  lastPlacement = null;
  document.getElementById('undo-btn').disabled = true;
  startDrawPhase();
};

  // 監聽「重新開始」按鈕
  document.getElementById('restartBtn').onclick = restartGame;
  // 監聽 Enter 鍵重啟（只在 end-screen 顯示時觸發）
  document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('end-screen').style.display === 'flex') {
    restartGame();
  }
});
  
  document.getElementById('refresh-btn').onclick = refreshCards;
};
