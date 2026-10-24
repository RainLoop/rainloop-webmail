import * as Links from 'Common/Links';
import { doc, SettingsGet, fireEvent, addEventsListener } from 'Common/Globals';
import { addObservablesTo } from 'External/ko';

let notificator = null,
	player = null,
	canPlay = type => !!player?.canPlayType(type).replace('no', ''),

	audioCtx = window.AudioContext || window.webkitAudioContext,

	play = (url, name) => {
		if (player) {
			player.src = url;
			player.play();
			name = name.trim();
			fireEvent('audio.start', name.replace(/\.([a-z0-9]{3})$/, '') || 'audio');
		}
	},

	createNewObject = () => {
		try {
			const player = new Audio;
			if (player.canPlayType && player.pause && player.play) {
				player.preload = 'none';
				player.loop = false;
				player.autoplay = false;
				player.muted = false;
				return player;
			}
		} catch (e) {
			console.error(e);
		}
		return null;
	},

	// The AudioContext is not allowed to start.
	// It must be resumed (or created) after a user gesture on the page. https://goo.gl/7K7WLu
	// Setup listeners to attempt an unlock
	unlockEvents = [
		'click','dblclick',
		'contextmenu',
		'auxclick',
		'mousedown','mouseup',
		'pointerup',
		'touchstart','touchend',
		'keydown','keyup'
	],
	unlock = () => {
		unlockEvents.forEach(type => doc.removeEventListener(type, unlock, true));
		if (audioCtx) {
			console.log('AudioContext ' + audioCtx.state);
			audioCtx.resume();
		}
//		setTimeout(()=>SMAudio.playNotification(0,1),1);
	};

if (audioCtx) {
	audioCtx = audioCtx ? new audioCtx : null;
	audioCtx.onstatechange = unlock;
}
unlockEvents.forEach(type => doc.addEventListener(type, unlock, true));

/**
 * Browsers can't play without user interaction
 */

export const SMAudio = new class {
	constructor() {
		player || (player = createNewObject());

		this.supported = !!player;
		this.supportedMp3 = canPlay('audio/mpeg;');
		this.supportedWav = canPlay('audio/wav; codecs="1"');
		this.supportedOgg = canPlay('audio/ogg; codecs="vorbis"');
		if (player) {
			const stopFn = () => this.pause();
			addEventsListener(player, ['ended','error'], stopFn);
			addEventListener('audio.api.stop', stopFn);
		}

		addObservablesTo(this, {
			notifications: false
		});
	}

	paused() {
		return !player || player.paused;
	}

	stop() {
		this.pause();
	}

	pause() {
		player?.pause();
		fireEvent('audio.stop');
	}

	playMp3(url, name) {
		this.supportedMp3 && play(url, name);
	}

	playOgg(url, name) {
		this.supportedOgg && play(url, name);
	}

	playWav(url, name) {
		this.supportedWav && play(url, name);
	}

	/**
	 * Used with SoundNotification setting
	 */
	playNotification(force, silent) {
		if (force || this.notifications()) {
			if ('running' == audioCtx.state && (this.supportedMp3 || this.supportedOgg)) {
				notificator = notificator || createNewObject();
				if (notificator) {
//					SettingsGet('NotificationSound').startsWith('custom@')
					notificator.src = Links.staticLink('sounds/'
						+ SettingsGet('NotificationSound')
						+ (this.supportedMp3 ? '.mp3' : '.ogg'));
					notificator.volume = silent ? 0.01 : 1;
					notificator.play();
				}
			} else {
				console.log('No audio: ' + audioCtx.state);
			}
		}
	}
};
