import './style.css';
import { Editor } from "./editor.js";
import { Game } from "./game.js";

const mainMenu = document.getElementById('mainMenu');
const playBtn = document.getElementById('playBtn');
const editorBtn = document.getElementById('editorBtn');
const loader = document.getElementById('loader');

function showLoader() {
  loader.style.display = 'flex';
}

function hideLoader() {
  loader.style.display = 'none';
}

playBtn.addEventListener('click', () => {
  mainMenu.style.display = 'none';
  showLoader();

  // Simuler le chargement avec un petit délai
  setTimeout(() => {
    const app = new Game();
    hideLoader();
  }, 1500); // 1,5s d'animation
});

editorBtn.addEventListener('click', () => {
  mainMenu.style.display = 'none';
  showLoader();

  setTimeout(() => {
    const app = new Editor();
    hideLoader();
  }, 1500);
});
