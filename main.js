
/** FIRECalc Stable v4.1.2 - Production Build **/
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
    
    let localData = null;
    try {
        // Try to read from local storage - this can throw SecurityError in some sandboxed environments
        localData = localStorage.getItem('firecalc_data');
    } catch (e) {
        console.warn("Storage access restricted.", e);
    }
    
    // FALLBACK: If storage is empty or failed, use Default Mock Data
    if (!localData) {
        console.warn("Storage empty. Seeding default data for Preview Mode.");
        window.currentData = JSON.parse(JSON.stringify(PROFILE_45_COUPLE));
    }
    
    // Attempt initialization
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

    function showApp() {
        if (loginScreen) loginScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        setupAppHeader(null, "Local User", "Reset App", true);
        updateSummaries();
    }

    // Safety net: Remove loader after 2 seconds even if init fails slightly
    setTimeout(() => {
        if (loginScreen && !loginScreen.classList.contains('hidden')) {
            const spinner = loginScreen.querySelector('.fa-spin');
            if (spinner) {
                // If we are stuck on spinner, force app show if data exists, otherwise show profile selection
                if (window.currentData) {
                    showApp();
                } else {
                    const modal = document.getElementById('profile-modal');
                    if (modal) modal.classList.remove('hidden');
                    loginScreen.classList.add('hidden');
                }
            }
        }
    }, 2000);
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
                if (modal) modal.classList.remove('hidden');
            };
        } else {
            // Fallback: if we can't find the text element to replace, just show the modal
            loginScreen.classList.add('hidden');
            if (modal) modal.classList.remove('hidden');
        }
    } else if (modal) {
        modal.classList.remove('hidden');
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

            try {
                localStorage.setItem('firecalc_data', JSON.stringify(data));
            } catch (e) {
                console.warn("Could not save to local storage (restricted environment)");
            }

            modal.classList.add('hidden');
            // Set data to window directly so initializeData can pick it up even if localStorage fails
            window.currentData = data; 
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
                try {
                    localStorage.removeItem('firecalc_data');
                } catch (e) {}
                window.location.reload();
            }
        };
    }
}

bootstrap();
