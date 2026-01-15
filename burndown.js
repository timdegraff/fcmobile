
import { formatter } from './formatter.js';
import { math, engine, assetColors, stateTaxRates } from './utils.js';

let isRealDollars = false;
let firstInsolvencyAge = null; 
let fullSimulationResults = [];

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
                            <h2 class="text-xl font-bold text-white tracking-tight leading-none uppercase tracking-tighter">Burndown Engine</h2>
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
                    <div id="card-preservation" class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden cursor-pointer hover:border-amber-500/30 transition-colors" title="Optimize for Legacy Preservation">
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

                    <div id="card-dwz" class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden cursor-pointer hover:border-pink-500/30 transition-colors" title="Solve for Max Sustainable Spend">
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
                    if (el.checked) {
                         const summaries = engine.calculateSummaries(window.currentData);
                         inp.value = math.toCurrency(summaries.totalAnnualBudget);
                    }
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

        const traceYearInput = document.getElementById('input-trace-year');
        const traceAgeInput = document.getElementById('input-trace-age');
        if (traceYearInput && traceAgeInput) {
            const clampInputs = () => {
                if (!fullSimulationResults.length) return;
                const first = fullSimulationResults[0], last = fullSimulationResults[fullSimulationResults.length - 1];
                let year = parseInt(traceYearInput.value);
                let age = parseInt(traceAgeInput.value);
                
                if (year < first.year) year = first.year;
                if (year > last.year) year = last.year;
                if (age < first.age) age = first.age;
                if (age > last.age) age = last.age;
                
                traceYearInput.value = year;
                traceAgeInput.value = age;
            };

            traceYearInput.oninput = () => {
                clampInputs();
                const match = fullSimulationResults.find(r => r.year === parseInt(traceYearInput.value));
                if (match) traceAgeInput.value = match.age;
                burndown.renderTrace();
            };
            traceAgeInput.oninput = () => {
                clampInputs();
                const match = fullSimulationResults.find(r => r.age === parseInt(traceAgeInput.value));
                if (match) traceYearInput.value = match.year;
                burndown.renderTrace();
            };
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
            const mode = data.strategyMode || 'RAW';
            const personaSelector = document.getElementById('persona-selector');
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
        strategyMode: document.getElementById('persona-selector')?.dataset.value || 'RAW',
        cashReserve: parseInt(document.getElementById('input-cash-reserve')?.value || 25000),
        snapPreserve: parseInt(document.getElementById('input-snap-preserve')?.value || 0), 
        useSync: document.getElementById('toggle-budget-sync')?.checked ?? true,
        manualBudget: math.fromCurrency(document.getElementById('input-manual-budget')?.value || "$100,000"),
        isRealDollars
    }),

    run: () => {
        const data = window.currentData; if (!data) return;
        
        const retAgeInput = document.querySelector('#tab-burndown input[data-id="retirementAge"]');
        if (retAgeInput && data.assumptions?.retirementAge) {
            retAgeInput.value = data.assumptions.retirementAge;
        }

        const config = burndown.scrape();
        
        // Update Food Aid Target (MAX) assuming MAGI is $0
        const ben = data.benefits || {};
        const filingStatus = data.assumptions?.filingStatus || 'Single';
        const adults = filingStatus === 'Married Filing Jointly' ? 2 : 1;
        const currentYear = new Date().getFullYear();
        const effectiveKidsCount = (ben.dependents || []).filter(d => (d.birthYear + 19) >= currentYear).length;
        const totalSize = adults + effectiveKidsCount;
        
        const maxSnapPossible = engine.calculateSnapBenefit(0, 0, 0, totalSize, ben.shelterCosts || 700, ben.hasSUA ?? true, ben.isDisabled ?? false, ben.childSupportPaid || 0, ben.depCare || 0, ben.medicalExps || 0, data.assumptions?.state || 'Michigan', 1, true);
        
        const snapIndicator = document.getElementById('est-snap-indicator');
        if (snapIndicator) {
            snapIndicator.textContent = math.toCurrency(maxSnapPossible);
        }

        fullSimulationResults = burndown.simulateProjection(data, config);
        
        // Sync trace inputs if they don't match the new simulation start
        const ty = document.getElementById('input-trace-year');
        const ta = document.getElementById('input-trace-age');
        if (ty && ta && fullSimulationResults.length > 0) {
            const first = fullSimulationResults[0];
            const currentYearVal = parseInt(ty.value);
            const last = fullSimulationResults[fullSimulationResults.length - 1];
            if (currentYearVal < first.year || currentYearVal > last.year) {
                ty.value = first.year;
                ta.value = first.age;
            }
        }

        if (document.getElementById('card-runway-val')) document.getElementById('card-runway-val').textContent = firstInsolvencyAge ? firstInsolvencyAge : "100+";
        if (document.getElementById('card-dwz-val')) document.getElementById('card-dwz-val').textContent = math.toSmartCompactCurrency(burndown.lastCalculatedResults.dwz || 0);
        if (document.getElementById('card-preservation-val')) document.getElementById('card-preservation-val').textContent = burndown.lastCalculatedResults.preservationAge || "100+";

        if (document.getElementById('burndown-table-container')) document.getElementById('burndown-table-container').innerHTML = burndown.renderTable(fullSimulationResults);
        
        burndown.renderTrace();
    },

    renderTrace: () => {
        const container = document.getElementById('logic-trace-container');
        const traceInput = document.getElementById('input-trace-year');
        if (!container || !traceInput) return;

        const targetYear = parseInt(traceInput.value);
        const cycle = fullSimulationResults.find(r => r.year === targetYear);

        if (!cycle) {
            container.innerHTML = `<div class="flex items-center justify-center h-full text-slate-600 italic">No simulation data found for Year ${targetYear}.</div>`;
            return;
        }

        const fmt = (v) => math.toCurrency(v);
        const fmtNW = (v) => math.toSmartCompactCurrency(v);
        const l = cycle.traceLog || [];
        const breakdown = cycle.incomeBreakdown || [];
        const inventory = (cycle.nwBreakdown || []).filter(item => Math.abs(item.value) > 1).sort((a, b) => b.value - a.value);
        const nwDelta = cycle.netWorth - cycle.startNW;

        container.innerHTML = `
            <div class="space-y-4">
                <div class="border-b border-white/5 pb-2 mb-4 flex justify-between items-center">
                    <span class="text-white font-black tracking-widest uppercase">--- AGE ${cycle.age} (${cycle.year}) ---</span>
                    <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-blue-500/20 text-blue-400">${cycle.status}</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <p class="text-teal-400 font-bold tracking-tight">Financial Inflows</p>
                            <span class="text-[8px] font-black text-slate-500 uppercase">Gross Total: ${fmt(cycle.floorGross)}</span>
                        </div>
                        <ul class="space-y-1 pl-4 border-l border-teal-500/20">
                            ${breakdown.map(item => `
                                <li class="flex justify-between items-center text-[11px]">
                                    <span class="text-slate-500 uppercase tracking-tighter">${item.name}:</span>
                                    <span class="text-white font-bold">${fmt(item.amount)}</span>
                                </li>
                            `).join('')}
                            <li class="pt-1 mt-1 border-t border-white/5 flex justify-between items-center text-[11px]">
                                <span class="text-slate-500 uppercase tracking-tighter">Withdrawals:</span>
                                <span class="text-white font-bold">${fmt(cycle.preTaxDraw)}</span>
                            </li>
                            <li class="flex justify-between items-center text-[11px]">
                                <span class="text-emerald-500 uppercase tracking-tighter">SNAP Aid:</span>
                                <span class="text-emerald-400 font-bold">${fmt(cycle.snap)}</span>
                            </li>
                        </ul>
                    </div>
                    <div class="space-y-2">
                        <p class="text-red-400 font-bold tracking-tight">Total Costs</p>
                        <ul class="space-y-1 pl-4 border-l border-red-500/20">
                            <li class="flex justify-between items-center text-[11px]">
                                <span class="text-slate-500 uppercase tracking-tighter">Target Budget:</span>
                                <span class="text-white font-bold">${fmt(cycle.budget)}</span>
                            </li>
                            <li class="flex justify-between items-center text-[11px]">
                                <span class="text-slate-500 uppercase tracking-tighter">Taxes (Est):</span>
                                <span class="text-white font-bold">-${fmt(cycle.taxes)}</span>
                            </li>
                            <li class="flex justify-between items-center text-[11px]">
                                <span class="text-slate-500 uppercase tracking-tighter">HELOC Interest:</span>
                                <span class="text-white font-bold">-${fmt(cycle.helocInt)}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2 mt-4">
                    <p class="text-blue-400 font-black uppercase tracking-widest text-[9px] mb-2">Step-by-Step Solver Logic</p>
                    ${l.map(entry => `
                        <div class="flex items-start gap-3">
                            <span class="text-slate-600 font-bold">»</span>
                            <p class="text-[11px] leading-relaxed text-slate-300">${entry}</p>
                        </div>
                    `).join('')}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/5">
                    <div>
                        <span class="text-slate-500 uppercase tracking-widest text-[9px] block mb-1">Cycle Net Result:</span>
                        <span class="font-black text-white text-sm">${fmt(cycle.postTaxInc)} / ${fmt(cycle.budget)} Target</span>
                    </div>
                    <div class="text-center md:border-x border-white/5">
                        <span class="text-slate-500 uppercase tracking-widest text-[9px] block mb-1">Year NW Delta:</span>
                        <span class="font-black ${nwDelta >= 0 ? 'text-emerald-400' : 'text-red-400'} text-sm">${nwDelta >= 0 ? '+' : ''}${fmtNW(nwDelta)}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-slate-500 uppercase tracking-widest text-[9px] block mb-1">NW: Start » End</span>
                        <span class="font-black text-teal-400 text-sm">${fmtNW(cycle.startNW)} » ${fmtNW(cycle.netWorth)}</span>
                    </div>
                </div>

                <div class="mt-6 pt-6 border-t border-white/5">
                    <div class="flex items-center justify-between mb-4">
                        <p class="text-[10px] font-black text-white uppercase tracking-[0.2em]">End of Year Asset Inventory</p>
                        <span class="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Sorted by Value (Desc)</span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        ${inventory.map(item => `
                            <div class="bg-white/5 border border-white/5 p-2 rounded-lg flex flex-col justify-between">
                                <div class="flex items-center gap-1.5 mb-1 truncate">
                                    <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${item.color || '#fff'}"></div>
                                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate">${item.name}</span>
                                </div>
                                <div class="text-[11px] font-black ${item.value >= 0 ? 'text-white' : 'text-red-400'} mono-numbers">
                                    ${fmt(item.value)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    simulateProjection: (data, config) => {
        const { assumptions, investments = [], income = [], budget = {}, benefits = {}, helocs = [], realEstate = [], otherAssets = [], debts = [], stockOptions = [] } = data;
        const inflationRate = (assumptions.inflation || 3) / 100, filingStatus = assumptions.filingStatus || 'Single', persona = config.strategyMode, rAge = parseFloat(assumptions.retirementAge) || 65, cashFloor = config.cashReserve;
        const ssStartAge = parseFloat(assumptions.ssStartAge) || 67, ssMonthly = parseFloat(assumptions.ssMonthly) || 0, workYears = parseFloat(assumptions.workYearsAtRetirement) || 35;
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
            '529': investments.filter(i => i.type === '529').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'heloc': helocs.reduce((s, h) => s + math.fromCurrency(h.balance), 0)
        };

        const helocLimit = helocs.reduce((s, h) => s + math.fromCurrency(h.limit), 0);
        const startAge = Math.floor(parseFloat(assumptions.currentAge) || 40);
        const results = [];

        for (let i = 0; i <= (100 - startAge); i++) {
            const age = startAge + i, year = new Date().getFullYear() + i, isRet = age >= rAge, infFac = Math.pow(1 + inflationRate, i);
            const totalHhSize = 1 + (filingStatus === 'Married Filing Jointly' ? 1 : 0) + (benefits.dependents || []).filter(d => (d.birthYear + 19) >= year).length;
            const fpl100 = math.getFPL(totalHhSize, assumptions.state) * infFac;

            let baseBudget = config.useSync ? summaries.totalAnnualBudget : config.manualBudget;
            let targetBudget = baseBudget * infFac;
            const helocInterestThisYear = bal['heloc'] * helocInterestRate;
            targetBudget += helocInterestThisYear;

            let floorGross = 0, floorTaxable = 0, incomeBreakdown = [];
            let floorGrossTrace = 0, floorDeductionTrace = 0;

            const processIncome = (inc) => {
                const isMon = inc.isMonthly === true || inc.isMonthly === 'true';
                let gross = math.fromCurrency(inc.amount) * (isMon ? 12 : 1) * Math.pow(1 + (inc.increase / 100 || 0), i);
                const isExpMon = inc.incomeExpensesMonthly === true || inc.incomeExpensesMonthly === 'true';
                let ded = (math.fromCurrency(inc.incomeExpenses) * (isExpMon ? 12 : 1));
                let netSrc = gross - ded;
                if (isNaN(parseInt(inc.nonTaxableUntil)) || year >= inc.nonTaxableUntil) floorTaxable += netSrc;
                floorGross += netSrc;
                floorGrossTrace += gross;
                floorDeductionTrace += ded;
                incomeBreakdown.push({ name: inc.name || 'Income Source', amount: netSrc });
            };

            if (!isRet) {
                income.forEach(processIncome);
            } else {
                income.filter(inc => inc.remainsInRetirement).forEach(processIncome);
                if (age >= ssStartAge) {
                    const ssFull = engine.calculateSocialSecurity(ssMonthly, workYears, infFac);
                    const taxableSS = engine.calculateTaxableSocialSecurity(ssFull, floorTaxable, filingStatus, assumptions.state, infFac);
                    floorGross += ssFull;
                    floorTaxable += taxableSS;
                    floorGrossTrace += ssFull;
                    incomeBreakdown.push({ name: 'Social Security', amount: ssFull });
                }
            }

            const startOfYearBal = { ...bal };
            const reGrowth = Math.pow(1 + (assumptions.realEstateGrowth / 100), i);
            const oaGrowth = Math.pow(1 + 0.02, i);
            const optGrowth = Math.pow(1 + (assumptions.stockGrowth / 100), i);
            const calcNWAtStart = () => {
                const sRE = realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * reGrowth), 0);
                const sREDebt = realEstate.reduce((s, r) => s + Math.max(0, math.fromCurrency(r.mortgage) - (math.fromCurrency(r.principalPayment)*12*i)), 0);
                const sOA = otherAssets.reduce((s, o) => s + (math.fromCurrency(o.value) * oaGrowth), 0);
                const sOADebt = otherAssets.reduce((s, o) => s + Math.max(0, math.fromCurrency(o.loan) - (math.fromCurrency(o.principalPayment)*12*i)), 0);
                const sOtherDebt = debts.reduce((s, d) => s + Math.max(0, math.fromCurrency(d.balance) - (math.fromCurrency(d.principalPayment)*12*i)), 0);
                const sOptNW = stockOptions.reduce((s, x) => {
                    const strike = math.fromCurrency(x.strikePrice);
                    const fmv = math.fromCurrency(x.currentPrice) * optGrowth;
                    return s + (Math.max(0, (fmv - strike) * parseFloat(x.shares)));
                }, 0);
                const sLiquid = startOfYearBal.cash + startOfYearBal.taxable + startOfYearBal.crypto + startOfYearBal.metals + startOfYearBal['401k'] + startOfYearBal['roth-basis'] + startOfYearBal['roth-earnings'] + startOfYearBal.hsa + startOfYearBal['529'];
                return (sLiquid + sRE + sOA + sOptNW) - (startOfYearBal['heloc'] + sREDebt + sOADebt + sOtherDebt);
            };
            const startNW = calcNWAtStart();

            let drawMap = {}, preTaxDraw = 0, taxes = 0, snap = 0, status = 'Silver';
            let traceLog = [], observedFriction = 0.25;
            let smartAdjustments = {}; // PERSISTENT ERROR CORRECTION MEMORY

            if (!isRet) {
                taxes = engine.calculateTax(floorTaxable, 0, filingStatus, assumptions.state, infFac);
                status = 'Active';
                traceLog.push(`Household generating ${math.toCurrency(floorGrossTrace)} Gross - ${math.toCurrency(floorDeductionTrace)} Deductions = ${math.toCurrency(floorGross)} Net Base Income.`);
                traceLog.push(`No asset withdrawals required while working. Tax estimated at ${math.toCurrency(taxes)}.`);
            } else {
                traceLog.push(`Household base income sources: ${incomeBreakdown.map(ib => `${ib.name} (${math.toCurrency(ib.amount)})`).join(', ')}.`);
                
                let magiLimit = fpl100 * 4.0; 
                if (persona === 'PLATINUM') {
                    traceLog.push(`PLATINUM strategy enabled: Solving for Handout Hunter MAGI ceiling.`);
                    let low = 0, high = 300000 * infFac;
                    for (let j = 0; j < 12; j++) {
                        let mid = (low + high) / 2;
                        let testSnap = engine.calculateSnapBenefit(mid / 12, 0, 0, totalHhSize, (benefits.shelterCosts || 700) * infFac, true, false, 0, 0, 0, assumptions.state, infFac, true);
                        if (testSnap * 12 >= config.snapPreserve) { magiLimit = mid; low = mid; } else { high = mid; }
                    }
                    magiLimit = Math.min(magiLimit, fpl100 * 4.0);
                    traceLog.push(`Determined MAGI Ceiling of ${math.toCurrency(magiLimit)} to protect benefits.`);
                }

                // 15-PASS SMART CORRECTION SOLVER
                for (let iter = 0; iter < 15; iter++) {
                    bal = { ...startOfYearBal }; drawMap = {}; preTaxDraw = 0;
                    let curOrdDraw = 0, curLtcgDraw = 0;

                    const solveWaterfall = (pList, loggable = false) => {
                        for (const pk of pList) {
                            const currentNet = (floorGross + preTaxDraw + snap) - taxes;
                            const gap = targetBudget - currentNet;
                            if (gap <= 10) break;
                            const av = (pk === 'cash' ? Math.max(0, bal[pk] - cashFloor) : (pk === 'heloc' ? Math.max(0, helocLimit - bal[pk]) : bal[pk]));
                            if (av <= 1) continue;

                            let bR = (['taxable', 'crypto', 'metals'].includes(pk) && bal[pk] > 0) ? bal[pk+'Basis'] / bal[pk] : 1;
                            let st = (stateTaxRates[assumptions.state]?.rate || 0);
                            
                            // CALCULATE RAW NEED
                            let currentDrag = observedFriction;
                            // Clamp expected friction
                            currentDrag = Math.min(0.85, Math.max(0, currentDrag));
                            
                            let etr = burndown.assetMeta[pk].isTaxable ? (pk === '401k' ? currentDrag : (1 - bR) * (0.15 + st + currentDrag)) : 0;
                            
                            // Base calculation from friction
                            let rawDrawNeeded = gap / (1 - Math.max(0, etr));
                            
                            // APPLY SMART CORRECTION
                            // If previous loops overshot, adjustments[pk] will be positive, reducing the draw.
                            if (smartAdjustments[pk]) {
                                rawDrawNeeded -= smartAdjustments[pk];
                            }
                            
                            // Strict Priority Rule: In Iron Fist, try to take full needed amount from this account
                            let adjustmentWeight = (persona === 'RAW') ? 1.0 : (iter >= 10 ? 1.0 : 0.8);
                            let draw = Math.min(av, Math.max(0, rawDrawNeeded * adjustmentWeight));
                            
                            if (iter === 14 && loggable) {
                                let msg = `Drawing ${math.toCurrency(draw)} from ${burndown.assetMeta[pk].label}.`;
                                if (smartAdjustments[pk]) msg += ` (Smart Correction Applied: ${math.toCurrency(-smartAdjustments[pk])})`;
                                traceLog.push(msg);
                            }
                            
                            if (pk === 'heloc') bal['heloc'] += draw;
                            else {
                                if (bal[pk+'Basis']) bal[pk+'Basis'] -= (bal[pk+'Basis'] * (draw / bal[pk]));
                                bal[pk] -= draw;
                            }
                            drawMap[pk] = (drawMap[pk] || 0) + draw; preTaxDraw += draw;
                            if (pk === '401k') curOrdDraw += draw;
                            else if (['taxable', 'crypto', 'metals'].includes(pk)) curLtcgDraw += (draw * (1 - bR));
                            
                            // If this account didn't fully empty, we ostensibly satisfied the gap. 
                            // In strict priority, we stop the waterfall here to avoid priority smearing.
                            if (draw < av) break;
                        }
                    };

                    if (persona === 'PLATINUM') {
                        // Platinum Logic (unchanged)
                        for (const pk of ['taxable', 'crypto', 'metals']) {
                            const currentNetPre = (floorGross + preTaxDraw + snap) - taxes;
                            const budgetGap = targetBudget - currentNetPre;
                            if (budgetGap <= 10) break;
                            let curMAGI = floorTaxable + curOrdDraw + curLtcgDraw;
                            if (curMAGI >= magiLimit) break;
                            let bR = bal[pk] > 0 ? bal[pk+'Basis'] / bal[pk] : 1;
                            let pullAllowedByMAGI = (magiLimit - curMAGI) / (1 - bR);
                            let pullNeededForGap = budgetGap / 0.98;
                            let pull = Math.min(bal[pk], pullAllowedByMAGI, pullNeededForGap);
                            if (pull > 1) {
                                bal[pk] -= pull; 
                                if (bal[pk+'Basis']) bal[pk+'Basis'] -= (bal[pk+'Basis'] * (pull / (bal[pk]+pull)));
                                drawMap[pk] = (drawMap[pk] || 0) + pull; preTaxDraw += pull; curLtcgDraw += (pull * (1 - bR));
                            }
                        }
                        const stdRemaining = burndown.priorityOrder.filter(k => !['taxable', 'crypto', 'metals'].includes(k));
                        solveWaterfall(stdRemaining, iter === 14);
                    } else {
                        solveWaterfall(burndown.priorityOrder, iter === 14);
                    }
                    
                    taxes = engine.calculateTax(floorTaxable + curOrdDraw, curLtcgDraw, filingStatus, assumptions.state, infFac);
                    snap = engine.calculateSnapBenefit((floorTaxable + curOrdDraw) / 12, 0, 0, totalHhSize, (benefits.shelterCosts || 700) * infFac, true, false, 0, 0, 0, assumptions.state, infFac, true) * 12;

                    const iterPostTax = (floorGross + preTaxDraw + snap) - taxes;
                    const surplus = iterPostTax - targetBudget;
                    const iterError = Math.abs(surplus) / targetBudget;
                    
                    // SMART CALIBRATION LOGIC
                    // Calculate observed friction for the next loop's base estimate
                    if (preTaxDraw > 100) {
                        const netBenefitProduced = (iterPostTax - (floorGross - engine.calculateTax(floorTaxable, 0, filingStatus, assumptions.state, infFac)));
                        observedFriction = Math.min(0.9, Math.max(0, 1 - (netBenefitProduced / preTaxDraw)));
                    }

                    // IDENTIFY MARGINAL ASSET & APPLY CORRECTION
                    const drawnKeys = Object.keys(drawMap).filter(k => drawMap[k] > 0);
                    const marginalKey = drawnKeys[drawnKeys.length - 1]; 
                    
                    if (marginalKey && iterError > 0.005) {
                        // Inverse of (1 - friction) is the Gross-to-Net Multiplier.
                        // We use the observed global friction as a proxy for the marginal dollar's friction.
                        const correctionScale = 1 / (1 - observedFriction);
                        
                        // If surplus > 0, we drew too much. Correction should be POSITIVE to subtract from draw.
                        // If surplus < 0, we drew too little. Correction should be NEGATIVE to add to draw (subtracting a negative).
                        const grossCorrection = surplus * correctionScale;
                        
                        // Dampening factor to prevent oscillation around cliffs (Smart Ratio)
                        const smartRatio = 0.8; 
                        
                        smartAdjustments[marginalKey] = (smartAdjustments[marginalKey] || 0) + (grossCorrection * smartRatio);
                    }

                    if (iter >= 4 && iterError <= 0.01) break; 
                }
                const fMAGI = floorTaxable + (drawMap['401k'] || 0) + ((drawMap['taxable']||0)*(1-(startOfYearBal.taxableBasis/startOfYearBal.taxable||1)));
                status = (age >= 65 ? 'Medicare' : (fMAGI/fpl100 <= 1.38 ? 'Platinum' : 'Silver'));
                traceLog.push(`Final Cycle MAGI: ${math.toCurrency(fMAGI)} (${Math.round(fMAGI/fpl100*100)}% FPL). Resulting status: ${status}.`);
            }

            const postTaxInc = (floorGross + preTaxDraw + snap) - taxes;
            if (isRet && status !== 'ERROR') {
                if ((postTaxInc - targetBudget) > (targetBudget * 0.05) && preTaxDraw > 100) {
                    status = 'ERROR';
                }
            }
            
            const stockGrowth = math.getGrowthForAge('Stock', age, assumptions.currentAge, assumptions);
            bal['529'] *= (1 + stockGrowth);
            
            // Calculate detailed NW Breakdown for trace
            const curREEquity = realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * reGrowth) - Math.max(0, math.fromCurrency(r.mortgage) - (math.fromCurrency(r.principalPayment)*12*i)), 0);
            const curOAEquity = otherAssets.reduce((s, o) => s + (math.fromCurrency(o.value) * oaGrowth) - Math.max(0, math.fromCurrency(o.loan) - (math.fromCurrency(o.principalPayment)*12*i)), 0);
            const curPEVal = stockOptions.reduce((s, x) => s + (Math.max(0, (math.fromCurrency(x.currentPrice) * optGrowth - math.fromCurrency(x.strikePrice)) * parseFloat(x.shares))), 0);
            const curDebtBal = debts.reduce((s, d) => s + Math.max(0, math.fromCurrency(d.balance) - (math.fromCurrency(d.principalPayment)*12*i)), 0);

            const liquid = bal.cash + bal.taxable + bal.crypto + bal.metals + bal['401k'] + bal['roth-basis'] + bal['roth-earnings'] + bal.hsa + bal['529'];
            const curNW = (liquid + realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * reGrowth), 0) + otherAssets.reduce((s, o) => s + (math.fromCurrency(o.value) * oaGrowth), 0) + stockOptions.reduce((s, x) => s + (Math.max(0, (math.fromCurrency(x.currentPrice) * optGrowth - math.fromCurrency(x.strikePrice)) * parseFloat(x.shares))), 0)) - (bal['heloc'] + realEstate.reduce((s, r) => s + Math.max(0, math.fromCurrency(r.mortgage) - (math.fromCurrency(r.principalPayment)*12*i)), 0) + otherAssets.reduce((s, o) => s + Math.max(0, math.fromCurrency(o.loan) - (math.fromCurrency(o.principalPayment)*12*i)), 0) + debts.reduce((s, d) => s + math.fromCurrency(d.balance) - (math.fromCurrency(d.principalPayment)*12*i)), 0);

            const nwBreakdown = [
                { name: 'Cash', value: bal['cash'], color: assetColors['Cash'] },
                { name: 'Brokerage', value: bal['taxable'], color: assetColors['Taxable'] },
                { name: 'Roth IRA', value: bal['roth-basis'] + bal['roth-earnings'], color: assetColors['Roth IRA'] },
                { name: '401k/IRA', value: bal['401k'], color: assetColors['Pre-Tax (401k/IRA)'] },
                { name: 'Bitcoin', value: bal['crypto'], color: assetColors['Crypto'] },
                { name: 'Metals', value: bal['metals'], color: assetColors['Metals'] },
                { name: 'HSA', value: bal['hsa'], color: assetColors['HSA'] },
                { name: '529 Plan', value: bal['529'], color: assetColors['529'] },
                { name: 'Real Estate Equity', value: curREEquity, color: assetColors['Real Estate'] },
                { name: 'Other Assets Equity', value: curOAEquity, color: assetColors['Other'] },
                { name: 'Stock Options', value: curPEVal, color: assetColors['Stock Options'] },
                { name: 'HELOC Debt', value: -bal['heloc'], color: assetColors['HELOC'] },
                { name: 'Other Debt', value: -curDebtBal, color: assetColors['Debt'] }
            ];

            // INSOLVENCY DEFINITION: Depletion of all prioritized drawable assets (available balance < $500)
            const liquidAvailable = burndown.priorityOrder.reduce((sum, pk) => {
                const av = (pk === 'cash' ? Math.max(0, bal[pk] - cashFloor) : (pk === 'heloc' ? Math.max(0, helocLimit - bal[pk]) : bal[pk]));
                return sum + av;
            }, 0);

            if (liquidAvailable < 500) {
                status = 'INSOLVENT';
                if (firstInsolvencyAge === null) firstInsolvencyAge = age;
            }

            results.push({ 
                age, year, budget: targetBudget, helocInt: helocInterestThisYear, isFirstRetYear: age === rAge, 
                preTaxDraw, taxes, snap, balances: { ...bal }, draws: drawMap, postTaxInc, status, 
                netWorth: curNW, startNW, floorGross, incomeBreakdown, traceLog, nwBreakdown
            });
        }
        return results;
    },

    renderTable: (results) => {
        const infRate = (window.currentData.assumptions.inflation || 3) / 100;
        const strategyMode = document.getElementById('persona-selector')?.dataset.value || 'RAW';
        let columns = [...burndown.priorityOrder];
        if (strategyMode === 'PLATINUM') {
            const harvestables = ['taxable', 'crypto', 'metals'];
            columns = [...columns.filter(k => harvestables.includes(k)), ...columns.filter(k => !harvestables.includes(k))];
        }
        const header = `<tr class="sticky top-0 bg-[#1e293b] !text-slate-500 label-std z-20 border-b border-white/5">
            <th class="p-2 w-10 text-center !bg-[#1e293b]">Age</th>
            <th class="p-2 text-center !bg-[#1e293b]">Budget</th>
            <th class="p-2 text-center !bg-[#1e293b]">Status</th>
            <th class="p-2 text-center !bg-[#1e293b] text-teal-400">Cashflow</th>
            <th class="p-2 text-center !bg-[#1e293b] text-emerald-500">Aid</th>
            <th class="p-2 text-center !bg-[#1e293b] text-orange-400">Gap</th>
            <th class="p-2 text-center !bg-[#1e293b]">Gross Draw</th>
            <th class="p-2 text-center !bg-[#1e293b]">Tax Paid</th>
            ${columns.map(k => `<th class="p-2 text-center !bg-[#1e293b] text-[7px]" style="color:${burndown.assetMeta[k].color}">${burndown.assetMeta[k].short}</th>`).join('')}
            <th class="p-2 text-center !bg-[#1e293b]">Post-Tax Inc</th>
            <th class="p-2 text-center !bg-[#1e293b] text-teal-400">Net Worth</th>
        </tr>`;
        const rows = results.map((r, i) => {
            const inf = isRealDollars ? Math.pow(1 + infRate, i) : 1;
            const formatVal = (v) => math.toSmartCompactCurrency(v / inf);
            let badgeClass = r.status === 'INSOLVENT' || r.status === 'ERROR' ? 'bg-red-600 text-white' : (r.status === 'Platinum' ? 'bg-emerald-500 text-white' : (r.status === 'Active' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'));
            const assetGap = Math.max(0, r.budget - r.floorGross - r.snap);
            return `<tr class="border-b border-white/5 hover:bg-white/5 text-[9px] ${r.status === 'ERROR' ? 'bg-red-900/10' : ''}">
                <td class="p-2 text-center font-bold">${r.age}</td>
                <td class="p-2 text-center"><div class="${r.isFirstRetYear ? 'text-white' : 'text-slate-400'}">${formatVal(r.budget)}</div>${r.isFirstRetYear ? '<div class="text-[7px] font-black text-amber-500 uppercase leading-none mt-0.5">Ret Year</div>' : ''}${r.helocInt > 10 ? `<div class="text-[7px] font-black text-orange-400 uppercase leading-none mt-0.5">+${formatVal(r.helocInt)} HELOC INT</div>` : ''}</td>
                <td class="p-2 text-center"><span class="px-2 py-0.5 rounded-[4px] text-[7px] font-black uppercase tracking-wider ${badgeClass}">${r.status}</span></td>
                <td class="p-2 text-center text-teal-400 font-bold">${formatVal(r.floorGross)}</td>
                <td class="p-2 text-center text-emerald-500 font-bold">${formatVal(r.snap)}</td>
                <td class="p-2 text-center text-orange-400 font-black">${formatVal(assetGap)}</td>
                <td class="p-2 text-center text-white font-bold">${formatVal(r.preTaxDraw)}</td>
                <td class="p-2 text-center text-red-400 font-bold">${formatVal(r.taxes)}</td>
                ${columns.map(k => `<td class="p-1.5 text-center leading-tight"><div class="font-black" style="color: ${r.draws[k] > 0 ? burndown.assetMeta[k].color : '#475569'}">${r.draws[k] > 1 ? formatVal(r.draws[k]) : '$0'}</div><div class="text-slate-600 text-[7px] font-bold">${formatVal(r.balances[k] || 0)}</div></td>`).join('')}
                <td class="p-2 text-center font-black text-white">${formatVal(r.postTaxInc)}</td>
                <td class="p-2 text-center font-black text-teal-400 bg-teal-400/5">${math.toSmartCompactCurrency(r.netWorth / inf)}</td>
            </tr>`;
        }).join('');
        return `<table class="w-full text-left border-collapse table-auto">${header}<tbody>${rows}</tbody></table>`;
    }
};
