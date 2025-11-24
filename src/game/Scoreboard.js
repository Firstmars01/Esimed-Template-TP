// filepath: src/game/Scoreboard.js
export class Scoreboard {
    constructor(maxScores = 10) {
        this.maxScores = maxScores;
        this.storageKey = 'racing_game_scores';
        this.currentTrack = 'default';
        this.scores = this.loadScores();
    }

    // Charger les scores depuis localStorage
    loadScores() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Erreur chargement scores:', e);
            return {};
        }
    }

    // Sauvegarder les scores dans localStorage
    saveScores() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.scores));
        } catch (e) {
            console.error('Erreur sauvegarde scores:', e);
        }
    }

    // Définir la piste actuelle
    setTrack(trackName) {
        this.currentTrack = trackName || 'default';
        if (!this.scores[this.currentTrack]) {
            this.scores[this.currentTrack] = [];
        }
    }

    // Ajouter un nouveau score
    addScore(time, playerName = 'Player') {
        if (!this.scores[this.currentTrack]) {
            this.scores[this.currentTrack] = [];
        }

        const score = {
            time: time,
            player: playerName,
            date: new Date().toISOString()
        };

        this.scores[this.currentTrack].push(score);

        // Trier par temps (croissant)
        this.scores[this.currentTrack].sort((a, b) => a.time - b.time);

        // Garder seulement les N meilleurs
        this.scores[this.currentTrack] = this.scores[this.currentTrack].slice(0, this.maxScores);

        this.saveScores();

        // Retourner la position du score
        const position = this.scores[this.currentTrack].findIndex(s =>
            s.time === time && s.player === playerName
        ) + 1;

        return position;
    }

    // Obtenir les scores de la piste actuelle
    getScores() {
        return this.scores[this.currentTrack] || [];
    }

    // Obtenir tous les scores de toutes les pistes
    getAllScores() {
        return this.scores;
    }

    // Vérifier si un temps est un record
    isNewRecord(time) {
        const trackScores = this.scores[this.currentTrack];
        if (!trackScores || trackScores.length === 0) return true;
        return time < trackScores[0].time;
    }

    // Vérifier si un temps entre dans le top N
    isTopScore(time) {
        const trackScores = this.scores[this.currentTrack];
        if (!trackScores || trackScores.length < this.maxScores) return true;
        return time < trackScores[trackScores.length - 1].time;
    }

    // Obtenir le meilleur temps
    getBestTime() {
        const trackScores = this.scores[this.currentTrack];
        if (!trackScores || trackScores.length === 0) return null;
        return trackScores[0];
    }

    // Formater le temps en MM:SS.mmm
    formatTime(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        const ms = milliseconds % 1000;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    // Mettre à jour l'affichage du scoreboard
    updateScoreboardDisplay() {
        const content = document.getElementById('scoreboard-content');
        if (!content) return;

        const scores = this.getScores();

        if (scores.length === 0) {
            content.innerHTML = '<div class="no-scores">No times recorded yet. Be the first!</div>';
            return;
        }

        let html = '<div class="scores-list">';

        scores.forEach((score, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            const date = new Date(score.date).toLocaleDateString();

            html += `
                <div class="score-item ${index < 3 ? 'top-three' : ''}">
                    <span class="rank">${medal || `#${index + 1}`}</span>
                    <span class="player-name">${score.player}</span>
                    <span class="time">${this.formatTime(score.time)}</span>
                    <span class="date">${date}</span>
                </div>
            `;
        });

        html += '</div>';
        content.innerHTML = html;
    }

    // Afficher le scoreboard
    showScoreboard() {
        this.updateScoreboardDisplay();
        const panel = document.getElementById('scoreboard-panel');
        if (panel) {
            panel.style.display = 'flex';
        }

        // Event listeners (vérifier s'ils existent déjà)
        const closeBtn = document.getElementById('close-scoreboard');
        const clearBtn = document.getElementById('clear-scores-btn');

        if (closeBtn && !closeBtn.dataset.listenerAdded) {
            closeBtn.addEventListener('click', () => this.hideScoreboard());
            closeBtn.dataset.listenerAdded = 'true';
        }

        if (clearBtn && !clearBtn.dataset.listenerAdded) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete all scores?')) {
                    this.clearScores();
                    this.updateScoreboardDisplay();
                }
            });
            clearBtn.dataset.listenerAdded = 'true';
        }

        // Fermer avec ESC (ajouter une seule fois)
        if (!document.body.dataset.scoreboardEscListener) {
            document.addEventListener('keydown', (e) => {
                const panel = document.getElementById('scoreboard-panel');
                if (e.key === 'Escape' && panel && panel.style.display === 'flex') {
                    this.hideScoreboard();
                }
            });
            document.body.dataset.scoreboardEscListener = 'true';
        }
    }

    // Masquer le scoreboard
    hideScoreboard() {
        const panel = document.getElementById('scoreboard-panel');
        if (panel) {
            panel.style.display = 'none';
        }

        // Réafficher l'overlay de fin s'il existe
        const finishOverlay = document.getElementById('game-finish-overlay');
        if (finishOverlay) {
            finishOverlay.style.display = 'flex';
        }
    }

    // Effacer tous les scores
    clearScores() {
        this.scores = {};
        this.saveScores();
    }

    // Effacer les scores d'une piste spécifique
    clearTrackScores(trackName) {
        if (this.scores[trackName]) {
            delete this.scores[trackName];
            this.saveScores();
        }
    }

    // Créer le bouton pour ouvrir le scoreboard
    createScoreboardButton() {
        if (document.getElementById('btn-scoreboard')) return;

        const inGameMenu = document.getElementById('inGameMenu');
        if (!inGameMenu) return;

        const btn = document.createElement('button');
        btn.id = 'btn-scoreboard';
        btn.textContent = 'Scoreboard';
        btn.addEventListener('click', () => this.showScoreboard());

        // Insérer après le bouton "Commands"
        const btnCommands = document.getElementById('btnCommands');
        if (btnCommands && btnCommands.nextSibling) {
            inGameMenu.insertBefore(btn, btnCommands.nextSibling);
        } else {
            inGameMenu.appendChild(btn);
        }
    }

    // Demander le nom du joueur
    promptPlayerName() {
        const name = prompt('Enter your name for the leaderboard:', 'Player');
        return name || 'Anonymous';
    }
}