/**
 * ============================================================================
 * PROJECT KIHON: NEO-TOKYO ODYSSEY
 * Module 03: The Radical Forge (Kanji Synthesis Engine)
 * - Interactive Radical Core Inventory
 * - Order-Independent Reaction Chamber Fusion
 * - Guided Discovery Hints on Mismatch
 * - Unlocked Arsenal & Persistent Subsystem Upgrades
 * ============================================================================
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. FORGE SYNTHESIZER SOUND ENGINE (WEB AUDIO API)
  // ==========================================================================

  const ForgeAudio = {
    ctx: null,

    init: function () {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },

    // High-energy particle fusion chord
    playFusionSuccess: function () {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Plasma sweep oscillator
        const oscSweep = this.ctx.createOscillator();
        const gainSweep = this.ctx.createGain();
        oscSweep.type = 'sawtooth';
        oscSweep.frequency.setValueAtTime(220, now);
        oscSweep.frequency.exponentialRampToValueAtTime(880, now + 0.35);

        gainSweep.gain.setValueAtTime(0.2, now);
        gainSweep.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        oscSweep.connect(gainSweep);
        gainSweep.connect(this.ctx.destination);
        oscSweep.start(now);
        oscSweep.stop(now + 0.35);

        // Radiant harmonic triad (C5 - G5 - C6)
        const notes = [523.25, 783.99, 1046.50];
        notes.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const startTime = now + 0.25 + idx * 0.06;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, startTime);

          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.4);
        });
      } catch (err) {
        console.warn('[ForgeAudio] Success sound error:', err);
      }
    },

    // Unstable radiation mismatch buzz
    playFusionMismatch: function () {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(85, now + 0.28);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      } catch (err) {
        console.warn('[ForgeAudio] Mismatch buzz error:', err);
      }
    },

    // Click/Slot placement blip
    playSlotClick: function () {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } catch (err) {
        console.warn('[ForgeAudio] Click error:', err);
      }
    }
  };


  // ==========================================================================
  // 2. RADICAL INVENTORY & REACTION CHAMBER LOGIC
  // ==========================================================================

  let slot1Data = null; // { char, meaning }
  let slot2Data = null; // { char, meaning }

  /**
   * Render Radical Core Inventory from KIHON_DATA.radicals
   */
  function renderRadicalInventory() {
    const container = document.getElementById('radical-inventory');
    if (!container || !window.KIHON_DATA || !window.KIHON_DATA.radicals) return;

    container.innerHTML = '';

    window.KIHON_DATA.radicals.forEach(item => {
      const card = document.createElement('div');
      card.className = "radical-card p-3 rounded-lg text-center flex flex-col justify-between items-center transition-all";
      card.setAttribute('data-radical', item.char);
      card.setAttribute('data-meaning', item.meaning || item.romaji);

      const strokeCount = item.strokes ? item.strokes.length : 1;

      card.innerHTML = `
        <div class="text-3xl font-jp font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)] mb-1">
          ${item.char}
        </div>
        <div class="text-xs font-mono font-medium text-slate-200 truncate w-full">
          ${item.meaning ? item.meaning.split('/')[0].trim() : item.romaji}
        </div>
        <div class="text-[10px] font-mono text-slate-400 mt-1">
          ${strokeCount} ${strokeCount === 1 ? 'STROKE' : 'STROKES'}
        </div>
      `;

      card.onclick = () => selectRadical(item.char, item.meaning || item.romaji);
      container.appendChild(card);
    });
  }

  /**
   * Slot a radical into Slot 1 or Slot 2
   * Supports combining duplicates (e.g. 木 + 木 = 林, 火 + 火 = 炎)
   */
  window.selectRadical = function (char, meaning) {
    ForgeAudio.playSlotClick();

    if (!slot1Data) {
      // Slot into Slot 1
      slot1Data = { char, meaning: meaning || '' };
      updateSlotUI('slot-1', slot1Data);
      updateForgeResultText(`[SLOT 01 LOADED] Radical <span class="text-cyan-300 font-bold">${char}</span> locked in. Select a second radical to initiate fusion reaction.`);
    } else if (!slot2Data) {
      // Slot into Slot 2 (even if same character!)
      slot2Data = { char, meaning: meaning || '' };
      updateSlotUI('slot-2', slot2Data);
      updateForgeResultText(`[CHAMBER PRIMED] Radicals <span class="text-cyan-300 font-bold">${slot1Data.char}</span> + <span class="text-cyan-300 font-bold">${char}</span> ready for synthesis.`);
      
      // Auto-evaluate when 2 slots are filled
      setTimeout(() => evaluateForge(slot1Data.char, slot2Data.char), 150);
    } else {
      // Both slots were full: replace Slot 2 or reset to new Slot 1
      slot1Data = { char, meaning: meaning || '' };
      slot2Data = null;
      updateSlotUI('slot-1', slot1Data);
      clearSlotUI('slot-2');
      resetOutputUI();
      updateForgeResultText(`[CHAMBER RECONFIGURED] Radical <span class="text-cyan-300 font-bold">${char}</span> loaded into Slot 01.`);
    }

    highlightSelectedRadicals();
  };

  /**
   * Backward-compatible alias for inline HTML onclick="selectRadicalForForge(this, ...)"
   */
  window.selectRadicalForForge = function (cardEl, char, meaning) {
    selectRadical(char, meaning);
  };

  /**
   * Update visual state for a slot
   */
  function updateSlotUI(slotId, data) {
    const el = document.getElementById(slotId);
    if (!el) return;

    const charEl = el.querySelector('.slot-char');
    const labelEl = el.querySelector('.slot-label');

    if (charEl) charEl.innerText = data.char;
    if (labelEl) labelEl.innerText = data.meaning ? data.meaning.split('/')[0].trim() : '';

    el.classList.add('filled', 'scale-105');
    setTimeout(() => el.classList.remove('scale-105'), 200);

    // Make slot clickable to remove
    el.style.cursor = 'pointer';
    el.title = 'Click to eject radical';
    el.onclick = () => ejectSlot(slotId);
  }

  function clearSlotUI(slotId) {
    const el = document.getElementById(slotId);
    if (!el) return;

    const charEl = el.querySelector('.slot-char');
    const labelEl = el.querySelector('.slot-label');

    if (charEl) charEl.innerText = '-';
    if (labelEl) labelEl.innerText = 'Empty';

    el.classList.remove('filled');
    el.style.cursor = 'default';
    el.title = '';
    el.onclick = null;
  }

  function ejectSlot(slotId) {
    ForgeAudio.playSlotClick();
    if (slotId === 'slot-1') {
      slot1Data = null;
      clearSlotUI('slot-1');
    } else if (slotId === 'slot-2') {
      slot2Data = null;
      clearSlotUI('slot-2');
    }
    resetOutputUI();
    highlightSelectedRadicals();
    updateForgeResultText('Reaction Slot cleared. Select radicals from inventory to synthesize compound Kanji.');
  }

  /**
   * Clear both slots
   */
  window.resetForgeSlots = function () {
    ForgeAudio.playSlotClick();
    slot1Data = null;
    slot2Data = null;
    clearSlotUI('slot-1');
    clearSlotUI('slot-2');
    resetOutputUI();
    highlightSelectedRadicals();
    updateForgeResultText('Select two compatible radicals from your inventory and ignite the fusion chamber to synthesize compound Kanji.');
  };

  function resetOutputUI() {
    const out = document.getElementById('forge-output');
    if (!out) return;
    const charEl = out.querySelector('.output-char');
    const labelEl = out.querySelector('.output-label');
    if (charEl) charEl.innerText = '?';
    if (labelEl) labelEl.innerText = 'Awaiting';
    out.classList.remove('filled', 'ring-2', 'ring-emerald-400');
  }

  function highlightSelectedRadicals() {
    const cards = document.querySelectorAll('.radical-card');
    cards.forEach(card => {
      const r = card.getAttribute('data-radical');
      const isSelected = (slot1Data && slot1Data.char === r) || (slot2Data && slot2Data.char === r);
      if (isSelected) {
        card.classList.add('selected', 'border-emerald-500', 'bg-emerald-950/30');
      } else {
        card.classList.remove('selected', 'border-emerald-500', 'bg-emerald-950/30');
      }
    });
  }


  // ==========================================================================
  // 3. FUSION EVALUATOR & GUIDED DISCOVERY
  // ==========================================================================

  /**
   * Evaluate forge reaction between 2 radicals (order-independent)
   */
  window.evaluateForge = function (r1, r2) {
    if (!r1 || !r2) {
      if (!slot1Data || !slot2Data) {
        updateForgeResultText('⚠ Both Reaction Chamber slots must be occupied before initiating fusion.');
        return;
      }
      r1 = slot1Data.char;
      r2 = slot2Data.char;
    }

    const recipes = window.FORGE_RECIPES || [];

    // Order-independent lookup
    const match = recipes.find(recipe => {
      const ing = recipe.ingredients;
      if (!Array.isArray(ing) || ing.length < 2) return false;
      return (ing[0] === r1 && ing[1] === r2) || (ing[0] === r2 && ing[1] === r1);
    });

    const out = document.getElementById('forge-output');
    const resultText = document.getElementById('forge-result-text');

    if (match) {
      // ----------------------------------------------------------------------
      // MATCH FOUND: Successful Kanji Forging
      // ----------------------------------------------------------------------
      ForgeAudio.playFusionSuccess();

      // Output slot animation
      if (out) {
        const charEl = out.querySelector('.output-char');
        const labelEl = out.querySelector('.output-label');

        if (charEl) charEl.innerText = match.result;
        if (labelEl) labelEl.innerText = match.meaning.split('/')[0].trim();

        out.className = "forge-slot w-24 h-28 rounded-xl flex flex-col items-center justify-center p-2 text-center border-2 border-emerald-400 bg-emerald-950/40 shadow-[0_0_25px_rgba(16,185,129,0.5)] scale-110 transition-all duration-300";
        setTimeout(() => out.classList.remove('scale-110'), 300);
      }

      // Speak newly forged character
      if (window.PlayerState) {
        window.PlayerState.playAudio(match.result);
        const isNew = window.PlayerState.addForgedKanji(match.result);
        if (isNew) {
          window.PlayerState.addXP(match.xp || 50);
        }
      }

      // Display detailed mnemonic lore breakdown & ship upgrade effect
      if (resultText) {
        resultText.innerHTML = `
          <div class="space-y-1 text-left w-full">
            <div class="flex items-center justify-between pb-1 border-b border-emerald-500/30">
              <span class="text-emerald-300 font-bold font-orbitron text-sm">
                FUSION SUCCESSFUL: ${match.result} (${match.romaji})
              </span>
              <span class="text-xs font-mono text-emerald-400">+${match.xp || 50} XP</span>
            </div>
            <div class="text-xs font-mono text-slate-300">
              <span class="text-cyan-400 font-bold">Mnemonic Formula:</span> 
              ${r1} + ${r2} → <span class="text-white font-bold">${match.meaning}</span>
            </div>
            <div class="text-[11px] font-rajdhani text-slate-300 leading-relaxed italic">
              "${match.lore}"
            </div>
            <div class="text-[10px] font-mono text-amber-300 bg-slate-900/90 px-2 py-1 rounded border border-amber-500/30 mt-1">
              SUBSYSTEM UPGRADE: ${match.system || 'UPGRADE SYNCHRONIZED'}
            </div>
          </div>
        `;
      }

      // Re-render unlocked arsenal
      renderUnlockedArsenal();

    } else {
      // ----------------------------------------------------------------------
      // MISMATCH: Guided Discovery Hint Engine
      // ----------------------------------------------------------------------
      ForgeAudio.playFusionMismatch();

      if (out) {
        const charEl = out.querySelector('.output-char');
        const labelEl = out.querySelector('.output-label');
        if (charEl) charEl.innerText = '⚠';
        if (labelEl) labelEl.innerText = 'Unstable';
        out.className = "forge-slot w-24 h-28 rounded-xl flex flex-col items-center justify-center p-2 text-center border-2 border-red-500 bg-red-950/30 shadow-[0_0_20px_rgba(239,68,68,0.4)]";
      }

      // Search for recipes containing r1 to provide guided hints
      const r1Recipes = recipes.filter(rec => rec.ingredients.includes(r1));
      let hintHtml = '';

      if (r1Recipes.length > 0) {
        const partners = r1Recipes.map(rec => {
          const partner = rec.ingredients[0] === r1 ? rec.ingredients[1] : rec.ingredients[0];
          return `<span class="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold font-jp">${partner}</span> (for ${rec.result})`;
        }).join(', ');

        hintHtml = `
          <div class="mt-1.5 p-2 rounded bg-slate-900/90 border border-cyan-500/30 text-[11px] font-mono text-cyan-200">
            <span class="text-amber-400 font-bold">GUIDED DISCOVERY TELEMETRY:</span><br>
            Radical <span class="font-bold font-jp text-white">${r1}</span> can combine with: ${partners}.
          </div>
        `;
      } else {
        hintHtml = `
          <div class="mt-1 text-[11px] text-slate-400 font-mono">
            Try standard building blocks like <span class="text-cyan-300">人 + 木 = 休</span> or <span class="text-cyan-300">日 + 月 = 明</span>.
          </div>
        `;
      }

      if (resultText) {
        resultText.innerHTML = `
          <div class="text-center w-full">
            <span class="text-red-400 font-bold font-mono text-xs">
              ⚡ REACTION INCOMPATIBLE: [${r1}] + [${r2}] produced unstable radiation!
            </span>
            ${hintHtml}
          </div>
        `;
      }
    }
  };

  /**
   * Action trigger for the primary "INITIATE KANJI FUSION REACTION" button
   */
  window.fuseRadicals = function () {
    if (!slot1Data || !slot2Data) {
      ForgeAudio.playFusionMismatch();
      updateForgeResultText('⚠ Both slots must be loaded with radicals from your inventory first.');
      return;
    }
    evaluateForge(slot1Data.char, slot2Data.char);
  };

  function updateForgeResultText(html) {
    const el = document.getElementById('forge-result-text');
    if (el) el.innerHTML = html;
  }


  // ==========================================================================
  // 4. UNLOCKED ARSENAL PERSISTENT COLLECTION
  // ==========================================================================

  /**
   * Render crafted Kanji upgrades into #unlocked-arsenal
   */
  function renderUnlockedArsenal() {
    const list = document.getElementById('unlocked-arsenal');
    const countBadge = document.getElementById('forge-count');
    if (!list) return;

    list.innerHTML = '';

    const recipes = window.FORGE_RECIPES || [];
    const forgedSet = window.PlayerState ? window.PlayerState.forgedKanji : new Set();

    if (countBadge) {
      countBadge.textContent = `${forgedSet.size} / ${recipes.length} FORGED`;
    }

    if (forgedSet.size === 0) {
      list.innerHTML = `
        <div class="p-4 text-center text-xs font-mono text-slate-400 bg-slate-900/60 rounded-lg border border-slate-800">
          No Kanji weapons forged yet. Combine radicals in the Reaction Chamber above to manufacture ship upgrades!
        </div>
      `;
      return;
    }

    // Render each unlocked recipe
    recipes.forEach(recipe => {
      const isUnlocked = forgedSet.has(recipe.result);
      if (!isUnlocked) return; // Only show unlocked items

      const item = document.createElement('div');
      item.className = "p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 flex items-center justify-between gap-3 transition-all cursor-pointer";
      item.title = `Click to speak ${recipe.result}`;
      item.onclick = () => {
        if (window.PlayerState) {
          window.PlayerState.playAudio(recipe.result);
        }
      };

      item.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-3xl font-jp font-bold text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
            ${recipe.result}
          </span>
          <div>
            <div class="text-xs font-orbitron font-bold text-slate-100 flex items-center gap-2">
              <span>${recipe.system.split('//')[0].trim()}</span>
              <span class="text-emerald-400 font-mono text-[10px]">[${recipe.meaning.split('/')[0].trim()}]</span>
            </div>
            <div class="text-[11px] font-mono text-slate-400">
              Formula: ${recipe.ingredients.join(' + ')} • Readings: ${recipe.onyomi || recipe.romaji}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ONLINE
          </span>
        </div>
      `;

      list.appendChild(item);
    });
  }


  // ==========================================================================
  // 5. BOOTSTRAP & INITIALIZATION
  // ==========================================================================

  function initForge() {
    renderRadicalInventory();
    renderUnlockedArsenal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForge);
  } else {
    initForge();
  }

  console.log('[Project Kihon] forge.js initialized successfully.');

})();
