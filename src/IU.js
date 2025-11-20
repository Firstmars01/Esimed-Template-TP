import GUI from 'lil-gui';

export class UI {
  constructor() {
    this.gui = new GUI();
  }

  addFunction(callback) {
    this.exportScene = () => {
      const event = new CustomEvent('exportScene');
      window.dispatchEvent(event);
    };

    const folder = this.gui.addFolder('Fonctions');
    folder.add(this, 'exportScene').name('Export scene to JSON');

    this.clearScene = () => {
      const event = new CustomEvent('clearScene');
      window.dispatchEvent(event);
    };

    folder.add(this, 'clearScene').name('Clear scene');


    const obj = { importScene: callback };
    folder.add(obj, 'importScene').name('Import Scene');
  }


  addSkyboxUI(files, params, onChange) {
    const folder = this.gui.addFolder('Skybox');
    folder.add(params, 'texture', files).onChange(onChange);
  }

  addGroundUI(textures, params, onChange) {
    const folder = this.gui.addFolder('Ground');
    folder.add(params, 'texture', textures).onChange(() => onChange(params.texture, params.repeats));
    folder.add(params, 'repeats', 1, 2000, 1).onChange(() => onChange(params.texture, params.repeats));
  }

  addSunUI(params, onChange) {
    const folder = this.gui.addFolder('Sun');
    folder.addColor(params, 'color').onChange(() => onChange(params));  // <-- couleur
    folder.add(params, 'intensity', 0, 10).onChange(() => onChange(params));
    folder.add(params, 'x', -100, 100).onChange(() => onChange(params));
    folder.add(params, 'z', -100, 100).onChange(() => onChange(params));
  }

  addSelectionUI() {
    this.selectionData = {
      name: '',
      posX: 0, posY: 0, posZ: 0,
      rotX: 0, rotY: 0, rotZ: 0,
      scaleX: 0, scaleY: 0, scaleZ: 0
    };

    this.selectionFolder = this.gui.addFolder('Objet sélectionné');
    this.selectionFolder.add(this.selectionData, 'name').listen();
    this.selectionFolder.add(this.selectionData, 'posX').listen();
    this.selectionFolder.add(this.selectionData, 'posY').listen();
    this.selectionFolder.add(this.selectionData, 'posZ').listen();
    this.selectionFolder.add(this.selectionData, 'rotX').listen();
    this.selectionFolder.add(this.selectionData, 'rotY').listen();
    this.selectionFolder.add(this.selectionData, 'rotZ').listen();
    this.selectionFolder.add(this.selectionData, 'scaleX').listen();
    this.selectionFolder.add(this.selectionData, 'scaleY').listen();
    this.selectionFolder.add(this.selectionData, 'scaleZ').listen();

    this.selectionFolder.hide(); // caché par défaut
  }

  updateSelection(obj) {
    if (!obj) {
      this.selectionFolder.hide();
      return;
    }

    this.selectionData.name = obj.name;
    this.selectionData.posX = obj.posX;
    this.selectionData.posY = obj.posY;
    this.selectionData.posZ = obj.posZ;
    this.selectionData.rotX = obj.rotX;
    this.selectionData.rotY = obj.rotY;
    this.selectionData.rotZ = obj.rotZ;
    this.selectionData.scaleX = obj.scaleX;
    this.selectionData.scaleY = obj.scaleY;
    this.selectionData.scaleZ = obj.scaleZ;

    this.selectionFolder.show();
  }


}
