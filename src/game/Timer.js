export class Timer {
  constructor() {
    this.startTime = null;
    this.endTime = null;
    this.isRunning = false;
    this.elapsedTime = 0;

    // Create the timer UI element
    this.createTimerUI();
  }

  // Create the timer display element (only if it doesn't already exist)
  createTimerUI() {
    if (document.getElementById('game-timer')) return;

    const timerElement = document.createElement('div');
    timerElement.id = 'game-timer';
    timerElement.textContent = '00:00.000';

    document.body.appendChild(timerElement);
    this.timerElement = timerElement;
  }

  // Start the timer
  start() {
    if (this.isRunning) return;

    this.startTime = Date.now();
    this.endTime = null;
    this.isRunning = true;
    this.elapsedTime = 0;

    console.log('Timer started');

    // Show the timer on screen
    if (this.timerElement) {
      this.timerElement.style.display = 'block';
    }
  }

  // Stop the timer and return the elapsed time in ms
  stop() {
    if (!this.isRunning) return;

    this.endTime = Date.now();
    this.isRunning = false;
    this.elapsedTime = this.endTime - this.startTime;

    console.log(`Timer stopped - Time: ${this.getFormattedTime()}`);

    return this.elapsedTime;
  }

  // Reset the timer values and UI
  reset() {
    this.startTime = null;
    this.endTime = null;
    this.isRunning = false;
    this.elapsedTime = 0;

    if (this.timerElement) {
      this.timerElement.textContent = '00:00.000';
    }
  }

  // Update the timer every frame while running
  update() {
    if (!this.isRunning) return;

    const currentTime = Date.now();
    this.elapsedTime = currentTime - this.startTime;

    if (this.timerElement) {
      this.timerElement.textContent = this.getFormattedTime();
    }
  }

  // Convert milliseconds into MM:SS.mmm format
  getFormattedTime() {
    const totalMs = this.elapsedTime;
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const milliseconds = totalMs % 1000;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }

  // Return elapsed time in ms
  getElapsedTime() {
    return this.elapsedTime;
  }

  // Hide the timer UI
  hide() {
    if (this.timerElement) {
      this.timerElement.style.display = 'none';
    }
  }

  // Show the timer UI
  show() {
    if (this.timerElement) {
      this.timerElement.style.display = 'block';
    }
  }

  // Remove the timer UI element from the DOM
  destroy() {
    if (this.timerElement) {
      this.timerElement.remove();
      this.timerElement = null;
    }
  }
}
