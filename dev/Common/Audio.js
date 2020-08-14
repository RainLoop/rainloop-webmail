import * as Links from 'Common/Links';

class Audio {
	notificator = null;
	player = null;

	supported = false;
	supportedMp3 = false;
	supportedOgg = false;
	supportedWav = false;
	supportedNotification = false;

	constructor() {
		this.player = this.createNewObject();

		// Safari can't play without user interaction
		this.supported = !!this.player && !!this.player.play;
		if (this.supported && this.player && this.player.canPlayType) {
			this.supportedMp3 = !!this.player.canPlayType('audio/mpeg;').replace(/no/, '');
			this.supportedWav = !!this.player.canPlayType('audio/wav; codecs="1"').replace(/no/, '');
			this.supportedOgg = !!this.player.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, '');
			this.supportedNotification = this.supported && this.supportedMp3;
		}

		if (!this.player || (!this.supportedMp3 && !this.supportedOgg && !this.supportedWav)) {
			this.supported = false;
			this.supportedMp3 = false;
			this.supportedOgg = false;
			this.supportedWav = false;
			this.supportedNotification = false;
		}

		if (this.supported && this.player) {
			const stopFn = () => this.stop();

			this.player.addEventListener('ended', stopFn);
			this.player.addEventListener('error', stopFn);

			addEventListener('audio.api.stop', stopFn);
		}
	}

	createNewObject() {
		try {
			const player = window.Audio ? new Audio() : null;
			if (player && player.canPlayType && player.pause && player.play) {
				player.preload = 'none';
				player.loop = false;
				player.autoplay = false;
				player.muted = false;
			}

			return player;
		} catch (e) {} // eslint-disable-line no-empty

		return null;
	}

	paused() {
		return this.supported ? !!this.player.paused : true;
	}

	stop() {
		if (this.supported && this.player.pause) {
			this.player.pause();
		}

		dispatchEvent(new CustomEvent('audio.stop'));
	}

	pause() {
		this.stop();
	}

	clearName(name = '', ext = '') {
		name = name.trim();
		if (ext && '.' + ext === name.toLowerCase().substr((ext.length + 1) * -1)) {
			name = name.substr(0, name.length - 4).trim();
		}

		return name || 'audio';
	}

	playMp3(url, name) {
		if (this.supported && this.supportedMp3) {
			this.player.src = url;
			this.player.play();

			dispatchEvent(new CustomEvent('audio.start', {detail:this.clearName(name, 'mp3')}));
		}
	}

	playOgg(url, name) {
		if (this.supported && this.supportedOgg) {
			this.player.src = url;
			this.player.play();

			name = this.clearName(name, 'oga');
			name = this.clearName(name, 'ogg');

			dispatchEvent(new CustomEvent('audio.start', {detail:name}));
		}
	}

	playWav(url, name) {
		if (this.supported && this.supportedWav) {
			this.player.src = url;
			this.player.play();

			dispatchEvent(new CustomEvent('audio.start', {detail:this.clearName(name, 'wav')}));
		}
	}

	playNotification() {
		if (this.supported && this.supportedMp3) {
			if (!this.notificator) {
				this.notificator = this.createNewObject();
				this.notificator.src = Links.sound('new-mail.mp3');
			}

			if (this.notificator && this.notificator.play) {
				this.notificator.play();
			}
		}
	}
}

export default new Audio();
