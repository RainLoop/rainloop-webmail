
(function () {

	'use strict';

	var
		window = require('window'),
		$ = require('$'),

		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),
		Events = require('Common/Events')
	;

	/**
	 * @constructor
	 */
	function Audio()
	{
		var self = this;

//		this.userMedia = window.navigator.getUserMedia || window.navigator.webkitGetUserMedia ||
//			window.navigator.mozGetUserMedia || window.navigator.msGetUserMedia;
//
//		this.audioContext = window.AudioContext || window.webkitAudioContext;
//		if (!this.audioContext || !window.Float32Array)
//		{
//			this.audioContext = null;
//			this.userMedia = null;
//		}

		this.player = this.createNewObject();

		this.supported = !Globals.bMobileDevice && !Globals.bSafari && !!this.player && !!this.player.play;
		if (this.supported &&  this.player.canPlayType)
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
			$(this.player).on('ended error', function () {
				self.stop();
			});

			Events.sub('audio.api.stop', function () {
				self.stop();
			});
		}
	}

	Audio.prototype.player = null;
	Audio.prototype.notificator = null;

	Audio.prototype.supported = false;
	Audio.prototype.supportedMp3 = false;
	Audio.prototype.supportedOgg = false;
	Audio.prototype.supportedWav = false;
	Audio.prototype.supportedNotification = false;

//	Audio.prototype.record = function ()
//	{
//		this.getUserMedia({audio:true}, function () {
//		}, function(oError) {
//		});
//	};

	Audio.prototype.createNewObject = function ()
	{
		var player = window.Audio ? new window.Audio() : null;
		if (player && player.canPlayType && player.pause && player.play)
		{
			player.preload = 'none';
			player.loop = false;
			player.autoplay = false;
			player.muted = false;
		}

		return player;
	};

	Audio.prototype.paused = function ()
	{
		return this.supported ? !!this.player.paused : true;
	};

	Audio.prototype.stop = function ()
	{
		if (this.supported && this.player.pause)
		{
			this.player.pause();
		}

		Events.pub('audio.stop');
	};

	Audio.prototype.pause = Audio.prototype.stop;

	Audio.prototype.clearName = function (sName, sExt)
	{
		sExt = sExt || '';
		sName = Utils.isUnd(sName) ? '' : Utils.trim(sName);
		if (sExt && '.' + sExt === sName.toLowerCase().substr((sExt.length + 1) * -1))
		{
			sName = Utils.trim(sName.substr(0, sName.length - 4));
		}

		if ('' === sName)
		{
			sName = 'audio';
		}

		return sName;
	};

	Audio.prototype.playMp3 = function (sUrl, sName)
	{
		if (this.supported && this.supportedMp3)
		{
			this.player.src = sUrl;
			this.player.play();

			Events.pub('audio.start', [this.clearName(sName, 'mp3'), 'mp3']);
		}
	};

	Audio.prototype.playOgg = function (sUrl, sName)
	{
		if (this.supported && this.supportedOgg)
		{
			this.player.src = sUrl;
			this.player.play();

			sName = this.clearName(sName, 'oga');
			sName = this.clearName(sName, 'ogg');

			Events.pub('audio.start', [sName, 'ogg']);
		}
	};

	Audio.prototype.playWav = function (sUrl, sName)
	{
		if (this.supported && this.supportedWav)
		{
			this.player.src = sUrl;
			this.player.play();

			Events.pub('audio.start', [this.clearName(sName, 'wav'), 'wav']);
		}
	};

	Audio.prototype.playNotification = function ()
	{
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
	};

	module.exports = new Audio();

}());
