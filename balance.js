/*
 * ArcMecha-Defense tuning data.
 * Edit numbers in this file to rebalance towers, enemies, waves, drops,
 * fortress systems, boss combat, research costs, and offline production.
 */
window.ARC_BALANCE = {
  saveKey: "arcmecha-defense-save-v1",
  grid: { cols: 10, rows: 12 },
  battle: {
    startingGold: 155,
    baseHp: 120,
    betweenWaveSeconds: 12,
    earlyWaveGoldPerSecond: 3,
    towerSellRatio: 0.55,
    survivalResearchPerMinute: 18
  },
  resources: {
    gold: { name: "Field Gold", icon: "G", color: "#e8b55b", asset: "./assets/icons/field-gold.svg" },
    nano: { name: "Nano Scrap", icon: "NS", color: "#bb9461", asset: "./assets/icons/nano-scrap.svg" },
    arcane: { name: "Arcane Crystal", icon: "AC", color: "#9d73e7", asset: "./assets/icons/arcane-crystal.svg" },
    plasma: { name: "Plasma Core", icon: "PC", color: "#63ccdc", asset: "./assets/icons/plasma-core.svg" },
    bio: { name: "Zombie Biosample", icon: "ZB", color: "#86b36e", asset: "./assets/icons/zombie-biosample.svg" },
    research: { name: "Research", icon: "RP", color: "#e8b55b", asset: "./assets/icons/research-data.svg" }
  },
  towers: {
    sentry: {
      name: "Copper Sentry",
      short: "SENTRY",
      category: "mechanical",
      role: "Neutral starter gun",
      price: 55,
      damage: 14,
      range: 2.75,
      cooldown: 0.74,
      upgradeCost: 42,
      maxStars: 5,
      color: "#c78b53",
      unlockStage: 1,
      unlockCost: null
    },
    repeater: {
      name: "Longshot Repeater",
      short: "RAPID",
      category: "mechanical",
      role: "Fast, light, long-range fire",
      price: 105,
      damage: 4,
      range: 2.75,
      cooldown: 0.11,
      upgradeCost: 78,
      maxStars: 5,
      color: "#dfb36b",
      unlockStage: 2,
      unlockCost: { research: 25, nano: 2 }
    },
    cannon: {
      name: "Plasma Siege Cannon",
      short: "CANNON",
      category: "mechanical",
      role: "Heavy blast damage",
      price: 124,
      damage: 76,
      range: 2.75,
      cooldown: 2.85,
      splash: 1.02,
      upgradeCost: 96,
      maxStars: 5,
      color: "#e26b47",
      unlockStage: 3,
      unlockCost: { research: 40, plasma: 2, nano: 1 }
    },
    tesla: {
      name: "Tesla Arc Coil",
      short: "TESLA",
      category: "mechanical",
      role: "Continuous anti-armor current",
      price: 150,
      damage: 4,
      range: 2.75,
      cooldown: 0.07,
      armoredMultiplier: 2.45,
      upgradeCost: 112,
      maxStars: 5,
      color: "#68d1ea",
      unlockStage: 4,
      unlockCost: { research: 56, plasma: 3, arcane: 1 }
    },
    cryo: {
      name: "Cryo Vapor Array",
      short: "CRYO",
      category: "mechanical",
      role: "Damage with slowing vapor",
      price: 82,
      damage: 13,
      range: 2.75,
      cooldown: 1.05,
      slow: 0.52,
      slowSeconds: 2.15,
      upgradeCost: 62,
      maxStars: 5,
      color: "#82d9e8",
      unlockStage: 5,
      unlockCost: { research: 68, arcane: 3, plasma: 1 }
    },
    goldRitual: {
      name: "Golden Rite Obelisk",
      short: "GOLD RITE",
      category: "magic",
      role: "Creates gold on a global cycle",
      price: 142,
      goldPerCycle: 5,
      effectInterval: 5,
      starInterval: 300,
      color: "#ffc96b",
      unlockStage: 2,
      unlockCost: { research: 36, arcane: 2 }
    },
    empowerment: {
      name: "Empowerment Glyph",
      short: "GLYPH",
      category: "magic",
      role: "Global mechanical tower amplification",
      price: 168,
      damageBoost: 0.075,
      speedBoost: 0.055,
      rangeBoost: 0.04,
      starInterval: 300,
      color: "#bd77f1",
      unlockStage: 4,
      unlockCost: { research: 72, arcane: 4, nano: 1 }
    },
    lightningStorm: {
      name: "Storm Invocation",
      short: "STORM",
      category: "magic",
      role: "Strikes every zombie globally",
      price: 210,
      damage: 13,
      effectInterval: 5,
      starInterval: 300,
      color: "#87cfff",
      unlockStage: 6,
      unlockCost: { research: 92, arcane: 5, plasma: 3 }
    },
    frostTempest: {
      name: "Frost Tempest",
      short: "TEMPEST",
      category: "magic",
      role: "Global recurring slow",
      price: 195,
      damage: 2,
      slow: 0.38,
      slowSeconds: 2.2,
      effectInterval: 5,
      starInterval: 300,
      color: "#a7eafb",
      unlockStage: 7,
      unlockCost: { research: 106, arcane: 6, plasma: 2 }
    }
  },
  enemies: {
    shambling: {
      name: "Iron Rotter",
      hp: 88,
      speed: 0.62,
      damage: 10,
      gold: 10,
      color: "#71834f"
    },
    runner: {
      name: "Feral Runner",
      hp: 43,
      speed: 1.38,
      damage: 7,
      gold: 9,
      color: "#9f7144"
    },
    armored: {
      name: "Platebound Corpse",
      hp: 150,
      armor: 0.44,
      speed: 0.54,
      damage: 16,
      gold: 17,
      color: "#687174"
    },
    mage: {
      name: "Grave Arcanist",
      hp: 96,
      speed: 0.62,
      damage: 12,
      gold: 21,
      shieldAura: 35,
      auraInterval: 4.5,
      color: "#755788"
    },
    giant: {
      name: "Runed Colossus",
      hp: 390,
      shield: 100,
      speed: 0.35,
      damage: 34,
      gold: 38,
      color: "#4d5b4d"
    }
  },
  paths: {
    single: [
      [[4, -1], [4, 1], [2, 1], [2, 4], [6, 4], [6, 7], [4, 7], [4, 12]]
    ],
    fork: [
      [[2, -1], [2, 2], [1, 2], [1, 6], [4, 6], [4, 12]],
      [[7, -1], [7, 3], [8, 3], [8, 7], [5, 7], [5, 10], [4, 10], [4, 12]]
    ],
    crossing: [
      [[1, -1], [1, 2], [5, 2], [5, 5], [3, 5], [3, 9], [4, 12]],
      [[8, -1], [8, 3], [6, 3], [6, 6], [8, 6], [8, 9], [5, 9], [4, 9], [4, 12]]
    ],
    siege: [
      [[1, -1], [1, 3], [3, 3], [3, 8], [4, 8], [4, 12]],
      [[5, -1], [5, 2], [7, 2], [7, 5], [5, 5], [5, 9], [4, 9], [4, 12]],
      [[8, -1], [8, 4], [9, 4], [9, 8], [5, 8], [5, 10], [4, 10], [4, 12]]
    ]
  },
  stages: [
    { name: "Ashen Rail Gate", map: "single", waves: 4, types: ["shambling", "runner"], reward: { research: 20, focus: ["nano"], rolls: [{ amount: 5, table: { nano: 1 } }] } },
    { name: "Boiler Graveyard", map: "single", waves: 5, types: ["shambling", "runner"], reward: { research: 27, focus: ["arcane"], rolls: [{ amount: 5, table: { arcane: 1 } }, { amount: 2, table: { arcane: 0.75, nano: 0.25 } }] } },
    { name: "The Copper Divide", map: "fork", waves: 6, types: ["shambling", "runner", "armored"], reward: { research: 34, focus: ["plasma"], rolls: [{ amount: 5, table: { plasma: 1 } }, { amount: 2, table: { plasma: 0.75, nano: 0.25 } }] } },
    { name: "Sigil Refinery", map: "fork", waves: 6, types: ["runner", "armored", "mage"], reward: { research: 42, focus: ["nano", "arcane"], rolls: [{ amount: 4, table: { nano: 1 } }, { amount: 4, table: { arcane: 1 } }] } },
    { name: "Piston Necropolis", map: "crossing", waves: 7, types: ["shambling", "armored", "mage", "giant"], reward: { research: 52, focus: ["nano", "plasma"], rolls: [{ amount: 4, table: { nano: 1 } }, { amount: 4, table: { plasma: 1 } }, { amount: 2, table: { nano: 0.5, plasma: 0.5 } }] } },
    { name: "Stormwork Viaduct", map: "crossing", waves: 7, types: ["runner", "armored", "mage", "giant"], reward: { research: 64, focus: ["arcane", "plasma"], rolls: [{ amount: 5, table: { arcane: 1 } }, { amount: 5, table: { plasma: 1 } }] } },
    { name: "Frozen Dynamo", map: "crossing", waves: 8, types: ["shambling", "runner", "armored", "mage", "giant"], reward: { research: 78, focus: ["bio"], rolls: [{ amount: 6, table: { bio: 1 } }, { amount: 4, table: { arcane: 0.45, plasma: 0.55 } }] } },
    { name: "Cathedral of Gears", map: "siege", waves: 8, types: ["armored", "mage", "giant", "runner"], reward: { research: 94, focus: ["arcane", "bio"], rolls: [{ amount: 7, table: { arcane: 1 } }, { amount: 5, table: { bio: 1 } }, { amount: 3, table: { arcane: 0.65, bio: 0.35 } }] } },
    { name: "King's Black Foundry", map: "siege", waves: 9, types: ["armored", "mage", "giant", "runner"], reward: { research: 112, focus: ["plasma", "bio"], rolls: [{ amount: 8, table: { plasma: 1 } }, { amount: 6, table: { bio: 1 } }, { amount: 3, table: { plasma: 0.68, bio: 0.32 } }] } },
    { name: "Throne of the Rot Engine", map: "siege", waves: 10, types: ["shambling", "runner", "armored", "mage", "giant"], reward: { research: 140, focus: ["nano", "arcane", "plasma", "bio"], rolls: [{ amount: 5, table: { nano: 1 } }, { amount: 5, table: { arcane: 1 } }, { amount: 5, table: { plasma: 1 } }, { amount: 5, table: { bio: 1 } }] } }
  ],
  bosses: [
    { name: "Boilerjaw Brute", trait: "Electro-stitched jaw", hp: 360, damage: 9, interval: 1.6 },
    { name: "Coilback Cadaver", trait: "Scrap tesla spine", hp: 520, damage: 12, interval: 1.48 },
    { name: "Servo Abomination", trait: "Siege piston limbs", hp: 740, damage: 15, interval: 1.4 },
    { name: "Rune-Socket Witch", trait: "Arcane staff shield", hp: 940, damage: 18, interval: 1.35 },
    { name: "Steamgut Colossus", trait: "Pressurized armor", hp: 1250, damage: 22, interval: 1.32 },
    { name: "Tempest Apostle", trait: "Lightning crozier", hp: 1540, damage: 26, interval: 1.25 },
    { name: "Cryo Reliquary", trait: "Frozen sigil heart", hp: 1880, damage: 30, interval: 1.2 },
    { name: "Geargrave Hierophant", trait: "Machine and sorcery", hp: 2350, damage: 35, interval: 1.14 },
    { name: "Crownforged Herald", trait: "Royal technomancy", hp: 2820, damage: 40, interval: 1.08 },
    { name: "THE ZOMBIE KING", trait: "Sovereign of rot and engines", hp: 3800, damage: 49, interval: 1.0 }
  ],
  fortress: {
    armor: { name: "Aegis Frame", max: 8, hpPerLevel: 32, costs: { research: 24, bio: 1 } },
    plasma: { name: "Plasma Bulwark", max: 8, shieldPerLevel: 30, cooldown: 9, costs: { research: 32, bio: 2 } },
    critical: { name: "Critical Matrix", max: 8, chancePerLevel: 0.045, damagePerLevel: 0.22, costs: { research: 40, bio: 3 } },
    special: { name: "Special Ability Slot", max: 3, costs: { research: 70, bio: 18 } }
  },
  guns: {
    rotary: { name: "Brass Rotary", kind: "Mechanical", damage: 21, interval: 0.38, color: "#dda65a", stage: 1 },
    siege: { name: "Plasma Mortar", kind: "Mechanical", damage: 53, interval: 1.16, color: "#ef754f", stage: 3 },
    volt: { name: "Volt Accelerator", kind: "Mechanical", damage: 34, interval: 0.63, color: "#70d9ea", stage: 5 },
    frostRune: { name: "Frost Hex Projector", kind: "Status Magic", damage: 11, interval: 0.65, slow: 0.18, color: "#a7e7f5", stage: 2 },
    shockRune: { name: "Shocking Sigil", kind: "Status Magic", damage: 15, interval: 0.58, weaken: 0.08, color: "#bd80ef", stage: 4 }
  },
  production: {
    research: { basePerSecond: 0.035, upgradeCost: 60, increase: 0.2 },
    bio: { basePerSecond: 0.012, upgradeCost: 85, increase: 0.18 }
  }
};
