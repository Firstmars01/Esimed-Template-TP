import { startApp, disposeCurrent, getSceneApi, getThreeScene } from "../main.js";
import { Game } from "../game/game.js";
import { Editor } from "../editor/editor.js";

// --- Sélecteurs UI ---
const mainMenu = document.getElementById('mainMenu');
const playBtn = document.getElementById('playBtn');
const editorBtn = document.getElementById('editorBtn');

const btnHome = document.getElementById('btnHome');
const inGameMenu = document.getElementById('inGameMenu');

// --- Panels ---
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

// --- Boutons menu principal ---
playBtn.addEventListener('click', () => startApp(Game));
editorBtn.addEventListener('click', () => startApp(Editor));

// --- Bouton Home ---
btnHome.addEventListener('click', async () => {
    await disposeCurrent();
    window.location.reload();
});

// --- Toggler de panels ---
document.getElementById('btnCommands').addEventListener('click', () => togglePanel('commands'));
document.getElementById('btnLoadMap').addEventListener('click', () => togglePanel('maps'));
document.getElementById('btnChangeCar').addEventListener('click', () => togglePanel('cars'));

// --- Charger des maps (boutons statiques) ---
document.querySelectorAll('.mapButton').forEach(btn => {
    btn.addEventListener('click', async () => {
        const mapUrl = btn.dataset.map;
        const currentGame = window.__app.getCurrent();
        if (!mapUrl || !currentGame) return;

        const sceneApi = getSceneApi(currentGame);
        if (!sceneApi) return;

        if (typeof sceneApi.clearScene === 'function') sceneApi.clearScene();

        if (typeof sceneApi.init === 'function') {
            await sceneApi.init(mapUrl);
        } else if (typeof sceneApi.loadScene === 'function') {
            await sceneApi.loadScene(mapUrl);
        }
    });
});

// --- Charger map depuis PC ---
document.getElementById('btnBrowseMap').addEventListener('click', () => {
    document.getElementById('fileMapInput').click();
});

document.getElementById('fileMapInput').addEventListener('change', async (event) => {
    const currentGame = window.__app.getCurrent();
    if (!currentGame) return;

    const sceneApi = getSceneApi(currentGame);
    if (!sceneApi) return;

    const params = {};

    if (currentGame.sceneManager) {
        params.sun = currentGame.sceneManager.getSceneWrapper?.().sun ?? null;
        params.ground = currentGame.sceneManager.getSceneWrapper?.().ground ?? null;
        params.skybox = currentGame.sceneManager.getSceneWrapper?.().skybox ?? null;
    } else if (currentGame.scene) {
        params.sun = currentGame.scene.sun ?? null;
        params.ground = currentGame.scene.ground ?? null;
        params.skybox = currentGame.scene.skybox ?? null;
    }

    if (typeof sceneApi.importScene === 'function') {
        await sceneApi.importScene(event, params);
    } else if (typeof sceneApi.loadScene === 'function') {
        await sceneApi.loadScene(event.target.files[0]);
    }
});

// --- Charger une voiture ---
async function loadCarIntoScene(modelName) {
    const currentGame = window.__app.getCurrent();
    if (!modelName || !currentGame) return;

    const scene = getThreeScene(currentGame);
    if (!scene) return;

    if (!currentGame.car?.loadModel) return;

    await currentGame.car.loadModel(modelName, scene);

    if (typeof currentGame.buildObstacleList === 'function') {
        currentGame.car.setObstacles(currentGame.buildObstacleList());
    }
}

// --- Boutons statiques voitures ---
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('carButton')) {
        const model = e.target.dataset.model;
        loadCarIntoScene(model).catch(err => console.error(err));
    }
});

// --- Charger dynamiquement les boutons des voitures ---
async function loadCarButtons() {
    try {
        const response = await fetch('/models/car/cars.json');
        const cars = await response.json();

        const container = document.getElementById('carPanel');
        container.innerHTML = "";

        cars.forEach(filename => {
            const modelName = filename.replace('.glb', '');

            const btn = document.createElement('button');
            btn.className = 'mapButton carButton';
            btn.dataset.model = modelName;
            btn.textContent = modelName;

            container.appendChild(btn);
        });
    } catch (err) {
        console.error('Erreur loading car buttons', err);
    }
}

loadCarButtons();
