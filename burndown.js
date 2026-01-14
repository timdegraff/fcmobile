
import { formatter } from './formatter.js';
import { math, engine, assetColors, stateTaxRates } from './utils.js';

let isRealDollars = false;
let simulationTrace = {}; 
let firstInsolvencyAge = null; 
let lastUsedRetirementAge = 65;

export const burndown = {
    getIsRealDollars: () => isRealDollars,
    toggleRealDollars: () => {
        isRealDollars = !isRealDollars;
        return isRealDollars;
    },
    priorityOrder: ['cash', 'roth-basis', 'taxable', 'crypto', 'metals', 'heloc', '401k', 'hsa', 'roth-earnings'],
    getInsolvencyAge: () => firstInsolvencyAge,
    lastCalculatedResults: { dwz: 0, preservationAge: null, maxSnapPossible: 0 },

    init: () => {
        const viewContainer = document.getElementById('burndown-view-container');
        if (!viewContainer) return;

        viewContainer.innerHTML = `
            <div class="flex flex-col gap-2.5">
                <div class="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-2 border-b border-white/5 pb-2">
                    <div class="flex items-center gap-4 px-1">
                        <div class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                            <i class="fas fa-microchip text-sm"></i>
                        </div>
                        <div class="flex flex-col">
                            <h2 class="text-xl font-bold text-white tracking-tight leading-none">Burndown Engine</h2>
                            <span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1">Decumulation Logic Orchestrator</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-6">
                         <div class="flex flex-col items-end gap-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Retirement Age</label>
                            <div class="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-white/10">
                                <button id="btn-retire-minus" class="w-6 h-6 flex items-center justify-center hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"><i class="fas fa-minus text-[10px]"></i></button>
                                <input type="number" id="input-retire-age-direct" class="bg-transparent border-none text-blue-400 font-black mono-numbers text-sm w-10 text-center outline-none" value="65">
                                <button id="btn-retire-plus" class="w-6 h-6 flex items-center justify-center hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"><i class="fas fa-plus text-[10px]"></i></button>
                                <input type="range" id="input-top-retire-age" min="18" max="72" step="1" class="hidden"> 
                            </div>
                         </div>
                         
                         <div class="flex flex-col items-center gap-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Currency Mode</label>
                            <button id="toggle-burndown-real" class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-all">
                                Nominal $
                            </button>
                         </div>

                         <div class="flex flex-col items-end gap-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Budget Logic</label>
                            <div class="flex items-center gap-2">
                                <div id="manual-budget-container" class="flex items-center">
                                    <input type="text" id="input-manual-budget" data-type="currency" inputmode="decimal" class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-teal-400 font-bold text-right w-24 mono-numbers outline-none focus:border-blue-500 transition-all">
                                </div>
                                <label class="flex items-center gap-2 cursor-pointer bg-slate-900/50 border border-white/10 px-2 py-1 rounded-lg hover:border-slate-600 transition-all">
                                    <span class="text-[9px] font-black text-slate-400 uppercase">Sync</span>
                                    <input type="checkbox" id="toggle-budget-sync" checked class="w-3 h-3 accent-blue-500 rounded bg-slate-800 border-slate-600">
                                </label>
                            </div>
                         </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div id="card-preservation" class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group cursor-pointer hover:border-amber-500/30 transition-all">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-infinity text-4xl text-amber-500 opacity-20 group-hover:opacity-100 transition-opacity"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-shield-alt"></i> Preservation Age</label>
                            <div id="card-preservation-val" class="text-3xl font-black text-amber-500 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-preservation-sub" class="text-[9px] font-bold text-amber-500/60 uppercase tracking-tighter leading-none">STAYS SOLVENT AT CURRENT BUDGET UNTIL AGE 100+</div>
                    </div>

                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-road text-4xl text-blue-400 opacity-20"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-flag-checkered"></i> Retirement Runway</label>
                            <div id="card-runway-val" class="text-3xl font-black text-red-400 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-runway-sub" class="text-[9px] font-bold text-blue-400/60 uppercase tracking-tighter leading-none">SUSTAINS TARGET BUDGET IN 2026 DOLLARS UNTIL THIS AGE</div>
                    </div>

                    <div id="card-dwz" class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group cursor-pointer hover:border-pink-500/30 transition-all">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-skull text-4xl text-pink-400 opacity-20 group-hover:opacity-100 transition-opacity"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-pink-400 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-glass-cheers"></i> Die With Zero</label>
                            <div id="card-dwz-val" class="text-3xl font-black text-pink-400 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-dwz-sub" class="text-[9px] font-bold text-pink-500/60 uppercase tracking-tighter leading-none">MAX SUSTAINABLE SPEND OF $0K STARTING AT RETIREMENT</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                     <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-col justify-center h-28">
                        <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Burn Down Engines</label>
                        <div id="persona-selector" class="grid grid-cols-2 gap-1 p-1 bg-black/40 rounded-lg border border-white/5 h-full">
                            <button data-mode="PLATINUM" class="rounded-md text-[10px] font-black uppercase tracking-tight transition-all flex flex-col items-center justify-center border border-transparent hover:bg-emerald-500/5">
                                <span class="text-emerald-400 text-xs font-black">HANDOUT HUNTER</span>
                                <span class="text-[6.5px] opacity-40 leading-none mt-1 uppercase text-center">aggressive aid maximization</span>
                            </button>
                            <button data-mode="RAW" class="rounded-md text-[10px] font-black uppercase tracking-tight transition-all flex flex-col items-center justify-center border border-transparent hover:bg-slate-500/5">
                                <span class="text-slate-400 text-xs font-black">IRON FIST</span>
                                <span class="text-[6.5px] opacity-40 leading-none mt-1 uppercase text-center">strict priority burn</span>
                            </button>
                        </div>
                    </div>

                    <div id="card-snap-wrapper" class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-col justify-between h-28 transition-all duration-300">
                        <div class="flex justify-between items-start mb-1">
                            <div>
                                <label class="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block">Max Food Aid (2026)</label>
                                <div id="est-snap-indicator" class="text-2xl font-black text-emerald-400 mono-numbers leading-none mt-0.5">$0</div>
                            </div>
                            <div class="text-right">
                                <span class="text-[7px] text-slate-500 font-black uppercase tracking-widest block">Simulation Goal</span>
                                <span id="label-snap-preserve" class="text-[10px] font-bold text-emerald-400 mono-numbers">$0/mo</span>
                            </div>
                        </div>
                        
                        <div class="space-y-1.5">
                            <div class="flex justify-between items-end">
                                <p class="text-[6px] text-slate-600 font-bold uppercase">Slider sets benefit floor goal. Max is based on $0 income.</p>
                            </div>
                            <input type="range" id="input-snap-preserve" min="0" max="2000" step="100" value="0" class="input-range w-full accent-emerald-500">
                        </div>
                    </div>

                    <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-col justify-center h-28">
                        <div class="flex justify-between items-center mb-4">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cash Safety Net</label>
                            <span id="label-cash-reserve" class="text-pink-400 font-black mono-numbers text-[10px]">$25,000</span>
                        </div>
                        <input type="range" id="input-cash-reserve" min="0" max="100000" step="1000" value="25000" class="input-range w-full">
                    </div>
                </div>

                <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-wrap items-center gap-3">
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Draw Order Priority:</span>
                    <div id="draw-priority-list" class="flex flex-wrap items-center gap-2"></div>
                </div>

                <div class="card-container bg-black/20 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                    <div id="burndown-table-container" class="max-h-[65vh] overflow-auto mono-numbers"></div>
                    <div class="p-3 bg-slate-900/60 border-t border-white/5 text-[8px] text-slate-500 font-bold uppercase tracking-widest text-center">
                        <i class="fas fa-info-circle mr-1"></i> DISCLAIMER: All asset withdrawals are modeled as lump-sum transfers (assets) to optimize for government benefit eligibility across all states.
                    </div>
                </div>
            </div>
        `;
        burndown.attachListeners();
        burndown.run(); 
    },

    attachListeners: () => {
        ['toggle-budget-sync', 'input-top-retire-age', 'input-cash-reserve', 'input-snap-preserve'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.oninput = () => {
                if (id === 'input-cash-reserve') {
                    const lbl = document.getElementById('label-cash-reserve');
                    if (lbl) lbl.textContent = math.toCurrency(parseInt(el.value));
                }
                if (id === 'input-snap-preserve') {
                    const lbl = document.getElementById('label-snap-preserve');
                    const maxVal = burndown.lastCalculatedResults.maxSnapPossible;
                    // Snap to exact max if slider is at the very end
                    const val = (parseInt(el.value) >= parseInt(el.max)) ? maxVal : parseInt(el.value);
                    if (lbl) lbl.textContent = `${math.toCurrency(val)}/mo`;
                }
                if (id === 'input-top-retire-age') {
                    let val = parseInt(el.value);
                    const curAge = parseFloat(window.currentData?.assumptions?.currentAge) || 40;
                    val = Math.max(curAge, Math.min(72, val));
                    el.value = val;
                    const directInp = document.getElementById('input-retire-age-direct');
                    if (directInp) directInp.value = val;
                    if (window.currentData?.assumptions) window.currentData.assumptions.retirementAge = val;
                }
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        });

        const personaContainer = document.getElementById('persona-selector');
        if (personaContainer) {
            personaContainer.onclick = (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const mode = btn.dataset.mode;
                personaContainer.querySelectorAll('button').forEach(b => {
                    b.classList.remove('bg-emerald-500/10', 'border-emerald-500/30', 'bg-slate-500/10', 'border-slate-500/30');
                });
                const styleMap = { 'PLATINUM': 'bg-emerald-500/10 border-emerald-500/30', 'RAW': 'bg-slate-500/10 border-slate-500/30' };
                btn.classList.add(...styleMap[mode].split(' '));
                personaContainer.dataset.value = mode;

                if (mode === 'PLATINUM') {
                    burndown.priorityOrder = ['cash', 'roth-basis', 'hsa', 'taxable', 'crypto', 'metals', 'heloc', '401k', 'roth-earnings'];
                }

                const snapWrapper = document.getElementById('card-snap-wrapper');
                if (snapWrapper) {
                    snapWrapper.classList.toggle('opacity-20', mode === 'RAW');
                    snapWrapper.classList.toggle('pointer-events-none', mode === 'RAW');
                }
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        }

        const realBtn = document.getElementById('toggle-burndown-real');
        if (realBtn) {
            realBtn.onclick = () => { isRealDollars = !isRealDollars; burndown.updateToggleStyle(realBtn); burndown.run(); if (window.debouncedAutoSave) window.debouncedAutoSave(); };
        }
    },

    updateToggleStyle: (btn) => {
        if (!btn) return;
        btn.classList.toggle('bg-blue-600/20', isRealDollars);
        btn.classList.toggle('text-blue-400', isRealDollars);
        btn.textContent = isRealDollars ? '2026 Dollars' : 'Nominal Dollars';
    },

    assetMeta: {
        'cash': { label: 'Cash', short: 'Cash', color: assetColors['Cash'], isTaxable: false },
        'taxable': { label: 'Brokerage', short: 'Brokerage', color: assetColors['Taxable'], isTaxable: true }, 
        'roth-basis': { label: 'Roth Basis', short: 'Roth Basis', color: assetColors['Roth IRA'], isTaxable: false },
        'heloc': { label: 'HELOC', short: 'HELOC', color: assetColors['HELOC'], isTaxable: false },
        '401k': { label: '401k/IRA', short: '401k/IRA', color: assetColors['Pre-Tax (401k/IRA)'], isTaxable: true },
        'roth-earnings': { label: 'Roth Gains', short: 'Roth Gains', color: assetColors['Roth IRA'], isTaxable: false },
        'crypto': { label: 'Bitcoin', short: 'Bitcoin', color: assetColors['Crypto'], isTaxable: true },
        'metals': { label: 'Metals', short: 'Metals', color: assetColors['Metals'], isTaxable: true },
        'hsa': { label: 'HSA', short: 'HSA', color: assetColors['HSA'], isTaxable: false }
    },

    load: (data) => {
        if (data?.priority) burndown.priorityOrder = [...new Set(data.priority)];
        isRealDollars = !!data?.isRealDollars;
        if (data) {
            const mode = data.strategyMode || 'PLATINUM', personaSelector = document.getElementById('persona-selector');
            if (personaSelector) { const btn = personaSelector.querySelector(`[data-mode="${mode}"]`); if (btn) btn.click(); }
            const sync = (id, val) => { const el = document.getElementById(id); if (el) { el.value = val; el.dispatchEvent(new Event('input')); } };
            sync('input-cash-reserve', data.cashReserve ?? 25000);
            sync('input-snap-preserve', data.snapPreserve ?? 0);
            sync('input-top-retire-age', Math.min(72, window.currentData?.assumptions?.retirementAge || 65));
        }
        burndown.run();
    },

    scrape: () => ({
        priority: burndown.priorityOrder,
        strategyMode: document.getElementById('persona-selector')?.dataset.value || 'PLATINUM',
        cashReserve: parseInt(document.getElementById('input-cash-reserve')?.value || 25000),
        snapPreserve: parseInt(document.getElementById('input-snap-preserve')?.value || 0), 
        useSync: document.getElementById('toggle-budget-sync')?.checked ?? true,
        manualBudget: math.fromCurrency(document.getElementById('input-manual-budget')?.value || "$100,000"),
        isRealDollars
    }),

    run: () => {
        const data = window.currentData; if (!data || !data.assumptions || isNaN(data.assumptions.currentAge)) return;
        const config = burndown.scrape();
        simulationTrace = {}; 
        const results = burndown.simulateProjection(data, config);
        
        if (document.getElementById('card-runway-val')) document.getElementById('card-runway-val').textContent = firstInsolvencyAge ? firstInsolvencyAge : "100+";
        if (document.getElementById('card-dwz-val')) document.getElementById('card-dwz-val').textContent = math.toSmartCompactCurrency(burndown.lastCalculatedResults.dwz || 0);

        const maxSnapEl = document.getElementById('est-snap-indicator');
        const snapSlider = document.getElementById('input-snap-preserve');
        if (maxSnapEl) maxSnapEl.textContent = math.toCurrency(burndown.lastCalculatedResults.maxSnapPossible);
        if (snapSlider) {
            const currentMax = burndown.lastCalculatedResults.maxSnapPossible;
            snapSlider.max = Math.floor(currentMax / 100) * 100;
            // Handle last segment to exact max
            const sliderVal = parseInt(snapSlider.value);
            if (sliderVal >= parseInt(snapSlider.max)) snapSlider.value = snapSlider.max;
        }

        if (document.getElementById('burndown-table-container')) document.getElementById('burndown-table-container').innerHTML = burndown.renderTable(results);
    },

    simulateProjection: (data, config, isSilent = false, retirementSpendOverride = null) => {
        const { assumptions, investments = [], realEstate = [], income = [], budget = {}, benefits = {}, helocs = [], debts = [], otherAssets = [], stockOptions = [] } = data;
        const inflationRate = (assumptions.inflation || 3) / 100, filingStatus = assumptions.filingStatus || 'Single', persona = config.strategyMode, rAge = parseFloat(assumptions.retirementAge) || 65, cashFloor = config.cashReserve;
        if (!isSilent) firstInsolvencyAge = null;
        
        const helocInterestRate = (helocs?.length > 0) ? (parseFloat(helocs[0].rate) || assumptions.helocRate || 7) / 100 : (assumptions.helocRate || 7) / 100;
        const optionsEquity = stockOptions.reduce((s, x) => s + Math.max(0, (math.fromCurrency(x.currentPrice) - math.fromCurrency(x.strikePrice)) * (parseFloat(x.shares) || 0)), 0);

        let bal = {
            'cash': investments.filter(i => i.type === 'Cash').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'taxable': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.value), 0) + optionsEquity,
            'taxableBasis': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0) + stockOptions.reduce((s, x) => s + (math.fromCurrency(x.strikePrice) * (parseFloat(x.shares) || 0)), 0),
            'roth-basis': investments.filter(i => i.type === 'Roth IRA').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0),
            'roth-earnings': investments.filter(i => i.type === 'Roth IRA').reduce((s, i) => s + Math.max(0, math.fromCurrency(i.value) - math.fromCurrency(i.costBasis)), 0),
            '401k': investments.filter(i => i.type === 'Pre-Tax (401k/IRA)').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'crypto': investments.filter(i => i.type === 'Crypto').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'cryptoBasis': investments.filter(i => i.type === 'Crypto').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0),
            'metals': investments.filter(i => i.type === 'Metals').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'metalsBasis': investments.filter(i => i.type === 'Metals').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0),
            'hsa': investments.filter(i => i.type === 'HSA').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'heloc': helocs.reduce((s, h) => s + math.fromCurrency(h.balance), 0)
        };

        const helocLimit = helocs.reduce((s, h) => s + math.fromCurrency(h.limit), 0);
        const startAge = Math.max(18, Math.min(72, Math.floor(parseFloat(assumptions.currentAge) || 40)));
        const results = [];

        // 2026 USER-SPECIFIED CEILINGS
        const ceilings = {
            'Single': 65550,
            'Married Filing Jointly': 131100,
            'Head of Household': 90350
        };

        for (let i = 0; i <= (100 - startAge); i++) {
            const age = startAge + i, year = new Date().getFullYear() + i, isRet = age >= rAge, infFac = Math.pow(1 + inflationRate, i);
            const dependCount = (benefits.dependents || []).filter(d => (parseInt(d.birthYear) + 19) >= year).length;
            const totalHhSize = 1 + (filingStatus === 'Married Filing Jointly' ? 1 : 0) + dependCount;
            const fpl100 = math.getFPL(totalHhSize, assumptions.state) * infFac;

            // Budget Calculation
            let baseBudget = (isRet && retirementSpendOverride !== null) ? retirementSpendOverride * infFac : (config.useSync ? (budget.expenses || []).reduce((s, exp) => (isRet && exp.remainsInRetirement === false) ? s : s + (exp.isFixed ? math.fromCurrency(exp.annual) : math.fromCurrency(exp.annual) * infFac), 0) : (config.manualBudget || 100000) * infFac);
            const helocInterestDue = bal['heloc'] * helocInterestRate;
            baseBudget += helocInterestDue;
            const targetBudget = baseBudget;

            // Baseline Pass
            let floorOrd = 0, floorGross = 0;
            (isRet ? income.filter(inc => inc.remainsInRetirement) : income).forEach(inc => {
                let gross = math.fromCurrency(inc.amount) * (inc.isMonthly === true || inc.isMonthly === 'true' ? 12 : 1) * Math.pow(1 + (inc.increase / 100 || 0), i);
                let netSrc = gross - (math.fromCurrency(inc.incomeExpenses) * (inc.incomeExpensesMonthly ? 12 : 1));
                const unt = parseInt(inc.nonTaxableUntil);
                if (isNaN(unt) || year >= unt) floorOrd += netSrc;
                floorGross += netSrc;
            });

            // SNAP Max calculation for first year
            if (i === 0) {
                burndown.lastCalculatedResults.maxSnapPossible = engine.calculateSnapBenefit(0, 0, bal['cash']+bal['taxable'], totalHhSize, (benefits.shelterCosts||700)*infFac, true, false, 0, 0, 0, assumptions.state, infFac, true);
            }

            const startOfYearBal = { ...bal };
            let currentOrdDraw = 0, currentLtcgDraw = 0, currentTax = 0, totalWithdrawn = 0, currentDrawsMap = {}, finalSnap = 0;

            const solvePass = (priorityList) => {
                for (const pk of priorityList) {
                    const currentNet = (floorGross + totalWithdrawn + finalSnap) - currentTax;
                    const gap = targetBudget - currentNet;
                    if (gap <= 10) break;

                    const av = (pk === 'cash' ? Math.max(0, bal[pk] - cashFloor) : (pk === 'heloc' ? Math.max(0, helocLimit - bal[pk]) : (bal[pk] || 0)));
                    if (av <= 1) continue;

                    let bR = (['taxable', 'crypto', 'metals'].includes(pk) && bal[pk] > 0) ? bal[pk+'Basis'] / bal[pk] : 1;
                    const stRate = (stateTaxRates[assumptions.state]?.rate || 0);
                    const etr = burndown.assetMeta[pk].isTaxable ? (pk === '401k' ? (0.15 + stRate) : (1 - bR) * (0.10 + stRate)) : 0;
                    
                    const neededGross = gap / (1 - etr);
                    const pull = Math.min(av, neededGross);

                    if (pk === 'heloc') bal['heloc'] += pull;
                    else {
                        if (bal[pk+'Basis'] !== undefined) bal[pk+'Basis'] -= (bal[pk+'Basis'] * (pull / bal[pk]));
                        bal[pk] -= pull;
                    }
                    currentDrawsMap[pk] = (currentDrawsMap[pk] || 0) + pull; totalWithdrawn += pull;
                    if (pk === '401k') currentOrdDraw += pull; else if (['taxable', 'crypto', 'metals'].includes(pk)) currentLtcgDraw += (pull * (1 - bR));
                    currentTax = engine.calculateTax(floorOrd + currentOrdDraw, currentLtcgDraw, filingStatus, assumptions.state, infFac);
                }
            };

            for (let iter = 0; iter < 5; iter++) {
                bal = { ...startOfYearBal }; currentOrdDraw = 0; currentLtcgDraw = 0; totalWithdrawn = 0; currentDrawsMap = {};
                
                if (persona === 'PLATINUM') {
                    let lowM = 0, highM = 300000 * infFac, ceilingMAGI = 0;
                    for (let j = 0; j < 15; j++) {
                        let mid = (lowM + highM) / 2;
                        let testAid = engine.calculateSnapBenefit(mid/12, 0, bal['cash']+bal['taxable']+100000, totalHhSize, (benefits.shelterCosts||700)*infFac, true, false, 0, 0, 0, assumptions.state, infFac, true);
                        if (testAid >= config.snapPreserve) { ceilingMAGI = mid; lowM = mid; } else { highM = mid; }
                    }
                    const magiLimit = Math.min(ceilingMAGI, ceilings[filingStatus] * infFac);
                    
                    // Harvest LTCG to Limit
                    for (const pk of ['taxable', 'crypto', 'metals']) {
                        let curMAGI = floorOrd + currentOrdDraw + currentLtcgDraw;
                        if (curMAGI >= magiLimit) break;
                        let bR = bal[pk] > 0 ? bal[pk+'Basis'] / bal[pk] : 1;
                        let pull = Math.min(bal[pk], (magiLimit - curMAGI) / (1 - bR));
                        if (pull > 1) {
                            if (bal[pk+'Basis'] !== undefined) bal[pk+'Basis'] -= (bal[pk+'Basis'] * (pull / bal[pk]));
                            bal[pk] -= pull; currentDrawsMap[pk] = (currentDrawsMap[pk] || 0) + pull; totalWithdrawn += pull; currentLtcgDraw += (pull * (1 - bR));
                        }
                    }
                    solvePass(['cash', 'roth-basis', 'hsa', 'heloc', '401k', 'roth-earnings']);
                } else {
                    solvePass(burndown.priorityOrder);
                }
                currentTax = engine.calculateTax(floorOrd + currentOrdDraw, currentLtcgDraw, filingStatus, assumptions.state, infFac);
                finalSnap = engine.calculateSnapBenefit((floorOrd + currentOrdDraw + currentLtcgDraw)/12, 0, bal['cash']+bal['taxable'] + totalWithdrawn, totalHhSize, (benefits.shelterCosts||700)*infFac, true, false, 0, 0, 0, assumptions.state, infFac, true) * 12;
            }

            const fMAGI = floorOrd + currentOrdDraw + currentLtcgDraw;
            const liquid = bal['cash'] + bal['taxable'] + bal['roth-basis'] + bal['roth-earnings'] + bal['401k'] + bal['crypto'] + bal['metals'] + bal['hsa'] + Math.max(0, helocLimit - bal['heloc']);
            const curNW = (liquid + realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * Math.pow(1 + (assumptions.realEstateGrowth/100), i)), 0)) - (bal['heloc'] + debts.reduce((s,d)=>s+math.fromCurrency(d.balance),0));

            const netCash = (floorGross + totalWithdrawn + finalSnap) - currentTax;
            const status = (liquid < 1000) ? 'INSOLVENT' : (Math.abs(netCash - targetBudget) > 1000 ? 'ERROR' : (age >= 65 ? 'Medicare' : (fMAGI/fpl100 <= 1.38 ? 'Platinum' : 'Silver')));
            if (liquid < 1000 && firstInsolvencyAge === null) firstInsolvencyAge = age;

            results.push({ age, year, budget: targetBudget, helocInterest: helocInterestDue, magi: fMAGI, netWorth: curNW, isInsolvent: liquid < 1000, balances: { ...bal }, draws: currentDrawsMap, totalDraw: totalWithdrawn, snapBenefit: finalSnap, taxes: currentTax, netCash, status });
        }
        return results;
    },

    renderTable: (results) => {
        const infRate = (window.currentData.assumptions.inflation || 3) / 100;
        const columns = ['cash', 'taxable', 'roth-basis', 'heloc', 'crypto', 'metals', '401k', 'hsa', 'roth-earnings'];
        
        const header = `<tr class="sticky top-0 bg-[#1e293b] !text-slate-500 label-std z-20 border-b border-white/5">
            <th class="p-2 w-10 text-center !bg-[#1e293b]">Age</th>
            <th class="p-2 text-center !bg-[#1e293b]">Target</th>
            <th class="p-2 text-center !bg-[#1e293b]">Status</th>
            <th class="p-2 text-center !bg-[#1e293b]">Tax Paid</th>
            <th class="p-2 text-center !bg-[#1e293b]">SNAP</th>
            ${columns.map(k => `<th class="p-2 text-center !bg-[#1e293b] uppercase tracking-tighter text-[7px]" style="color:${burndown.assetMeta[k].color}">${burndown.assetMeta[k].short}</th>`).join('')}
            <th class="p-2 text-center !bg-[#1e293b] text-teal-400">Post-Tax</th>
            <th class="p-2 text-center !bg-[#1e293b]">Net Worth</th>
        </tr>`;
        
        const rows = results.map((r, i) => {
            const inf = isRealDollars ? Math.pow(1 + infRate, i) : 1;
            const formatVal = (v) => math.toSmartCompactCurrency(v / inf);
            let badgeClass = r.status === 'INSOLVENT' || r.status === 'ERROR' ? 'bg-red-600 text-white animate-pulse' : (r.status === 'Platinum' ? 'bg-emerald-500 text-white' : (r.status === 'Silver' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'));
            
            return `<tr class="border-b border-white/5 hover:bg-white/5 text-[9px] ${r.status === 'ERROR' ? 'bg-red-900/10' : ''}">
                <td class="p-2 text-center font-bold">${r.age}</td>
                <td class="p-2 text-center">
                    <div class="text-slate-400 font-medium">${formatVal(r.budget)}</div>
                    ${r.helocInterest > 100 ? `<div class="text-[6.5px] text-red-400 font-bold tracking-tighter">+${formatVal(r.helocInterest)} HELOC INT</div>` : ''}
                </td>
                <td class="p-2 text-center"><span class="px-2 py-0.5 rounded-[4px] text-[7px] font-black uppercase tracking-wider ${badgeClass}">${r.status}</span></td>
                <td class="p-2 text-center text-red-400 font-bold">${formatVal(r.taxes)}</td>
                <td class="p-2 text-center text-emerald-500 font-bold">${formatVal(r.snapBenefit)}</td>
                ${columns.map(k => {
                    const draw = r.draws[k] || 0;
                    const bal = r.balances[k] || 0;
                    const meta = burndown.assetMeta[k];
                    return `<td class="p-1.5 text-center leading-tight">
                        <div class="font-black" style="color: ${draw > 0 ? meta.color : '#475569'}">${draw > 1 ? formatVal(draw) : '$0'}</div>
                        <div class="text-slate-600 text-[7px] font-bold">${formatVal(bal)}</div>
                    </td>`;
                }).join('')}
                <td class="p-2 text-center font-black text-teal-400 bg-teal-400/5">${formatVal(r.netCash)}</td>
                <td class="p-2 text-center font-black ${r.isInsolvent ? 'text-red-400' : 'text-teal-400'}">${formatVal(r.netWorth)}</td>
            </tr>`;
        }).join('');
        return `<table class="w-full text-left border-collapse table-auto">${header}<tbody>${rows}</tbody></table>`;
    }
};
