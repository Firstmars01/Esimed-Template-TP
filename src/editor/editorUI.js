import { UI } from '../ui/ui.js';

export class EditorUI {
  constructor(editor) {
    this.editor = editor;
    this.ui = new UI();

    // Expose ui sur l'editor pour compatibilité avec le code existant (Selection utilise editor.ui)
    this.editor.ui = this.ui;

    // Connecter les contrôles basiques — ces appels nécessitent que editor ait déjà initialisé
    // scene, skyboxFiles, skyboxParams, groundTexture, groundParams et sunParams.
    if (this.editor.skyboxFiles && this.editor.skyboxParams && this.editor.scene) {
      this.ui.addSkyboxUI(this.editor.skyboxFiles, this.editor.skyboxParams, this.editor.scene.addSkybox.bind(this.editor.scene));
    }

    if (this.editor.groundTexture && this.editor.groundParams && this.editor.scene) {
      this.ui.addGroundUI(this.editor.groundTexture, this.editor.groundParams, this.editor.scene.changeGround.bind(this.editor.scene));
    }

    if (this.editor.sunParams && this.editor.scene) {
      this.ui.addSunUI(this.editor.sunParams, this.editor.scene.changeSun.bind(this.editor.scene));
    }

    // Sélection (visibilité et mise à jour depuis Selection)
    this.ui.addSelectionUI();

    // Import / Export / Clear
    // Crée un input d'import et passe le callback à UI
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json,application/json';
    importInput.style.display = 'none';
    document.body.appendChild(importInput);

    importInput.addEventListener('change', async (event) => {
      // Prefer sceneManager.importScene if available, else fallback to core scene.importScene
      if (this.editor.sceneManager?.importScene) {
        await this.editor.sceneManager.importScene(event, {
          skybox: this.editor.skyboxParams,
          ground: this.editor.groundParams,
        });
      } else if (this.editor.scene?.importScene) {
        await this.editor.scene.importScene(event, {
          skybox: this.editor.skyboxParams,
          ground: this.editor.groundParams,
        });
      }
      importInput.value = '';
    });

    this.ui.addFunction(() => importInput.click());

    // Contrôle clavier (éditeur fournit la propriété keyboardMoveEnabled)
    this.ui.addKeyboardControlOption(this.editor);
  }

  addObjectList(models, addObjectCallback) {
    this.ui.addObjectFromListUI(models, addObjectCallback);
  }

  updateSelection(data) {
    this.ui.updateSelection(data);
  }
}
