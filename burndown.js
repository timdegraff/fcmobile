
import { formatter } from './formatter.js';
import { math, engine, assetColors, stateTaxRates } from './utils.js';

let isRealDollars = false;
let firstInsolvencyAge = null; 

export const burndown = {
    getIsRealDollars: () => isRealDollars,
    toggleRealDollars: () => { isRealDollars = !isRealDollars; return isRealDollars; },
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
                                <button data-step="down" data-target="retirementAge" class="w-6 h-6 flex items-center justify-center hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"><i class="fas fa-minus text-[10px]"></i></button>
                                <input type="number" data-id="retirementAge" class="bg-transparent border-none text-blue-400 font-black mono-numbers text-sm w-10 text-center outline-none" value="65">
                                <button data-step="up" data-target="retirementAge" class="w-6 h-6 flex items-center justify-center hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"><i class="fas fa-plus text-[10px]"></i></button>
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
                                <input type="text" id="input-manual-budget" data-type="currency" inputmode="decimal" class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-teal-400 font-bold text-right w-24 mono-numbers outline-none focus:border-blue-500 transition-all">
                                <label class="flex items-center gap-2 cursor-pointer bg-slate-900/50 border border-white/10 px-2 py-1 rounded-lg hover:border-slate-600 transition-all">
                                    <span class="text-[9px] font-black text-slate-400 uppercase">Sync</span>
                                    <input type="checkbox" id="toggle-budget-sync" checked class="w-3 h-3 accent-blue-500 rounded bg-slate-800 border-slate-600">
                                </label>
                            </div>
                         </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div id="card-preservation" class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-infinity text-4xl text-amber-500 opacity-20"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-shield-alt"></i> Preservation Age</label>
                            <div id="card-preservation-val" class="text-3xl font-black text-amber-500 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-preservation-sub" class="text-[9px] font-bold text-amber-500/60 uppercase tracking-tighter leading-none">STAYS SOLVENT AT CURRENT BUDGET UNTIL AGE 100+</div>
                    </div>

                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-road text-4xl text-blue-400 opacity-20"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-flag-checkered"></i> Retirement Runway</label>
                            <div id="card-runway-val" class="text-3xl font-black text-red-400 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-runway-sub" class="text-[9px] font-bold text-blue-400/60 uppercase tracking-tighter leading-none">SUSTAINS TARGET BUDGET IN 2026 DOLLARS UNTIL THIS AGE</div>
                    </div>

                    <div id="card-dwz" class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-skull text-4xl text-pink-400 opacity-20"></i></div>
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
                                <label class="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block">Food Aid Target (MAX)</label>
                                <div id="est-snap-indicator" class="text-2xl font-black text-emerald-400 mono-numbers leading-none mt-0.5">$0</div>
                            </div>
                            <div class="text-right">
                                <span class="text-[7px] text-slate-500 font-black uppercase tracking-widest block">Simulation Goal</span>
                                <span id="label-snap-preserve" class="text-[10px] font-bold text-emerald-400 mono-numbers">$0/mo</span>
                            </div>
                        </div>
                        <input type="range" id="input-snap-preserve" min="0" max="2000" step="100" value="0" class="input-range w-full accent-emerald-500">
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
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Draw Priority:</span>
                    <div id="draw-priority-list" class="flex flex-wrap items-center gap-2"></div>
                </div>

                <div class="card-container bg-black/20 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                    <div id="burndown-table-container" class="max-h-[65vh] overflow-auto mono-numbers"></div>
                    <div class="p-3 bg-slate-900/60 border-t border-white/5 text-[8px] text-slate-500 font-bold uppercase tracking-widest text-center">
                        <i class="fas fa-info-circle mr-1"></i> DISCLAIMER: Decumulation model assumes asset withdrawals as annual lump-sums to optimize for government benefit eligibility.
                    </div>
                </div>
            </div>
        `;
        burndown.attachListeners();
        burndown.run(); 
    },

    attachListeners: () => {
        ['input-cash-reserve', 'input-snap-preserve', 'toggle-budget-sync', 'input-manual-budget'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.oninput = () => {
                if (id === 'input-cash-reserve') document.getElementById('label-cash-reserve').textContent = math.toCurrency(parseInt(el.value));
                if (id === 'input-snap-preserve') document.getElementById('label-snap-preserve').textContent = `${math.toCurrency(parseInt(el.value))}/mo`;
                if (id === 'toggle-budget-sync') {
                    const inp = document.getElementById('input-manual-budget');
                    inp.disabled = el.checked;
                    inp.classList.toggle('opacity-40', el.checked);
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
            realBtn.onclick = () => { isRealDollars = !isRealDollars; burndown.updateToggleStyle(realBtn); burndown.run(); };
        }
    },

    renderPriorityList: () => {
        const container = document.getElementById('draw-priority-list');
        if (!container) return;
        container.innerHTML = burndown.priorityOrder.map(k => {
            const meta = burndown.assetMeta[k];
            return `
                <div data-id="${k}" class="flex items-center gap-1.5 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg cursor-grab active:cursor-grabbing hover:border-slate-500 transition-colors">
                    <div class="w-1.5 h-1.5 rounded-full" style="background-color: ${meta.color}"></div>
                    <span class="text-[9px] font-black uppercase text-slate-300 tracking-tight">${meta.short}</span>
                </div>
            `;
        }).join('');

        if (typeof Sortable !== 'undefined') {
            new Sortable(container, {
                animation: 150,
                onEnd: () => {
                    burndown.priorityOrder = Array.from(container.children).map(el => el.dataset.id);
                    burndown.run();
                    if (window.debouncedAutoSave) window.debouncedAutoSave();
                }
            });
        }
    },

    updateToggleStyle: (btn) => {
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
            
            const syncCheck = document.getElementById('toggle-budget-sync');
            if (syncCheck) syncCheck.checked = data.useSync ?? true;
            
            const manualBud = document.getElementById('input-manual-budget');
            if (manualBud) {
                const summaries = engine.calculateSummaries(window.currentData);
                manualBud.value = math.toCurrency(data.useSync ? summaries.totalAnnualBudget : (data.manualBudget || 100000));
                manualBud.disabled = data.useSync;
            }
        }
        burndown.renderPriorityList();
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
        const data = window.currentData; if (!data) return;
        const config = burndown.scrape();
        const results = burndown.simulateProjection(data, config);
        
        if (document.getElementById('card-runway-val')) document.getElementById('card-runway-val').textContent = firstInsolvencyAge ? firstInsolvencyAge : "100+";
        if (document.getElementById('card-dwz-val')) document.getElementById('card-dwz-val').textContent = math.toSmartCompactCurrency(burndown.lastCalculatedResults.dwz || 0);
        if (document.getElementById('card-preservation-val')) document.getElementById('card-preservation-val').textContent = burndown.lastCalculatedResults.preservationAge || "100+";

        if (document.getElementById('burndown-table-container')) document.getElementById('burndown-table-container').innerHTML = burndown.renderTable(results);
    },

    simulateProjection: (data, config) => {
        const { assumptions, investments = [], income = [], budget = {}, benefits = {}, helocs = [], realEstate = [], otherAssets = [], debts = [] } = data;
        const inflationRate = (assumptions.inflation || 3) / 100, filingStatus = assumptions.filingStatus || 'Single', persona = config.strategyMode, rAge = parseFloat(assumptions.retirementAge) || 65, cashFloor = config.cashReserve;
        firstInsolvencyAge = null;
        
        const summaries = engine.calculateSummaries(data);
        const helocInterestRate = (parseFloat(helocs[0]?.rate) || 7) / 100;
        let bal = {
            'cash': investments.filter(i => i.type === 'Cash').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'taxable': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'taxableBasis': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0),
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
        const startAge = Math.floor(parseFloat(assumptions.currentAge) || 40);
        const results = [];
        const ceilings = { 'Single': 65550, 'Married Filing Jointly': 131100, 'Head of Household': 90350 };

        for (let i = 0; i <= (100 - startAge); i++) {
            const age = startAge + i, year = new Date().getFullYear() + i, isRet = age >= rAge, infFac = Math.pow(1 + inflationRate, i);
            const totalHhSize = 1 + (filingStatus === 'Married Filing Jointly' ? 1 : 0) + (benefits.dependents || []).filter(d => (d.birthYear + 19) >= year).length;
            const fpl100 = math.getFPL(totalHhSize, assumptions.state) * infFac;

            // Budget calculation using Sync vs Manual
            let baseBudget = config.useSync ? summaries.totalAnnualBudget : config.manualBudget;
            let targetBudget = baseBudget * infFac;
            targetBudget += bal['heloc'] * helocInterestRate;

            let floorGross = 0, floorTaxable = 0;
            if (!isRet) {
                // Working years: assume income covers everything
                income.forEach(inc => {
                    let gross = math.fromCurrency(inc.amount) * (inc.isMonthly ? 12 : 1) * Math.pow(1 + (inc.increase / 100 || 0), i);
                    let netSrc = gross - (math.fromCurrency(inc.incomeExpenses) * (inc.incomeExpensesMonthly ? 12 : 1));
                    if (isNaN(parseInt(inc.nonTaxableUntil)) || year >= inc.nonTaxableUntil) floorTaxable += netSrc;
                    floorGross += netSrc;
                });
            } else {
                income.filter(inc => inc.remainsInRetirement).forEach(inc => {
                    let gross = math.fromCurrency(inc.amount) * (inc.isMonthly ? 12 : 1) * Math.pow(1 + (inc.increase / 100 || 0), i);
                    let netSrc = gross - (math.fromCurrency(inc.incomeExpenses) * (inc.incomeExpensesMonthly ? 12 : 1));
                    if (isNaN(parseInt(inc.nonTaxableUntil)) || year >= inc.nonTaxableUntil) floorTaxable += netSrc;
                    floorGross += netSrc;
                });
            }

            const startOfYearBal = { ...bal };
            let drawMap = {}, preTaxDraw = 0, taxes = 0, snap = 0, status = 'Silver';

            // WORKING YEAR LOGIC: No draws.
            if (!isRet) {
                taxes = engine.calculateTax(floorTaxable, 0, filingStatus, assumptions.state, infFac);
                status = 'Active';
            } else {
                // Binary search for SNAP Ceiling in Handout Hunter
                let magiLimit = ceilings[filingStatus] * infFac;
                if (persona === 'PLATINUM') {
                    let low = 0, high = 300000 * infFac;
                    for (let j = 0; j < 12; j++) {
                        let mid = (low + high) / 2;
                        let testSnap = engine.calculateSnapBenefit(mid / 12, 0, 0, totalHhSize, (benefits.shelterCosts || 700) * infFac, true, false, 0, 0, 0, assumptions.state, infFac, true);
                        if (testSnap * 12 >= config.snapPreserve) { magiLimit = mid; low = mid; } else { high = mid; }
                    }
                    magiLimit = Math.min(magiLimit, ceilings[filingStatus] * infFac);
                }

                // Solve Loop for Retirment Years
                for (let iter = 0; iter < 5; iter++) {
                    bal = { ...startOfYearBal }; drawMap = {}; preTaxDraw = 0;
                    let curOrdDraw = 0, curLtcgDraw = 0;

                    const solveWaterfall = (pList) => {
                        for (const pk of pList) {
                            const gap = targetBudget - ((floorGross + preTaxDraw + snap) - taxes);
                            if (gap <= 10) break;
                            const av = (pk === 'cash' ? Math.max(0, bal[pk] - cashFloor) : (pk === 'heloc' ? Math.max(0, helocLimit - bal[pk]) : bal[pk]));
                            if (av <= 1) continue;

                            let bR = (['taxable', 'crypto', 'metals'].includes(pk) && bal[pk] > 0) ? bal[pk+'Basis'] / bal[pk] : 1;
                            let st = (stateTaxRates[assumptions.state]?.rate || 0);
                            
                            // Marginal gross-up iteration: re-calc ETR based on current ordinary income
                            const testTax1 = engine.calculateTax(floorTaxable + curOrdDraw, curLtcgDraw, filingStatus, assumptions.state, infFac);
                            const testTax2 = engine.calculateTax(floorTaxable + curOrdDraw + 1000, curLtcgDraw, filingStatus, assumptions.state, infFac);
                            const marginalOrd = (testTax2 - testTax1) / 1000;
                            
                            let etr = burndown.assetMeta[pk].isTaxable ? (pk === '401k' ? marginalOrd : (1 - bR) * (0.15 + st)) : 0;
                            if (etr >= 0.9) etr = 0.5; // Catch safety for weird math

                            let draw = Math.min(av, gap / (1 - etr));
                            if (pk === 'heloc') bal['heloc'] += draw;
                            else {
                                if (bal[pk+'Basis']) bal[pk+'Basis'] -= (bal[pk+'Basis'] * (draw / bal[pk]));
                                bal[pk] -= draw;
                            }
                            drawMap[pk] = (drawMap[pk] || 0) + draw; preTaxDraw += draw;
                            if (pk === '401k') curOrdDraw += draw;
                            else if (['taxable', 'crypto', 'metals'].includes(pk)) curLtcgDraw += (draw * (1 - bR));
                        }
                    };

                    if (persona === 'PLATINUM') {
                        for (const pk of ['taxable', 'crypto', 'metals']) {
                            let curMAGI = floorTaxable + curOrdDraw + curLtcgDraw;
                            if (curMAGI >= magiLimit) break;
                            let bR = bal[pk] > 0 ? bal[pk+'Basis'] / bal[pk] : 1;
                            let pull = Math.min(bal[pk], (magiLimit - curMAGI) / (1 - bR));
                            if (pull > 1) {
                                bal[pk] -= pull; bal[pk+'Basis'] -= (bal[pk+'Basis'] * (pull / (bal[pk]+pull)));
                                drawMap[pk] = (drawMap[pk] || 0) + pull; preTaxDraw += pull; curLtcgDraw += (pull * (1 - bR));
                            }
                        }
                        solveWaterfall(['cash', 'roth-basis', 'hsa', 'heloc', '401k', 'roth-earnings']);
                    } else {
                        solveWaterfall(burndown.priorityOrder);
                    }
                    taxes = engine.calculateTax(floorTaxable + curOrdDraw, curLtcgDraw, filingStatus, assumptions.state, infFac);
                    snap = engine.calculateSnapBenefit(floorTaxable / 12, 0, 0, totalHhSize, (benefits.shelterCosts || 700) * infFac, true, false, 0, 0, 0, assumptions.state, infFac, true) * 12;
                }
                const fMAGI = floorTaxable + (drawMap['401k'] || 0) + ((drawMap['taxable']||0)*(1-(startOfYearBal.taxableBasis/startOfYearBal.taxable||1)));
                status = (age >= 65 ? 'Medicare' : (fMAGI/fpl100 <= 1.38 ? 'Platinum' : 'Silver'));
            }

            const postTaxInc = (floorGross + preTaxDraw + snap) - taxes;
            
            // Net Worth unification math: (Liquid - helocLimit) + appreciate illiquid - amortize debts
            const reGrowth = Math.pow(1 + (assumptions.realEstateGrowth / 100), i);
            const oaGrowth = Math.pow(1 + 0.02, i); // Assumed 2% for vehicles/misc
            const curRE = realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * reGrowth), 0);
            const curREDebt = realEstate.reduce((s, r) => s + Math.max(0, math.fromCurrency(r.mortgage) - (math.fromCurrency(r.principalPayment)*12*i)), 0);
            const curOA = otherAssets.reduce((s, o) => s + (math.fromCurrency(o.value) * oaGrowth), 0);
            const curOADebt = otherAssets.reduce((s, o) => s + Math.max(0, math.fromCurrency(o.loan) - (math.fromCurrency(o.principalPayment)*12*i)), 0);
            const curOtherDebt = debts.reduce((s, d) => s + Math.max(0, math.fromCurrency(d.balance) - (math.fromCurrency(d.principalPayment)*12*i)), 0);
            
            const liquid = bal.cash + bal.taxable + bal.crypto + bal.metals + bal['401k'] + bal['roth-basis'] + bal['roth-earnings'] + bal.hsa;
            const curNW = (liquid + curRE + curOA) - (bal['heloc'] + curREDebt + curOADebt + curOtherDebt);

            if (liquid < 1000 && firstInsolvencyAge === null) firstInsolvencyAge = age;
            if (liquid < 1000) status = 'INSOLVENT';
            else if (isRet && Math.abs(postTaxInc - targetBudget) > 1000) status = 'ERROR';

            results.push({ age, year, budget: targetBudget, isFirstRetYear: age === rAge, preTaxDraw, taxes, snap, balances: { ...bal }, draws: drawMap, postTaxInc, status, netWorth: curNW });
        }
        return results;
    },

    renderTable: (results) => {
        const infRate = (window.currentData.assumptions.inflation || 3) / 100;
        const columns = ['cash', 'taxable', 'roth-basis', 'heloc', 'crypto', 'metals', '401k', 'hsa', 'roth-earnings'];
        
        const header = `<tr class="sticky top-0 bg-[#1e293b] !text-slate-500 label-std z-20 border-b border-white/5">
            <th class="p-2 w-10 text-center !bg-[#1e293b]">Age</th>
            <th class="p-2 text-center !bg-[#1e293b]">Budget</th>
            <th class="p-2 text-center !bg-[#1e293b]">Status</th>
            <th class="p-2 text-center !bg-[#1e293b]">Pre-Tax Draw</th>
            <th class="p-2 text-center !bg-[#1e293b]">Tax Paid</th>
            <th class="p-2 text-center !bg-[#1e293b]">SNAP</th>
            ${columns.map(k => `<th class="p-2 text-center !bg-[#1e293b] text-[7px]" style="color:${burndown.assetMeta[k].color}">${burndown.assetMeta[k].short}</th>`).join('')}
            <th class="p-2 text-center !bg-[#1e293b] text-teal-400">Post-Tax Inc</th>
            <th class="p-2 text-center !bg-[#1e293b]">Net Worth</th>
        </tr>`;
        
        const rows = results.map((r, i) => {
            const inf = isRealDollars ? Math.pow(1 + infRate, i) : 1;
            const formatVal = (v) => math.toSmartCompactCurrency(v / inf);
            let badgeClass = r.status === 'INSOLVENT' || r.status === 'ERROR' ? 'bg-red-600 text-white' : (r.status === 'Platinum' ? 'bg-emerald-500 text-white' : (r.status === 'Active' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'));
            
            return `<tr class="border-b border-white/5 hover:bg-white/5 text-[9px] ${r.status === 'ERROR' ? 'bg-red-900/10' : ''}">
                <td class="p-2 text-center font-bold">${r.age}</td>
                <td class="p-2 text-center">
                    <div class="${r.isFirstRetYear ? 'text-white' : 'text-slate-400'}">${formatVal(r.budget)}</div>
                    ${r.isFirstRetYear ? '<div class="text-[7px] font-black text-amber-500 uppercase leading-none mt-0.5">Ret Year</div>' : ''}
                </td>
                <td class="p-2 text-center"><span class="px-2 py-0.5 rounded-[4px] text-[7px] font-black uppercase tracking-wider ${badgeClass}">${r.status}</span></td>
                <td class="p-2 text-center text-white font-bold">${formatVal(r.preTaxDraw)}</td>
                <td class="p-2 text-center text-red-400 font-bold">${formatVal(r.taxes)}</td>
                <td class="p-2 text-center text-emerald-500 font-bold">${formatVal(r.snap)}</td>
                ${columns.map(k => `<td class="p-1.5 text-center leading-tight">
                    <div class="font-black" style="color: ${r.draws[k] > 0 ? burndown.assetMeta[k].color : '#475569'}">${r.draws[k] > 1 ? formatVal(r.draws[k]) : '$0'}</div>
                    <div class="text-slate-600 text-[7px] font-bold">${formatVal(r.balances[k] || 0)}</div>
                </td>`).join('')}
                <td class="p-2 text-center font-black text-teal-400 bg-teal-400/5">${formatVal(r.postTaxInc)}</td>
                <td class="p-2 text-center font-black text-white">${formatVal(r.netWorth)}</td>
            </tr>`;
        }).join('');
        return `<table class="w-full text-left border-collapse table-auto">${header}<tbody>${rows}</tbody></table>`;
    }
};
