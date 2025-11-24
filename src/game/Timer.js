// filepath: src/game/Timer.js
export class Timer {
    constructor() {
        this.startTime = null;
        this.endTime = null;
        this.isRunning = false;
        this.elapsedTime = 0;

        // Créer l'élément UI du chronomètre
        this.createTimerUI();
    }

    createTimerUI() {
        // Vérifier si l'élément existe déjà
        if (document.getElementById('game-timer')) return;

        const timerElement = document.createElement('div');
        timerElement.id = 'game-timer';
        timerElement.textContent = '00:00.000';

        document.body.appendChild(timerElement);
        this.timerElement = timerElement;
    }

    start() {
        if (this.isRunning) return;

        this.startTime = Date.now();
        this.endTime = null;
        this.isRunning = true;
        this.elapsedTime = 0;

        console.log('⏱️ Chronomètre démarré');

        // Afficher le timer
        if (this.timerElement) {
            this.timerElement.style.display = 'block';
        }
    }

    stop() {
        if (!this.isRunning) return;

        this.endTime = Date.now();
        this.isRunning = false;
        this.elapsedTime = this.endTime - this.startTime;

        console.log(`Chronomètre arrêté - Temps: ${this.getFormattedTime()}`);

        return this.elapsedTime;
    }

    reset() {
        this.startTime = null;
        this.endTime = null;
        this.isRunning = false;
        this.elapsedTime = 0;

        if (this.timerElement) {
            this.timerElement.textContent = '00:00.000';
        }
    }

    update() {
        if (!this.isRunning) return;

        const currentTime = Date.now();
        this.elapsedTime = currentTime - this.startTime;

        if (this.timerElement) {
            this.timerElement.textContent = this.getFormattedTime();
        }
    }

    getFormattedTime() {
        const totalMs = this.elapsedTime;
        const minutes = Math.floor(totalMs / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        const milliseconds = totalMs % 1000;

        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    }

    getElapsedTime() {
        return this.elapsedTime;
    }

    hide() {
        if (this.timerElement) {
            this.timerElement.style.display = 'none';
        }
    }

    show() {
        if (this.timerElement) {
            this.timerElement.style.display = 'block';
        }
    }

    destroy() {
        if (this.timerElement) {
            this.timerElement.remove();
            this.timerElement = null;
        }
    }
}