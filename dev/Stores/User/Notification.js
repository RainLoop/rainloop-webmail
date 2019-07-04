import window from 'window';
import ko from 'ko';

import { DesktopNotification, Magics } from 'Common/Enums';
import * as Events from 'Common/Events';
import Audio from 'Common/Audio';

import * as Settings from 'Storage/Settings';

class NotificationUserStore {
	constructor() {
		this.enableSoundNotification = ko.observable(false);
		this.soundNotificationIsSupported = ko.observable(false);

		this.allowDesktopNotification = ko.observable(false);

		this.desktopNotificationPermissions = ko
			.computed(() => {
				this.allowDesktopNotification();

				let result = DesktopNotification.NotSupported;

				const NotificationClass = this.notificationClass();
				if (NotificationClass && NotificationClass.permission) {
					switch (NotificationClass.permission.toLowerCase()) {
						case 'granted':
							result = DesktopNotification.Allowed;
							break;
						case 'denied':
							result = DesktopNotification.Denied;
							break;
						case 'default':
							result = DesktopNotification.NotAllowed;
							break;
						// no default
					}
				} else if (window.webkitNotifications && window.webkitNotifications.checkPermission) {
					result = window.webkitNotifications.checkPermission();
				}

				return result;
			})
			.extend({ notify: 'always' });

		this.enableDesktopNotification = ko
			.computed({
				read: () =>
					this.allowDesktopNotification() && DesktopNotification.Allowed === this.desktopNotificationPermissions(),
				write: (value) => {
					if (value) {
						const NotificationClass = this.notificationClass(),
							permission = this.desktopNotificationPermissions();

						if (NotificationClass && DesktopNotification.Allowed === permission) {
							this.allowDesktopNotification(true);
						} else if (NotificationClass && DesktopNotification.NotAllowed === permission) {
							NotificationClass.requestPermission(() => {
								this.allowDesktopNotification.valueHasMutated();

								if (DesktopNotification.Allowed === this.desktopNotificationPermissions()) {
									if (this.allowDesktopNotification()) {
										this.allowDesktopNotification.valueHasMutated();
									} else {
										this.allowDesktopNotification(true);
									}
								} else {
									if (this.allowDesktopNotification()) {
										this.allowDesktopNotification(false);
									} else {
										this.allowDesktopNotification.valueHasMutated();
									}
								}
							});
						} else {
							this.allowDesktopNotification(false);
						}
					} else {
						this.allowDesktopNotification(false);
					}
				}
			})
			.extend({ notify: 'always' });

		if (!this.enableDesktopNotification.valueHasMutated) {
			this.enableDesktopNotification.valueHasMutated = () => {
				this.allowDesktopNotification.valueHasMutated();
			};
		}

		this.computers();

		this.initNotificationPlayer();
	}

	computers() {
		this.isDesktopNotificationSupported = ko.computed(
			() => DesktopNotification.NotSupported !== this.desktopNotificationPermissions()
		);

		this.isDesktopNotificationDenied = ko.computed(
			() =>
				DesktopNotification.NotSupported === this.desktopNotificationPermissions() ||
				DesktopNotification.Denied === this.desktopNotificationPermissions()
		);
	}

	initNotificationPlayer() {
		if (Audio && Audio.supportedNotification) {
			this.soundNotificationIsSupported(true);
		} else {
			this.enableSoundNotification(false);
			this.soundNotificationIsSupported(false);
		}
	}

	playSoundNotification(skipSetting) {
		if (Audio && Audio.supportedNotification && (skipSetting ? true : this.enableSoundNotification())) {
			Audio.playNotification();
		}
	}

	displayDesktopNotification(imageSrc, title, text, nessageData) {
		if (this.enableDesktopNotification()) {
			const NotificationClass = this.notificationClass(),
				notification = NotificationClass
					? new NotificationClass(title, {
							body: text,
							icon: imageSrc
					  })
					: null;

			if (notification) {
				if (notification.show) {
					notification.show();
				}

				if (nessageData) {
					notification.onclick = () => {
						window.focus();

						if (nessageData.Folder && nessageData.Uid) {
							Events.pub('mailbox.message.show', [nessageData.Folder, nessageData.Uid]);
						}
					};
				}

				window.setTimeout(
					(function(localNotifications) {
						return () => {
							if (localNotifications.cancel) {
								localNotifications.cancel();
							} else if (localNotifications.close) {
								localNotifications.close();
							}
						};
					})(notification),
					Magics.Time7s
				);
			}
		}
	}

	populate() {
		this.enableSoundNotification(!!Settings.settingsGet('SoundNotification'));
		this.enableDesktopNotification(!!Settings.settingsGet('DesktopNotifications'));
	}

	/**
	 * @returns {*|null}
	 */
	notificationClass() {
		return window.Notification && window.Notification.requestPermission ? window.Notification : null;
	}
}

export default new NotificationUserStore();
