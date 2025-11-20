import './style.css';
import { Editor } from "./editor.js";
import { Game } from "./game.js";

const mainMenu = document.getElementById('mainMenu');
const playBtn = document.getElementById('playBtn');
const editorBtn = document.getElementById('editorBtn');
const loader = document.getElementById('loader');
const inGameMenu = document.getElementById('inGameMenu');

let currentGame;

function showLoader() {
  loader.style.display = 'flex';
}

function hideLoader() {
  loader.style.display = 'none';
}

// Fonction commune pour lancer le jeu ou l'éditeur
const btnHome = document.getElementById('btnHome');

// Fonction pour lancer le jeu ou l'éditeur
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

    // Afficher le bouton Home pour Game et Editor
    btnHome.classList.remove('hidden');

    hideLoader();
  }, 1500);
}

// Au clic sur Home, reload la page
btnHome.addEventListener('click', () => {
  window.location.reload();
});



// Event listeners
playBtn.addEventListener('click', () => startApp(Game));
editorBtn.addEventListener('click', () => startApp(Editor));

// Toggle panels
document.getElementById('btnCommands').addEventListener('click', () => {
  const panel = document.getElementById('commandsPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('btnLoadMap').addEventListener('click', () => {
  const panel = document.getElementById('loadMapPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

// Charger une map depuis le menu in-game
document.querySelectorAll('.mapButton').forEach(btn => {
  btn.addEventListener('click', async () => {
    const mapUrl = btn.dataset.map;

    if (currentGame && currentGame.scene) {
      // Supprimer les objets existants
      currentGame.scene.clearScene();

      // Charger la nouvelle map
      await currentGame.scene.loadScene(mapUrl);
    }
  });
});

// Bouton "Charger depuis PC"
document.getElementById('btnBrowseMap').addEventListener('click', () => {
  document.getElementById('fileMapInput').click();
});

// Lorsque l’utilisateur choisit un fichier JSON
document.getElementById('fileMapInput').addEventListener('change', async (event) => {
  if (!currentGame || !currentGame.scene) return;

  // Appelle directement la méthode importScene
  await currentGame.scene.importScene(event, {
    sun: currentGame.scene.sun,
    ground: currentGame.scene.ground,
    skybox: currentGame.scene.skybox
  });
});

