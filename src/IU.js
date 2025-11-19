import GUI from 'lil-gui';

export class UI {
  constructor() {
    this.gui = new GUI();
  }

  addSkyboxUI(files, params, onChange) {
    const folder = this.gui.addFolder('Skybox');

    folder.add(params, 'texture', files)
      .name('Texture')
      .onChange(value => {
        params.texture = value;
        onChange(value);
      });

    folder.open();
  }
}
