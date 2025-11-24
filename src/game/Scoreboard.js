export class Scoreboard {
  constructor(maxScores = 10) {
    this.maxScores = maxScores;
    this.storageKey = 'racing_game_scores';
    this.currentTrack = 'default';
    this.scores = this.loadScores();
  }

  // Load scores from localStorage
  loadScores() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Error loading scores:', e);
      return {};
    }
  }

  // Save scores into localStorage
  saveScores() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.scores));
    } catch (e) {
      console.error('Error saving scores:', e);
    }
  }

  // Set the current track name
  setTrack(trackName) {
    this.currentTrack = trackName || 'default';
    if (!this.scores[this.currentTrack]) {
      this.scores[this.currentTrack] = [];
    }
  }

  // Add a new score to the leaderboard
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

    // Sort scores by time (ascending)
    this.scores[this.currentTrack].sort((a, b) => a.time - b.time);

    // Keep only the top N scores
    this.scores[this.currentTrack] = this.scores[this.currentTrack].slice(0, this.maxScores);

    this.saveScores();

    // Return the score’s ranking position
    const position = this.scores[this.currentTrack].findIndex(s =>
      s.time === time && s.player === playerName
    ) + 1;

    return position;
  }

  // Get scores for the current track
  getScores() {
    return this.scores[this.currentTrack] || [];
  }

  // Get all scores from all tracks
  getAllScores() {
    return this.scores;
  }

  // Check if a given time is a new record
  isNewRecord(time) {
    const trackScores = this.scores[this.currentTrack];
    if (!trackScores || trackScores.length === 0) return true;
    return time < trackScores[0].time;
  }

  // Check if a time fits inside the top N best results
  isTopScore(time) {
    const trackScores = this.scores[this.currentTrack];
    if (!trackScores || trackScores.length < this.maxScores) return true;
    return time < trackScores[trackScores.length - 1].time;
  }

  // Get the best time of the current track
  getBestTime() {
    const trackScores = this.scores[this.currentTrack];
    if (!trackScores || trackScores.length === 0) return null;
    return trackScores[0];
  }

  // Format time as MM:SS.mmm
  formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const ms = milliseconds % 1000;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  // Update the HTML scoreboard display
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

  // Open the scoreboard panel
  showScoreboard() {
    this.updateScoreboardDisplay();
    const panel = document.getElementById('scoreboard-panel');
    if (panel) {
      panel.style.display = 'flex';
    }

    // Event listeners (add only once)
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

    // Close with ESC key (add once only)
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

  // Hide the scoreboard panel
  hideScoreboard() {
    const panel = document.getElementById('scoreboard-panel');
    if (panel) {
      panel.style.display = 'none';
    }

    // Re-show the game finish overlay if it exists
    const finishOverlay = document.getElementById('game-finish-overlay');
    if (finishOverlay) {
      finishOverlay.style.display = 'flex';
    }
  }

  // Delete all saved scores
  clearScores() {
    this.scores = {};
    this.saveScores();
  }

  // Delete scores from a specific track
  clearTrackScores(trackName) {
    if (this.scores[trackName]) {
      delete this.scores[trackName];
      this.saveScores();
    }
  }

  // Create the button that opens the scoreboard
  createScoreboardButton() {
    if (document.getElementById('btn-scoreboard')) return;

    const inGameMenu = document.getElementById('inGameMenu');
    if (!inGameMenu) return;

    const btn = document.createElement('button');
    btn.id = 'btn-scoreboard';
    btn.textContent = 'Scoreboard';
    btn.addEventListener('click', () => this.showScoreboard());

    // Insert after the "Commands" button
    const btnCommands = document.getElementById('btnCommands');
    if (btnCommands && btnCommands.nextSibling) {
      inGameMenu.insertBefore(btn, btnCommands.nextSibling);
    } else {
      inGameMenu.appendChild(btn);
    }
  }

  // Ask the player to input their name
  promptPlayerName() {
    const name = prompt('Enter your name for the leaderboard:', 'Player');
    return name || 'Anonymous';
  }
}
