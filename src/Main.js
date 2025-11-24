import './style.css';
import { Editor } from "./editor/Editor.js";
import { Game } from "./game/Game.js";

// --- Global references ---
let currentGame;

// --- Loader ---
const loader = document.getElementById('loader');
function showLoader() { loader.style.display = 'flex'; }
function hideLoader() { loader.style.display = 'none'; }

// --- Scene helpers ---
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

// --- Application cleanup ---
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

  // hide editor commands panel when disposing
  try { document.getElementById('EditorCommandsPanel').style.display = 'none'; } catch (e) {}
  // hide editor menu container
  try { document.getElementById('editorMenu').style.display = 'none'; } catch (e) {}

  currentGame = null;
}

// --- Start an application ---
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

    // show editor menu and commands if Editor
    try {
      const editorMenu = document.getElementById('editorMenu');
      const editorPanel = document.getElementById('EditorCommandsPanel');
      if (editorMenu) editorMenu.style.display = (currentGame instanceof Editor) ? 'flex' : 'none';
      if (editorPanel) editorPanel.style.display = (currentGame instanceof Editor) ? 'block' : 'none';
    } catch (e) {}

    inGameMenu.style.display = currentGame instanceof Game ? 'block' : 'none';
    btnHome.classList.remove('hidden');

  } catch (err) {
    console.error('Error launching the app:', err);
    mainMenu.style.display = 'block';
  } finally {
    hideLoader();
  }
}

// Debug helper
window.__app = {
  getCurrent: () => currentGame
};
