
(function () {

	'use strict';

	var
		window = require('window'),
		ko = require('ko'),

		Enums = require('Common/Enums'),

		Settings = require('Storage/Settings')
	;

	/**
	 * @constructor
	 */
	function NotificationSettings()
	{
		var self = this;

		this.allowDesktopNotification = ko.observable(false);

		this.desktopNotificationPermisions = ko.computed(function () {

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

		}, this);

		this.enableDesktopNotification = ko.computed({
			'owner': this,
			'read': function () {
				return this.allowDesktopNotification() &&
					Enums.DesktopNotification.Allowed === this.desktopNotificationPermisions();
			},
			'write': function (bValue) {
				if (bValue)
				{
					var
						NotificationClass = this.notificationClass(),
						iPermission = this.desktopNotificationPermisions()
					;

					if (NotificationClass && Enums.DesktopNotification.Allowed === iPermission)
					{
						this.allowDesktopNotification(true);
					}
					else if (NotificationClass && Enums.DesktopNotification.NotAllowed === iPermission)
					{
						NotificationClass.requestPermission(function () {
							self.allowDesktopNotification.valueHasMutated();
							if (Enums.DesktopNotification.Allowed === self.desktopNotificationPermisions())
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
		});

		if (!this.enableDesktopNotification.valueHasMutated)
		{
			this.enableDesktopNotification.valueHasMutated = function () {
				self.allowDesktopNotification.valueHasMutated();
			};
		}

		this.computedProperies();
	}

	NotificationSettings.prototype.computedProperies = function ()
	{
		this.isDesktopNotificationSupported = ko.computed(function () {
			return Enums.DesktopNotification.NotSupported !== this.desktopNotificationPermisions();
		}, this);

		this.isDesktopNotificationDenied = ko.computed(function () {
			return Enums.DesktopNotification.NotSupported === this.desktopNotificationPermisions() ||
				Enums.DesktopNotification.Denied === this.desktopNotificationPermisions();
		}, this);
	};

	NotificationSettings.prototype.populate = function ()
	{
		this.enableDesktopNotification(!!Settings.settingsGet('DesktopNotifications'));
	};

	/**
	 * @return {*|null}
	 */
	NotificationSettings.prototype.notificationClass = function ()
	{
		return window.Notification && window.Notification.requestPermission ? window.Notification : null;
	};

	module.exports = new NotificationSettings();

}());
