(() => {
  "use strict";

  const B = window.ARC_BALANCE;
  const $ = id => document.getElementById(id);
  const canvas = $("defense-canvas");
  const ctx = canvas.getContext("2d");
  const CW = canvas.width / B.grid.cols;
  const CH = canvas.height / B.grid.rows;
  const views = ["home", "campaign", "fortress", "research", "nests", "survival"];

  const ui = {
    headerGold: $("header-gold"),
    resources: {
      nano: $("res-nano"),
      arcane: $("res-arcane"),
      plasma: $("res-plasma"),
      bio: $("res-bio"),
      research: $("res-research")
    },
    music: $("music-toggle"),
    fx: $("fx-toggle"),
    continue: $("continue-button"),
    homeHp: $("home-hp"),
    homeLoadout: $("home-loadout"),
    homeNests: $("home-nests"),
    homeOutput: $("home-output"),
    stageGrid: $("stage-grid"),
    stagePanel: $("stage-panel"),
    campaignProgress: $("campaign-progress"),
    weaponSlots: $("weapon-slots"),
    systems: $("system-upgrades"),
    researchBalance: $("research-balance"),
    researchGrid: $("research-grid"),
    nestGrid: $("nest-grid"),
    survival: $("survival-content"),
    battleScreen: $("battle-screen"),
    battleMode: $("battle-mode"),
    battleTitle: $("battle-title"),
    battleHp: $("battle-hp"),
    battleGold: $("battle-gold"),
    battleWave: $("battle-wave"),
    battleTimer: $("battle-timer"),
    battleToast: $("battle-toast"),
    sendWave: $("send-wave"),
    towerUpgrade: $("tower-upgrade"),
    selectedInfo: $("selected-info"),
    towerDeck: $("tower-deck"),
    bossScreen: $("boss-screen"),
    bossStage: $("boss-stage-title"),
    transformation: $("transformation"),
    duelPanel: $("duel-panel"),
    mechHpBar: $("mech-hp-bar"),
    mechHp: $("mech-hp"),
    bossHpBar: $("boss-hp-bar"),
    bossHp: $("boss-hp"),
    bossName: $("boss-name"),
    bossTrait: $("boss-trait"),
    duelLog: $("duel-log"),
    result: $("result-dialog"),
    resultTag: $("result-tag"),
    resultTitle: $("result-title"),
    resultCopy: $("result-copy"),
    resultRewards: $("result-rewards"),
    story: $("story-dialog")
  };

  let state = loadState();
  let selectedStage = Math.min(state.highestUnlocked, B.stages.length);
  let runtime = null;
  let bossRuntime = null;
  let lastFrame = performance.now();
  let toastTimer = 0;
  let saveTimer = 0;
  let particles = [];

  class AudioRig {
    constructor() {
      this.ctx = null;
      this.beatTimer = 0;
      this.beat = 0;
    }

    unlock() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.ctx = new AudioContext();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      this.updateMusic();
    }

    updateMusic() {
      if (this.beatTimer) window.clearInterval(this.beatTimer);
      this.beatTimer = 0;
      if (!state.settings.music || !this.ctx) return;
      this.beatTimer = window.setInterval(() => {
        if (!state.settings.music) return;
        this.pulse(this.beat % 4 === 0 ? 48 : 62, this.beat % 4 === 0 ? 0.12 : 0.045, .11, "sawtooth");
        if (this.beat % 8 === 4) this.pulse(164, .035, .07, "square");
        this.beat += 1;
      }, 560);
    }

    pulse(freq, volume, duration, type = "triangle") {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(28, freq * .72), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + .008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(this.ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + .02);
    }

    fx(name) {
      if (!state.settings.fx || !this.ctx) return;
      const clips = {
        build: [125, .08, .12, "square"],
        shot: [240, .023, .045, "triangle"],
        magic: [520, .045, .14, "sine"],
        hit: [78, .045, .09, "sawtooth"],
        victory: [330, .1, .24, "triangle"],
        fail: [76, .1, .32, "sawtooth"],
        coin: [720, .035, .09, "sine"]
      };
      this.pulse(...(clips[name] || clips.shot));
    }
  }

  const audio = new AudioRig();

  function freshState() {
    return {
      version: 1,
      settings: { music: true, fx: true },
      storySeen: false,
      tutorialSkipped: false,
      highestUnlocked: 1,
      clearedStages: [],
      capturedNests: {},
      storyComplete: false,
      resources: { nano: 0, arcane: 0, plasma: 0, bio: 0, research: 0 },
      unlockedTowers: { sentry: true },
      towerResearch: {},
      fortress: {
        armor: 0,
        plasma: 0,
        critical: 0,
        special: 0,
        slots: ["rotary", "rotary"]
      },
      productionUpgrades: { research: 0, bio: 0 },
      survivalBest: 0,
      lastProduction: Date.now()
    };
  }

  function loadState() {
    const base = freshState();
    try {
      const saved = JSON.parse(localStorage.getItem(B.saveKey) || "null");
      if (!saved) return base;
      return {
        ...base,
        ...saved,
        settings: { ...base.settings, ...saved.settings },
        resources: { ...base.resources, ...saved.resources },
        unlockedTowers: { ...base.unlockedTowers, ...saved.unlockedTowers },
        towerResearch: { ...base.towerResearch, ...saved.towerResearch },
        fortress: { ...base.fortress, ...saved.fortress },
        productionUpgrades: { ...base.productionUpgrades, ...saved.productionUpgrades },
        capturedNests: { ...base.capturedNests, ...saved.capturedNests }
      };
    } catch (error) {
      return base;
    }
  }

  function saveState() {
    localStorage.setItem(B.saveKey, JSON.stringify(state));
  }

  function round(value) {
    return Math.floor(value || 0).toLocaleString("en-US");
  }

  function hasStageCleared(stageNumber) {
    return state.clearedStages.includes(stageNumber);
  }

  function fortressMaxHp() {
    return B.battle.baseHp + state.fortress.armor * B.fortress.armor.hpPerLevel;
  }

  function resourceLabel(key, value) {
    return `${B.resources[key].icon} ${round(value)}`;
  }

  function costHtml(cost) {
    return Object.entries(cost || {}).map(([key, amount]) => `<b>${B.resources[key].icon}</b> ${amount}`).join(" / ");
  }

  function canPay(cost) {
    return Object.entries(cost || {}).every(([key, amount]) => state.resources[key] >= amount);
  }

  function pay(cost) {
    Object.entries(cost || {}).forEach(([key, amount]) => {
      state.resources[key] -= amount;
    });
  }

  function addResource(key, value) {
    state.resources[key] = (state.resources[key] || 0) + value;
  }

  function productionRates() {
    const totals = { research: 0, bio: 0 };
    Object.values(state.capturedNests).forEach(nest => {
      if (!nest.type) return;
      const config = B.production[nest.type];
      const multiplier = 1 + state.productionUpgrades[nest.type] * config.increase;
      totals[nest.type] += config.basePerSecond * multiplier;
    });
    return totals;
  }

  function accrueProduction(now = Date.now()) {
    const elapsed = Math.max(0, Math.min((now - state.lastProduction) / 1000, 365 * 24 * 3600));
    if (elapsed < .05) return;
    const rates = productionRates();
    addResource("research", rates.research * elapsed);
    addResource("bio", rates.bio * elapsed);
    state.lastProduction = now;
  }

  function renderResources() {
    ui.headerGold.textContent = runtime ? round(runtime.gold) : "--";
    Object.entries(ui.resources).forEach(([key, node]) => {
      node.textContent = round(state.resources[key]);
    });
    ui.researchBalance.textContent = round(state.resources.research);
  }

  function renderHome() {
    const rates = productionRates();
    const nests = Object.keys(state.capturedNests).length;
    ui.homeHp.textContent = `${fortressMaxHp()} HP`;
    ui.homeLoadout.textContent = state.fortress.slots.map(id => B.guns[id].name).join(" / ");
    ui.homeNests.textContent = `${nests} / ${B.stages.length}`;
    ui.homeOutput.textContent = nests
      ? `+${(rates.research * 60).toFixed(1)} RP/min / +${(rates.bio * 60).toFixed(1)} ZB/min`
      : "Defeat a nest boss to build production";
    ui.continue.textContent = state.highestUnlocked > 1 ? "CONTINUE CAMPAIGN" : "BEGIN CAMPAIGN";
  }

  function showView(name) {
    views.forEach(view => {
      $(`view-${view}`).classList.toggle("active", view === name);
      document.querySelector(`.bottom-nav button[data-view="${view}"]`).classList.toggle("selected", view === name);
    });
    if (name === "campaign") renderCampaign();
    if (name === "fortress") renderFortress();
    if (name === "research") renderResearch();
    if (name === "nests") renderNests();
    if (name === "survival") renderSurvival();
    renderResources();
  }

  function renderAll() {
    accrueProduction();
    renderResources();
    renderHome();
    renderCampaign();
    renderFortress();
    renderResearch();
    renderNests();
    renderSurvival();
  }

  function renderCampaign() {
    ui.campaignProgress.textContent = `${state.clearedStages.length} / ${B.stages.length} CLEARED`;
    ui.stageGrid.innerHTML = B.stages.map((stage, index) => {
      const number = index + 1;
      const locked = number > state.highestUnlocked;
      const cleared = hasStageCleared(number);
      const klass = [locked ? "locked" : "", cleared ? "cleared" : "", selectedStage === number ? "selected" : ""].join(" ");
      return `<button class="stage-tile ${klass}" data-stage="${number}" ${locked ? "disabled" : ""}><span>${cleared ? "CLEARED" : locked ? "LOCKED" : "STAGE"}</span><strong>${number}</strong></button>`;
    }).join("");
    const stage = B.stages[selectedStage - 1];
    const unlocked = selectedStage <= state.highestUnlocked;
    const cleared = hasStageCleared(selectedStage);
    const captured = Boolean(state.capturedNests[selectedStage]);
    const pathCount = B.paths[stage.map].length;
    const dropLabels = stage.reward.rolls.map((roll, i) => {
      const description = Object.entries(roll).map(([key, chance]) => `${B.resources[key].icon} ${Math.round(chance * 100)}%`).join(" / ");
      return `<span class="drop-chip">DROP ${i + 1}: ${description}</span>`;
    }).join("");
    ui.stagePanel.innerHTML = `
      <p class="eyebrow">STAGE ${selectedStage.toString().padStart(2, "0")} ${cleared ? "// SECURED" : ""}</p>
      <h3>${stage.name}</h3>
      <p class="stage-subline">${stage.waves} waves / ${pathCount} route${pathCount > 1 ? "s" : ""} / RP ${stage.reward.research} on victory</p>
      <div class="drop-row">${dropLabels}</div>
      <div class="stage-actions">
        <button class="primary" id="start-defense" ${unlocked ? "" : "disabled"}>${cleared ? "REPLAY DEFENSE" : "DEPLOY DEFENSE"}</button>
        <button class="secondary" id="start-boss" ${cleared ? "" : "disabled"}>${captured ? "REPLAY BOSS" : "ASSAULT NEST"}</button>
      </div>`;
    const defense = $("start-defense");
    const boss = $("start-boss");
    if (defense) defense.onclick = () => startDefense(selectedStage, false);
    if (boss) boss.onclick = () => startBoss(selectedStage);
    ui.stageGrid.querySelectorAll("[data-stage]").forEach(button => {
      button.onclick = () => {
        selectedStage = Number(button.dataset.stage);
        renderCampaign();
      };
    });
  }

  function scaledCost(base, level) {
    const multiplier = 1 + level * .62;
    const cost = {};
    Object.entries(base).forEach(([key, amount]) => {
      cost[key] = Math.ceil(amount * multiplier);
    });
    return cost;
  }

  function renderFortress() {
    ui.weaponSlots.innerHTML = state.fortress.slots.map((installed, slot) => {
      const options = Object.entries(B.guns).map(([id, gun]) => {
        const available = state.highestUnlocked > gun.stage || hasStageCleared(gun.stage) || gun.stage === 1;
        return `<option value="${id}" ${installed === id ? "selected" : ""} ${available ? "" : "disabled"}>${gun.name} - ${gun.kind}${available ? "" : ` (clear Stage ${gun.stage})`}</option>`;
      }).join("");
      return `<div class="weapon-slot"><label>WEAPON SLOT ${slot + 1}</label><select data-gun-slot="${slot}">${options}</select></div>`;
    }).join("");
    ui.weaponSlots.querySelectorAll("select").forEach(select => {
      select.onchange = () => {
        state.fortress.slots[Number(select.dataset.gunSlot)] = select.value;
        audio.fx("build");
        saveState();
        renderHome();
      };
    });

    const systems = [
      { id: "armor", copy: `Fortress HP +${B.fortress.armor.hpPerLevel} per level` },
      { id: "plasma", copy: `Temporary plasma shield +${B.fortress.plasma.shieldPerLevel} per level in boss combat` },
      { id: "critical", copy: "Raises critical hit chance and critical damage together" },
      { id: "special", copy: "Unlocks reserved special ability slots; module designs forthcoming" }
    ];
    ui.systems.innerHTML = systems.map(system => {
      const level = state.fortress[system.id];
      const config = B.fortress[system.id];
      const cost = scaledCost(config.costs, level);
      const capped = level >= config.max;
      return `<article class="upgrade-card">
        <h3>${config.name}<span>${system.id === "special" ? `${level} / ${config.max} SLOTS` : `LV ${level} / ${config.max}`}</span></h3>
        <p class="fine">${system.copy}</p>
        <p class="cost">${capped ? "MAXIMUM CALIBRATION" : costHtml(cost)}</p>
        <button class="secondary" data-system="${system.id}" ${capped || !canPay(cost) ? "disabled" : ""}>${capped ? "MAXED" : "UPGRADE"}</button>
      </article>`;
    }).join("");
    ui.systems.querySelectorAll("[data-system]").forEach(button => {
      button.onclick = () => {
        const id = button.dataset.system;
        const cost = scaledCost(B.fortress[id].costs, state.fortress[id]);
        if (!canPay(cost)) return;
        pay(cost);
        state.fortress[id] += 1;
        audio.fx("build");
        saveState();
        renderAll();
      };
    });
  }

  function towerResearch(id) {
    if (!state.towerResearch[id]) state.towerResearch[id] = { power: 0, range: 0, timing: 0 };
    return state.towerResearch[id];
  }

  function researchCost(tower, stat, level) {
    const resource = tower.category === "magic" ? "arcane" : stat === "timing" ? "plasma" : "nano";
    return { research: 16 + level * 17 + tower.unlockStage * 3, [resource]: 1 + Math.floor(level / 2) };
  }

  function renderResearch() {
    ui.researchGrid.innerHTML = Object.entries(B.towers).map(([id, tower]) => {
      const availableByStage = tower.unlockStage === 1 || hasStageCleared(tower.unlockStage);
      const unlocked = Boolean(state.unlockedTowers[id]);
      const levels = towerResearch(id);
      const unlockCopy = tower.unlockCost ? costHtml(tower.unlockCost) : "INITIAL SCHEMATIC";
      let actions = "";
      if (!unlocked) {
        actions = `<button class="primary" data-unlock="${id}" ${availableByStage && canPay(tower.unlockCost) ? "" : "disabled"}>${availableByStage ? `RESEARCH // ${unlockCopy}` : `CLEAR STAGE ${tower.unlockStage}`}</button>`;
      } else {
        actions = `<div class="research-actions">
          ${["power", "range", "timing"].map(stat => {
            const cost = researchCost(tower, stat, levels[stat]);
            const name = stat === "timing" ? (tower.category === "magic" ? "STAR SPEED" : "FIRE RATE") : stat.toUpperCase();
            return `<button class="secondary" data-calibrate="${id}:${stat}" ${canPay(cost) ? "" : "disabled"}>${name} +${levels[stat]}<br>${costHtml(cost)}</button>`;
          }).join("")}
        </div>`;
      }
      return `<article class="research-card ${unlocked ? "" : "locked"}">
        <span class="type-flag ${tower.category}">${tower.category.toUpperCase()}</span>
        <h3>${tower.name}<span>${unlocked ? "ONLINE" : "LOCKED"}</span></h3>
        <p class="fine">${tower.role}. ${tower.category === "magic" ? "Unlimited automatic stars." : "Gold upgrades cap at 5 stars."}</p>
        ${actions}
      </article>`;
    }).join("");
    ui.researchGrid.querySelectorAll("[data-unlock]").forEach(button => {
      button.onclick = () => {
        const id = button.dataset.unlock;
        const cost = B.towers[id].unlockCost;
        if (!canPay(cost)) return;
        pay(cost);
        state.unlockedTowers[id] = true;
        audio.fx("magic");
        saveState();
        renderAll();
      };
    });
    ui.researchGrid.querySelectorAll("[data-calibrate]").forEach(button => {
      button.onclick = () => {
        const [id, stat] = button.dataset.calibrate.split(":");
        const levels = towerResearch(id);
        const cost = researchCost(B.towers[id], stat, levels[stat]);
        if (!canPay(cost)) return;
        pay(cost);
        levels[stat] += 1;
        audio.fx("build");
        saveState();
        renderAll();
      };
    });
  }

  function renderNests() {
    ui.nestGrid.innerHTML = B.stages.map((stage, index) => {
      const number = index + 1;
      const nest = state.capturedNests[number];
      if (!nest) {
        return `<article class="nest-card unclaimed"><h3>NEST ${number}: ${stage.name}</h3><p class="fine">Defeat this stage's nest boss to secure the site.</p></article>`;
      }
      if (!nest.type) {
        return `<article class="nest-card"><p class="eyebrow">SECURED SITE ${number}</p><h3>${stage.name}</h3><p class="fine">Choose one installation. It can be dismantled later.</p><div class="nest-actions"><button class="secondary" data-build-nest="${number}:research">RESEARCH CENTER</button><button class="secondary" data-build-nest="${number}:bio">BIOSAMPLE LAB</button></div></article>`;
      }
      const isResearch = nest.type === "research";
      const production = B.production[nest.type];
      const multiplier = 1 + state.productionUpgrades[nest.type] * production.increase;
      const rate = production.basePerSecond * multiplier * 60;
      const cost = { research: production.upgradeCost * (state.productionUpgrades[nest.type] + 1) };
      return `<article class="nest-card">
        <p class="eyebrow">SITE ${number} // ACTIVE</p>
        <h3>${isResearch ? "Research Center" : "Biosample Laboratory"}</h3>
        <p class="fine">${stage.name}</p>
        <p class="nest-production">+${rate.toFixed(2)} ${isResearch ? "RP" : "ZB"} / MIN // NO STORAGE CAP</p>
        <div class="nest-actions">
          <button class="secondary" data-upgrade-output="${nest.type}" ${canPay(cost) ? "" : "disabled"}>RATE +${Math.round(production.increase * 100)}%<br>${costHtml(cost)}</button>
          <button class="danger" data-demolish="${number}">DISMANTLE</button>
        </div>
      </article>`;
    }).join("");
    ui.nestGrid.querySelectorAll("[data-build-nest]").forEach(button => {
      button.onclick = () => {
        const [stage, type] = button.dataset.buildNest.split(":");
        state.capturedNests[stage].type = type;
        state.lastProduction = Date.now();
        audio.fx("build");
        saveState();
        renderAll();
      };
    });
    ui.nestGrid.querySelectorAll("[data-demolish]").forEach(button => {
      button.onclick = () => {
        accrueProduction();
        state.capturedNests[button.dataset.demolish].type = null;
        audio.fx("hit");
        saveState();
        renderAll();
      };
    });
    ui.nestGrid.querySelectorAll("[data-upgrade-output]").forEach(button => {
      button.onclick = () => {
        const type = button.dataset.upgradeOutput;
        const cost = { research: B.production[type].upgradeCost * (state.productionUpgrades[type] + 1) };
        if (!canPay(cost)) return;
        accrueProduction();
        pay(cost);
        state.productionUpgrades[type] += 1;
        audio.fx("magic");
        saveState();
        renderAll();
      };
    });
  }

  function renderSurvival() {
    if (!state.storyComplete) {
      ui.survival.innerHTML = `<article class="panel survival-lock"><p class="eyebrow">LOCKED SYSTEM</p><h2>SURVIVAL MODE</h2><p class="fine">Destroy the Zombie King in Stage 10's nest assault to unlock endless operations.</p></article>`;
      return;
    }
    const arenas = [`<button class="arena-button" data-survival="special"><strong>Endless Crown Foundry</strong><small>SPECIAL ARENA</small></button>`]
      .concat(B.stages.map((stage, index) => `<button class="arena-button" data-survival="${index + 1}"><strong>${stage.name}</strong><small>ENDLESS MAP ${index + 1}</small></button>`))
      .join("");
    ui.survival.innerHTML = `
      <div class="section-head"><div><p class="eyebrow">POST-CAMPAIGN</p><h2>Survival Mode</h2></div><span class="badge">BEST ${formatTime(state.survivalBest)}</span></div>
      <p class="fine inset">Begin at Wave 1 every run. Randomized hordes, minibosses and mutated campaign bosses grant Research Points based only on survival time.</p>
      <div class="arena-list">${arenas}</div>`;
    ui.survival.querySelectorAll("[data-survival]").forEach(button => {
      button.onclick = () => startDefense(button.dataset.survival === "special" ? 10 : Number(button.dataset.survival), true, button.dataset.survival === "special");
    });
  }

  function expandPathCells(paths) {
    const cells = new Set();
    paths.forEach(path => {
      path.forEach((point, index) => {
        if (!index) return;
        const from = path[index - 1];
        const dx = Math.sign(point[0] - from[0]);
        const dy = Math.sign(point[1] - from[1]);
        let col = from[0];
        let row = from[1];
        while (col !== point[0] || row !== point[1]) {
          if (col !== point[0]) col += dx;
          else if (row !== point[1]) row += dy;
          if (row >= 0 && row < B.grid.rows && col >= 0 && col < B.grid.cols) cells.add(`${col},${row}`);
        }
      });
    });
    return cells;
  }

  function startDefense(stageNumber, survival = false, special = false) {
    audio.unlock();
    const stage = B.stages[stageNumber - 1];
    const paths = B.paths[special ? "siege" : stage.map];
    runtime = {
      type: survival ? "survival" : "defense",
      survival,
      special,
      stageNumber,
      stage,
      paths,
      occupied: expandPathCells(paths),
      towers: [],
      enemies: [],
      projectiles: [],
      selectedTower: "sentry",
      selectedPlaced: null,
      gold: B.battle.startingGold,
      hp: fortressMaxHp(),
      maxHp: fortressMaxHp(),
      wave: 0,
      totalWaves: survival ? Infinity : stage.waves,
      countdown: B.battle.betweenWaveSeconds,
      queue: [],
      between: true,
      elapsed: 0,
      kills: 0,
      stopped: false
    };
    particles = [];
    ui.battleMode.textContent = survival ? "SURVIVAL" : "DEFENSE";
    ui.battleTitle.textContent = special ? "Endless Crown Foundry" : stage.name;
    ui.battleScreen.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    renderTowerDeck();
    renderBattleStats();
    battleToast(survival ? "Survive. Research accrues with time." : "Deploy towers before the first wave.");
    lastFrame = performance.now();
  }

  function availableTowers() {
    return Object.entries(B.towers).filter(([id]) => state.unlockedTowers[id]);
  }

  function renderTowerDeck() {
    if (!runtime) return;
    ui.towerDeck.innerHTML = availableTowers().map(([id, tower]) => `
      <button class="tower-choice ${runtime.selectedTower === id ? "selected" : ""}" data-tower="${id}" style="color:${tower.color}">
        <i></i><strong>${tower.short}</strong><small>${tower.price} G</small>
      </button>`).join("");
    ui.towerDeck.querySelectorAll("[data-tower]").forEach(button => {
      button.onclick = () => {
        runtime.selectedTower = button.dataset.tower;
        runtime.selectedPlaced = null;
        renderTowerDeck();
        renderSelectedInfo();
      };
    });
    renderSelectedInfo();
  }

  function renderSelectedInfo() {
    if (!runtime) return;
    if (runtime.selectedPlaced) {
      const tower = runtime.selectedPlaced;
      const config = B.towers[tower.id];
      const upgradable = config.category === "mechanical" && tower.stars < config.maxStars;
      const price = Math.ceil(config.upgradeCost * Math.pow(1.4, tower.stars - 1));
      ui.selectedInfo.textContent = `${config.name} // ${tower.stars} STAR${tower.stars > 1 ? "S" : ""}`;
      ui.towerUpgrade.textContent = upgradable ? `UPGRADE ${price} G` : config.category === "magic" ? "AUTO ASCENSION" : "MAX STARS";
      ui.towerUpgrade.disabled = !upgradable || runtime.gold < price;
      ui.towerUpgrade.classList.remove("hidden");
      return;
    }
    const tower = B.towers[runtime.selectedTower];
    ui.selectedInfo.textContent = `${tower.name} // ${tower.category === "magic" ? "AUTO STARS" : "MAX 5 STARS"}`;
    ui.towerUpgrade.classList.add("hidden");
  }

  function renderBattleStats() {
    if (!runtime) return;
    ui.battleHp.textContent = `${Math.max(0, Math.ceil(runtime.hp))} / ${runtime.maxHp}`;
    ui.battleHp.style.color = runtime.hp / runtime.maxHp < .32 ? "#ed755c" : "";
    ui.battleGold.textContent = round(runtime.gold);
    ui.headerGold.textContent = round(runtime.gold);
    ui.battleWave.textContent = runtime.survival ? `${runtime.wave} / INF` : `${runtime.wave} / ${runtime.totalWaves}`;
    if (runtime.between) {
      ui.battleTimer.textContent = `NEXT ${Math.ceil(runtime.countdown)}S`;
      const bonus = Math.max(0, Math.ceil(runtime.countdown) * B.battle.earlyWaveGoldPerSecond);
      ui.sendWave.textContent = runtime.wave ? `CALL EARLY +${bonus}G` : `START WAVE +${bonus}G`;
      ui.sendWave.disabled = false;
    } else {
      ui.battleTimer.textContent = `${runtime.enemies.length + runtime.queue.length} HOSTILES`;
      ui.sendWave.textContent = "WAVE ACTIVE";
      ui.sendWave.disabled = true;
    }
    renderSelectedInfo();
  }

  function battleToast(text) {
    ui.battleToast.textContent = text;
    ui.battleToast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => ui.battleToast.classList.remove("show"), 1800);
  }

  function launchWave(early = false) {
    if (!runtime || !runtime.between) return;
    if (early) {
      const bonus = Math.max(0, Math.ceil(runtime.countdown) * B.battle.earlyWaveGoldPerSecond);
      runtime.gold += bonus;
      if (bonus) battleToast(`Early deployment bonus +${bonus} gold`);
    }
    runtime.wave += 1;
    const count = 4 + runtime.stageNumber + runtime.wave * 2 + (runtime.survival ? Math.floor(runtime.wave * .75) : 0);
    const types = runtime.survival
      ? Object.keys(B.enemies)
      : runtime.stage.types;
    runtime.queue = [];
    for (let i = 0; i < count; i += 1) {
      const weightedIndex = Math.min(types.length - 1, Math.floor((i + runtime.wave + Math.random() * 2) / 3));
      runtime.queue.push({
        at: i * Math.max(.32, .72 - runtime.stageNumber * .025 - (runtime.survival ? runtime.wave * .007 : 0)),
        type: types[weightedIndex],
        path: i % runtime.paths.length,
        elite: false
      });
    }
    if (runtime.survival && runtime.wave % 5 === 0) {
      runtime.queue.push({ at: count * .42, type: "giant", path: runtime.wave % runtime.paths.length, elite: true });
      battleToast(runtime.wave % 10 === 0 ? "MUTATED BOSS SIGNATURE DETECTED" : "MINIBOSS ENTERING THE FIELD");
    }
    runtime.spawnClock = 0;
    runtime.between = false;
    audio.fx("hit");
    renderBattleStats();
  }

  function spawnEnemy(item) {
    const base = B.enemies[item.type];
    const progression = 1 + (runtime.stageNumber - 1) * .11 + (runtime.wave - 1) * .075 + (runtime.survival ? Math.pow(runtime.wave, 1.12) * .028 : 0);
    const multiplier = item.elite ? 3.4 : 1;
    const hp = Math.round(base.hp * progression * multiplier);
    runtime.enemies.push({
      ...base,
      type: item.type,
      elite: item.elite,
      name: item.elite ? (runtime.wave % 10 === 0 ? "Mutated Nest Lord" : "Grave Miniboss") : base.name,
      path: runtime.paths[item.path],
      pathIndex: 0,
      x: (runtime.paths[item.path][0][0] + .5) * CW,
      y: (runtime.paths[item.path][0][1] + .5) * CH,
      hp,
      maxHp: hp,
      shield: (base.shield || 0) * progression * multiplier,
      maxShield: (base.shield || 0) * progression * multiplier,
      slowUntil: 0,
      slowValue: 0,
      auraClock: 1.2,
      dead: false,
      progress: 0,
      damage: Math.round(base.damage * progression * (item.elite ? 1.75 : 1)),
      gold: Math.round(base.gold * (item.elite ? 2.3 : 1))
    });
  }

  function permanentMultipliers(id) {
    const levels = towerResearch(id);
    return {
      damage: 1 + levels.power * .09,
      range: 1 + levels.range * .045,
      speed: 1 + levels.timing * .065,
      starInterval: Math.max(.18, 1 - levels.timing * .075)
    };
  }

  function globalEmpowerment() {
    let damage = 0;
    let speed = 0;
    let range = 0;
    runtime.towers.filter(tower => tower.id === "empowerment").forEach(tower => {
      const config = B.towers.empowerment;
      const permanent = permanentMultipliers(tower.id);
      damage += config.damageBoost * tower.stars * permanent.damage;
      speed += config.speedBoost * tower.stars * permanent.speed;
      range += config.rangeBoost * tower.stars * permanent.range;
    });
    return { damage, speed, range };
  }

  function damageEnemy(enemy, amount, source, magical = false) {
    if (enemy.dead) return;
    let final = amount;
    if (enemy.armor && !magical && source !== "tesla") final *= 1 - enemy.armor;
    if (enemy.type === "armored" && (source === "tesla" || magical)) final *= source === "tesla" ? B.towers.tesla.armoredMultiplier : 1.38;
    if (enemy.shield > 0) {
      const absorbed = Math.min(enemy.shield, final);
      enemy.shield -= absorbed;
      final -= absorbed;
    }
    enemy.hp -= final;
    if (enemy.hp <= 0) {
      enemy.dead = true;
      runtime.gold += enemy.gold;
      runtime.kills += 1;
      burst(enemy.x, enemy.y, B.towers[source] ? B.towers[source].color : "#e7b66f");
      audio.fx("hit");
    }
  }

  function applyMagicEffect(tower, config) {
    const mult = permanentMultipliers(tower.id);
    if (tower.id === "goldRitual") {
      const gold = Math.round(config.goldPerCycle * tower.stars * mult.damage);
      runtime.gold += gold;
      battleToast(`Golden Rite +${gold} gold`);
      audio.fx("coin");
    }
    if (tower.id === "lightningStorm") {
      runtime.enemies.forEach(enemy => damageEnemy(enemy, config.damage * tower.stars * mult.damage, tower.id, true));
      runtime.flash = .22;
      audio.fx("magic");
    }
    if (tower.id === "frostTempest") {
      runtime.enemies.forEach(enemy => {
        enemy.slowUntil = runtime.elapsed + config.slowSeconds * (1 + tower.stars * .04);
        enemy.slowValue = Math.min(.72, config.slow + tower.stars * .018);
        damageEnemy(enemy, config.damage * tower.stars * mult.damage, tower.id, true);
      });
      audio.fx("magic");
    }
  }

  function updateTowers(dt) {
    const empower = globalEmpowerment();
    runtime.towers.forEach(tower => {
      const config = B.towers[tower.id];
      const permanent = permanentMultipliers(tower.id);
      if (config.category === "magic") {
        tower.age += dt;
        const stars = 1 + Math.floor(tower.age / (config.starInterval * permanent.starInterval));
        if (stars > tower.stars) {
          tower.stars = stars;
          battleToast(`${config.name} ascends to Star ${stars}`);
          audio.fx("magic");
        }
        if (config.effectInterval) {
          tower.cool -= dt;
          const interval = tower.id === "goldRitual"
            ? Math.max(1, config.effectInterval - (tower.stars - 1))
            : Math.max(2, config.effectInterval - (tower.stars - 1) * .1);
          if (tower.cool <= 0) {
            applyMagicEffect(tower, config);
            tower.cool += interval;
          }
        }
        return;
      }
      tower.cool -= dt;
      if (tower.cool > 0) return;
      const range = config.range * CW * permanent.range * (1 + empower.range);
      const target = runtime.enemies
        .filter(enemy => !enemy.dead && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= range)
        .sort((left, right) => right.progress - left.progress)[0];
      if (!target) return;
      const starPower = 1 + (tower.stars - 1) * .27;
      const damage = config.damage * starPower * permanent.damage * (1 + empower.damage);
      if (tower.id === "cannon") {
        runtime.enemies.filter(enemy => !enemy.dead && Math.hypot(enemy.x - target.x, enemy.y - target.y) <= config.splash * CW).forEach(enemy => {
          damageEnemy(enemy, damage * (enemy === target ? 1 : .56), tower.id, false);
        });
      } else {
        damageEnemy(target, damage, tower.id, tower.id === "tesla");
      }
      if (config.slow) {
        target.slowUntil = runtime.elapsed + config.slowSeconds;
        target.slowValue = config.slow;
      }
      runtime.projectiles.push({ x: tower.x, y: tower.y, tx: target.x, ty: target.y, life: .12, color: config.color });
      const rate = (1 + (tower.stars - 1) * .12) * permanent.speed * (1 + empower.speed);
      tower.cool += config.cooldown / rate;
      audio.fx("shot");
    });
  }

  function updateEnemies(dt) {
    runtime.enemies.forEach(enemy => {
      if (enemy.dead) return;
      if (enemy.shieldAura) {
        enemy.auraClock -= dt;
        if (enemy.auraClock <= 0) {
          runtime.enemies.filter(ally => !ally.dead && Math.hypot(ally.x - enemy.x, ally.y - enemy.y) < CW * 2.2).forEach(ally => {
            ally.shield = Math.max(ally.shield || 0, enemy.shieldAura);
          });
          enemy.auraClock = enemy.auraInterval;
        }
      }
      const next = enemy.path[enemy.pathIndex + 1];
      if (!next) {
        runtime.hp -= enemy.damage;
        enemy.dead = true;
        burst(enemy.x, enemy.y, "#cf543d");
        audio.fx("fail");
        return;
      }
      const tx = (next[0] + .5) * CW;
      const ty = (next[1] + .5) * CH;
      const distance = Math.hypot(tx - enemy.x, ty - enemy.y);
      const slow = enemy.slowUntil > runtime.elapsed ? 1 - enemy.slowValue : 1;
      const step = enemy.speed * CH * dt * slow;
      if (distance <= step) {
        enemy.x = tx;
        enemy.y = ty;
        enemy.pathIndex += 1;
      } else {
        enemy.x += ((tx - enemy.x) / distance) * step;
        enemy.y += ((ty - enemy.y) / distance) * step;
      }
      enemy.progress = enemy.pathIndex + (distance ? 1 - Math.min(1, distance / CH) : 1);
    });
    runtime.enemies = runtime.enemies.filter(enemy => !enemy.dead);
  }

  function burst(x, y, color) {
    for (let i = 0; i < 7; i += 1) {
      particles.push({ x, y, dx: (Math.random() - .5) * 76, dy: (Math.random() - .5) * 76, life: .42, color });
    }
  }

  function updateDefense(dt) {
    if (!runtime || runtime.stopped) return;
    runtime.elapsed += dt;
    if (runtime.flash) runtime.flash = Math.max(0, runtime.flash - dt);
    updateTowers(dt);
    if (runtime.between) {
      runtime.countdown -= dt;
      if (runtime.countdown <= 0) launchWave(false);
    } else {
      runtime.spawnClock += dt;
      while (runtime.queue.length && runtime.queue[0].at <= runtime.spawnClock) {
        spawnEnemy(runtime.queue.shift());
      }
      updateEnemies(dt);
      if (!runtime.queue.length && !runtime.enemies.length) {
        if (!runtime.survival && runtime.wave >= runtime.totalWaves) {
          finishDefense(true);
          return;
        }
        runtime.between = true;
        runtime.countdown = B.battle.betweenWaveSeconds;
      }
    }
    runtime.projectiles.forEach(projectile => { projectile.life -= dt; });
    runtime.projectiles = runtime.projectiles.filter(projectile => projectile.life > 0);
    particles.forEach(particle => {
      particle.life -= dt;
      particle.x += particle.dx * dt;
      particle.y += particle.dy * dt;
    });
    particles = particles.filter(particle => particle.life > 0);
    if (runtime.hp <= 0) finishDefense(false);
    renderBattleStats();
  }

  function rollReward(stage) {
    const rewards = {};
    stage.reward.rolls.forEach(roll => {
      const random = Math.random();
      let cumulative = 0;
      let result = Object.keys(roll)[0];
      Object.entries(roll).some(([key, probability]) => {
        cumulative += probability;
        if (random <= cumulative) {
          result = key;
          return true;
        }
        return false;
      });
      rewards[result] = (rewards[result] || 0) + 1;
    });
    return rewards;
  }

  function finishDefense(victory, withdrew = false) {
    if (!runtime || runtime.stopped) return;
    runtime.stopped = true;
    const completedRuntime = runtime;
    let rewards = {};
    let research = 0;
    if (completedRuntime.survival) {
      research = Math.floor(completedRuntime.elapsed * B.battle.survivalResearchPerMinute / 60);
      addResource("research", research);
      state.survivalBest = Math.max(state.survivalBest, completedRuntime.elapsed);
      showResult(
        withdrew ? "OPERATION ENDED" : "CITADEL OVERRUN",
        `Survived ${formatTime(completedRuntime.elapsed)} and reached Wave ${completedRuntime.wave}. Survival rewards are based on time only.`,
        { research }
      );
    } else if (victory) {
      rewards = rollReward(completedRuntime.stage);
      research = completedRuntime.stage.reward.research;
      Object.entries(rewards).forEach(([key, amount]) => addResource(key, amount));
      addResource("research", research);
      if (!hasStageCleared(completedRuntime.stageNumber)) state.clearedStages.push(completedRuntime.stageNumber);
      state.highestUnlocked = Math.min(B.stages.length, Math.max(state.highestUnlocked, completedRuntime.stageNumber + 1));
      selectedStage = Math.min(B.stages.length, completedRuntime.stageNumber + 1);
      showResult("DEFENSE VICTORY", `Stage ${completedRuntime.stageNumber} secured. Its zombie nest is now available for an automated fortress assault.`, { ...rewards, research });
      audio.fx("victory");
    } else {
      const progress = completedRuntime.totalWaves ? Math.min(1, completedRuntime.wave / completedRuntime.totalWaves) : 0;
      research = withdrew ? 0 : Math.floor(completedRuntime.stage.reward.research * progress * .65);
      addResource("research", research);
      showResult(withdrew ? "OPERATION ABORTED" : "FORTRESS BREACHED", "No material cache recovered. Research was salvaged from combat progress.", { research });
      audio.fx("fail");
    }
    state.lastProduction = Date.now();
    saveState();
    ui.battleScreen.classList.add("hidden");
    document.body.style.overflow = "";
    runtime = null;
    renderAll();
  }

  function showResult(title, copy, rewards, tag = "AFTER ACTION REPORT") {
    ui.resultTag.textContent = tag;
    ui.resultTitle.textContent = title;
    ui.resultCopy.textContent = copy;
    ui.resultRewards.innerHTML = Object.entries(rewards).filter(([, amount]) => amount > 0).map(([key, amount]) => `<span class="drop-chip">${resourceLabel(key, amount)}</span>`).join("");
    if (!ui.result.open) ui.result.showModal();
  }

  function formatTime(seconds) {
    const time = Math.max(0, Math.floor(seconds || 0));
    const minutes = Math.floor(time / 60).toString().padStart(2, "0");
    return `${minutes}:${(time % 60).toString().padStart(2, "0")}`;
  }

  function drawTile(col, row, road) {
    const x = col * CW;
    const y = row * CH;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 8);
    ctx.lineTo(x + CW - 5, y + 2);
    ctx.lineTo(x + CW - 2, y + CH - 9);
    ctx.lineTo(x + 6, y + CH - 3);
    ctx.closePath();
    ctx.fillStyle = road ? "#30261f" : ((col + row) % 2 ? "#181713" : "#131310");
    ctx.fill();
    ctx.strokeStyle = road ? "rgba(209,150,77,.24)" : "rgba(190,139,74,.07)";
    ctx.stroke();
    if (road) {
      ctx.beginPath();
      ctx.moveTo(x + 13, y + CH / 2 + 2);
      ctx.lineTo(x + CW - 12, y + CH / 2 - 2);
      ctx.strokeStyle = "rgba(210,159,88,.17)";
      ctx.stroke();
    }
  }

  function drawFortress() {
    const x = 4 * CW + CW / 2;
    const y = canvas.height - 17;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#241b15";
    ctx.fillRect(-67, -34, 134, 38);
    ctx.fillStyle = "#94633b";
    ctx.fillRect(-43, -50, 86, 45);
    ctx.fillStyle = "#d39b57";
    ctx.fillRect(-11, -68, 22, 36);
    ctx.fillStyle = "#a168d9";
    ctx.shadowColor = "#a168d9";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, -35, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTower(tower) {
    const config = B.towers[tower.id];
    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.fillStyle = "#12100e";
    ctx.beginPath();
    ctx.ellipse(0, 12, 23, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = config.color;
    ctx.globalAlpha = .26;
    ctx.beginPath();
    ctx.arc(0, 0, config.category === "magic" ? 24 : 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (config.category === "magic") {
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-13, 11);
      ctx.lineTo(0, -22);
      ctx.lineTo(13, 11);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -5, 7, 0, Math.PI * 2);
      ctx.fillStyle = config.color;
      ctx.fill();
    } else {
      ctx.fillStyle = "#60442d";
      ctx.fillRect(-12, -4, 24, 22);
      ctx.fillStyle = config.color;
      ctx.fillRect(-8, -13, 27, 8);
      ctx.fillRect(-4, -22, 8, 13);
    }
    ctx.fillStyle = "#eddbbe";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`★${tower.stars}`, 0, 31);
    ctx.restore();
  }

  function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.shield > 0) {
      ctx.strokeStyle = "rgba(167,113,231,.78)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.elite ? 23 : 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.ellipse(0, 4, enemy.elite ? 16 : enemy.type === "giant" ? 14 : 10, enemy.elite ? 20 : enemy.type === "giant" ? 19 : 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c3ae79";
    ctx.beginPath();
    ctx.arc(0, -10, enemy.elite ? 10 : 7, 0, Math.PI * 2);
    ctx.fill();
    const width = enemy.elite ? 42 : 30;
    ctx.fillStyle = "#271b18";
    ctx.fillRect(-width / 2, -29, width, 4);
    ctx.fillStyle = "#d35945";
    ctx.fillRect(-width / 2, -29, width * Math.max(0, enemy.hp / enemy.maxHp), 4);
    ctx.restore();
  }

  function drawDefense() {
    if (!runtime) return;
    const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
    background.addColorStop(0, "#17130f");
    background.addColorStop(1, "#090908");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < B.grid.rows; row += 1) {
      for (let col = 0; col < B.grid.cols; col += 1) {
        drawTile(col, row, runtime.occupied.has(`${col},${row}`));
      }
    }
    ctx.fillStyle = "#b07440";
    runtime.paths.forEach(path => {
      const start = path[0];
      ctx.beginPath();
      ctx.moveTo((start[0] + .5) * CW - 10, 10);
      ctx.lineTo((start[0] + .5) * CW + 10, 10);
      ctx.lineTo((start[0] + .5) * CW, 22);
      ctx.closePath();
      ctx.fill();
    });
    drawFortress();
    runtime.towers.forEach(drawTower);
    runtime.enemies.forEach(drawEnemy);
    runtime.projectiles.forEach(projectile => {
      ctx.globalAlpha = projectile.life / .12;
      ctx.strokeStyle = projectile.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(projectile.x, projectile.y);
      ctx.lineTo(projectile.tx, projectile.ty);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    particles.forEach(particle => {
      ctx.globalAlpha = particle.life / .42;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;
    if (runtime.flash) {
      ctx.fillStyle = `rgba(128,196,255,${runtime.flash})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function placeAtCell(col, row) {
    if (!runtime) return;
    const occupiedTower = runtime.towers.find(tower => tower.col === col && tower.row === row);
    if (occupiedTower) {
      runtime.selectedPlaced = occupiedTower;
      renderSelectedInfo();
      return;
    }
    if (runtime.occupied.has(`${col},${row}`) || row >= B.grid.rows - 1) {
      battleToast("Route and fortress cells cannot hold towers.");
      return;
    }
    const config = B.towers[runtime.selectedTower];
    if (runtime.gold < config.price) {
      battleToast("Insufficient field gold.");
      return;
    }
    runtime.gold -= config.price;
    runtime.towers.push({
      id: runtime.selectedTower,
      col,
      row,
      x: (col + .5) * CW,
      y: (row + .5) * CH,
      stars: 1,
      age: 0,
      cool: config.effectInterval || .18
    });
    runtime.selectedPlaced = null;
    audio.fx("build");
    renderBattleStats();
  }

  function upgradeSelectedTower() {
    if (!runtime || !runtime.selectedPlaced) return;
    const tower = runtime.selectedPlaced;
    const config = B.towers[tower.id];
    if (config.category === "magic" || tower.stars >= config.maxStars) return;
    const price = Math.ceil(config.upgradeCost * Math.pow(1.4, tower.stars - 1));
    if (runtime.gold < price) return;
    runtime.gold -= price;
    tower.stars += 1;
    audio.fx("build");
    burst(tower.x, tower.y, config.color);
    renderBattleStats();
  }

  function startBoss(stageNumber) {
    audio.unlock();
    const config = B.bosses[stageNumber - 1];
    bossRuntime = {
      stageNumber,
      config,
      heroMax: fortressMaxHp(),
      heroHp: fortressMaxHp(),
      shield: state.fortress.plasma * B.fortress.plasma.shieldPerLevel,
      shieldMax: state.fortress.plasma * B.fortress.plasma.shieldPerLevel,
      shieldClock: B.fortress.plasma.cooldown,
      bossHp: config.hp,
      bossMax: config.hp,
      gunClocks: [0, .14],
      bossClock: 1.1,
      elapsed: 0,
      active: false,
      stopped: false,
      weakened: 0
    };
    ui.bossStage.textContent = `STAGE ${stageNumber} // ${B.stages[stageNumber - 1].name}`;
    ui.bossName.textContent = config.name;
    ui.bossTrait.textContent = config.trait;
    ui.transformation.classList.remove("hidden");
    ui.duelPanel.classList.add("hidden");
    ui.bossScreen.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      if (!bossRuntime || bossRuntime.stageNumber !== stageNumber) return;
      ui.transformation.classList.add("hidden");
      ui.duelPanel.classList.remove("hidden");
      bossRuntime.active = true;
      ui.duelLog.textContent = "Weapons live. Automated combat protocol engaged.";
      updateBossUI();
    }, 2200);
  }

  function updateBoss(dt) {
    if (!bossRuntime || !bossRuntime.active || bossRuntime.stopped) return;
    const fight = bossRuntime;
    fight.elapsed += dt;
    state.fortress.slots.forEach((id, index) => {
      const gun = B.guns[id];
      fight.gunClocks[index] -= dt;
      if (fight.gunClocks[index] <= 0) {
        let damage = gun.damage;
        const chance = state.fortress.critical * B.fortress.critical.chancePerLevel;
        if (Math.random() < chance) {
          damage *= 1.5 + state.fortress.critical * B.fortress.critical.damagePerLevel;
          ui.duelLog.textContent = `${gun.name}: CRITICAL IMPACT // ${Math.round(damage)} damage`;
        } else {
          ui.duelLog.textContent = `${gun.name} strikes for ${Math.round(damage)} damage.`;
        }
        fight.bossHp -= damage;
        if (gun.slow) fight.weakened = Math.max(fight.weakened, gun.slow);
        if (gun.weaken) fight.weakened = Math.max(fight.weakened, gun.weaken);
        fight.gunClocks[index] += gun.interval;
        audio.fx(gun.kind === "Status Magic" ? "magic" : "shot");
      }
    });
    fight.bossClock -= dt;
    if (fight.bossClock <= 0) {
      let damage = fight.config.damage * (1 - fight.weakened);
      if (fight.shield > 0) {
        const absorbed = Math.min(fight.shield, damage);
        fight.shield -= absorbed;
        damage -= absorbed;
      }
      fight.heroHp -= damage;
      ui.duelLog.textContent = `${fight.config.name} attacks. Citadel takes ${Math.round(damage)} structural damage.`;
      fight.bossClock += fight.config.interval;
      fight.weakened = Math.max(0, fight.weakened - .03);
      audio.fx("hit");
    }
    if (fight.shieldMax) {
      fight.shieldClock -= dt;
      if (fight.shieldClock <= 0) {
        fight.shield = fight.shieldMax;
        fight.shieldClock = B.fortress.plasma.cooldown;
        ui.duelLog.textContent = "Plasma Bulwark regenerated.";
      }
    }
    updateBossUI();
    if (fight.bossHp <= 0) finishBoss(true);
    else if (fight.heroHp <= 0) finishBoss(false);
  }

  function updateBossUI() {
    if (!bossRuntime) return;
    const fight = bossRuntime;
    ui.mechHp.textContent = `${Math.max(0, Math.ceil(fight.heroHp))} HP${fight.shield > 0 ? ` + ${Math.ceil(fight.shield)} SHIELD` : ""}`;
    ui.bossHp.textContent = `${Math.max(0, Math.ceil(fight.bossHp))} HP`;
    ui.mechHpBar.style.width = `${Math.max(0, fight.heroHp / fight.heroMax * 100)}%`;
    ui.bossHpBar.style.width = `${Math.max(0, fight.bossHp / fight.bossMax * 100)}%`;
  }

  function finishBoss(victory, withdrew = false) {
    if (!bossRuntime || bossRuntime.stopped) return;
    const stageNumber = bossRuntime.stageNumber;
    bossRuntime.stopped = true;
    ui.bossScreen.classList.add("hidden");
    document.body.style.overflow = "";
    if (victory) {
      if (!state.capturedNests[stageNumber]) state.capturedNests[stageNumber] = { type: null };
      if (stageNumber === B.stages.length) state.storyComplete = true;
      const finale = stageNumber === B.stages.length;
      showResult(
        finale ? "THE ZOMBIE KING IS DESTROYED" : "NEST CAPTURED",
        finale
          ? "The Rot Engine falls silent. Survival operations are now unlocked without end."
          : "The citadel mech has secured this nest. Convert it into a Research Center or a Biosample Laboratory.",
        {},
        finale ? "CAMPAIGN COMPLETE // SURVIVAL ONLINE" : "AUTOMATED ASSAULT COMPLETE"
      );
      audio.fx("victory");
    } else {
      showResult(withdrew ? "ASSAULT WITHDRAWN" : "MECH DISABLED", "Upgrade fortress systems or change weapon hardpoints before attempting this nest again.", {});
      audio.fx("fail");
    }
    bossRuntime = null;
    saveState();
    renderAll();
  }

  function animationLoop(now) {
    const dt = Math.min(.06, (now - lastFrame) / 1000);
    lastFrame = now;
    if (runtime) {
      updateDefense(dt);
      drawDefense();
    }
    if (bossRuntime) updateBoss(dt);
    if (now - saveTimer > 3000) {
      accrueProduction();
      renderResources();
      if (!runtime && !bossRuntime) renderHome();
      saveState();
      saveTimer = now;
    }
    requestAnimationFrame(animationLoop);
  }

  function bindEvents() {
    document.addEventListener("pointerdown", () => audio.unlock(), { once: true });
    $("home-brand").onclick = () => showView("home");
    document.querySelectorAll(".bottom-nav button").forEach(button => {
      button.onclick = () => showView(button.dataset.view);
    });
    ui.music.onclick = () => {
      state.settings.music = !state.settings.music;
      ui.music.classList.toggle("active", state.settings.music);
      ui.music.setAttribute("aria-pressed", state.settings.music);
      audio.unlock();
      audio.updateMusic();
      saveState();
    };
    ui.fx.onclick = () => {
      state.settings.fx = !state.settings.fx;
      ui.fx.classList.toggle("active", state.settings.fx);
      ui.fx.setAttribute("aria-pressed", state.settings.fx);
      audio.unlock();
      audio.fx("build");
      saveState();
    };
    ui.continue.onclick = () => {
      if (!state.storySeen) {
        ui.story.showModal();
      } else {
        showView("campaign");
      }
    };
    $("skip-tutorial").onclick = () => {
      state.storySeen = true;
      state.tutorialSkipped = true;
      ui.story.close();
      saveState();
      showView("campaign");
    };
    $("start-tutorial").onclick = () => {
      state.storySeen = true;
      state.tutorialSkipped = false;
      ui.story.close();
      saveState();
      startDefense(1, false);
      battleToast("Select Copper Sentry, then tap outside the route to build.");
    };
    ui.sendWave.onclick = () => launchWave(true);
    ui.towerUpgrade.onclick = upgradeSelectedTower;
    $("leave-battle").onclick = () => finishDefense(false, true);
    $("leave-boss").onclick = () => finishBoss(false, true);
    $("result-close").onclick = () => {
      ui.result.close();
      showView(state.storyComplete ? "survival" : "campaign");
    };
    canvas.addEventListener("pointerup", event => {
      if (!runtime) return;
      const bounds = canvas.getBoundingClientRect();
      const col = Math.floor(((event.clientX - bounds.left) / bounds.width) * B.grid.cols);
      const row = Math.floor(((event.clientY - bounds.top) / bounds.height) * B.grid.rows);
      if (col >= 0 && col < B.grid.cols && row >= 0 && row < B.grid.rows) placeAtCell(col, row);
    });
  }

  function init() {
    accrueProduction();
    ui.music.classList.toggle("active", state.settings.music);
    ui.fx.classList.toggle("active", state.settings.fx);
    ui.music.setAttribute("aria-pressed", state.settings.music);
    ui.fx.setAttribute("aria-pressed", state.settings.fx);
    bindEvents();
    renderAll();
    showView("home");
    saveState();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
    requestAnimationFrame(animationLoop);
  }

  init();
})();
