import { UI } from '../ui/UI.js';

export class EditorUI {
  constructor(editor) {
    this.editor = editor;
    this.ui = new UI();

    // Expose ui on the editor for compatibility with existing code (Selection uses editor.ui)
    this.editor.ui = this.ui;

    // Connect basic controls — these calls require that the editor has already initialized
    // scene, skyboxFiles, skyboxParams, groundTexture, groundParams and sunParams.
    if (this.editor.skyboxFiles && this.editor.skyboxParams && this.editor.scene) {
      this.ui.addSkyboxUI(
        this.editor.skyboxFiles,
        this.editor.skyboxParams,
        this.editor.scene.addSkybox.bind(this.editor.scene)
      );
    }

    if (this.editor.groundTexture && this.editor.groundParams && this.editor.scene) {
      this.ui.addGroundUI(
        this.editor.groundTexture,
        this.editor.groundParams,
        this.editor.scene.changeGround.bind(this.editor.scene)
      );
    }

    if (this.editor.sunParams && this.editor.scene) {
      this.ui.addSunUI(
        this.editor.sunParams,
        this.editor.scene.changeSun.bind(this.editor.scene)
      );
    }

    // Selection (visibility and update from Selection)
    this.ui.addSelectionUI();

    // Creates an import input and passes the callback to UI
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json,application/json';
    importInput.style.display = 'none';
    document.body.appendChild(importInput);

    importInput.addEventListener('change', async (event) => {
      // Prefer sceneManager.importScene if available, otherwise fallback to core scene.importScene
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

    // Keyboard control (editor provides the property keyboardMoveEnabled)
    this.ui.addKeyboardControlOption(this.editor);
  }

  addObjectList(models, addObjectCallback) {
    this.ui.addObjectFromListUI(models, addObjectCallback);
  }

  updateSelection(data) {
    this.ui.updateSelection(data);
  }
}
