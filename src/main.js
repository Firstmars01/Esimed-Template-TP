import './style.css';
import { Editor } from "./editor/editor.js";
import { Game } from "./game/game.js";

// --- Références globales ---
let currentGame;

// --- Loader ---
const loader = document.getElementById('loader');
function showLoader() { loader.style.display = 'flex'; }
function hideLoader() { loader.style.display = 'none'; }

// --- Helpers scène ---
export function getSceneApi(app) {
    if (!app) return null;
    if (app.sceneManager) return app.sceneManager;
    if (app.scene) return app.scene;
    return null;
}

export function getThreeScene(app) {
    const api = getSceneApi(app);
    if (!api) return null;

    if (typeof api.getScene === 'function') return api.getScene();
    if (api.scene) return api.scene;

    return null;
}

// --- Nettoyage application ---
export async function disposeCurrent() {
    if (!currentGame) return;

    if (typeof currentGame.dispose === 'function') {
        await currentGame.dispose();
    }

    if (currentGame.ui?.destroy) {
        try { currentGame.ui.destroy(); } catch (e) {}
    }

    if (currentGame.renderer?.domElement) {
        try { currentGame.renderer.domElement.remove(); } catch (e) {}
    }

    currentGame = null;
}

// --- Lancer une application ---
export async function startApp(AppClass) {
    const mainMenu = document.getElementById('mainMenu');
    const inGameMenu = document.getElementById('inGameMenu');
    const btnHome = document.getElementById('btnHome');

    mainMenu.style.display = 'none';
    showLoader();

    try {
        await new Promise(r => setTimeout(r, 800));

        await disposeCurrent();
        const appInstance = new AppClass();

        if (typeof appInstance.init === 'function') {
            await appInstance.init();
        }

        currentGame = appInstance;

        inGameMenu.style.display = currentGame instanceof Game ? 'block' : 'none';
        btnHome.classList.remove('hidden');

    } catch (err) {
        console.error('Erreur au lancement de l app :', err);
        mainMenu.style.display = 'block';
    } finally {
        hideLoader();
    }
}

// Helper debug
window.__app = {
    getCurrent: () => currentGame
};
