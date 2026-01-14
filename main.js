
import { initializeUI } from './core.js';
import { initializeData, updateSummaries, loadUserDataIntoUI, refreshAllModules } from './data.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';
import { projection } from './projection.js';
import { PROFILE_25_SINGLE, PROFILE_45_COUPLE, PROFILE_55_RETIREE } from './profiles.js';

// Module init
initializeUI();
benefits.init();
burndown.init();
projection.init();

async function bootstrap() {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    
    // Check local storage for existing data
    const localData = localStorage.getItem('firecalc_data');
    
    if (localData) {
        try {
            await initializeData();
            setupAppHeader(null, "Local User", "Reset App", true);
            showApp();
        } catch (e) {
            console.error("Boot error", e);
            showProfileSelection();
        }
    } else {
        showProfileSelection();
    }

    function showApp() {
        if (loginScreen) loginScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        updateSummaries();
    }
}

function showProfileSelection() {
    const modal = document.getElementById('profile-modal');
    const loginScreen = document.getElementById('login-screen');
    
    if (loginScreen) loginScreen.classList.add('hidden');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.querySelectorAll('button').forEach(b => {
        b.onclick = async () => {
            const type = b.dataset.profile;
            let data;
            
            if (type === '25') data = JSON.parse(JSON.stringify(PROFILE_25_SINGLE));
            else if (type === '55') data = JSON.parse(JSON.stringify(PROFILE_55_RETIREE));
            else if (type === '45') data = JSON.parse(JSON.stringify(PROFILE_45_COUPLE));
            else {
                data = JSON.parse(JSON.stringify(PROFILE_25_SINGLE));
                data.investments = [];
                data.income = [];
                data.budget.expenses = [];
                data.budget.savings = [];
                data.realEstate = [];
                data.debts = [];
            }

            localStorage.setItem('firecalc_data', JSON.stringify(data));
            modal.classList.add('hidden');
            await initializeData();
            setupAppHeader(null, "Local User", "Reset App", true);
            document.getElementById('app-container').classList.remove('hidden');
            loadUserDataIntoUI();
            refreshAllModules();
        };
    });
}

function setupAppHeader(avatarUrl, userName, logoutText, isLoggedIn) {
    const avatar = document.getElementById('user-avatar');
    if (avatar) avatar.src = avatarUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    
    const name = document.getElementById('user-name');
    if (name) name.textContent = userName || "Local User";
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.textContent = logoutText;
        logoutBtn.onclick = async () => {
            if (confirm("This will PERMANENTLY clear your local data. Are you sure?")) {
                localStorage.removeItem('firecalc_data');
                window.location.reload();
            }
        };
    }
}

bootstrap();
