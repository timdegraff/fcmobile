
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

                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden cursor-pointer hover:border-blue-500/30 transition-colors">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-road text-4xl text-blue-400 opacity-20"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-flag-checkered"></i> Retirement Runway</label>
                            <div id="card-runway-val" class="text-3xl font-black text-blue-400 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-runway-sub" class="text-[9px] font-bold text-blue-400/60 uppercase tracking-tighter leading-none">YEARS OF SOLVENCY REMAINING FROM TODAY</div>
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

                <div id="priority-list-wrapper" class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-wrap items-center gap-3 transition-opacity">
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
                
                // Grey out priority list if PLATINUM
                const priorityWrapper = document.getElementById('priority-list-wrapper');
                if (priorityWrapper) {
                    priorityWrapper.classList.toggle('opacity-40', mode === 'PLATINUM');
                    priorityWrapper.classList.toggle('pointer-events-none', mode === 'PLATINUM');
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
        'crypto': { label: 'Crypto', short: 'Crypto', color: assetColors['Crypto'], isTaxable: true },
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
            
            // Initial grey-out state if needed
            const priorityWrapper = document.getElementById('priority-list-wrapper');
            if (priorityWrapper) {
                priorityWrapper.classList.toggle('opacity-40', mode === 'PLATINUM');
                priorityWrapper.classList.toggle('pointer-events-none', mode === 'PLATINUM');
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
        const actualInsolvencyAge = firstInsolvencyAge;
        
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

        const currentAge = parseFloat(data.assumptions.currentAge) || 40;
        
        if (document.getElementById('card-runway-val')) {
            const runwayVal = firstInsolvencyAge ? (firstInsolvencyAge - currentAge) : null;
            const el = document.getElementById('card-runway-val');
            el.textContent = runwayVal !== null ? `${runwayVal} Years` : "Forever";
            
            el.classList.remove('text-red-400');
            el.classList.add('text-blue-400');
        }
        
        if (document.getElementById('card-dwz-val')) document.getElementById('card-dwz-val').textContent = math.toSmartCompactCurrency(burndown.lastCalculatedResults.dwz || 0);
        
        if (document.getElementById('card-preservation-val')) {
            document.getElementById('card-preservation-val').textContent = firstInsolvencyAge ? firstInsolvencyAge : "100+";
        }

        if (document.getElementById('burndown-table-container')) document.getElementById('burndown-table-container').innerHTML = burndown.renderTable(fullSimulationResults);
        
        burndown.renderTrace();
        
        // New: Calculate DWZ
        burndown.calculateDieWithZero(data, config, actualInsolvencyAge);
    },

    calculateDieWithZero: (data, baseConfig, restoreInsolvencyAge) => {
        let low = 0;
        let high = 500000;
        let best = 0;
        
        const solverConfig = { ...baseConfig, useSync: false };

        for (let i = 0; i < 20; i++) {
            const mid = (low + high) / 2;
            solverConfig.manualBudget = mid;
            
            burndown.simulateProjection(data, solverConfig);
            
            if (firstInsolvencyAge !== null) {
                // Failed (Insolvent before death)
                high = mid;
            } else {
                // Survived
                best = mid;
                low = mid;
            }
        }
        
        // Restore global state
        firstInsolvencyAge = restoreInsolvencyAge;
        burndown.lastCalculatedResults.dwz = best;
        
        const dwzVal = document.getElementById('card-dwz-val');
        const dwzSub = document.getElementById('card-dwz-sub');
        const kVal = Math.round(best / 1000);
        
        if (dwzVal) dwzVal.textContent = math.toSmartCompactCurrency(best);
        if (dwzSub) dwzSub.textContent = `MAX SUSTAINABLE SPEND OF $${kVal}K/YR STARTING AT RETIREMENT`;
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
        
        // Parsing HELOC Rate: Allow 0% but default to 7% if missing or invalid string
        let hRateRaw = parseFloat(helocs[0]?.rate);
        if (isNaN(hRateRaw)) hRateRaw = 7.0;
        const helocInterestRate = hRateRaw / 100;

        const stateMeta = stateTaxRates[assumptions.state || 'Michigan'];
        
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

        for (let i = 0; i <= (100 - startAge); i++) {
            const age = startAge + i, year = new Date().getFullYear() + i, isRet = age >= rAge, infFac = Math.pow(1 + inflationRate, i);
            const effectiveKidsCount = (benefits.dependents || []).filter(d => (d.birthYear + 19) >= year).length;
            const totalHhSize = 1 + (filingStatus === 'Married Filing Jointly' ? 1 : 0) + effectiveKidsCount;
            const fpl100 = math.getFPL(totalHhSize, assumptions.state) * infFac;

            let baseBudget = config.useSync ? summaries.totalAnnualBudget : config.manualBudget;
            let targetBudget = baseBudget * infFac;

            if (isRet) {
                let phaseMult = 1.0;
                if (age < 60) phaseMult = assumptions.phaseGo1 ?? 1.0;
                else if (age < 80) phaseMult = assumptions.phaseGo2 ?? 0.9;
                else phaseMult = assumptions.phaseGo3 ?? 0.8;
                targetBudget *= phaseMult;
            }

            const helocInterestThisYear = bal['heloc'] * helocInterestRate;
            
            // Integrate HELOC interest into the core budget requirement to force the solver to cover it
            targetBudget += helocInterestThisYear;

            let floorGross = 0, floorTaxable = 0, incomeBreakdown = [];
            let floorGrossTrace = 0, floorDeductionTrace = 0;
            let traceLog = [];
            
            if (helocInterestThisYear > 50) {
                traceLog.push(`Debt Service: ${math.toCurrency(helocInterestThisYear)} interest due on ${math.toCurrency(bal['heloc'])} HELOC balance. Added to budget.`);
            }

            // 1. INJECT ANNUAL SAVINGS (Post-Growth, Pre-Withdrawal)
            (budget.savings || []).forEach(sav => {
                if (isRet && !sav.remainsInRetirement) return;
                const amt = math.fromCurrency(sav.annual) * infFac;
                if (sav.type === 'Taxable') { bal['taxable'] += amt; bal['taxableBasis'] += amt; }
                else if (sav.type === 'Roth IRA') { bal['roth-basis'] += amt; }
                else if (sav.type === 'Cash') { bal['cash'] += amt; }
                else if (sav.type === 'HSA') { bal['hsa'] += amt; }
                else if (sav.type === 'Crypto') { bal['crypto'] += amt; bal['cryptoBasis'] += amt; }
                else if (sav.type === 'Metals') { bal['metals'] += amt; bal['metalsBasis'] += amt; }
                else if (sav.type === 'Pre-Tax (401k/IRA)') { bal['401k'] += amt; }
            });

            const processIncome = (inc) => {
                const isMon = inc.isMonthly === true || inc.isMonthly === 'true';
                let gross = math.fromCurrency(inc.amount) * (isMon ? 12 : 1) * Math.pow(1 + (inc.increase / 100 || 0), i);
                const bonus = (gross * (parseFloat(inc.bonusPct) / 100 || 0));
                
                let personal401k = 0, match401k = 0;
                if (!isRet) {
                    const irsLimit = (age >= 50 ? 31000 : 23500) * infFac;
                    let rawP = (gross * (parseFloat(inc.contribution) / 100 || 0));
                    if (inc.contribOnBonus) rawP += (bonus * (parseFloat(inc.contribution) / 100 || 0));
                    personal401k = Math.min(rawP, irsLimit);
                    
                    let rawM = (gross * (parseFloat(inc.match) / 100 || 0));
                    if (inc.matchOnBonus) rawM += (bonus * (parseFloat(inc.match) / 100 || 0));
                    match401k = rawM;
                    bal['401k'] += (personal401k + match401k);
                }

                const isExpMon = inc.incomeExpensesMonthly === true || inc.incomeExpensesMonthly === 'true';
                let ded = (math.fromCurrency(inc.incomeExpenses) * (isExpMon ? 12 : 1));
                
                // Surplus Income (Income - Expenses - Contributions) - Treated as spent per user request
                let netSrc = (gross + bonus) - ded - personal401k; 

                if (isNaN(parseInt(inc.nonTaxableUntil)) || year >= inc.nonTaxableUntil) floorTaxable += netSrc;
                floorGross += netSrc;
                floorGrossTrace += (gross + bonus);
                floorDeductionTrace += (ded + personal401k);
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
            
            const calcNW = (b) => {
                const sRE = realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * reGrowth), 0);
                const sREDebt = realEstate.reduce((s, r) => s + Math.max(0, math.fromCurrency(r.mortgage) - (math.fromCurrency(r.principalPayment)*12*i)), 0);
                const sOA = otherAssets.reduce((s, o) => s + (math.fromCurrency(o.value) * oaGrowth), 0);
                const sOADebt = otherAssets.reduce((s, o) => s + Math.max(0, math.fromCurrency(o.loan) - (math.fromCurrency(o.principalPayment)*12*i)), 0);
                const sOtherDebt = debts.reduce((s, d) => s + Math.max(0, math.fromCurrency(d.balance) - (math.fromCurrency(d.principalPayment)*12*i)), 0);
                const sOptNW = stockOptions.reduce((s, x) => {
                    const fmv = math.fromCurrency(x.currentPrice) * optGrowth;
                    return s + (Math.max(0, (fmv - math.fromCurrency(x.strikePrice)) * parseFloat(x.shares)));
                }, 0);
                const sLiquid = b.cash + b.taxable + b.crypto + b.metals + b['401k'] + b['roth-basis'] + b['roth-earnings'] + b.hsa;
                return (sLiquid + sRE + sOA + sOptNW) - (b['heloc'] + sREDebt + sOADebt + sOtherDebt);
            };

            const startNW = calcNW(startOfYearBal);

            let drawMap = {}, preTaxDraw = 0, taxes = 0, snap = 0, status = 'Silver';
            let observedFriction = 0.25;
            let smartAdjustments = {};

            if (!isRet) {
                taxes = engine.calculateTax(floorTaxable, 0, 0, filingStatus, assumptions.state, infFac);
                status = 'Active';
                traceLog.push(`Household generating ${math.toCurrency(floorGrossTrace)} Gross - ${math.toCurrency(floorDeductionTrace)} Deductions = ${math.toCurrency(floorGross)} Net Base Income.`);
            } else {
                traceLog.push(`Household base income sources: ${incomeBreakdown.map(ib => `${ib.name} (${math.toCurrency(ib.amount)})`).join(', ')}.`);
                
                if (persona === 'PLATINUM') {
                    // --- DUAL MAGI ACCOUNTING & SMART CLIFF LOGIC (V5.0 UPGRADE) ---
                    // Strategy: Fill MAGI "Net Room" with High-Density assets to launder money at low tax rates.
                    // If budget gap remains, use Zero-Density "Buffer" assets.
                    // If buffer is empty, pivot to "Smart Cliff" check.

                    const magiLimit = fpl100 * 1.38; // Platinum Ceiling
                    const mandatoryMagi = floorTaxable; 
                    
                    // 1. Asset Classification
                    // Density = MAGI generated per $1 of liquidity drawn.
                    let assets = [
                        { key: '401k', type: 'Ordinary', val: bal['401k'], basis: 0, density: 1.0, label: '401k/IRA' },
                        { key: 'metals', type: 'Collectibles', val: bal['metals'], basis: bal['metalsBasis'], density: 0, label: 'Metals' },
                        { key: 'crypto', type: 'LTCG', val: bal['crypto'], basis: bal['cryptoBasis'], density: 0, label: 'Crypto' },
                        { key: 'taxable', type: 'LTCG', val: bal['taxable'], basis: bal['taxableBasis'], density: 0, label: 'Brokerage' }
                    ];
                    
                    // Calculate dynamic densities (MAGI impact)
                    assets.forEach(a => {
                        if (a.val > 0) {
                            const gainRatio = 1 - (a.basis / a.val);
                            a.density = Math.max(0, gainRatio);
                        }
                    });
                    
                    // Priority for filling MAGI: High Density First (401k)
                    let highDensityAssets = assets.filter(a => a.val > 0).sort((a,b) => b.density - a.density);

                    // Zero Density Buffer Assets (Order: Cash -> Roth -> HELOC)
                    let zeroDensityAssets = [
                        { key: 'cash', val: bal['cash'], label: 'Cash' },
                        { key: 'roth-basis', val: bal['roth-basis'], label: 'Roth Basis' },
                        { key: 'heloc', val: (helocLimit - bal['heloc']), label: 'HELOC' }
                    ];
                    let bufferTotal = zeroDensityAssets.reduce((s, a) => s + a.val, 0);

                    // Solver State Trackers
                    let committedDraws = {};
                    let currentOrd = floorTaxable; 
                    let currentLtcg = 0;
                    let currentColl = 0;
                    let cashGenerated = 0;

                    // Helper to calc tax/snap for a hypothetical state
                    const calcImpact = (o, l, c) => {
                        const t = engine.calculateTax(o, l, c, filingStatus, assumptions.state, infFac);
                        const s = engine.calculateSnapBenefit(o/12, 0, 0, totalHhSize, (benefits.shelterCosts||700)*infFac, true, false, 0, 0, 0, assumptions.state, infFac, true) * 12;
                        return { taxes: t, snap: s };
                    };

                    // Function to execute "Fill MAGI" (Step A)
                    const fillMagi = () => {
                        for (let asset of highDensityAssets) {
                            let currentMagi = currentOrd + currentLtcg + currentColl;
                            let room = magiLimit - currentMagi;
                            if (room <= 1) break;
                            if (asset.val <= 0 || asset.density <= 0) continue; 

                            let drawAmount = room / asset.density; 
                            drawAmount = Math.min(drawAmount, asset.val);
                            
                            committedDraws[asset.key] = (committedDraws[asset.key] || 0) + drawAmount;
                            cashGenerated += drawAmount;
                            
                            // Update Running Totals
                            if (asset.key === '401k') currentOrd += drawAmount;
                            else {
                                let gain = drawAmount * asset.density;
                                if (asset.key === 'metals') currentColl += gain;
                                else currentLtcg += gain;
                            }
                        }
                    };

                    // Function to execute "Fill Budget" from Buffer (Step B)
                    const fillBudgetFromBuffer = (gap) => {
                        for (let asset of zeroDensityAssets) {
                            if (gap <= 1) break;
                            if (asset.val <= 0) continue;
                            
                            let draw = Math.min(gap, asset.val);
                            committedDraws[asset.key] = (committedDraws[asset.key] || 0) + draw;
                            cashGenerated += draw; 
                            gap -= draw;
                        }
                        return gap; // Remaining gap
                    };

                    // --- LOGIC BRANCHING ---
                    if (bufferTotal > 0) {
                        // === STRATEGY A: LAUNDER WITH BUFFER ===
                        fillMagi(); // Fill MAGI bucket
                        
                        let impact = calcImpact(currentOrd, currentLtcg, currentColl);
                        let netC = floorGross + cashGenerated + impact.snap - impact.taxes;
                        let gap = targetBudget - netC;
                        
                        if (gap > 0) {
                            let remainingGap = fillBudgetFromBuffer(gap);
                            if (remainingGap > 1) {
                                traceLog.push(`Platinum (Buffer): Buffer exhausted with ${math.toCurrency(remainingGap)} deficit remaining.`);
                            } else {
                                traceLog.push(`Platinum (Buffer): Filled MAGI, then used Zero-Income assets to bridge budget.`);
                            }
                        } else {
                            // Surplus logic handled by global reinvestment below, but we log it
                            traceLog.push(`Platinum (Buffer): MAGI fill generated surplus of ${math.toCurrency(-gap)}. Reinvesting.`);
                        }
                        
                        // Finalize tax/snap for this branch
                        taxes = impact.taxes;
                        snap = impact.snap;
                        
                    } else {
                        // === STRATEGY B: SMART CLIFF (NO BUFFER) ===
                        fillMagi(); // Step A: Cap at Platinum
                        
                        let impact = calcImpact(currentOrd, currentLtcg, currentColl);
                        let netC = floorGross + cashGenerated + impact.snap - impact.taxes;
                        
                        if (netC >= targetBudget * 0.98) {
                            // Stay Platinum
                            traceLog.push(`Platinum (No Buffer): Shortfall accepted (${math.toCurrency(targetBudget - netC)}) to preserve aid status.`);
                            taxes = impact.taxes;
                            snap = impact.snap;
                        } else {
                            // Break Glass -> Switch to Iron Fist
                            traceLog.push(`Platinum (No Buffer): Deficit too large. Breaking glass (switching to Silver/Iron Fist).`);
                            
                            // Reset state for Iron Fist run
                            committedDraws = {};
                            currentOrd = floorTaxable; currentLtcg = 0; currentColl = 0; cashGenerated = 0;
                            
                            // Iron Fist Loop (Priority Order)
                            let currentTaxes = engine.calculateTax(floorTaxable, 0, 0, filingStatus, assumptions.state, infFac);
                            let currentSnap = engine.calculateSnapBenefit(floorTaxable/12, 0, 0, totalHhSize, (benefits.shelterCosts||700)*infFac, true, false, 0, 0, 0, assumptions.state, infFac, true)*12;
                            let currentNet = floorGross + currentSnap - currentTaxes;
                            
                            // Re-merge all assets for Iron Fist priority scan
                            let allAssets = [...assets, ...zeroDensityAssets];
                            
                            for (const pk of burndown.priorityOrder) {
                                let deficit = targetBudget - currentNet;
                                if (deficit <= 1) break;
                                
                                let asset = allAssets.find(a => a.key === pk);
                                if (!asset && pk === 'heloc') asset = { val: helocLimit - bal['heloc'], key: 'heloc' }; 
                                if (!asset || asset.val <= 0) continue;
                                
                                // Binary Search for this asset
                                let low = 0, high = asset.val, bestDraw = 0;
                                let density = asset.density || 0;
                                
                                // Optimization: If density is 0, net gain is strictly Draw amount
                                if (density === 0 && pk !== '401k') {
                                     bestDraw = Math.min(deficit, asset.val);
                                } else {
                                    for (let j=0; j<10; j++) {
                                        let testDraw = (low+high)/2;
                                        let tOrd = currentOrd + (pk === '401k' ? testDraw : 0);
                                        let gain = testDraw * density;
                                        let tColl = currentColl + (pk === 'metals' ? gain : 0);
                                        let tLtcg = currentLtcg + (['taxable','crypto'].includes(pk) ? gain : 0);
                                        
                                        let tImpact = calcImpact(tOrd, tLtcg, tColl);
                                        let netGain = testDraw - (tImpact.taxes - currentTaxes) + (tImpact.snap - currentSnap);
                                        
                                        if (netGain < deficit) { bestDraw = testDraw; low = testDraw; }
                                        else { high = testDraw; }
                                    }
                                    bestDraw = high;
                                }
                                
                                committedDraws[pk] = (committedDraws[pk] || 0) + bestDraw;
                                
                                // Update state for next asset
                                if (pk === '401k') currentOrd += bestDraw;
                                else if (['taxable','crypto','metals'].includes(pk)) {
                                    let ratio = 1 - (bal[pk+'Basis']/bal[pk]); 
                                    if (pk === 'metals') currentColl += bestDraw * ratio;
                                    else currentLtcg += bestDraw * ratio;
                                }
                                
                                let imp = calcImpact(currentOrd, currentLtcg, currentColl);
                                currentTaxes = imp.taxes;
                                currentSnap = imp.snap;
                                currentNet = floorGross + (Object.values(committedDraws).reduce((a,b)=>a+b,0)) + currentSnap - currentTaxes;
                            }
                            taxes = currentTaxes;
                            snap = currentSnap;
                        }
                    }
                    
                    // Commit Draws
                    preTaxDraw = 0;
                    drawMap = committedDraws;
                    Object.entries(committedDraws).forEach(([k, amt]) => {
                        if (amt <= 0) return;
                        preTaxDraw += amt;
                        if (k === 'heloc') bal['heloc'] += amt;
                        else {
                            if (bal[k+'Basis']) bal[k+'Basis'] -= (bal[k+'Basis'] * (amt / bal[k]));
                            bal[k] -= amt;
                        }
                    });
                    
                    // Status Update
                    const fMAGI = currentOrd + currentLtcg + currentColl;
                    status = (age >= 65 ? 'Medicare' : (fMAGI/fpl100 <= 1.38 ? 'Platinum' : 'Silver'));
                    traceLog.push(`Final Cycle MAGI: ${math.toCurrency(fMAGI)} (${status}).`);

                } else {
                    // --- NEW SEQUENTIAL BINARY SEARCH IRON FIST ---
                    // Spot-on decumulation: solves for each asset in priority order.
                    let currentTaxes = engine.calculateTax(floorTaxable, 0, 0, filingStatus, assumptions.state, infFac);
                    let currentSnap = engine.calculateSnapBenefit(floorTaxable / 12, 0, 0, totalHhSize, (benefits.shelterCosts || 700) * infFac, true, false, 0, 0, 0, assumptions.state, infFac, true) * 12;
                    let currentNet = floorGross + currentSnap - currentTaxes;

                    drawMap = {};
                    preTaxDraw = 0;
                    let runningOrd = floorTaxable;
                    let runningLtcg = 0;
                    let runningColl = 0;

                    for (const pk of burndown.priorityOrder) {
                        let deficit = targetBudget - currentNet;
                        if (deficit <= 1) break; // Gap is filled

                        const av = (pk === 'cash' ? Math.max(0, bal[pk] - cashFloor) : (pk === 'heloc' ? Math.max(0, helocLimit - bal[pk]) : bal[pk]));
                        if (av <= 1) continue;

                        // Binary search for precise draw from THIS specific asset
                        let low = 0, high = av, bestDraw = 0;
                        const bR = (['taxable', 'crypto', 'metals'].includes(pk) && startOfYearBal[pk] > 0) ? startOfYearBal[pk+'Basis'] / startOfYearBal[pk] : 1;

                        for (let j = 0; j < 15; j++) {
                            let testDraw = (low + high) / 2;
                            let testOrd = runningOrd + (pk === '401k' ? testDraw : 0);
                            let testLtcg = runningLtcg + (['taxable', 'crypto'].includes(pk) ? testDraw * (1 - bR) : 0);
                            let testColl = runningColl + (pk === 'metals' ? testDraw * (1 - bR) : 0);

                            let testTaxes = engine.calculateTax(testOrd, testLtcg, testColl, filingStatus, assumptions.state, infFac);
                            let testSnap = engine.calculateSnapBenefit(testOrd / 12, 0, 0, totalHhSize, (benefits.shelterCosts || 700) * infFac, true, false, 0, 0, 0, assumptions.state, infFac, true) * 12;
                            
                            // Net Gain = Gross Draw - Tax Impact + Aid Impact
                            let netGain = testDraw - (testTaxes - currentTaxes) + (testSnap - currentSnap);
                            
                            if (netGain < deficit) {
                                bestDraw = testDraw;
                                low = testDraw;
                            } else {
                                high = testDraw;
                            }
                        }
                        
                        // Commit the draw
                        bestDraw = high; 
                        let finalOrd = runningOrd + (pk === '401k' ? bestDraw : 0);
                        let finalLtcg = runningLtcg + (['taxable', 'crypto'].includes(pk) ? bestDraw * (1 - bR) : 0);
                        let finalColl = runningColl + (pk === 'metals' ? bestDraw * (1 - bR) : 0);
                        
                        let finalTaxes = engine.calculateTax(finalOrd, finalLtcg, finalColl, filingStatus, assumptions.state, infFac);
                        let finalSnap = engine.calculateSnapBenefit(finalOrd / 12, 0, 0, totalHhSize, (benefits.shelterCosts || 700) * infFac, true, false, 0, 0, 0, assumptions.state, infFac, true) * 12;

                        traceLog.push(`Iron Fist: Drew ${math.toCurrency(bestDraw)} from ${burndown.assetMeta[pk].label} to cover deficit.`);

                        drawMap[pk] = bestDraw;
                        preTaxDraw += bestDraw;
                        runningOrd = finalOrd;
                        runningLtcg = finalLtcg;
                        runningColl = finalColl;
                        currentTaxes = finalTaxes;
                        currentSnap = finalSnap;
                        currentNet = floorGross + preTaxDraw + currentSnap - currentTaxes;

                        if (pk === 'heloc') bal['heloc'] += bestDraw;
                        else {
                            if (bal[pk+'Basis']) bal[pk+'Basis'] -= (bal[pk+'Basis'] * (bestDraw / bal[pk]));
                            bal[pk] -= bestDraw;
                        }
                    }
                    taxes = currentTaxes;
                    snap = currentSnap;
                    
                    // Status Update
                    const fMAGI = runningOrd + runningLtcg + runningColl;
                    status = (age >= 65 ? 'Medicare' : (fMAGI/fpl100 <= 1.38 ? 'Platinum' : 'Silver'));
                    traceLog.push(`Final Cycle MAGI: ${math.toCurrency(fMAGI)} (${status}).`);
                }
            }

            const postTaxInc = (floorGross + preTaxDraw + snap) - taxes;
            
            // Reinvestment Logic for Surplus: Only if significantly over budget despite solver efforts
            if (postTaxInc > targetBudget + 100) { 
                let surplus = postTaxInc - targetBudget;
                
                // Paydown Rule: Use surplus to pay down HELOC principal first
                if (bal['heloc'] > 0) {
                    const paydown = Math.min(bal['heloc'], surplus);
                    bal['heloc'] -= paydown;
                    surplus -= paydown;
                    traceLog.push(`Surplus Income: Used ${math.toCurrency(paydown)} to pay down HELOC principal.`);
                }

                if (surplus > 0) {
                    bal['taxable'] += surplus;
                    bal['taxableBasis'] += surplus; 
                    traceLog.push(`Surplus Income: ${math.toCurrency(surplus)} exceeds budget. Reinvested into Brokerage (100% Cost Basis).`);
                }
            }

            if (isRet && (targetBudget - postTaxInc) > (targetBudget * 0.02)) {
                status = 'INSOLVENT';
                if (firstInsolvencyAge === null) firstInsolvencyAge = age;
            }

            // APY: APPLIED AT YEAR END TO REMAINING BALANCES
            const stockGrowth = math.getGrowthForAge('Stock', age, assumptions.currentAge, assumptions);
            const cryptoGrowth = math.getGrowthForAge('Crypto', age, assumptions.currentAge, assumptions);
            const metalsGrowth = math.getGrowthForAge('Metals', age, assumptions.currentAge, assumptions);

            // Calculate illiquid asset values for trace
            const sRE = realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * reGrowth), 0);
            const sOA = otherAssets.reduce((s, o) => s + (math.fromCurrency(o.value) * oaGrowth), 0);
            const sOptNW = stockOptions.reduce((s, x) => {
                const fmv = math.fromCurrency(x.currentPrice) * optGrowth;
                return s + (Math.max(0, (fmv - math.fromCurrency(x.strikePrice)) * parseFloat(x.shares)));
            }, 0);

            const nwBreakdown = [
                { name: 'Cash', value: bal['cash'], color: assetColors['Cash'] },
                { name: 'Brokerage', value: bal['taxable'], color: assetColors['Taxable'] },
                { name: 'Roth IRA', value: bal['roth-basis'] + bal['roth-earnings'], color: assetColors['Roth IRA'] },
                { name: '401k/IRA', value: bal['401k'], color: assetColors['Pre-Tax (401k/IRA)'] },
                { name: 'Crypto', value: bal['crypto'], color: assetColors['Crypto'] },
                { name: 'Metals', value: bal['metals'], color: assetColors['Metals'] },
                { name: 'HSA', value: bal['hsa'], color: assetColors['HSA'] },
                { name: 'Real Estate', value: sRE, color: assetColors['Real Estate'] },
                { name: 'Stock Options', value: sOptNW, color: assetColors['Stock Options'] },
                { name: 'Other Assets', value: sOA, color: assetColors['Other'] }
            ];

            results.push({ 
                age, year, budget: targetBudget, helocInt: helocInterestThisYear, isFirstRetYear: age === rAge, 
                preTaxDraw, taxes, snap, balances: { ...startOfYearBal }, draws: drawMap, postTaxInc, status, 
                netWorth: calcNW(bal), startNW, floorGross, incomeBreakdown, traceLog, nwBreakdown
            });

            // Apply growth for NEXT year
            ['taxable', '401k', 'hsa'].forEach(k => bal[k] *= (1 + stockGrowth));
            bal['crypto'] *= (1 + cryptoGrowth);
            bal['metals'] *= (1 + metalsGrowth);
            bal['roth-earnings'] += ((bal['roth-basis'] + bal['roth-earnings']) * stockGrowth);
        }
        return results;
    },

    renderTable: (results) => {
