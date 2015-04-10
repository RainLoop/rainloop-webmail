
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

		this.obj = window.Audio ? new window.Audio() : null;
		this.objForNotification = window.Audio ? new window.Audio() : null;

		this.supported = !Globals.bMobileDevice &&
			this.obj && this.obj.canPlayType && this.obj.play &&
			'' !== this.obj.canPlayType('audio/mpeg;');

		if (this.obj && this.supported)
		{
			this.obj.preload = 'none';
			this.obj.loop = false;
			this.obj.autoplay = false;
			this.obj.muted = false;

			this.objForNotification.preload = 'none';
			this.objForNotification.loop = false;
			this.objForNotification.autoplay = false;
			this.objForNotification.muted = false;
			this.objForNotification.src = Links.sound('new-mail.mp3');

			$(this.obj).on('ended error', function () {
				self.stop();
			});

			Events.sub('audio.api.stop', function () {
				self.stop();
			});

			Events.sub('audio.api.play', function (sUrl, sName) {
				self.playMp3(sUrl, sName);
			});
		}
	}

	Audio.prototype.obj = null;
	Audio.prototype.objForNotification = null;
	Audio.prototype.supported = false;

	Audio.prototype.paused = function ()
	{
		return this.supported ? !!this.obj.paused : true;
	};

	Audio.prototype.stop = function ()
	{
		if (this.supported && this.obj.pause)
		{
			this.obj.pause();
		}

		Events.pub('audio.stop');
	};

	Audio.prototype.pause = Audio.prototype.stop;

	Audio.prototype.playMp3 = function (sUrl, sName)
	{
		if (this.supported && this.obj.play)
		{
			this.obj.src = sUrl;
			this.obj.play();

			sName = Utils.isUnd(sName) ? '' : Utils.trim(sName);
			if ('.mp3' === sName.toLowerCase().substr(-4))
			{
				sName = Utils.trim(sName.substr(0, sName.length - 4));
			}

			if ('' === sName)
			{
				sName = 'audio';
			}

			Events.pub('audio.start', [sName]);
		}
	};

	Audio.prototype.playNotification = function ()
	{
		if (this.supported && this.objForNotification.play)
		{
			this.objForNotification.play();
		}
	};

	module.exports = new Audio();

}());
