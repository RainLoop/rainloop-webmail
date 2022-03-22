import { doc, elementById, $htmlCL } from 'Common/Globals';

// Fullscreen must be on app, else other popups fail
export const
	app = elementById('rl-app'),
	appFullscreen = () => (doc.fullscreenElement || doc.webkitFullscreenElement) === app,
	exitFullscreen = () => appFullscreen() && (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc),
	isFullscreen = ko.observable(false),
	toggleFullscreen = () => isFullscreen() ? exitFullscreen() : app.requestFullscreen();

if (app) {
	let event = 'fullscreenchange';
	if (!app.requestFullscreen && app.webkitRequestFullscreen) {
		app.requestFullscreen = app.webkitRequestFullscreen;
		event = 'webkit'+event;
	}
	if (app.requestFullscreen) {
		doc.addEventListener(event, () => {
			isFullscreen(appFullscreen());
			$htmlCL.toggle('rl-fullscreen', appFullscreen());
		});
	}
}
