import GUI from 'lil-gui';

export class UI {
  constructor() {
    this.gui = new GUI();
    this.selectionData = null;
    this.selectionFolder = null;
  }

  /*** Global functions (Export, Clear, Import) ***/
  addFunction(importCallback) {
    const folder = this.gui.addFolder('Functions');

    folder.add(this, 'exportScene').name('Export scene to JSON');
    folder.add(this, 'clearScene').name('Clear scene');
    folder.add({ importScene: importCallback }, 'importScene').name('Import Scene');
  }

  exportScene() {
    window.dispatchEvent(new CustomEvent('exportScene'));
  }

  clearScene() {
    window.dispatchEvent(new CustomEvent('clearScene'));
  }

  /*** Skybox ***/
  addSkyboxUI(files, params, onChange) {
    const folder = this.gui.addFolder('Skybox');
    folder.add(params, 'texture', files).onChange(onChange);
  }

  /*** Ground ***/
  addGroundUI(textures, params, onChange) {
    const folder = this.gui.addFolder('Ground');
    folder.add(params, 'texture', textures).onChange(() => onChange(params.texture, params.repeats));
    folder.add(params, 'repeats', 1, 2000, 1).onChange(() => onChange(params.texture, params.repeats));
  }

  /*** Sun ***/
  addSunUI(params, onChange) {
    const folder = this.gui.addFolder('Sun');
    folder.addColor(params, 'color').onChange(() => onChange(params));
    folder.add(params, 'intensity', 0, 10).onChange(() => onChange(params));
    folder.add(params, 'x', -1000, 1000).onChange(() => onChange(params));
    folder.add(params, 'z', -1000, 1000).onChange(() => onChange(params));
  }

  /*** Object selection ***/
  addSelectionUI() {
    this.selectionData = {
      name: '',
      posX: 0, posY: 0, posZ: 0,
      rotX: 0, rotY: 0, rotZ: 0,
      scaleX: 0, scaleY: 0, scaleZ: 0
    };

    this.selectionFolder = this.gui.addFolder('Selected Object');

    const fields = [
      'name',
      'posX', 'posY', 'posZ',
      'rotX', 'rotY', 'rotZ',
      'scaleX', 'scaleY', 'scaleZ'
    ];

    fields.forEach(field => this.selectionFolder.add(this.selectionData, field).listen());

    this.selectionFolder.hide(); // hidden by default
  }

  updateSelection(obj) {
    if (!obj) {
      this.selectionFolder.hide();
      return;
    }

    // Update values
    this.selectionData.name = obj.name || '';
    ['pos', 'rot', 'scale'].forEach(prefix => {
      ['X', 'Y', 'Z'].forEach(axis => {
        this.selectionData[`${prefix}${axis}`] = obj[`${prefix}${axis}`] ?? 0;
      });
    });

    this.selectionFolder.show();
  }

  /*** Keyboard control ***/
  addKeyboardControlOption(params) {
    const folder = this.gui.addFolder('Keyboard Control');
    folder.add(params, 'keyboardMoveEnabled').name('Keyboard movement ZQSD');
  }

  /*** Add object from a list ***/
  addObjectFromListUI(models, addObjectCallback) {
    const folder = this.gui.addFolder('Add Object');
    const params = { selectedModel: models[0] || '' };

    folder.add(params, 'selectedModel', models).name('Model');
    folder.add({ add: () => addObjectCallback(params.selectedModel) }, 'add').name('Add');
  }
}
