import { UI } from '../ui/ui.js';

export class GameUI {
  constructor(game) {
    this.game = game;
    this.ui = new UI();

    // Expose ui on game for compatibility
    this.game.ui = this.ui;

    // Game-specific UI can be added here. For now, we expose selection UI and object adding capabilities
    this.ui.addSelectionUI();

    // If game provides model lists or functions, wire them
    if (this.game.modelList && this.game.addObject) {
      this.ui.addObjectFromListUI(this.game.modelList, this.game.addObject.bind(this.game));
    }

    // Keyboard control option (game may want to use keyboardMoveEnabled)
    if (typeof this.game.keyboardMoveEnabled !== 'undefined') {
      this.ui.addKeyboardControlOption(this.game);
    }
  }

  updateSelection(data) {
    this.ui.updateSelection(data);
  }
}

