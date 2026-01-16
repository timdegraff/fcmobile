
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
