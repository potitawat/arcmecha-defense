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
      this.master = null;
      this.noise = null;
    }

    unlock() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.34;
        this.master.connect(this.ctx.destination);
        this.noise = this.createNoise();
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
        const step = this.beat % 16;
        if (step === 0 || step === 8) this.kick(step === 0 ? 43 : 38);
        if (step === 4 || step === 12) this.metalHit(step === 4 ? 0.072 : 0.052);
        if ([3, 7, 11, 15].includes(step)) this.noiseTick(0.01);
        if (step === 0 || step === 8) this.drone(step === 0 ? 32 : 48, 0.028, 0.46);
        if (step === 15) this.pulse(86, 0.018, 0.2, "sawtooth", -9);
        this.beat += 1;
      }, 245);
    }

    createNoise() {
      const length = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      return buffer;
    }

    output() {
      return this.master || this.ctx.destination;
    }

    pulse(freq, volume, duration, type = "triangle", detune = 0) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, now);
      oscillator.detune.setValueAtTime(detune, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(28, freq * .72), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + .008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(this.output());
      oscillator.start(now);
      oscillator.stop(now + duration + .02);
    }

    filteredNoise(volume, duration, frequency, type = "bandpass") {
      if (!this.ctx || !this.noise) return;
      const now = this.ctx.currentTime;
      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      source.buffer = this.noise;
      filter.type = type;
      filter.frequency.value = frequency;
      filter.Q.value = 6;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + .004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter).connect(gain).connect(this.output());
      source.start(now);
      source.stop(now + duration + .02);
    }

    kick(freq) {
      this.pulse(freq, 0.11, 0.18, "sine");
      this.filteredNoise(0.022, 0.035, 120, "lowpass");
    }

    metalHit(volume) {
      this.filteredNoise(volume, 0.13, 1800, "bandpass");
      this.pulse(172, 0.024, 0.09, "square", -12);
    }

    noiseTick(volume) {
      this.filteredNoise(volume, 0.045, 3200, "highpass");
    }

    drone(freq, volume, duration) {
      this.pulse(freq, volume, duration, "sawtooth", -7);
      this.pulse(freq * 1.5, volume * 0.28, duration * .8, "triangle", 5);
    }

    fx(name, variant = "") {
      if (!state.settings.fx || !this.ctx) return;
      if (name === "build") {
        this.metalHit(0.09);
        this.pulse(118, 0.035, 0.11, "square");
      } else if (name === "shot") {
        if (variant === "cannon") {
          this.kick(64);
          this.filteredNoise(0.045, 0.11, 420, "lowpass");
        } else if (variant === "tesla") {
          this.pulse(620, 0.025, 0.075, "sawtooth", 11);
          this.noiseTick(0.018);
        } else if (variant === "cryo") {
          this.filteredNoise(0.028, 0.16, 950, "bandpass");
          this.pulse(260, 0.016, 0.09, "sine", -10);
        } else if (variant === "repeater") {
          this.pulse(330, 0.018, 0.03, "square");
        } else {
          this.pulse(210, 0.024, 0.045, "triangle");
          this.noiseTick(0.012);
        }
      } else if (name === "magic") {
        this.pulse(420, 0.04, 0.22, "sine", 9);
        this.pulse(630, 0.025, 0.18, "triangle", -8);
      } else if (name === "hit") {
        this.kick(72);
      } else if (name === "victory") {
        [220, 277, 330, 440].forEach((freq, index) => window.setTimeout(() => this.pulse(freq, 0.052, 0.18, "triangle"), index * 80));
      } else if (name === "fail") {
        this.pulse(72, 0.09, 0.36, "sawtooth", -14);
      } else if (name === "coin") {
        this.pulse(820, 0.03, 0.07, "sine");
        window.setTimeout(() => this.pulse(1020, 0.022, 0.06, "sine"), 45);
      }
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

  function resourceIcon(key, klass = "mini-icon") {
    const resource = B.resources[key];
    return `<img class="${klass}" src="${resource.asset}" alt="${resource.name}">`;
  }

  function resourceLabel(key, value) {
    return `${resourceIcon(key)}<span>${round(value)}</span>`;
  }

  function costHtml(cost) {
    return Object.entries(cost || {}).map(([key, amount]) => `<span class="cost-token">${resourceIcon(key)}<b>${amount}</b></span>`).join("");
  }

  function rewardRollTable(roll) {
    return {
      amount: roll.amount || 1,
      table: roll.table || roll
    };
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
    const enemyTags = stage.types.map(type => B.enemies[type].name).join(" / ");
    const dropLabels = stage.reward.rolls.map((roll, i) => {
      const { amount, table } = rewardRollTable(roll);
      const description = Object.entries(table).map(([key, chance]) => `${resourceIcon(key)} ${Math.round(chance * 100)}%`).join(" / ");
      return `<span class="drop-chip">DROP ${i + 1} x${amount}: ${description}</span>`;
    }).join("");
    const nextStep = !cleared
      ? "Primary objective: survive all waves. Build on dark metal plates; brass-lit roads are enemy lanes."
      : captured
        ? "This stage is secured. Replay defense for material rolls or tune your fortress for later stages."
        : "Defense cleared. Assault the nest to unlock timed production on this site.";
    ui.stagePanel.innerHTML = `
      <p class="eyebrow">STAGE ${selectedStage.toString().padStart(2, "0")} ${cleared ? "// SECURED" : ""}</p>
      <h3>${stage.name}</h3>
      <p class="stage-subline">${stage.waves} waves / ${pathCount} route${pathCount > 1 ? "s" : ""} / ${enemyTags}</p>
      <div class="mission-brief">
        <strong>${nextStep}</strong>
        <span>Victory: ${resourceIcon("research")} ${stage.reward.research} plus larger material cache rolls. Defeat: partial Research only.</span>
      </div>
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
    ui.towerDeck.innerHTML = availableTowers().map(([id, tower]) => {
      const statLine = tower.category === "magic"
        ? `Global / ${tower.effectInterval ? `${tower.effectInterval}s cycle` : "passive"}`
        : `DMG ${tower.damage} / RNG ${tower.range}`;
      return `
      <button class="tower-choice ${runtime.selectedTower === id ? "selected" : ""}" data-tower="${id}" style="--tower:${tower.color}">
        <i></i><strong>${tower.short}</strong><small>${tower.price}G</small><em>${statLine}</em>
      </button>`;
    }).join("");
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
      ui.selectedInfo.innerHTML = `<strong>${config.name}</strong><span>${tower.stars} star${tower.stars > 1 ? "s" : ""} // ${config.role}</span>`;
      ui.towerUpgrade.textContent = upgradable ? `UPGRADE ${price} G` : config.category === "magic" ? "AUTO ASCENSION" : "MAX STARS";
      ui.towerUpgrade.disabled = !upgradable || runtime.gold < price;
      ui.towerUpgrade.classList.remove("hidden");
      return;
    }
    const tower = B.towers[runtime.selectedTower];
    ui.selectedInfo.innerHTML = `<strong>${tower.name}</strong><span>${tower.category === "magic" ? "Global effect. Auto-stars over time." : "Tap a free dark plate to build. Tap a tower to upgrade."}</span>`;
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
      runtime.enemies.forEach(enemy => {
        damageEnemy(enemy, config.damage * tower.stars * mult.damage, tower.id, true);
        impactBurst(enemy.x, enemy.y, config.color, "tesla");
      });
      runtime.flash = .22;
      audio.fx("magic");
    }
    if (tower.id === "frostTempest") {
      runtime.enemies.forEach(enemy => {
        enemy.slowUntil = runtime.elapsed + config.slowSeconds * (1 + tower.stars * .04);
        enemy.slowValue = Math.min(.72, config.slow + tower.stars * .018);
        damageEnemy(enemy, config.damage * tower.stars * mult.damage, tower.id, true);
        impactBurst(enemy.x, enemy.y, config.color, "cryo");
      });
      audio.fx("magic");
    }
  }

  function updateTowers(dt) {
    const empower = globalEmpowerment();
    runtime.towers.forEach(tower => {
      const config = B.towers[tower.id];
      const permanent = permanentMultipliers(tower.id);
      tower.recoil = Math.max(0, (tower.recoil || 0) - dt * 5.5);
      tower.heat = Math.max(0, (tower.heat || 0) - dt * 2.2);
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
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      tower.recoil = tower.id === "cannon" ? 1 : tower.id === "tesla" ? .34 : .62;
      tower.heat = 1;
      const projectileLife = tower.id === "cannon" ? .38 : tower.id === "cryo" ? .32 : tower.id === "tesla" ? .11 : .16;
      runtime.projectiles.push({
        x: tower.x,
        y: tower.y,
        tx: target.x,
        ty: target.y,
        life: projectileLife,
        maxLife: projectileLife,
        color: config.color,
        type: tower.id,
        splash: tower.id === "cannon" ? config.splash * CW : 0
      });
      impactBurst(target.x, target.y, config.color, tower.id);
      if (tower.id === "cannon") {
        runtime.flash = Math.max(runtime.flash || 0, .12);
        runtime.shake = Math.max(runtime.shake || 0, .14);
      }
      const rate = (1 + (tower.stars - 1) * .12) * permanent.speed * (1 + empower.speed);
      tower.cool += config.cooldown / rate;
      audio.fx("shot", tower.id);
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

  function burst(x, y, color, power = 1) {
    const count = Math.round(13 * power);
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x,
        y,
        dx: (Math.random() - .5) * 112 * power,
        dy: (Math.random() - .65) * 96 * power,
        life: .36 + Math.random() * .28,
        size: 1.4 + Math.random() * 3.4 * power,
        color
      });
    }
  }

  function impactBurst(x, y, color, type) {
    const power = type === "cannon" ? 2.4 : type === "cryo" ? 1.35 : type === "tesla" ? 1.15 : .82;
    burst(x, y, color, power);
    if (type === "cannon") {
      for (let i = 0; i < 10; i += 1) {
        particles.push({
          x,
          y,
          dx: (Math.random() - .5) * 54,
          dy: (Math.random() - .5) * 54,
          life: .5 + Math.random() * .35,
          size: 8 + Math.random() * 14,
          color: "rgba(239, 97, 54, .28)"
        });
      }
    }
    if (type === "cryo") {
      for (let i = 0; i < 8; i += 1) {
        particles.push({
          x,
          y,
          dx: (Math.random() - .5) * 36,
          dy: (Math.random() - .5) * 36,
          life: .55 + Math.random() * .28,
          size: 7 + Math.random() * 10,
          color: "rgba(174, 239, 255, .25)"
        });
      }
    }
  }

  function updateDefense(dt) {
    if (!runtime || runtime.stopped) return;
    runtime.elapsed += dt;
    if (runtime.flash) runtime.flash = Math.max(0, runtime.flash - dt);
    if (runtime.shake) runtime.shake = Math.max(0, runtime.shake - dt);
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
      const { amount, table } = rewardRollTable(roll);
      const random = Math.random();
      let cumulative = 0;
      let result = Object.keys(table)[0];
      Object.entries(table).some(([key, probability]) => {
        cumulative += probability;
        if (random <= cumulative) {
          result = key;
          return true;
        }
        return false;
      });
      rewards[result] = (rewards[result] || 0) + amount;
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

  function diamond(cx, cy, w, h) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy);
    ctx.lineTo(cx, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy);
    ctx.closePath();
  }

  function glow(color, blur = 12) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  }

  function resetGlow() {
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }

  function drawTile(col, row, road) {
    const x = col * CW;
    const y = row * CH;
    const cx = x + CW / 2;
    const cy = y + CH / 2;
    const seed = (col * 17 + row * 31) % 7;
    diamond(cx, cy, CW - 6, CH - 12);
    const fill = ctx.createLinearGradient(x, y, x + CW, y + CH);
    if (road) {
      fill.addColorStop(0, "#3b2b21");
      fill.addColorStop(.48, "#201713");
      fill.addColorStop(1, "#4b321f");
    } else {
      fill.addColorStop(0, seed % 2 ? "#1e1d19" : "#171815");
      fill.addColorStop(.6, "#11120f");
      fill.addColorStop(1, seed % 3 ? "#24211a" : "#171410");
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = road ? "rgba(228, 151, 73, .46)" : "rgba(176, 130, 74, .14)";
    ctx.lineWidth = road ? 1.4 : .8;
    ctx.stroke();
    if (road) {
      glow("rgba(235, 122, 55, .35)", 10);
      ctx.strokeStyle = "rgba(240, 157, 79, .36)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x + 12, cy + 2);
      ctx.lineTo(x + CW - 12, cy - 2);
      ctx.stroke();
      resetGlow();
    } else {
      ctx.fillStyle = `rgba(202, 151, 87, ${0.04 + seed * 0.008})`;
      ctx.fillRect(x + 13 + seed, y + 15, 11, 2);
      ctx.fillRect(x + 31, y + 34 + seed, 15, 1.5);
    }
  }

  function drawRoutePreview() {
    ctx.save();
    runtime.paths.forEach(path => {
      ctx.strokeStyle = "rgba(235, 151, 72, .16)";
      ctx.lineWidth = 15;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      path.forEach((point, index) => {
        const x = (point[0] + .5) * CW;
        const y = (point[1] + .5) * CH;
        if (index) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
      glow("rgba(236, 102, 49, .38)", 18);
      ctx.strokeStyle = "rgba(234, 132, 61, .35)";
      ctx.lineWidth = 3;
      ctx.stroke();
      resetGlow();
    });
    ctx.restore();
  }

  function drawFortress() {
    const x = 4 * CW + CW / 2;
    const y = canvas.height - 18;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,.38)";
    ctx.beginPath();
    ctx.ellipse(0, -6, 92, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b211b";
    ctx.fillRect(-76, -46, 152, 48);
    ctx.fillStyle = "#7f5637";
    ctx.fillRect(-55, -72, 110, 55);
    ctx.fillStyle = "#c78b4d";
    ctx.fillRect(-18, -98, 36, 46);
    ctx.fillRect(-71, -62, 24, 36);
    ctx.fillRect(47, -62, 24, 36);
    ctx.strokeStyle = "rgba(242, 192, 112, .6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-55, -72, 110, 55);
    glow("#a46de8", 22);
    ctx.fillStyle = "#b985ff";
    ctx.beginPath();
    ctx.arc(0, -52, 10 + Math.sin(runtime.elapsed * 3) * 2, 0, Math.PI * 2);
    ctx.fill();
    resetGlow();
    ctx.strokeStyle = "rgba(161, 107, 220, .45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -52, 26 + Math.sin(runtime.elapsed * 2) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawGear(x, y, radius, teeth, color, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i += 1) {
      const r = i % 2 ? radius * .78 : radius;
      const angle = i * Math.PI / teeth;
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(0, 0, radius * .34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }

  function drawTower(tower) {
    const config = B.towers[tower.id];
    const selected = runtime.selectedPlaced === tower;
    const height = Math.min(24, 10 + tower.stars * 2.4);
    const recoil = tower.recoil || 0;
    const heat = tower.heat || 0;
    const angle = tower.angle ?? -Math.PI / 2;
    ctx.save();
    ctx.translate(tower.x, tower.y);
    if (selected && config.range) {
      const range = (config.range || 1.5) * CW * permanentMultipliers(tower.id).range;
      ctx.strokeStyle = "rgba(230, 178, 95, .42)";
      ctx.fillStyle = "rgba(230, 178, 95, .055)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,.42)";
    ctx.beginPath();
    ctx.ellipse(0, 13, 25, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    glow(config.color, selected ? 22 : 10 + heat * 8);
    diamond(0, 7, 42, 24);
    const base = ctx.createLinearGradient(-18, -5, 18, 22);
    base.addColorStop(0, "#39302a");
    base.addColorStop(.5, "#151210");
    base.addColorStop(1, "#0a0807");
    ctx.fillStyle = base;
    ctx.fill();
    ctx.strokeStyle = heat ? "#f4d09b" : config.color;
    ctx.lineWidth = selected ? 2.4 : 1.2;
    ctx.stroke();
    ctx.fillStyle = "rgba(231, 178, 97, .55)";
    for (let i = 0; i < Math.min(5, tower.stars); i += 1) {
      ctx.beginPath();
      ctx.arc(-15 + i * 7.5, 14, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (config.category === "magic") {
      ctx.rotate(Math.sin(runtime.elapsed * .7 + tower.col) * .05);
      const starPulse = 1 + Math.sin(runtime.elapsed * 2.2 + tower.stars) * .06;
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-14, 8);
      ctx.lineTo(0, -height - 18);
      ctx.lineTo(14, 8);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "rgba(16, 10, 22, .78)";
      ctx.beginPath();
      ctx.moveTo(-10, 5);
      ctx.lineTo(0, -height - 12);
      ctx.lineTo(10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -height - 5, (7 + Math.sin(runtime.elapsed * 3 + tower.row) * 1.4) * starPulse, 0, Math.PI * 2);
      ctx.fillStyle = config.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.36)";
      ctx.beginPath();
      ctx.arc(0, -height - 5, 18 + Math.min(14, tower.stars * .35), runtime.elapsed, runtime.elapsed + Math.PI * 1.2);
      ctx.stroke();
      if (tower.id === "goldRitual") {
        ctx.fillStyle = "#f7d078";
        ctx.fillRect(-5, -height - 26, 10, 7);
      }
    } else {
      ctx.fillStyle = "#4a3324";
      ctx.fillRect(-12, -height, 24, height + 11);
      ctx.fillStyle = "#91633c";
      ctx.fillRect(-8, -height - 9, 16, 11);
      ctx.save();
      ctx.translate(0, -height - 5);
      ctx.rotate(angle);
      const kick = recoil * (tower.id === "cannon" ? 12 : 7);
      ctx.fillStyle = "#2b211b";
      ctx.fillRect(-10, -9, 18, 18);
      ctx.strokeStyle = "rgba(242, 198, 128, .52)";
      ctx.strokeRect(-10, -9, 18, 18);
      if (tower.id === "repeater") {
        ctx.fillStyle = "#d8a760";
        [-5, 0, 5].forEach(offset => ctx.fillRect(4 - kick, offset - 1.4, 31, 2.8));
        ctx.fillStyle = heat ? "#fff1ad" : "#9a6b42";
        ctx.fillRect(31 - kick, -6, 6, 12);
      } else if (tower.id === "cannon") {
        ctx.fillStyle = "#201815";
        ctx.fillRect(2 - kick, -8, 33, 16);
        ctx.strokeStyle = "#e1764c";
        ctx.lineWidth = 3;
        ctx.strokeRect(3 - kick, -7, 30, 14);
        ctx.fillStyle = `rgba(245, 91, 48, ${.22 + heat * .55})`;
        ctx.fillRect(29 - kick, -5, 8, 10);
      } else if (tower.id === "tesla") {
        ctx.strokeStyle = "#7ae9ff";
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i += 1) {
          ctx.beginPath();
          ctx.arc(14 + i * 5 - kick, 0, 6, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
        }
        ctx.fillStyle = heat ? "#f2ffff" : "#7ae9ff";
        ctx.beginPath();
        ctx.arc(35 - kick, 0, 5 + heat * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (tower.id === "cryo") {
        ctx.fillStyle = "#20343a";
        ctx.fillRect(2 - kick, -7, 29, 14);
        ctx.fillStyle = "#a8efff";
        ctx.fillRect(25 - kick, -5, 10, 10);
        ctx.strokeStyle = "rgba(190,245,255,.65)";
        ctx.beginPath();
        ctx.arc(31 - kick, 0, 10 + heat * 4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#c89352";
        ctx.fillRect(4 - kick, -4, 24, 8);
        ctx.fillStyle = heat ? "#fff2b1" : "#4b3020";
        ctx.fillRect(27 - kick, -5, 6, 10);
      }
      ctx.restore();
      if (tower.stars >= 3) drawGear(-13, -height + 5, 6, 8, "rgba(222, 164, 86, .8)", runtime.elapsed * (tower.id === "repeater" ? 3 : 1));
      if (heat) {
        ctx.fillStyle = `rgba(255, 199, 107, ${heat * .45})`;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * 30, -height - 5 + Math.sin(angle) * 30, 5 + heat * 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    resetGlow();
    ctx.fillStyle = "#f1dfba";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(config.category === "magic" ? `★${tower.stars}` : "★".repeat(tower.stars), 0, 32);
    ctx.restore();
  }

  function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const size = enemy.elite ? 1.45 : enemy.type === "giant" ? 1.28 : 1;
    const limp = Math.sin(runtime.elapsed * 7 * enemy.speed + enemy.progress) * 3;
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.beginPath();
    ctx.ellipse(0, 15 * size, 18 * size, 7 * size, 0, 0, Math.PI * 2);
    ctx.fill();
    if (enemy.shield > 0) {
      glow("rgba(170, 108, 238, .6)", 13);
      ctx.strokeStyle = "rgba(185,125,244,.78)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -1, 19 * size, 0, Math.PI * 2);
      ctx.stroke();
      resetGlow();
    }
    ctx.strokeStyle = "#2a221d";
    ctx.lineWidth = 4 * size;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-7 * size, 7 * size);
    ctx.lineTo(-15 * size, 18 * size + limp);
    ctx.moveTo(7 * size, 7 * size);
    ctx.lineTo(14 * size, 18 * size - limp);
    ctx.moveTo(-8 * size, -2 * size);
    ctx.lineTo(-17 * size, 8 * size - limp);
    ctx.moveTo(8 * size, -1 * size);
    ctx.lineTo(18 * size, 7 * size + limp);
    ctx.stroke();
    const flesh = ctx.createLinearGradient(-10, -18 * size, 10, 18 * size);
    flesh.addColorStop(0, enemy.type === "armored" ? "#8d8a7c" : "#a29a78");
    flesh.addColorStop(.45, enemy.color);
    flesh.addColorStop(1, "#2f271f");
    ctx.fillStyle = flesh;
    ctx.beginPath();
    ctx.ellipse(0, 2 * size, 10 * size, 17 * size, .08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = enemy.type === "armored" ? "#7f817b" : "#b8ad8c";
    ctx.beginPath();
    ctx.ellipse(0, -14 * size, 7.3 * size, 8.7 * size, -.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#191311";
    ctx.beginPath();
    ctx.arc(-2.5 * size, -15 * size, 1.3 * size, 0, Math.PI * 2);
    ctx.arc(3.5 * size, -14 * size, 1.2 * size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(230, 214, 170, .45)";
    ctx.lineWidth = 1.2 * size;
    ctx.beginPath();
    ctx.moveTo(-3 * size, -9.5 * size);
    ctx.lineTo(4 * size, -9 * size);
    ctx.stroke();
    if (enemy.type === "runner") {
      ctx.strokeStyle = "#c7a36d";
      ctx.lineWidth = 2.2 * size;
      ctx.beginPath();
      ctx.moveTo(-5 * size, 9 * size);
      ctx.lineTo(-21 * size, 19 * size + limp);
      ctx.moveTo(6 * size, 9 * size);
      ctx.lineTo(21 * size, 16 * size - limp);
      ctx.stroke();
    } else if (enemy.type === "mage") {
      ctx.strokeStyle = "#b98aff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(13 * size, -20 * size);
      ctx.lineTo(21 * size, 12 * size);
      ctx.stroke();
      glow("#b98aff", 12);
      ctx.fillStyle = "#b98aff";
      ctx.beginPath();
      ctx.arc(13 * size, -21 * size, 4.5 * size, 0, Math.PI * 2);
      ctx.fill();
      resetGlow();
    } else if (enemy.type === "armored") {
      ctx.fillStyle = "rgba(164, 159, 137, .72)";
      ctx.fillRect(-10 * size, -5 * size, 20 * size, 16 * size);
      ctx.strokeStyle = "#d2c59d";
      ctx.lineWidth = 2 * size;
      ctx.strokeRect(-10 * size, -5 * size, 20 * size, 16 * size);
    } else if (enemy.type === "giant" || enemy.elite) {
      ctx.fillStyle = "#594638";
      ctx.fillRect(-15 * size, -5 * size, 30 * size, 23 * size);
      ctx.fillStyle = "#9f6b42";
      ctx.fillRect(-5 * size, -27 * size, 10 * size, 9 * size);
      ctx.strokeStyle = "rgba(183, 117, 68, .7)";
      ctx.lineWidth = 2 * size;
      ctx.strokeRect(-15 * size, -5 * size, 30 * size, 23 * size);
    }
    const width = enemy.elite ? 48 : enemy.type === "giant" ? 40 : 31;
    ctx.fillStyle = "rgba(13,10,9,.88)";
    ctx.fillRect(-width / 2, -31 * size, width, 5);
    ctx.fillStyle = enemy.shield > 0 ? "#a66fed" : "#d35a45";
    ctx.fillRect(-width / 2, -31 * size, width * Math.max(0, enemy.hp / enemy.maxHp), 5);
    ctx.restore();
  }

  function drawJaggedLine(x1, y1, x2, y2, color, width, alpha) {
    const segments = 7;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segments; i += 1) {
      const t = i / segments;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      const jitter = (Math.random() - .5) * 13;
      ctx.lineTo(x + jitter, y - jitter * .55);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawProjectile(projectile) {
    const maxLife = projectile.maxLife || .12;
    const alpha = Math.max(0, projectile.life / maxLife);
    const progress = 1 - alpha;
    const midX = (projectile.x + projectile.tx) / 2;
    const midY = (projectile.y + projectile.ty) / 2 - 20;
    const x = (1 - progress) * (1 - progress) * projectile.x + 2 * (1 - progress) * progress * midX + progress * progress * projectile.tx;
    const y = (1 - progress) * (1 - progress) * projectile.y + 2 * (1 - progress) * progress * midY + progress * progress * projectile.ty;
    ctx.save();
    glow(projectile.color, projectile.type === "cannon" ? 20 : 13);
    if (projectile.type === "tesla") {
      drawJaggedLine(projectile.x, projectile.y, projectile.tx, projectile.ty, projectile.color, 3.8, alpha);
      drawJaggedLine(projectile.x, projectile.y, projectile.tx, projectile.ty, "rgba(244,255,255,.92)", 1.2, alpha * .8);
    } else if (projectile.type === "cannon") {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(86, 66, 54, .45)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(projectile.x, projectile.y);
      ctx.quadraticCurveTo(midX, midY + 12, x, y);
      ctx.stroke();
      ctx.fillStyle = "#f0653d";
      ctx.beginPath();
      ctx.arc(x, y, 8 + progress * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(246, 118, 58, ${alpha * .8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(projectile.tx, projectile.ty, projectile.splash * progress, 0, Math.PI * 2);
      ctx.stroke();
    } else if (projectile.type === "cryo") {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(178,239,255,.34)";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(projectile.x, projectile.y);
      ctx.quadraticCurveTo(midX, midY, x, y);
      ctx.stroke();
      ctx.fillStyle = "#c9f8ff";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(184,246,255,${alpha * .42})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(projectile.tx, projectile.ty, 18 * progress, 0, Math.PI * 2);
      ctx.stroke();
    } else if (projectile.type === "repeater") {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = projectile.color;
      ctx.lineWidth = 2.3;
      [-4, 0, 4].forEach(offset => {
        ctx.beginPath();
        ctx.moveTo(projectile.x, projectile.y + offset);
        ctx.lineTo(projectile.tx, projectile.ty + offset * .25);
        ctx.stroke();
      });
    } else {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = projectile.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(projectile.x, projectile.y);
      ctx.quadraticCurveTo(midX, midY, projectile.tx, projectile.ty);
      ctx.stroke();
      ctx.fillStyle = "#ffe2a3";
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    resetGlow();
    ctx.restore();
  }

  function drawDefense() {
    if (!runtime) return;
    const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
    background.addColorStop(0, "#1a1611");
    background.addColorStop(.55, "#0f100d");
    background.addColorStop(1, "#070706");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,.025)";
    for (let i = 0; i < 42; i += 1) {
      const x = (i * 139 + Math.floor(runtime.elapsed * 8)) % canvas.width;
      const y = (i * 83) % canvas.height;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.save();
    if (runtime.shake) {
      ctx.translate((Math.random() - .5) * runtime.shake * 24, (Math.random() - .5) * runtime.shake * 18);
    }
    for (let row = 0; row < B.grid.rows; row += 1) {
      for (let col = 0; col < B.grid.cols; col += 1) {
        drawTile(col, row, runtime.occupied.has(`${col},${row}`));
      }
    }
    drawRoutePreview();
    runtime.paths.forEach(path => {
      const start = path[0];
      glow("#e28845", 14);
      ctx.fillStyle = "#c18046";
      ctx.beginPath();
      ctx.moveTo((start[0] + .5) * CW - 12, 12);
      ctx.lineTo((start[0] + .5) * CW + 12, 12);
      ctx.lineTo((start[0] + .5) * CW, 29);
      ctx.closePath();
      ctx.fill();
      resetGlow();
    });
    drawFortress();
    runtime.towers.forEach(drawTower);
    runtime.enemies.forEach(drawEnemy);
    runtime.projectiles.forEach(drawProjectile);
    ctx.globalAlpha = 1;
    particles.forEach(particle => {
      ctx.globalAlpha = Math.max(0, particle.life / .42);
      glow(particle.color, 8);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size || 2.4, 0, Math.PI * 2);
      ctx.fill();
      resetGlow();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
    if (runtime.flash) {
      ctx.fillStyle = `rgba(128,196,255,${runtime.flash})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height * .42, 120, canvas.width / 2, canvas.height / 2, 470);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.42)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
