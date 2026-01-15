
            const postTaxInc = (floorGross + preTaxDraw + snap) - taxes;
            const shortfall = targetBudget - postTaxInc;

            if (isRet) {
                if (shortfall > (targetBudget * 0.02)) {
                    status = 'INSOLVENT';
                    if (firstInsolvencyAge === null) firstInsolvencyAge = age;
                } else if ((postTaxInc - targetBudget) > (targetBudget * 0.05) && preTaxDraw > 100) {
                    status = 'ERROR';
                }
            }
            
            // Apply Asset Growth (APY) to remaining balances for year-end
            const stockGrowth = math.getGrowthForAge('Stock', age, assumptions.currentAge, assumptions);
            const cryptoGrowth = math.getGrowthForAge('Crypto', age, assumptions.currentAge, assumptions);
            const metalsGrowth = math.getGrowthForAge('Metals', age, assumptions.currentAge, assumptions);

            bal['taxable'] *= (1 + stockGrowth);
            bal['401k'] *= (1 + stockGrowth);
            bal['hsa'] *= (1 + stockGrowth);
            bal['529'] *= (1 + stockGrowth);
            bal['crypto'] *= (1 + cryptoGrowth);
            bal['metals'] *= (1 + metalsGrowth);
            
            // Roth: Growth accumulates in earnings
            const totalRoth = bal['roth-basis'] + bal['roth-earnings'];
            bal['roth-earnings'] += (totalRoth * stockGrowth);
            
            // Calculate detailed NW Breakdown for trace
            const curREEquity = realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * reGrowth) - Math.max(0, math.fromCurrency(r.mortgage) - (math.fromCurrency(r.principalPayment)*12*i)), 0);
