// Entry point — initialises audio players and bug animation

import { initAudioPlayers } from './audio.js';
import { initBugs }         from './bugs.js';

document.addEventListener('DOMContentLoaded', () => {
  initAudioPlayers();
  initBugs(); // async, loads Motion from CDN then starts spawning
});
