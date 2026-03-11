/**
 * DATA.JS - Resident Evil Idle Survivor
 * Este arquivo contém todas as definições de balanceamento e caminhos de assets.
 */

// 1. Definições dos Heróis (S.T.A.R.S & Sobreviventes)
const HERO_TEMPLATES = [
    { id: 1, name: "Recruta R.P.D.", damage: 8, price: 15, sprite: "assets/heroes/recruit.png", abilityType: "basic", abilityDesc: "Treinamento básico." },
    { id: 2, name: "Jill Valentine", damage: 25, price: 200, sprite: "assets/heroes/jill.png", abilityType: "crit_chance", abilityDesc: "10% de chance de dano x3." },
    { id: 3, name: "Chris Redfield", damage: 60, price: 1500, sprite: "assets/heroes/chris.png", abilityType: "boss_slayer", abilityDesc: "+50% de dano contra Bosses." },
    { id: 4, name: "Barry Burton", damage: 150, price: 8000, sprite: "assets/heroes/barry.png", abilityType: "slow_heavy", abilityDesc: "Dano massivo, mas tiro lento." },
    { id: 5, name: "Rebecca Chambers", damage: 40, price: 25000, sprite: "assets/heroes/rebecca.png", abilityType: "gold_boost", abilityDesc: "+20% de ouro por monstro." },
    { id: 6, name: "Leon S. Kennedy", damage: 400, price: 120000, sprite: "assets/heroes/leon.png", abilityType: "double_shot", abilityDesc: "Atira duas vezes por segundo." },
    { id: 7, name: "Claire Redfield", damage: 850, price: 500000, sprite: "assets/heroes/claire.png", abilityType: "skill_booster", abilityDesc: "Granada carrega com 15 cliques." },
    { id: 8, name: "Ada Wong", damage: 2200, price: 2500000, sprite: "assets/heroes/ada.png", abilityType: "loot_finder", abilityDesc: "Dobras a chance de cair loot." },
    { id: 9, name: "Sherry", damage: 7500, price: 15000000, sprite: "assets/heroes/sherry.png", abilityType: "insta_kill", abilityDesc: "1% de chance de matar monstros comuns." },
    { id: 10, name: "Albert Wesker", damage: 25000, price: 99000000, sprite: "assets/heroes/wesker.png", abilityType: "anti_regen", abilityDesc: "Anula a regeneração dos Bosses." }
];

// 2. Definições dos Monstros Comuns
const MONSTER_LIST = [
    { name: "Zombie", sprite: "assets/monsters/zombie.png", baseHp: 20, rewardBase: 5 },
    { name: "Zombie Dog", sprite: "assets/monsters/zzombie.png", baseHp: 35, rewardBase: 8 },
    { name: "Licker", sprite: "assets/monsters/licker.png", baseHp: 70, rewardBase: 15 },
    { name: "Hunter", sprite: "assets/monsters/hunter.png", baseHp: 45, rewardBase: 6 },
    { name: "Chimera", sprite: "assets/monsters/chimera.png", baseHp: 90, rewardBase: 25 }
];

// 3. Definições dos Chefes (A cada 10 monstros)
const BOSS_LIST = [
    { name: "Tyrant T-103", sprite: "assets/monsters/tyrant.png", hpMultiplier: 6 },
    { name: "Nemesis T-Type", sprite: "assets/monsters/nemesis.png", hpMultiplier: 10 },
    { name: "Mr. X", sprite: "assets/monsters/mrsx.png", hpMultiplier: 8 }
];

// 4. Itens da Loja (Futuro: Poções e Equipamentos)
const SHOP_ITEMS = [
    { 
        id: "green_herb", 
        name: "Erva Verde", 
        price: 50, 
        effect: "speed_boost", 
        duration: 30,
        sprite: "assets/items/green_herb.png" 
    },
    { 
        id: "combat_knife", 
        name: "Faca de Combate", 
        price: 200, 
        effect: "click_damage_plus", 
        sprite: "assets/items/knife.png" 
    }
];

// 5. Configurações de Cenários (A cada X Waves)
const SCENARIOS = [
    { id: 0, name: "Entrada da Mansão", bg: "assets/bg/mansion_hall.png", startWave: 1 },
    { id: 1, name: "Corredor Escuro", bg: "assets/bg/mansion_corridor.png", startWave: 6 },
    { id: 2, name: "Pátio Externo", bg: "assets/bg/courtyard.png", startWave: 11 },
    { id: 3, name: "Laboratório Secreto", bg: "assets/bg/lab.png", startWave: 16 }
];

// data.js
const LOOT_TABLE = [
    { id: "gold", name: "Maleta de Gold", sprite: "assets/items/gold.png", chance: 0.1, type: "instant_gold" }
];


/*Emblemas*/ 
const EMBLEMS = [
    { wave: 50, name: "Sobrevivente", image: "assets/emblems/wave50.png" },
    { wave: 100, name: "Agente de Campo", image: "assets/emblems/wave100.png" },
    { wave: 200, name: "Especialista Tático", image: "assets/emblems/wave200.png" },
    { wave: 300, name: "Exterminador", image: "assets/emblems/wave300.png" },
    // Adicione os outros até a 900...
    { wave: 1000, name: "Lenda de Raccoon", image: "assets/emblems/wave1000.png" },
    { prestige: true, name: "S.T.A.R.S. Elite", image: "assets/emblems/stars_prestige.png" }
];