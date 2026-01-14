
import { initializeUI } from './core.js';
import { initializeData, updateSummaries, loadUserDataIntoUI, refreshAllModules } from './data.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';
import { projection } from './projection.js';
import { PROFILE_25_SINGLE, PROFILE_45_COUPLE, PROFILE_55_RETIREE, BLANK_PROFILE } from './profiles.js';

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
            const success = await initializeData();
            if (success) {
                showApp();
            } else {
                showProfileSelection();
            }
        } catch (e) {
            console.error("Boot error", e);
            showProfileSelection();
        }
    } else {
        // First time user or reset: show profile selection
        showProfileSelection();
    }

    function showApp() {
        if (loginScreen) loginScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        setupAppHeader(null, "Local User", "Reset App", true);
        updateSummaries();
    }
}

function showProfileSelection() {
    const modal = document.getElementById('profile-modal');
    const loginScreen = document.getElementById('login-screen');
    
    if (loginScreen) {
        // Change spinner text to invite entry
        const textEl = loginScreen.querySelector('.flex.items-center');
        if (textEl) {
            textEl.innerHTML = `
                <button id="btn-guest-entry" class="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 active:scale-95 transition-all">
                    Enter as Guest
                </button>
            `;
            document.getElementById('btn-guest-entry').onclick = () => {
                loginScreen.classList.add('hidden');
                modal.classList.remove('hidden');
            };
        }
    }
    
    if (!modal) return;
    
    modal.querySelectorAll('button').forEach(b => {
        b.onclick = async () => {
            const type = b.dataset.profile;
            let data;
            
            if (type === '25') data = JSON.parse(JSON.stringify(PROFILE_25_SINGLE));
            else if (type === '55') data = JSON.parse(JSON.stringify(PROFILE_55_RETIREE));
            else if (type === '45') data = JSON.parse(JSON.stringify(PROFILE_45_COUPLE));
            else {
                // Use BLANK_PROFILE pre-populated with your specific screenshot data
                data = JSON.parse(JSON.stringify(BLANK_PROFILE));
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
    const name = document.getElementById('user-name');
    if (name) name.textContent = userName || "Local User";
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.textContent = logoutText;
        logoutBtn.onclick = async () => {
            if (confirm("This will PERMANENTLY clear your local data and reset the simulator. Are you sure?")) {
                localStorage.removeItem('firecalc_data');
                window.location.reload();
            }
        };
    }
}

bootstrap();
