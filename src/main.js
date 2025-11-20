import './style.css';
import { Editor } from "./editor.js";
import { Game } from "./game.js";



const mainMenu = document.getElementById('mainMenu');
const playBtn = document.getElementById('playBtn');
const editorBtn = document.getElementById('editorBtn');
const loader = document.getElementById('loader');
const inGameMenu = document.getElementById('inGameMenu');
const btnHome = document.getElementById('btnHome');

let currentGame;

// --- Loader ---
function showLoader() {
  loader.style.display = 'flex';
}
function hideLoader() {
  loader.style.display = 'none';
}

// --- Démarrage de l'application ---
function startApp(AppClass) {
  mainMenu.style.display = 'none';
  showLoader();

  setTimeout(() => {
    currentGame = new AppClass();

    // Afficher le menu in-game uniquement si c’est le jeu
    if (currentGame instanceof Game) {
      inGameMenu.style.display = 'block';
    } else {
      inGameMenu.style.display = 'none';
    }

    // Afficher le bouton Home
    btnHome.classList.remove('hidden');

    hideLoader();
  }, 1500);
}

// --- Bouton Home ---
btnHome.addEventListener('click', () => {
  window.location.reload();
});

// --- Boutons menu principal ---
playBtn.addEventListener('click', () => startApp(Game));
editorBtn.addEventListener('click', () => startApp(Editor));

// --- Panels in-game ---
const panels = {
  commands: document.getElementById('commandsPanel'),
  maps: document.getElementById('loadMapPanel'),
  cars: document.getElementById('carPanel')
};

function togglePanel(panelName) {
  Object.keys(panels).forEach(name => {
    if (name !== panelName) panels[name].style.display = 'none';
  });
  const panel = panels[panelName];
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

// Event listeners pour toggle panels
document.getElementById('btnCommands').addEventListener('click', () => togglePanel('commands'));
document.getElementById('btnLoadMap').addEventListener('click', () => togglePanel('maps'));
document.getElementById('btnChangeCar').addEventListener('click', () => togglePanel('cars'));

// --- Charger une map ---
document.querySelectorAll('.mapButton').forEach(btn => {
  btn.addEventListener('click', async () => {
    const mapUrl = btn.dataset.map;
    if (!mapUrl || !currentGame?.scene) return;

    // Supprimer les objets existants
    currentGame.scene.clearScene();

    // Charger la nouvelle map
    await currentGame.scene.loadScene(mapUrl);
  });
});

// Charger depuis PC
document.getElementById('btnBrowseMap').addEventListener('click', () => {
  document.getElementById('fileMapInput').click();
});

document.getElementById('fileMapInput').addEventListener('change', async (event) => {
  if (!currentGame?.scene) return;

  await currentGame.scene.importScene(event, {
    sun: currentGame.scene.sun,
    ground: currentGame.scene.ground,
    skybox: currentGame.scene.skybox
  });
});

// --- Changer de voiture ---
document.querySelectorAll('.carButton').forEach(btn => {
  btn.addEventListener('click', async () => {
    const modelName = btn.dataset.model;
    if (!modelName || !currentGame?.car || !currentGame?.scene) return;

    await currentGame.car.loadModel(modelName, currentGame.scene.scene);
  });
});
