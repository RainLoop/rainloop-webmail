
import {window, $} from 'common';
import Globals from 'Common/Globals';
import Utils from 'Common/Utils';
import Links from 'Common/Links';
import Events from 'Common/Events';

class Audio
{
	player = null;
	notificator = null;

	supported = false;
	supportedMp3 = false;
	supportedOgg = false;
	supportedWav = false;
	supportedNotification = false;

	constructor()
	{
		this.player = this.createNewObject();

		this.supported = !Globals.bMobileDevice && !Globals.bSafari && !!this.player && !!this.player.play;
		if (this.supported && this.player.canPlayType)
		{
			this.supportedMp3 = '' !== this.player.canPlayType('audio/mpeg;').replace(/no/, '');
			this.supportedWav = '' !== this.player.canPlayType('audio/wav; codecs="1"').replace(/no/, '');
			this.supportedOgg = '' !== this.player.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, '');
			this.supportedNotification = this.supported && this.supportedMp3;
		}

		if (!this.player || (!this.supportedMp3 && !this.supportedOgg && !this.supportedWav))
		{
			this.supported = false;
			this.supportedMp3 = false;
			this.supportedOgg = false;
			this.supportedWav = false;
			this.supportedNotification = false;
		}

		if (this.supported)
		{
			$(this.player).on('ended error', () => this.stop());

			Events.sub('audio.api.stop', () => this.stop());
		}
	}

	createNewObject() {
		const player = window.Audio ? new window.Audio() : null;
		if (player && player.canPlayType && player.pause && player.play)
		{
			player.preload = 'none';
			player.loop = false;
			player.autoplay = false;
			player.muted = false;
		}

		return player;
	}

	paused() {
		return this.supported ? !!this.player.paused : true;
	}

	stop() {
		if (this.supported && this.player.pause)
		{
			this.player.pause();
		}

		Events.pub('audio.stop');
	}

	pause() {
		this.stop();
	}

	clearName(name = '', ext = '') {

		name = Utils.trim(name);
		if (ext && '.' + ext === name.toLowerCase().substr((ext.length + 1) * -1))
		{
			name = Utils.trim(name.substr(0, name.length - 4));
		}

		return '' === name ? 'audio' : name;
	}

	playMp3(url, name) {
		if (this.supported && this.supportedMp3)
		{
			this.player.src = url;
			this.player.play();

			Events.pub('audio.start', [this.clearName(name, 'mp3'), 'mp3']);
		}
	}

	playOgg(url, name) {
		if (this.supported && this.supportedOgg)
		{
			this.player.src = url;
			this.player.play();

			name = this.clearName(name, 'oga');
			name = this.clearName(name, 'ogg');

			Events.pub('audio.start', [name, 'ogg']);
		}
	}

	playWav(url, name) {
		if (this.supported && this.supportedWav)
		{
			this.player.src = url;
			this.player.play();

			Events.pub('audio.start', [this.clearName(name, 'wav'), 'wav']);
		}
	}

	playNotification() {
		if (this.supported && this.supportedMp3)
		{
			if (!this.notificator)
			{
				this.notificator = this.createNewObject();
				this.notificator.src = Links.sound('new-mail.mp3');
			}

			if (this.notificator && this.notificator.play)
			{
				this.notificator.play();
			}
		}
	}
}

module.exports = new Audio();
