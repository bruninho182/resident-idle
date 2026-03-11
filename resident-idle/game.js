/* ==========================================================================
   1. ESTADO DO JOGO & ELEMENTOS DO DOM
   ========================================================================== */
const gameState = {
    nickname: "",
    gold: 0,
    wave: 1,
    kills: 0,
    xp: 0,
    nextLevelXp: 50,
    ownedHeroes: [],
    heroPrices: {},
    activeMonster: { name: "", hp: 0, maxHp: 0, reward: 0, sprite: "" },
    skillClicks: 0,
    skillMaxClicks: 20,
    skillReady: false,
    bestWave: 1,
    unlockedEmblems: [],
    activeEmblem: "",
    prestigeCount: 0,
    prestigeMultiplier: 1 // Adicionado para a mecânica de prestígio funcionar
};

const dom = {
    login: document.getElementById('login-screen'),
    game: document.getElementById('game-screen'),
    nickInput: document.getElementById('nickname-input'),
    displayNick: document.getElementById('display-name'),
    gold: document.getElementById('gold'),
    wave: document.getElementById('wave'),
    hpFill: document.getElementById('hp-fill'),
    xpFill: document.getElementById('xp-fill'),
    monsterName: document.getElementById('monster-name'),
    monsterSprite: document.getElementById('monster-sprite'),
    log: document.getElementById('game-log'),
    heroShop: document.getElementById('hero-shop-list'),
    heroesArena: document.getElementById('heroes-side'),
    gameArea: document.querySelector('.game-area')
};

let bossRegenInterval = null;

/* ==========================================================================
   2. INICIALIZAÇÃO E SISTEMA DE SAVE
   ========================================================================== */
function startGame() {
    const hasSave = loadGame();
    const nick = dom.nickInput.value.trim();

    if (!hasSave && nick === "") return alert("Identifique-se, Agente!");

    if (!hasSave) {
        gameState.nickname = nick;
        gameState.ownedHeroes = [{ ...HERO_TEMPLATES[0], level: 1 }];
    }

    dom.displayNick.innerText = gameState.nickname;
    dom.login.classList.add('hidden');
    dom.game.classList.remove('hidden');

    spawnMonster();
    renderShop();
    renderHeroesInArena();
    updateUI();
    updateSkillUI();

    setInterval(autoAttack, 1000);
    setInterval(saveGame, 30000);
}

function saveGame() {
    HERO_TEMPLATES.forEach(h => gameState.heroPrices[h.id] = h.price);
    localStorage.setItem('RE_Idle_Survivor_Save', JSON.stringify(gameState));
    console.log("💾 Memory Card: Progresso Salvo.");
}

function loadGame() {
    const savedData = localStorage.getItem('RE_Idle_Survivor_Save');
    if (!savedData) return false;
    try {
        const parsed = JSON.parse(savedData);
        Object.assign(gameState, parsed);
        if (gameState.heroPrices) {
            HERO_TEMPLATES.forEach(h => {
                if (gameState.heroPrices[h.id]) h.price = gameState.heroPrices[h.id];
            });
        }
        return true;
    } catch (e) { return false; }
}

/* ==========================================================================
   3. SISTEMA DE COMBATE
   ========================================================================== */
function dealClickDamage(e) {
    if (sfx) sfx.play(sfx.pistol);
    
    const mainHero = gameState.ownedHeroes[0];
    // Dano de clique baseado no herói principal + bônus de prestígio
    let damage = (mainHero.damage * 1.5) * (gameState.prestigeMultiplier || 1);
    
    applyDamage(damage, true);
    createBloodSplatter(e);

    // Lógica da Granada (Habilidade da Claire integrada)
    const hasClaire = gameState.ownedHeroes.some(h => h.abilityType === "skill_booster");
    gameState.skillMaxClicks = hasClaire ? 15 : 20;

    if (!gameState.skillReady) {
        gameState.skillClicks++;
        updateSkillUI();
    }

    // Impacto visual no monstro
    dom.monsterSprite.style.transform = "scale(0.95)";
    setTimeout(() => dom.monsterSprite.style.transform = "scale(1)", 50);
}

function autoAttack() {
    let totalDmg = 0;
    const hasWesker = gameState.ownedHeroes.some(h => h.abilityType === "anti_regen");

    gameState.ownedHeroes.forEach(hero => {
        let heroDmg = hero.damage;
        if (hero.abilityType === "boss_slayer" && gameState.activeMonster.name.includes("BOSS")) heroDmg *= 1.5;
        if (hero.abilityType === "double_shot") heroDmg *= 2;
        totalDmg += heroDmg;
    });

    totalDmg *= (gameState.prestigeMultiplier || 1);

    if (hasWesker && bossRegenInterval) {
        clearInterval(bossRegenInterval);
        bossRegenInterval = null;
    }
    applyDamage(totalDmg, false);
}

function applyDamage(amount, isClick = false) {
    if (gameState.activeMonster.hp <= 0) return;
    gameState.activeMonster.hp -= amount;

    const spriteImg = document.getElementById('current-monster-img');
    if (spriteImg) {
        spriteImg.classList.add('monster-hit-anim');
        setTimeout(() => spriteImg.classList.remove('monster-hit-anim'), 150);
    }

    showDamagePopup(amount, isClick);
    if (isClick) animateHeroes();
    if (gameState.activeMonster.hp <= 0) handleMonsterDeath();
    updateUI();
}

function useSpecialSkill() {
    if (!gameState.skillReady) return;
    if (sfx) sfx.play(sfx.explosion);

    const specialDamage = gameState.activeMonster.maxHp * 0.3;
    const exp = document.getElementById('explosion-effect');
    const monsterImg = document.getElementById('current-monster-img');
    
    if (exp && monsterImg) {
        const monsterRect = monsterImg.getBoundingClientRect();
        const areaRect = dom.gameArea.getBoundingClientRect();
        const centerX = (monsterRect.left - areaRect.left) + (monsterRect.width / 2);
        const centerY = (monsterRect.top - areaRect.top) + (monsterRect.height / 2);

        exp.style.left = (centerX - 125) + 'px';
        exp.style.top = (centerY - 125) + 'px';
        exp.classList.remove('hidden');
        exp.classList.add('explosion-anim');
        dom.gameArea.classList.add('danger-flash');

        setTimeout(() => {
            exp.classList.remove('explosion-anim');
            exp.classList.add('hidden');
            dom.gameArea.classList.remove('danger-flash');
        }, 500);
    }

    applyDamage(specialDamage, false);
    gameState.skillClicks = 0;
    gameState.skillReady = false;
    updateSkillUI(); 
}

/* ==========================================================================
   4. PROGRESSÃO E MONSTROS
   ========================================================================== */
function handleMonsterDeath() {
    if (sfx) sfx.play(sfx.zombieDie);

    let reward = gameState.activeMonster.reward;
    if (gameState.ownedHeroes.some(h => h.abilityType === "gold_boost")) reward *= 1.2;
    gameState.gold += reward;

    // Posicionamento do loot
    const rect = dom.monsterSprite.getBoundingClientRect();
    const arenaRect = document.querySelector('.arena').getBoundingClientRect();
    tryDropLoot(rect.left - arenaRect.left, rect.top - arenaRect.top);

    gameState.kills++;
    gameState.xp += 10;

    // Lógica de Level Up por Treinamento (Barra de XP)
    if (gameState.xp >= gameState.nextLevelXp) {
        gameState.xp = 0;
        gameState.nextLevelXp = Math.floor(gameState.nextLevelXp * 1.7);
        const mainHero = gameState.ownedHeroes[0];
        mainHero.level++;
        mainHero.damage += 3;
        triggerLevelUpEffect(mainHero);
        if (sfx) sfx.play(sfx.levelUp);
        dom.log.innerText = `TREINAMENTO: ${mainHero.name} subiu para o Lv.${mainHero.level}!`;
    }

    if (gameState.kills % 10 === 0) {
        gameState.wave++;
        if(typeof checkScenario === "function") checkScenario();
    }

    if (gameState.wave > gameState.bestWave) gameState.bestWave = gameState.wave;

    spawnMonster();
    renderShop(); 
    saveGame();
    updateUI();
}

function spawnMonster() {
    const isBoss = (gameState.kills + 1) % 10 === 0;
    const list = isBoss ? BOSS_LIST : MONSTER_LIST;
    const monsterData = list[Math.floor(Math.random() * list.length)];

    const baseHp = isBoss ? 500 : 50; 
    gameState.activeMonster.maxHp = Math.floor(baseHp * Math.pow(1.35, gameState.wave - 1));
    gameState.activeMonster.hp = gameState.activeMonster.maxHp;
    
    const baseReward = isBoss ? 150 : 15;
    gameState.activeMonster.reward = Math.floor(baseReward * Math.pow(1.15, gameState.wave - 1));

    gameState.activeMonster.name = isBoss ? `⚠️ ALVO CRÍTICO: ${monsterData.name}` : monsterData.name;
    gameState.activeMonster.sprite = monsterData.sprite;

    const animClass = isBoss ? 'monster-idle' : (Math.random() > 0.5 ? 'monster-walk' : 'monster-idle');
    dom.monsterSprite.innerHTML = `<img src="${monsterData.sprite}" class="pixel-art ${animClass} ${isBoss ? 'boss-glow' : ''}" id="current-monster-img">`;
    dom.monsterName.innerText = gameState.activeMonster.name;
    
    if (isBoss) {
        dom.log.innerText = "SISTEMA: Bio-arma detectada. Regeneração ativa!";
        startBossRegen();
    } else {
        dom.log.innerText = `Inimigo detectado na Wave ${gameState.wave}.`;
    }
}

function startBossRegen() {
    if (bossRegenInterval) clearInterval(bossRegenInterval);
    bossRegenInterval = setInterval(() => {
        if (gameState.activeMonster.name.includes("BOSS") && gameState.activeMonster.hp > 0) {
            const healAmount = gameState.activeMonster.maxHp * 0.015;
            gameState.activeMonster.hp = Math.min(gameState.activeMonster.maxHp, gameState.activeMonster.hp + healAmount);
            dom.hpFill.style.backgroundColor = "#00ff00";
            setTimeout(() => { dom.hpFill.style.backgroundColor = "#8b0000"; }, 200);
            updateUI();
        } else {
            clearInterval(bossRegenInterval);
        }
    }, 2000);
}

/* ==========================================================================
   5. LOJA E ARENA DE HERÓIS
   ========================================================================== */
function renderShop() {
    if (!dom.heroShop) return;
    dom.heroShop.innerHTML = "";
    HERO_TEMPLATES.forEach((hero) => {
        const canAfford = gameState.gold >= hero.price;
        const item = document.createElement('div');
        item.className = "shop-item";
        item.innerHTML = `
            <div class="shop-info">
                <strong>${hero.name}</strong>
                <p class="ability-tag">${hero.abilityDesc}</p>
                <small>Dano: ${hero.damage} | 💰 ${hero.price.toLocaleString()}</small>
            </div>
            <button onclick="buyHero(${hero.id})" ${canAfford ? '' : 'disabled'}>RECRUTAR</button>
        `;
        dom.heroShop.appendChild(item);
    });
}

function buyHero(heroId) {
    const template = HERO_TEMPLATES.find(h => h.id === heroId);
    if (gameState.gold >= template.price) {
        gameState.gold -= template.price;
        const heroInParty = gameState.ownedHeroes.find(h => h.id === heroId);
        
        if (heroInParty) {
            heroInParty.level++;
            heroInParty.damage = Math.floor(heroInParty.damage * 1.25);
            triggerLevelUpEffect(heroInParty);
        } else {
            gameState.ownedHeroes.push({ ...template, level: 1 });
        }

        template.price = Math.floor(template.price * 2.1);
        if (sfx) sfx.play(sfx.levelUp);
        renderShop();
        renderHeroesInArena();
        updateUI();
        saveGame();
    }
}

function renderHeroesInArena() {
    if (!dom.heroesArena) return;
    dom.heroesArena.innerHTML = "";
    gameState.ownedHeroes.forEach(hero => {
        const div = document.createElement('div');
        let auraClass = hero.level >= 100 ? "hero-legend" : (hero.level >= 50 ? "hero-veteran" : "");
        const flashClass = hero.justLeveled ? "lvl-up-flash" : "";
        
        div.className = `hero-unit ${auraClass} ${flashClass}`;
        div.innerHTML = `
            <img src="${hero.sprite}" class="pixel-art hero-img" title="${hero.name}">
            <span class="hero-lvl-badge ${hero.justLeveled ? 'badge-pop' : ''}">Lv.${hero.level}</span>
            <small style="color: #ccc; font-size: 10px; margin-top: 2px;">${hero.name}</small>
        `;
        dom.heroesArena.appendChild(div);
    });
}

function triggerLevelUpEffect(hero) {
    hero.justLeveled = true;
    renderHeroesInArena();
    setTimeout(() => {
        hero.justLeveled = false;
        renderHeroesInArena();
    }, 600);
}

/* ==========================================================================
   6. INTERFACE, RANKING E EMBLEMAS
   ========================================================================== */
function updateUI() {
    dom.gold.innerText = Math.floor(gameState.gold).toLocaleString();
    dom.wave.innerText = gameState.wave;
    dom.monsterName.innerText = gameState.activeMonster.name;
    
    const hpPercent = (gameState.activeMonster.hp / gameState.activeMonster.maxHp) * 100;
    dom.hpFill.style.width = Math.max(0, hpPercent) + "%";
    
    const xpPercent = (gameState.xp / gameState.nextLevelXp) * 100;
    dom.xpFill.style.width = xpPercent + "%";

    // Efeito de cor baseado na Wave (Vírus evoluindo)
    if (gameState.wave > 10) {
        const intensity = Math.min((gameState.wave - 10) * 10, 150);
        dom.monsterSprite.style.filter = `hue-rotate(${intensity}deg) saturate(1.5)`;
    }

    const emblemImg = document.getElementById('display-emblem');
    if (gameState.activeEmblem && emblemImg) {
        emblemImg.src = gameState.activeEmblem;
        emblemImg.classList.remove('hidden');
    }

    checkEmblemUnlocks();
}

function updateSkillUI() {
    const slot = document.querySelector('.grenade-slot');
    if (!slot) return;
    const charge = (gameState.skillClicks / gameState.skillMaxClicks) * 360;
    slot.style.setProperty('--charge', charge);
    gameState.skillReady = gameState.skillClicks >= gameState.skillMaxClicks;
    slot.classList.toggle('ready', gameState.skillReady);
}

function toggleReport() {
    const screen = document.getElementById('ranking-screen');
    if (screen.style.display === 'block') {
        screen.style.display = 'none';
    } else {
        document.getElementById('stat-nick').innerText = gameState.nickname;
        document.getElementById('stat-wave').innerText = gameState.wave;
        document.getElementById('stat-kills').innerText = gameState.kills;
        document.getElementById('stat-best').innerText = gameState.bestWave;
        document.getElementById('player-rank').innerText = calculateRank();
        renderTrophyGallery();
        if (sfx) sfx.play(sfx.levelUp);
        screen.style.display = 'block';
    }
}

function calculateRank() {
    const w = gameState.wave;
    if (w >= 50) return "S";
    if (w >= 30) return "A";
    if (w >= 15) return "B";
    if (w >= 5)  return "C";
    return "D";
}

function checkEmblemUnlocks() {
    EMBLEMS.forEach(emblem => {
        if (emblem.wave && gameState.wave >= emblem.wave && !gameState.unlockedEmblems.includes(emblem.name)) {
            unlockEmblem(emblem);
        }
    });
    const prestigeBtn = document.getElementById('btn-prestige');
    if (prestigeBtn && gameState.wave >= 1000) prestigeBtn.classList.remove('hidden');
}

function unlockEmblem(emblem) {
    gameState.unlockedEmblems.push(emblem.name);
    gameState.activeEmblem = emblem.image;
    dom.log.innerText = `CONQUISTA: ${emblem.name.toUpperCase()}!`;
    if(sfx) sfx.play(sfx.levelUp);
    updateUI();
}

function triggerPrestige() {
    if (confirm("RECRUTAMENTO S.T.A.R.S.: Resetar progresso por +100% de dano permanente?")) {
        gameState.prestigeCount++;
        gameState.prestigeMultiplier += 1; // Aumenta o dano para o próximo reset
        gameState.wave = 1;
        gameState.gold = 0;
        gameState.kills = 0;
        gameState.ownedHeroes = [{ ...HERO_TEMPLATES[0], level: 1 }];
        const starsEmblem = EMBLEMS.find(e => e.prestige);
        if (starsEmblem) unlockEmblem(starsEmblem);
        saveGame();
        location.reload();
    }
}

function renderTrophyGallery() {
    const gallery = document.getElementById('trophy-gallery');
    if (!gallery) return;
    gallery.innerHTML = "";
    EMBLEMS.forEach(emblem => {
        if (emblem.prestige && !gameState.unlockedEmblems.includes(emblem.name)) return;
        const isUnlocked = gameState.unlockedEmblems.includes(emblem.name);
        const slot = document.createElement('div');
        slot.className = "trophy-slot";
        slot.innerHTML = `<img src="${emblem.image}" class="trophy-img ${isUnlocked ? 'trophy-unlocked' : 'trophy-locked'}" title="${isUnlocked ? emblem.name : 'Bloqueado'}">`;
        gallery.appendChild(slot);
    });
}

/* ==========================================================================
   7. UTILITÁRIOS (EFEITOS E ÁUDIO)
   ========================================================================== */
function createBloodSplatter(e) {
    if (!e || !dom.gameArea) return;
    for (let i = 0; i < 6; i++) {
        const splat = document.createElement('div');
        splat.className = 'blood-splat';
        const rect = dom.gameArea.getBoundingClientRect();
        splat.style.left = `${e.clientX - rect.left}px`;
        splat.style.top = `${e.clientY - rect.top}px`;
        splat.style.setProperty('--tx', `${(Math.random() - 0.5) * 120}px`);
        splat.style.setProperty('--ty', `${(Math.random() - 0.5) * 120}px`);
        dom.gameArea.appendChild(splat);
        setTimeout(() => splat.remove(), 800);
    }
}

function animateHeroes() {
    document.querySelectorAll('.hero-unit').forEach(hero => {
        hero.classList.add('hero-attack-anim');
        setTimeout(() => hero.classList.remove('hero-attack-anim'), 150);
    });
}

function showDamagePopup(amount, isClick) {
    const popup = document.createElement('div');
    popup.className = 'damage-popup';
    if (isClick) popup.style.color = '#ffff00';
    popup.innerText = `-${Math.floor(amount)}`;
    popup.style.left = `calc(50% + ${(Math.random() * 60 - 30)}px)`;
    popup.style.top = `calc(40% + ${(Math.random() * 40 - 20)}px)`;
    dom.monsterSprite.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
}

function tryDropLoot(x, y) {
    if (typeof LOOT_TABLE === 'undefined') return;
    LOOT_TABLE.forEach(item => {
        if (Math.random() < item.chance) {
            const lootEl = document.createElement('img');
            lootEl.src = item.sprite;
            lootEl.className = 'pixel-art loot-drop';
            lootEl.style.left = `${x}px`;
            lootEl.style.top = `${y}px`;
            lootEl.onclick = () => { collectLoot(item); lootEl.remove(); };
            document.querySelector('.arena').appendChild(lootEl);
            setTimeout(() => lootEl?.remove(), 5000);
        }
    });
}

function collectLoot(item) {
    dom.log.innerText = `COLETADO: ${item.name}!`;
    if(item.type === "instant_gold") gameState.gold += gameState.wave * 50;
    updateUI();
}

const sfx = {
    pistol: new Audio('assets/sfx/pistol_fire.mp3'),
    zombieDie: new Audio('assets/sfx/zombie_death.mp3'),
    explosion: new Audio('assets/sfx/grenade_exp.mp3'),
    levelUp: new Audio('assets/sfx/level_up.mp3'),
    play(sound) {
        const clone = sound.cloneNode();
        clone.volume = 0.4;
        clone.play();
    }
};

window.addEventListener('keydown', (e) => { if (e.code === "Space") useSpecialSkill(); });