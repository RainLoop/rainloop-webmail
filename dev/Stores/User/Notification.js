
(function () {

	'use strict';

	var
		window = require('window'),
		ko = require('ko'),
		buzz = require('buzz'),

		Enums = require('Common/Enums'),
		Links = require('Common/Links'),

		Settings = require('Storage/Settings')
	;

	/**
	 * @constructor
	 */
	function NotificationUserStore()
	{
		var self = this;

		this.buzz = null;

		this.enableSoundNotification = ko.observable(true);
		this.soundNotificationIsSupported = ko.observable(false);

		this.allowDesktopNotification = ko.observable(false);

		this.desktopNotificationPermissions = ko.computed(function () {

			this.allowDesktopNotification();

			var
				NotificationClass = this.notificationClass(),
				iResult = Enums.DesktopNotification.NotSupported
			;

			if (NotificationClass && NotificationClass.permission)
			{
				switch (NotificationClass.permission.toLowerCase())
				{
					case 'granted':
						iResult = Enums.DesktopNotification.Allowed;
						break;
					case 'denied':
						iResult = Enums.DesktopNotification.Denied;
						break;
					case 'default':
						iResult = Enums.DesktopNotification.NotAllowed;
						break;
				}
			}
			else if (window.webkitNotifications && window.webkitNotifications.checkPermission)
			{
				iResult = window.webkitNotifications.checkPermission();
			}

			return iResult;

		}, this).extend({'notify': 'always'});

		this.enableDesktopNotification = ko.computed({
			'owner': this,
			'read': function () {
				return this.allowDesktopNotification() &&
					Enums.DesktopNotification.Allowed === this.desktopNotificationPermissions();
			},
			'write': function (bValue) {
				if (bValue)
				{
					var
						NotificationClass = this.notificationClass(),
						iPermission = this.desktopNotificationPermissions()
					;

					if (NotificationClass && Enums.DesktopNotification.Allowed === iPermission)
					{
						this.allowDesktopNotification(true);
					}
					else if (NotificationClass && Enums.DesktopNotification.NotAllowed === iPermission)
					{
						NotificationClass.requestPermission(function () {
							self.allowDesktopNotification.valueHasMutated();
							if (Enums.DesktopNotification.Allowed === self.desktopNotificationPermissions())
							{
								if (self.allowDesktopNotification())
								{
									self.allowDesktopNotification.valueHasMutated();
								}
								else
								{
									self.allowDesktopNotification(true);
								}
							}
							else
							{
								if (self.allowDesktopNotification())
								{
									self.allowDesktopNotification(false);
								}
								else
								{
									self.allowDesktopNotification.valueHasMutated();
								}
							}
						});
					}
					else
					{
						this.allowDesktopNotification(false);
					}
				}
				else
				{
					this.allowDesktopNotification(false);
				}
			}
		}).extend({'notify': 'always'});

		if (!this.enableDesktopNotification.valueHasMutated)
		{
			this.enableDesktopNotification.valueHasMutated = function () {
				self.allowDesktopNotification.valueHasMutated();
			};
		}

		this.computedProperies();

		this.initNotificationPlayer();
	}

	NotificationUserStore.prototype.computedProperies = function ()
	{
		this.isDesktopNotificationSupported = ko.computed(function () {
			return Enums.DesktopNotification.NotSupported !== this.desktopNotificationPermissions();
		}, this);

		this.isDesktopNotificationDenied = ko.computed(function () {
			return Enums.DesktopNotification.NotSupported === this.desktopNotificationPermissions() ||
				Enums.DesktopNotification.Denied === this.desktopNotificationPermissions();
		}, this);
	};

	NotificationUserStore.prototype.initNotificationPlayer = function ()
	{
		if (buzz && buzz.isSupported() && (buzz.isOGGSupported() || buzz.isMP3Supported()))
		{
			this.soundNotificationIsSupported(true);

			this.buzz = new buzz.sound(Links.sound('new-mail'), {
				'preload': 'none',
				'formats': ['mp3', 'ogg']
			});
		}
		else
		{
			this.enableSoundNotification(false);
			this.soundNotificationIsSupported(false);
		}
	};

	NotificationUserStore.prototype.playSoundNotification = function (bSkipSetting)
	{
		if (this.buzz && (bSkipSetting ? true : this.enableSoundNotification()))
		{
			this.buzz.play();
		}
	};

	NotificationUserStore.prototype.displayDesktopNotification = function (sImageSrc, sTitle, sText)
	{
		if (this.enableDesktopNotification())
		{
			var
				NotificationClass = this.notificationClass(),
				oNotification = NotificationClass ? new NotificationClass(sTitle, {
					'body': sText,
					'icon': sImageSrc
				}) : null
			;

			if (oNotification)
			{
				if (oNotification.show)
				{
					oNotification.show();
				}

				window.setTimeout((function (oLocalNotifications) {
					return function () {
						if (oLocalNotifications.cancel)
						{
							oLocalNotifications.cancel();
						}
						else if (oLocalNotifications.close)
						{
							oLocalNotifications.close();
						}
					};
				}(oNotification)), 7000);
			}
		}
	};

	NotificationUserStore.prototype.populate = function ()
	{
		this.enableSoundNotification(!!Settings.settingsGet('SoundNotification'));
		this.enableDesktopNotification(!!Settings.settingsGet('DesktopNotifications'));
	};

	/**
	 * @return {*|null}
	 */
	NotificationUserStore.prototype.notificationClass = function ()
	{
		return window.Notification && window.Notification.requestPermission ? window.Notification : null;
	};

	module.exports = new NotificationUserStore();

}());
