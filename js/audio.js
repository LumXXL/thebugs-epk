// Custom HTML5 audio player — play/pause, scrubbing, time display
// Only one track plays at a time across all players on the page.

export function initAudioPlayers() {
  const cards = document.querySelectorAll('.track-card');
  let activeAudio = null;
  let activeCard = null;

  cards.forEach(card => {
    const audio    = card.querySelector('audio');
    const playBtn  = card.querySelector('.play-btn');
    const iconPlay = card.querySelector('.icon-play');
    const iconPause= card.querySelector('.icon-pause');
    const fill     = card.querySelector('.progress-fill');
    const range    = card.querySelector('.progress-input');
    const tCurrent = card.querySelector('.time-current');
    const tTotal   = card.querySelector('.time-total');
    const title    = card.querySelector('.track-title').textContent;

    function fmt(s) {
      if (!s || isNaN(s)) return '—:——';
      return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    }

    function setPlaying(on) {
      iconPlay.style.display  = on ? 'none' : '';
      iconPause.style.display = on ? '' : 'none';
      card.classList.toggle('is-playing', on);
      playBtn.setAttribute('aria-label', `${on ? 'Pause' : 'Play'} ${title}`);
    }

    function stopOther() {
      if (activeAudio && activeAudio !== audio) {
        activeAudio.pause();
        activeCard.querySelector('.icon-play').style.display  = '';
        activeCard.querySelector('.icon-pause').style.display = 'none';
        activeCard.classList.remove('is-playing');
      }
    }

    audio.addEventListener('loadedmetadata', () => {
      tTotal.textContent = fmt(audio.duration);
    });

    // Show loading state while buffering (e.g. on slow mobile connections)
    audio.addEventListener('waiting', () => {
      playBtn.classList.add('is-loading');
    });
    audio.addEventListener('canplay', () => {
      playBtn.classList.remove('is-loading');
    });
    audio.addEventListener('playing', () => {
      playBtn.classList.remove('is-loading');
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      fill.style.width = pct + '%';
      range.value = pct;
      tCurrent.textContent = fmt(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setPlaying(false);
      fill.style.width = '0%';
      range.value = 0;
      tCurrent.textContent = '0:00';
      activeAudio = null;
      activeCard  = null;
    });

    playBtn.addEventListener('click', () => {
      if (audio.paused) {
        stopOther();
        audio.play();
        setPlaying(true);
        activeAudio = audio;
        activeCard  = card;
      } else {
        audio.pause();
        setPlaying(false);
        activeAudio = null;
        activeCard  = null;
      }
    });

    // Drag scrubber
    range.addEventListener('input', () => {
      if (audio.duration) {
        audio.currentTime = (range.value / 100) * audio.duration;
        fill.style.width = range.value + '%';
      }
    });

    // Click anywhere on the progress bar
    card.querySelector('.progress-bar').addEventListener('click', e => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (audio.duration) {
        audio.currentTime = pct * audio.duration;
        fill.style.width  = (pct * 100) + '%';
        range.value       = pct * 100;
      }
    });
  });
}
