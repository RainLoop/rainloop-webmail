
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

		this.obj = this.createNewObject();
		this.objForNotification = this.createNewObject();

		this.supported = !Globals.bMobileDevice && !Globals.bSafari &&
			this.obj && '' !== this.obj.canPlayType('audio/mpeg');

		if (this.obj && this.supported)
		{
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

	Audio.prototype.createNewObject = function ()
	{
		var obj = window.Audio ? new window.Audio() : null;
		if (obj && obj.canPlayType)
		{
			obj.preload = 'none';
			obj.loop = false;
			obj.autoplay = false;
			obj.muted = false;
		}

		return obj;
	};

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
