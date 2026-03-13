let magnumBuffActive = false;
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
    activeSquad: [], // IDs dos heróis que estão lutando no momento (Max 10)
    ownedHeroes: [], // Heróis que o jogador já comprou
    heroPrices: {},
    activeMonster: { name: "", hp: 0, maxHp: 0, reward: 0, sprite: "" },
    skillClicks: 0,
    skillMaxClicks: 20,
    skillReady: false,
    bestWave: 1,
    unlockedEmblems: [],
    activeEmblem: "",
    prestigeCount: 0,
    prestigeMultiplier: 1,
    inventory: [null, null, null, null, null, null, null, null, null]
};

const dom = {
    login: document.getElementById('login-screen'),
    game: document.getElementById('game-screen'),
    nickInput: document.getElementById('nickname-input'),
    displayNick: document.getElementById('display-name'), // Este é o que estava dando erro
    gold: document.getElementById('gold'),
    wave: document.getElementById('wave'),
    hpFill: document.getElementById('hp-fill'),
    hpText: document.getElementById('hp-text'), // Adicionado para a vida numérica
    xpFill: document.getElementById('xp-fill'),
    xpText: document.getElementById('xp-text'), // Adicionado
    monsterName: document.getElementById('monster-name'),
    monsterSprite: document.getElementById('monster-sprite'),
    log: document.getElementById('game-log'),
    heroShop: document.getElementById('hero-shop-list'),
    heroesArena: document.getElementById('heroes-side'),
    gameArea: document.querySelector('.game-area'),
    emblem: document.getElementById('display-emblem')
};

let bossRegenInterval = null;

/* ==========================================================================
   2. INICIALIZAÇÃO E SAVE
   ========================================================================== */
function startGame() {
    const hasSave = loadGame();
    const nick = dom.nickInput.value.trim();

    if (!hasSave && nick === "") return alert("Identifique-se, Agente!");

    if (!hasSave) {
        gameState.nickname = nick;
        gameState.ownedHeroes = [{ ...HERO_TEMPLATES[0], level: 1 }];
        gameState.inventory = [null, null, null, null, null, null, null, null, null];
    }

    dom.displayNick.innerText = gameState.nickname;
    dom.login.classList.add('hidden');
    dom.game.classList.remove('hidden');

    spawnMonster();
    renderShop();
    renderHeroesInArena();
    renderInventory();     // Desenha os itens que estavam salvos
    renderTrophyGallery(); // Desenha as medalhas que estavam salvas
    updateUI();
    updateSkillUI();

    setInterval(autoAttack, 1000);
    setInterval(saveGame, 30000);
}

function saveGame() {
    HERO_TEMPLATES.forEach(h => gameState.heroPrices[h.id] = h.price);
    localStorage.setItem('RE_Idle_Survivor_Save', JSON.stringify(gameState));
    console.log("💾 Memory Card: Dados de missão preservados.");
}

function loadGame() {
    const savedData = localStorage.getItem('RE_Idle_Survivor_Save');
    if (!savedData) return false;
    try {
        const parsed = JSON.parse(savedData);
        Object.assign(gameState, parsed);

        if (!gameState.inventory) {
            gameState.inventory = [null, null, null, null, null, null, null, null, null];
        }

        // Sincroniza BIOS e dados novos para heróis antigos
        gameState.ownedHeroes = gameState.ownedHeroes.map(owned => {
            const template = HERO_TEMPLATES.find(t => t.id === owned.id);
            if (template) {
                return { ...template, ...owned, bio: template.bio, abilityDesc: template.abilityDesc };
            }
            return owned;
        });

        if (gameState.heroPrices) {
            HERO_TEMPLATES.forEach(h => {
                if (gameState.heroPrices[h.id]) h.price = gameState.heroPrices[h.id];
            });
        }
        return true;
    } catch (e) { return false; }
}

/* ==========================================================================
   3. COMBATE E POPUPS PRECISOS
   ========================================================================== */
function dealClickDamage(e) {
    if (sfx) sfx.play(sfx.pistol);
    
    const mainHero = gameState.ownedHeroes[0];
    let damage = (mainHero.damage * 1.5) * (gameState.prestigeMultiplier || 1);
    
    // Passamos o evento 'e' para saber a posição do clique
    applyDamage(damage, true, e);
    createBloodSplatter(e);

    const hasClaire = gameState.ownedHeroes.some(h => h.abilityType === "skill_booster");
    gameState.skillMaxClicks = hasClaire ? 15 : 20;

    if (!gameState.skillReady) {
        gameState.skillClicks++;
        updateSkillUI();
    }
}

function autoAttack() {
    try {
        let totalDmg = 0;
        let isCriticalHit = false;

        // 1. Obtém as sinergias para verificar bônus de Crítico (STARS)
        let activeSynergies = [];
        if (typeof getActiveSynergies === "function") {
            activeSynergies = getActiveSynergies();
        }

        // 2. Define a chance de Crítico (Base de 5% + bônus da sinergia STARS se houver)
        const starsBonus = activeSynergies.find(s => s.tag === "STARS");
        let critChance = 0.05; // 5% de chance base
        if (starsBonus && starsBonus.critChance) {
            critChance += starsBonus.critChance;
        }

        // Roda a sorte para ver se este ataque será crítico
        if (Math.random() < critChance) {
            isCriticalHit = true;
        }

        // 3. AGORA É RÍGIDO: Ele usa APENAS quem está no esquadrão ativo. 
        // Se o esquadrão estiver vazio, heroesToCalculate será uma lista vazia []
        let heroesToCalculate = gameState.activeSquad || [];

        // 4. Somar dano base dos heróis e habilidades passivas
        heroesToCalculate.forEach(heroId => {
            // Busca o herói nos comprados para pegar o Level e Dano atualizados
            const hero = gameState.ownedHeroes.find(h => h.id === heroId);
            if (hero) {
                let heroDmg = hero.damage || 0;
                
                // Habilidades Passivas Individuais
                if (hero.abilityType === "boss_slayer" && gameState.activeMonster.name.includes("BOSS")) heroDmg *= 1.5;
                if (hero.abilityType === "double_shot") heroDmg *= 2;
                
                totalDmg += heroDmg;
            }
        });

        // --- CONTINUAÇÃO DO CÓDIGO (NÃO PERDER NADA) ---

        // 5. Só processa multiplicadores e aplica dano se houver alguém atacando
        if (totalDmg > 0) {
            
            // 6. Aplica o Multiplicador de Crítico se a sorte bater
            if (isCriticalHit) {
                const multiplier = (starsBonus && starsBonus.critMult) ? starsBonus.critMult : 2;
                totalDmg *= multiplier;
            }

            // 7. Aplicar Sinergia UMBRELLA (Dano total multiplicado)
            const umbrellaBonus = activeSynergies.find(s => s.tag === "UMBRELLA");
            if (umbrellaBonus) totalDmg *= umbrellaBonus.multiplier;

            // 8. Aplicar Itens (Magnum) e Prestígio
            if (typeof magnumBuffActive !== 'undefined' && magnumBuffActive) totalDmg *= 5;
            totalDmg *= (gameState.prestigeMultiplier || 1);

            // 9. Aplicar o Dano no Monstro de forma única através da applyDamage
            // damageType será 'crit' ou 'passive'
            const damageType = isCriticalHit ? 'crit' : 'passive';
            applyDamage(totalDmg, damageType);
        }

    } catch (error) {
        console.error("Erro no Auto-Ataque:", error);
    }
}

function applyDamage(amount, type = 'passive', event = null) {
    // 1. Segurança: Se o monstro já está morto, não faz nada
    if (gameState.activeMonster.hp <= 0) return;

    // 2. TRATAMENTO DO TIPO: Definimos logo no início para usar nas animações
    let damageType = type;
    if (type === true) damageType = 'click';
    if (type === false) damageType = 'passive';

    // 3. Subtrai o HP
    gameState.activeMonster.hp -= amount;

    // 4. ANIMAÇÕES DO MONSTRO
    const spriteImg = document.getElementById('current-monster-img');
    if (spriteImg) {
        // Animação de "Hit" padrão (Vermelho/Piscar)
        spriteImg.classList.add('monster-hit-anim');
        setTimeout(() => spriteImg.classList.remove('monster-hit-anim'), 150);
        
        // EFEITO DE TREMOR: Apenas se for Crítico
        if (damageType === 'crit') {
            spriteImg.classList.add('shake-anim');
            setTimeout(() => spriteImg.classList.remove('shake-anim'), 200);
        }
    }

    // 5. POP-UP ÚNICO: Centralizado para evitar duplicidade
    showDamagePopup(amount, damageType, event);

    // 6. Anima os heróis apenas se for clique manual
    if (damageType === 'click' && typeof animateHeroes === "function") {
        animateHeroes();
    }

    // 7. Verificação de Morte
    if (gameState.activeMonster.hp <= 0) {
        gameState.activeMonster.hp = 0; 
        handleMonsterDeath();
    }

    // 8. Atualiza a interface
    updateUI();
}

function showDamagePopup(amount, type, e = null) {
    const popup = document.createElement('div');
    popup.className = 'damage-popup';
    
    // Definimos o texto e se haverá um aviso de CRITICAL
    let prefix = "-";
    if (type === 'crit') {
        prefix = "CRITICAL! -";
        popup.style.fontWeight = "bold";
    }
    
    popup.innerText = `${prefix}${Math.floor(amount)}`;
    
    // --- LÓGICA DE POSICIONAMENTO E CORES ---
    if (type === 'click' && e && e.clientX) {
        // POSIÇÃO DO MOUSE (Amarelo)
        const rect = dom.gameArea.getBoundingClientRect();
        popup.style.left = `${e.clientX - rect.left}px`;
        popup.style.top = `${e.clientY - rect.top}px`;
        popup.style.color = '#ffff00'; 
        popup.style.fontSize = '14px';
    } else {
        // POSIÇÃO NO MONSTRO (Passivo ou Crítico)
        const monsterRect = dom.monsterSprite.getBoundingClientRect();
        const areaRect = dom.gameArea.getBoundingClientRect();
        
        const x = (monsterRect.left - areaRect.left) + (monsterRect.width / 2);
        const y = (monsterRect.top - areaRect.top) + (monsterRect.height / 4);
        
        popup.style.left = `${x + (Math.random() * 40 - 20)}px`;
        popup.style.top = `${y + (Math.random() * 40 - 20)}px`;

        if (type === 'crit') {
            popup.style.color = '#ffaa00'; // Laranja/Ouro para o Crítico
            popup.style.fontSize = '24px'; // Bem maior para dar destaque
            popup.style.zIndex = '1000';
        } else {
            popup.style.color = '#ff0000'; // Vermelho para o passivo normal
            popup.style.fontSize = '12px';
        }
    }

    dom.gameArea.appendChild(popup);
    setTimeout(() => popup.remove(), 700);
}

function useSpecialSkill() {
    if (!gameState.skillReady) return;
    if (sfx) sfx.play(sfx.explosion);

    const specialDamage = gameState.activeMonster.maxHp * 0.4;
    applyDamage(specialDamage, false);
    
    // Efeito de explosão centralizado
    const exp = document.getElementById('explosion-effect');
    if (exp) {
        exp.classList.remove('hidden');
        exp.classList.add('explosion-anim');
        setTimeout(() => {
            exp.classList.remove('explosion-anim');
            exp.classList.add('hidden');
        }, 500);
    }

    gameState.skillClicks = 0;
    gameState.skillReady = false;
    updateSkillUI(); 
}

/* ==========================================================================
   4. PROGRESSÃO E RENDERIZAÇÃO
   ========================================================================== */
function handleMonsterDeath() {
    // 1. TRAVA DE SEGURANÇA: Impede que a função rode se o monstro já estiver sendo processado
    if (gameState.activeMonster.isDying) return;
    gameState.activeMonster.isDying = true;

    // 2. Som de morte imediato
    if (sfx) sfx.play(sfx.zombieDie);

    const spriteImg = document.getElementById('current-monster-img');
    
    if (spriteImg) {
        // --- EFEITO RESIDENT EVIL ---
        if (typeof spawnBloodEffect === "function") {
            spawnBloodEffect(spriteImg, 25);
        }
        
        spriteImg.classList.add('monster-death-gore');
    }

    // 3. Aguarda o "splat" (500ms) para processar as recompensas
    setTimeout(() => {
        if (spriteImg) spriteImg.classList.remove('monster-death-gore');

        // --- PROCESSAMENTO DE RECOMPENSAS ---
        
        // Recompensa de Gold com bônus
        let reward = gameState.activeMonster.reward;
        if (gameState.ownedHeroes.some(h => h.abilityType === "gold_boost")) {
            reward *= 1.2;
        }
        gameState.gold += reward;

        // Progressão de Kills e XP
        gameState.kills++;
        gameState.xp += 10;

        // Lógica de Level Up (Herói Principal)
        if (gameState.xp >= gameState.nextLevelXp) {
            gameState.xp = 0;
            gameState.nextLevelXp = Math.floor(gameState.nextLevelXp * 1.7);
            
            const mainHero = gameState.ownedHeroes[0];
            if (mainHero) {
                mainHero.level++;
                mainHero.damage += 3;
                triggerLevelUpEffect(mainHero);
                if (sfx) sfx.play(sfx.levelUp);
            }
        }

        // --- PROGRESSÃO DE WAVE ---
        // Só sobe a wave quando completa 10 kills (ex: 10, 20, 30...)
        if (gameState.kills > 0 && gameState.kills % 10 === 0) {
            gameState.wave++;
            // Opcional: sfx.play(sfx.waveClear) se você tiver esse som
        }
        
        // 4. RESET E PRÓXIMO MONSTRO
        gameState.activeMonster.isDying = false; // Libera a trava para o próximo
        spawnMonster();
        renderShop(); 
        saveGame();
        updateUI();

    }, 500); 
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
    
    if (isBoss) startBossRegen();
}

function renderHeroesInArena() {
    if (!dom.heroesArena) return;
    
    // 1. Limpa a arena completamente antes de redesenhar
    dom.heroesArena.innerHTML = "";
    
    // 2. Percorre apenas o esquadrão ATIVO (quem você selecionou nas barracas)
    gameState.activeSquad.forEach(heroId => {
        // Busca os dados do herói que você possui (incluindo level atual, dano, etc)
        const hero = gameState.ownedHeroes.find(h => h.id === heroId);
        
        // Só desenha se o herói existir
        if (hero) {
            const div = document.createElement('div');
            
            // Lógica de Auras por Level
            let auraClass = hero.level >= 100 ? "hero-legend" : (hero.level >= 50 ? "hero-veteran" : "");
            const flashClass = hero.justLeveled ? "lvl-up-flash" : "";
            
            div.className = `hero-unit ${auraClass} ${flashClass}`;
            
            // Estrutura mantida conforme sua solicitação
            div.innerHTML = `
                <div class="hero-tooltip">
                    <div class="tooltip-header">FILE: ${hero.name.toUpperCase()}</div>
                    <div class="tooltip-bio">${hero.bio || "Dados restritos."}</div>
                    <div class="tooltip-passive">SKILL: ${hero.abilityDesc}</div>
                </div>
                
                <div style="height: 80px; display: flex; align-items: center; justify-content: center;">
                    <img src="${hero.sprite}" class="pixel-art hero-img">
                </div>

                <div class="hero-lvl-tag">LEVEL: ${hero.level}</div>
                <small>${hero.name}</small>
            `;
            
            dom.heroesArena.appendChild(div);
        }
    });
}

/* ==========================================================================
   5. ATUALIZAÇÃO DA HUD (COM NÚMEROS DE HP)
   ========================================================================== */
function updateUI() {
    // 1. Grana
    const goldEl = document.getElementById('gold');
    if (goldEl) goldEl.innerText = Math.floor(gameState.gold).toLocaleString();

    // 2. Wave
    const waveEl = document.getElementById('wave');
    if (waveEl) waveEl.innerText = gameState.wave;

    // 3. HP do Monstro
    const hpPercent = (gameState.activeMonster.hp / gameState.activeMonster.maxHp) * 100;
    const hpFill = document.getElementById('hp-fill');
    const hpText = document.getElementById('hp-text');

    if (hpFill) {
        hpFill.style.width = Math.max(0, hpPercent) + "%";
        hpFill.classList.remove('hp-fine', 'hp-caution', 'hp-danger');
        if (hpPercent > 50) hpFill.classList.add('hp-fine');
        else if (hpPercent > 20) hpFill.classList.add('hp-caution');
        else hpFill.classList.add('hp-danger');
    }
    if (hpText) hpText.innerText = `${Math.floor(gameState.activeMonster.hp)} / ${Math.floor(gameState.activeMonster.maxHp)}`;

    // 4. Barra de XP
    const xpPercent = (gameState.xp / gameState.nextLevelXp) * 100;
    const xpFill = document.getElementById('xp-fill');
    const xpText = document.getElementById('xp-text');
    if (xpFill) xpFill.style.width = xpPercent + "%";
    if (xpText) xpText.innerText = `XP: ${gameState.xp} / ${gameState.nextLevelXp}`;

    // 5. EXIBIÇÃO DO PODER DE FOGO (DPS) - NOVO
    const dpsEl = document.getElementById('display-dps');
    if (dpsEl) {
        let currentDmg = 0;
        
        // Somar apenas o dano de quem está no esquadrão ativo
        gameState.activeSquad.forEach(id => {
            const h = gameState.ownedHeroes.find(hero => hero.id === id);
            if (h) currentDmg += (h.damage || 0);
        });

        // Aplicar multiplicador de sinergia Umbrella para mostrar o valor real
        if (typeof getActiveSynergies === "function") {
            const synergies = getActiveSynergies();
            const umbrella = synergies.find(s => s.tag === "UMBRELLA");
            if (umbrella) currentDmg *= umbrella.multiplier;
        }

        dpsEl.innerText = Math.floor(currentDmg).toLocaleString();
    }

    // 6. Sinergias
    if (typeof updateSynergyUI === "function") {
        updateSynergyUI();
    } 
}

/* ==========================================================================
   6. UTILITÁRIOS E RENDER SHOP
   ========================================================================== */
function renderShop() {
    if (!dom.heroShop) return;
    dom.heroShop.innerHTML = "";

    HERO_TEMPLATES.forEach((hero) => {
        const canAfford = gameState.gold >= hero.price;
        const card = document.createElement('div');
        card.className = "shop-card";
        
        card.innerHTML = `
            <div class="shop-card-header">
                <span>${hero.name}</span>
                <span class="shop-card-price">💰 ${hero.price.toLocaleString()}</span>
            </div>
            <div class="ability-tag">${hero.abilityDesc}</div>
            <button class="recruit-btn" onclick="buyHero(${hero.id})" ${canAfford ? '' : 'disabled'}>
                RECRUTAR
            </button>
        `;
        dom.heroShop.appendChild(card);
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

function startBossRegen() {
    if (bossRegenInterval) clearInterval(bossRegenInterval);
    bossRegenInterval = setInterval(() => {
        if (gameState.activeMonster.name.includes("BOSS") && gameState.activeMonster.hp > 0) {
            const healAmount = gameState.activeMonster.maxHp * 0.015;
            gameState.activeMonster.hp = Math.min(gameState.activeMonster.maxHp, gameState.activeMonster.hp + healAmount);
            updateUI();
        } else {
            clearInterval(bossRegenInterval);
        }
    }, 2000);
}

function updateSkillUI() {
    const slot = document.querySelector('.grenade-slot');
    if (!slot) return;
    const charge = (gameState.skillClicks / gameState.skillMaxClicks) * 360;
    slot.style.setProperty('--charge', charge);
    gameState.skillReady = gameState.skillClicks >= gameState.skillMaxClicks;
    slot.classList.toggle('ready', gameState.skillReady);
}

function animateHeroes() {
    document.querySelectorAll('.hero-unit').forEach((unit) => {
        unit.classList.add('hero-attack-anim');
        setTimeout(() => unit.classList.remove('hero-attack-anim'), 200);
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

function createBloodSplatter(e) {
    if (!e || !dom.gameArea) return;
    const rect = dom.gameArea.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
        const splat = document.createElement('div');
        splat.className = 'blood-splat';
        splat.style.left = `${e.clientX - rect.left}px`;
        splat.style.top = `${e.clientY - rect.top}px`;
        splat.style.setProperty('--tx', `${(Math.random() - 0.5) * 120}px`);
        splat.style.setProperty('--ty', `${(Math.random() - 0.5) * 120}px`);
        dom.gameArea.appendChild(splat);
        setTimeout(() => splat.remove(), 800);
    }
}

function toggleReport() {
    const screen = document.getElementById('ranking-screen');
    const isVisible = screen.style.display === 'block';
    screen.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
        document.getElementById('stat-nick').innerText = gameState.nickname;
        document.getElementById('stat-wave').innerText = gameState.wave;
        document.getElementById('stat-kills').innerText = gameState.kills;
        document.getElementById('stat-best').innerText = gameState.bestWave;
        document.getElementById('player-rank').innerText = calculateRank();
        renderTrophyGallery();
        if (sfx) sfx.play(sfx.levelUp);
    }
}

function calculateRank() {
    const w = gameState.wave;
    if (w >= 50) return "S";
    if (w >= 30) return "A";
    if (w >= 15) return "B";
    return "D";
}

function checkEmblemUnlocks() {
    EMBLEMS.forEach(emblem => {
        if (emblem.wave && gameState.wave >= emblem.wave && !gameState.unlockedEmblems.includes(emblem.name)) {
            unlockEmblem(emblem);
        }
    });
}

function unlockEmblem(emblem) {
    gameState.unlockedEmblems.push(emblem.name);
    gameState.activeEmblem = emblem.image;
    dom.log.innerText = `CONQUISTA: ${emblem.name.toUpperCase()}!`;
    if(sfx) sfx.play(sfx.levelUp);
    updateUI();
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

function buyItem(itemId) {
    const itemTemplate = CONSUMABLES_DATA.find(i => i.id === itemId);
    const price = itemTemplate.price * Math.pow(1.15, gameState.wave - 1);

    if (gameState.gold >= price) {
        // Encontra o primeiro slot vazio na maleta
        const emptySlotIndex = gameState.inventory.findIndex(slot => slot === null);
        
        if (emptySlotIndex !== -1) {
            gameState.gold -= price;
            gameState.inventory[emptySlotIndex] = { ...itemTemplate };
            renderInventory();
            updateUI();
        } else {
            alert("Maleta cheia! Use um item antes de comprar mais.");
        }
    }
}

function renderInventory() {
    const slots = document.querySelectorAll('.item-slot');
    slots.forEach((slot, index) => {
        slot.innerHTML = ""; // Limpa o slot
        const item = gameState.inventory[index];
        
        if (item) {
            const img = document.createElement('img');
            img.src = item.sprite;
            img.className = "pixel-art item-icon";
            img.onclick = () => useItem(index);
            slot.appendChild(img);
        }
    });
}

function useItem(slotIndex) {
    const item = gameState.inventory[slotIndex];
    if (!item) return;

    if (item.type === "boss_killer") {
        magnumBuffActive = true;

        // --- ATIVAÇÃO DOS EFEITOS DE TERMINAL ---
        dom.gameArea.classList.add('magnum-glitch-active', 'magnum-flicker');
        dom.log.innerText = "CRITICAL WARNING: MAGNUM PROTOCOL ACTIVE. SENSOR INTERFERENCE DETECTED.";

        setTimeout(() => {
            magnumBuffActive = false;
            
            // --- REMOÇÃO DOS EFEITOS ---
            dom.gameArea.classList.remove('magnum-glitch-active', 'magnum-flicker');
            dom.log.innerText = "SISTEMA: Estabilidade restaurada. Munição Magnum esgotada.";
        }, item.duration * 1000);


        dom.log.innerText = `PROTOCOLO MAGNUM: Dano massivo ativado por ${item.duration}s!`;
        
        // Efeito visual na área do monstro para mostrar o poder
        dom.monsterSprite.style.filter = "sepia(1) saturate(5) hue-rotate(-50deg)";

        setTimeout(() => {
            magnumBuffActive = false;
            dom.log.innerText = "SISTEMA: Munição de Magnum esgotada.";
            dom.monsterSprite.style.filter = "none";
        }, item.duration * 1000);
    }

    if (item.type === "heal") {
        gameState.activeMonster.hp -= (gameState.activeMonster.maxHp * item.effectValue);
        dom.log.innerText = `ITEM: Erva Verde usada! Alvo enfraquecido.`;
    } else if (item.type === "buff") {
        activateBuff(item);
    } else if (item.type === "special") {
        gameState.activeMonster.hp *= (1 - item.effectValue);
        dom.log.innerText = `ITEM: Spray usado! Dano crítico aplicado.`;
    }

    gameState.inventory[slotIndex] = null; // Remove da maleta
    renderInventory();
    updateUI();
}

// 1. Função para trocar de aba
function switchShop(type) {
    const heroList = document.getElementById('hero-shop-list');
    const itemList = document.getElementById('item-shop-list');
    const tabs = document.querySelectorAll('.tab-btn');

    tabs.forEach(btn => btn.classList.remove('active'));

    if (type === 'heroes') {
        heroList.classList.remove('hidden');
        itemList.classList.add('hidden');
        tabs[0].classList.add('active');
        renderShop(); // Sua função de heróis que já existe
    } else {
        heroList.classList.add('hidden');
        itemList.classList.remove('hidden');
        tabs[1].classList.add('active');
        renderItemShop(); // Nova função para itens
    }
}

// 2. Função para renderizar os consumíveis
function renderItemShop() {
    const container = document.getElementById('item-shop-list');
    if (!container) return;
    container.innerHTML = "";

    CONSUMABLES_DATA.forEach((item) => {
        // O preço escala 15% a cada Wave para manter o equilíbrio
        const currentPrice = Math.floor(item.price * Math.pow(1.15, gameState.wave - 1));
        const canAfford = gameState.gold >= currentPrice;

        const card = document.createElement('div');
        card.className = "shop-card"; // Reutiliza seu estilo bonito de card
        
        card.innerHTML = `
            <div class="shop-card-header">
                <span>${item.name}</span>
                <span class="shop-card-price">💰 ${currentPrice.toLocaleString()}</span>
            </div>
            <div style="font-size: 9px; color: #888; margin: 5px 0;">${item.description}</div>
            <button class="recruit-btn" onclick="buyItem('${item.id}')" ${canAfford ? '' : 'disabled'}>
                ADQUIRIR
            </button>
        `;
        container.appendChild(card);
    });
}

function renderBarracks() {
    const container = document.getElementById('all-heroes-list');
    container.innerHTML = "";

    HERO_TEMPLATES.forEach(hero => {
        const isOwned = gameState.ownedHeroes.some(h => h.id === hero.id);
        const isInSquad = gameState.activeSquad.includes(hero.id);
        
        const card = document.createElement('div');
        card.className = `barracks-card ${isOwned ? 'owned' : ''} ${isInSquad ? 'in-squad' : ''}`;
        
        card.innerHTML = `
            ${!isOwned ? '<span class="locked-label">NÃO RECRUTADO</span>' : ''}
            <img src="${hero.sprite}" class="pixel-art">
            <div style="font-size: 9px; margin-top: 5px;">${hero.name}</div>
        `;

        if (isOwned) {
            card.onclick = () => toggleHeroInSquad(hero.id);
        }
        
        container.appendChild(card);
    });
}

function toggleHeroInSquad(heroId) {
    const index = gameState.activeSquad.indexOf(heroId);

    if (index > -1) {
        // Remove do esquadrão
        gameState.activeSquad.splice(index, 1);
    } else {
        // Tenta adicionar
        if (gameState.activeSquad.length < 10) {
            gameState.activeSquad.push(heroId);
        } else {
            alert("CAPACIDADE MÁXIMA: O esquadrão suporta apenas 10 agentes.");
        }
    }
    renderBarracks();
}

function openBarracks() {
    document.getElementById('barracks-modal').classList.remove('hidden');
    renderBarracks();
}

function closeBarracks() {
    // 1. Esconde o menu de gerenciamento
    const modal = document.getElementById('barracks-modal');
    if (modal) modal.classList.add('hidden');

    // 2. Atualiza a arena com os heróis selecionados (limpa os antigos e desenha os novos)
    renderHeroesInArena(); 

    // 3. Recalcula e exibe as sinergias do novo esquadrão
    if (typeof updateSynergyUI === "function") {
        updateSynergyUI();
    }

    // 4. Atualiza a interface geral (como o dano total que pode ter mudado)
    if (typeof updateUI === "function") {
        updateUI();
    }

    // 5. Salva a nova formação no seu "Memory Card" (localStorage)
    if (typeof saveGame === "function") {
        saveGame();
    }
}

function getActiveSynergies() {
    const counts = {};
    const activeBonuses = [];

    if (!gameState.activeSquad || !SYNERGY_BONUSES) return [];

    // Usa activeSquad ou fallback para ownedHeroes
    let heroesInField = gameState.activeSquad.length > 0 
        ? gameState.activeSquad 
        : gameState.ownedHeroes.map(h => h.id).slice(0, 10);

    heroesInField.forEach(heroId => {
        const heroTemplate = HERO_TEMPLATES.find(h => h.id === heroId);
        if (heroTemplate && heroTemplate.tags) {
            heroTemplate.tags.forEach(tag => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
        }
    });

    for (const tag in SYNERGY_BONUSES) {
        if (counts[tag] >= SYNERGY_BONUSES[tag].threshold) {
            activeBonuses.push({ tag: tag, ...SYNERGY_BONUSES[tag] });
        }
    }
    return activeBonuses;
}

function updateSynergyUI() {
    const list = document.getElementById('active-synergy-list');
    if (!list) return;

    const synergies = getActiveSynergies();
    
    // Limpa a lista antes de desenhar
    list.innerHTML = "";

    if (synergies.length === 0) {
        list.innerHTML = "<small style='color:#444; padding:5px;'>Aguardando formação...</small>";
        return;
    }

    synergies.forEach(syn => {
        const badge = document.createElement('div');
        badge.className = "synergy-badge";
        // Estilo inline de segurança para garantir que apareça
        badge.style.border = "1px solid #00ff00";
        badge.style.margin = "4px 0";
        badge.style.padding = "4px";
        badge.style.display = "flex";
        badge.style.justifyContent = "space-between";
        
        badge.innerHTML = `
            <span style="color:#00ff00; font-size:9px; font-weight:bold;">${syn.name}</span>
            <span style="color:#fff; font-size:9px;">${syn.desc}</span>
        `;
        list.appendChild(badge);
    });
}

function clearSquad() {
    if (confirm("DESMOBILIZAR TODO O ESQUADRÃO?")) {
        gameState.activeSquad = [];
        renderHeroesInArena(); // Limpa a arena visualmente
        renderBarracks();      // Atualiza os checkboxes/cards no menu
        updateUI();            // Atualiza o Power de Fogo para 0
        saveGame();
        
        console.log("Esquadrão desmobilizado. Dano atual: 0");
    }
}

function spawnBloodEffect(targetElement, particleCount = 20) {
    // 1. Busca o container (com plano B caso o ID mude)
    const container = document.getElementById('monster-container') || document.getElementById('game-area');
    if (!container || !targetElement) return;

    // 2. Posição central do monstro em relação ao container
    const rect = targetElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const centerX = (rect.left - containerRect.left) + (rect.width / 2);
    const centerY = (rect.top - containerRect.top) + (rect.height / 2);

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'blood-particle';
        
        // --- VARIAÇÃO DE TAMANHO (Efeito Pixel Art) ---
        const size = Math.random() > 0.8 ? 6 : 3; // 20% de chance de ser um "pedaço" maior
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';

        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';

        // --- LÓGICA DE EXPLOSÃO COM GRAVIDADE ---
        const angle = Math.random() * Math.PI * 2;
        const force = 40 + Math.random() * 80;
        
        // tx: deslocamento horizontal
        const tx = Math.cos(angle) * force;
        // ty: deslocamento vertical (somamos +50 no final para simular a gota caindo no chão)
        const ty = (Math.sin(angle) * force) + 50; 

        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);

        // Tempo de vida aleatório para não sumirem todos no mesmo frame
        const duration = 0.5 + Math.random() * 0.4;
        particle.style.animation = `blood-splat ${duration}s ease-out forwards`;

        container.appendChild(particle);

        // Limpeza de memória
        setTimeout(() => {
            if (particle.parentNode) particle.remove();
        }, duration * 1000);
    }
}