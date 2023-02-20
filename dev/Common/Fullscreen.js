import { doc, appEl, $htmlCL } from 'Common/Globals';

// Fullscreen must be on app, else other popups fail
export const
	appFullscreen = () => (doc.fullscreenElement || doc.webkitFullscreenElement) === appEl,
	exitFullscreen = () => appFullscreen() && (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc),
	isFullscreen = ko.observable(false),
	toggleFullscreen = () => isFullscreen() ? exitFullscreen() : appEl.requestFullscreen();

if (appEl) {
	let event = 'fullscreenchange';
	if (!appEl.requestFullscreen && appEl.webkitRequestFullscreen) {
		appEl.requestFullscreen = appEl.webkitRequestFullscreen;
		event = 'webkit'+event;
	}
	if (appEl.requestFullscreen) {
		doc.addEventListener(event, () => {
			isFullscreen(appFullscreen());
			$htmlCL.toggle('rl-fullscreen', appFullscreen());
		});
	}
}
