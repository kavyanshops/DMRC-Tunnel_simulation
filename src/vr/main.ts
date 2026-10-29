import { VRApp } from './VRApp';

const canvas = document.getElementById('vr-canvas') as HTMLCanvasElement;
const btn = document.getElementById('vr-enter') as HTMLButtonElement;
const status = document.getElementById('vr-status') as HTMLElement;
const app = new VRApp(canvas);
app.onStatus = (s) => (status.textContent = s);
(window as any).__vr = app; // debugging / headless checks

const xr = (navigator as any).xr;
if (!window.isSecureContext) {
  btn.textContent = 'VR needs https or localhost';
  status.textContent = 'On Quest: run "adb reverse tcp:3000 tcp:3000" and open http://localhost:3000/vr.html, or serve over https.';
} else if (!xr) {
  btn.textContent = 'WebXR not available';
} else {
  xr.isSessionSupported('immersive-vr').then((ok: boolean) => {
    btn.textContent = ok ? 'Enter VR' : 'VR headset not detected';
    btn.disabled = !ok;
  });
  btn.addEventListener('click', () => app.enterVR().catch((e) => (status.textContent = 'Could not start VR: ' + e.message)));
}
