// Android app only: the hardware Back button must never close the game by accident.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { ST } from './state.js';
import { setPause } from './ui.js';
import { pvEnd } from './trailer.js';

if (Capacitor.isNativePlatform()) {
  let lastBack = 0, toast = null;
  const hint = () => {
    if (!toast) {
      toast = document.createElement('div');
      toast.textContent = 'Press back again to exit';
      toast.style.cssText = 'position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:60;padding:10px 18px;border-radius:20px;background:rgba(20,19,43,.92);color:#F1ECFF;font:600 14px sans-serif;pointer-events:none;display:none';
      document.body.appendChild(toast);
    }
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 1800);
  };
  App.addListener('backButton', () => {
    const menuPanel = document.getElementById('menuPanel'), closet = document.getElementById('closet');
    if (menuPanel.classList.contains('open')) { menuPanel.classList.remove('open'); return; }
    if (!closet.classList.contains('hide')) { document.getElementById('closetDone').click(); return; }
    if (ST.state === 'pv') { pvEnd(); return; }
    if (ST.state === 'play') { if (!ST.paused) setPause(true); return; }   // paused: Back does nothing, use Resume or Restart
    const now = Date.now();                                                // menu / game over: press twice to leave
    if (now - lastBack < 2000) App.exitApp(); else { lastBack = now; hint(); }
  });
}
