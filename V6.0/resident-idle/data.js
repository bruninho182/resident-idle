/**
 * DATA.JS - Resident Evil Idle Survivor
 * Definições de balanceamento, bios e caminhos de assets.
 */

// 1. Definições dos Heróis (S.T.A.R.S & Sobreviventes)
const HERO_TEMPLATES = [
    { 
        id: 1, 
        name: "Recruta R.P.D.", 
        tags: ["RPD"],
        damage: 8, 
        price: 15, 
        sprite: "assets/heroes/recruit.png", 
        abilityType: "basic", 
        abilityDesc: "Treinamento básico.",
        bio: "Oficial recém-formado da delegacia de Raccoon City. Apesar da inexperiência, possui bravura e dedicação ao protocolo policial."
    },
    { 
        id: 2, 
        name: "Jill Valentine", 
        tags: ["STARS"],
        damage: 25, 
        price: 200, 
        sprite: "assets/heroes/jill.png", 
        abilityType: "crit_chance", 
        abilityDesc: "10% de chance de dano x3.",
        bio: "Ex-membro do S.T.A.R.S. e mestra em destrancar fechaduras. Sua agilidade em campo permite identificar pontos fracos críticos nos inimigos."
    },
    { 
        id: 3, 
        name: "Chris Redfield", 
        tags: ["STARS"],
        damage: 60, 
        price: 1500, 
        sprite: "assets/heroes/chris.png", 
        abilityType: "boss_slayer", 
        abilityDesc: "+50% de dano contra Bosses.",
        bio: "Especialista em combate e sobrevivente do incidente na mansão. Sua força física é complementada por um ódio profundo contra bio-armas."
    },
    { 
        id: 4, 
        name: "Barry Burton", 
        tags: ["STARS"],
        damage: 150, 
        price: 8000, 
        sprite: "assets/heroes/barry.png", 
        abilityType: "slow_heavy", 
        abilityDesc: "Dano massivo, mas tiro lento.",
        bio: "Entusiasta de armas de fogo e suporte tático. Sua Magnum personalizada 'Silver Serpent' é capaz de derrubar as maiores ameaças biológicas."
    },
    { 
        id: 5, 
        name: "Rebecca Chambers", 
        tags: ["STARS"],
        damage: 40, 
        price: 25000, 
        sprite: "assets/heroes/rebecca.png", 
        abilityType: "gold_boost", 
        abilityDesc: "+20% de ouro por monstro.",
        bio: "Prodígio em bioquímica e medicina. Sua presença garante a gestão eficiente de recursos e logística financeira da equipe."
    },
    { 
        id: 6, 
        name: "Leon S. Kennedy", 
        tags: ["RPD"],
        damage: 400, 
        price: 120000, 
        sprite: "assets/heroes/leon.png", 
        abilityType: "double_shot", 
        abilityDesc: "Atira duas vezes por segundo.",
        bio: "Sobrevivente de Raccoon City com treinamento especial do governo. Especialista em combate com pistolas e táticas de sobrevivência extrema." 
    },
    { 
        id: 7, 
        name: "Claire Redfield", 
        tags: ["RPD"],
        damage: 850, 
        price: 500000, 
        sprite: "assets/heroes/claire.png", 
        abilityType: "skill_booster", 
        abilityDesc: "Granada carrega com 15 cliques.",
        bio: "Motociclista habilidosa que aprendeu combate por necessidade. Sua determinação em encontrar o irmão a tornou mestre em armamento pesado."
    },
    { 
        id: 8, 
        name: "Ada Wong", 
        tags: ["RPD"],
        damage: 2200, 
        price: 2500000, 
        sprite: "assets/heroes/ada.png", 
        abilityType: "loot_finder", 
        abilityDesc: "Dobra a chance de cair loot.",
        bio: "Espiã enigmática cujas motivações são sempre incertas. Sua tecnologia avançada permite localizar suprimentos onde outros não veem nada."
    },
    { 
        id: 9, 
        name: "Sherry Birkin", 
        tags: ["RPD"],
        damage: 7500, 
        price: 15000000, 
        sprite: "assets/heroes/sherry.png", 
        abilityType: "insta_kill", 
        abilityDesc: "1% de chance de matar monstros comuns.",
        bio: "Possuidora de uma resiliência genética única após exposição ao G-Vírus. Sua força interior manifesta golpes inesperadamente letais."
    },
    { 
        id: 10, 
        name: "Albert Wesker", 
        tags: ["UMBRELLA", "STARS"],
        damage: 25000, 
        price: 99000000, 
        sprite: "assets/heroes/wesker.png", 
        abilityType: "anti_regen", 
        abilityDesc: "Anula a regeneração dos Bosses.",
        bio: "Antigo líder dos S.T.A.R.S. com aprimoramentos genéticos sobre-humanos. Sua frieza calculista impede que bio-armas se curem."
    }
];




// Definição dos Bônus
const SYNERGY_BONUSES = {
    STARS: { 
        name: "S.T.A.R.S. Alpha", 
        threshold: 3, 
        desc: "+20% Dano Crítico", 
        multiplier: 1.2 ,
        critMult: 3
    },
    RPD: { 
        name: "Lei e Ordem", 
        threshold: 2, 
        desc: "+15% Ouro por Morte", 
        multiplier: 1.15 
    },
    UMBRELLA: { 
        name: "Bio-Genética", 
        threshold: 2, 
        desc: "Dano Massivo: x1.5 Dano Total", 
        multiplier: 1.5 
    }
};




// 2. Monstros Comuns
const MONSTER_LIST = [
    { name: "Zombie", sprite: "assets/monsters/zombie.png", baseHp: 20, rewardBase: 5 },
    { name: "Zombie Dog", sprite: "assets/monsters/zzombie.png", baseHp: 35, rewardBase: 8 },
    { name: "Licker", sprite: "assets/monsters/licker.png", baseHp: 70, rewardBase: 15 },
    { name: "Hunter", sprite: "assets/monsters/hunter.png", baseHp: 45, rewardBase: 6 },
    { name: "Chimera", sprite: "assets/monsters/chimera.png", baseHp: 90, rewardBase: 25 }
];

// 3. Chefes
const BOSS_LIST = [
    { name: "Tyrant T-103", sprite: "assets/monsters/tyrant.png", hpMultiplier: 6 },
    { name: "Nemesis T-Type", sprite: "assets/monsters/nemesis.png", hpMultiplier: 10 },
    { name: "Mr. X", sprite: "assets/monsters/mrsx.png", hpMultiplier: 8 }
];

// 4. Itens e Loot
const SHOP_ITEMS = [
    { id: "green_herb", name: "Erva Verde", price: 50, effect: "speed_boost", duration: 30, sprite: "assets/items/green_herb.png" },
    { id: "combat_knife", name: "Faca de Combate", price: 200, effect: "click_damage_plus", sprite: "assets/items/knife.png" }
];

const LOOT_TABLE = [
    { id: "gold", name: "Maleta de Gold", sprite: "assets/items/gold.png", chance: 0.1, type: "instant_gold" }
];

// 5. Cenários e Emblemas
const SCENARIOS = [
    { id: 0, name: "Entrada da Mansão", bg: "assets/bg/mansion_hall.png", startWave: 1 },
    { id: 1, name: "Corredor Escuro", bg: "assets/bg/mansion_corridor.png", startWave: 6 },
    { id: 2, name: "Pátio Externo", bg: "assets/bg/courtyard.png", startWave: 11 },
    { id: 3, name: "Laboratório Secreto", bg: "assets/bg/lab.png", startWave: 16 }
];

const EMBLEMS = [
    { wave: 50, name: "Sobrevivente", image: "assets/emblems/wave50.png" },
    { wave: 100, name: "Agente de Campo", image: "assets/emblems/wave100.png" },
    { wave: 200, name: "Especialista Tático", image: "assets/emblems/wave200.png" },
    { wave: 300, name: "Exterminador", image: "assets/emblems/wave300.png" },
    { wave: 1000, name: "Lenda de Raccoon", image: "assets/emblems/wave1000.png" },
    { prestige: true, name: "S.T.A.R.S. Elite", image: "assets/emblems/stars_prestige.png" }
];

const CONSUMABLES_DATA = [
    {
        id: "green_herb",
        name: "Erva Verde",
        price: 100, // Preço base que deve escalar com a Wave
        type: "heal",
        effectValue: 0.25, // Recupera 25% da barra de progresso ou "proteção"
        description: "Estabiliza o avanço. Reduz o HP do monstro atual em 25%.",
        sprite: "assets/items/green_herb.png"
    },
    {
        id: "ammo_box",
        name: "Pente de Munição",
        price: 500,
        type: "buff",
        duration: 30, // Segundos
        effectValue: 2, // Dano de clique x2
        description: "Dano de clique duplicado por 30 segundos.",
        sprite: "assets/items/ammo.png"
    },
    {
        id: "first_aid_spray",
        name: "Spray de Primeiros Socorros",
        price: 2000,
        type: "special",
        effectValue: 0.5, // 50% de dano instantâneo
        description: "Dano massivo imediato: Remove 50% do HP atual do alvo.",
        sprite: "assets/items/spray.png"
    },

    {
        id: "magnum_ammo",
        name: "Munição de Magnum",
        price: 5000, // Custo de elite
        type: "boss_killer",
        duration: 15, // 15 segundos de puro poder
        effectValue: 5, // Dano multiplicado por 5x
        description: "Poder de parada absoluto. Dano aumentado em 500% por 15 segundos.",
        sprite: "assets/items/magnum_ammo.png"
    }
];