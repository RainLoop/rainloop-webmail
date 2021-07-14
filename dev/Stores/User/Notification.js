import ko from 'ko';

import { SMAudio } from 'Common/Audio';
import { SettingsGet } from 'Common/Globals';
import * as Links from 'Common/Links';

/**
 * Might not work due to the new ServiceWorkerRegistration.showNotification
 */
const HTML5Notification = window.Notification,
	HTML5NotificationStatus = () => (HTML5Notification && HTML5Notification.permission) || 'denied',
	NotificationsDenied = () => 'denied' === HTML5NotificationStatus(),
	NotificationsGranted = () => 'granted' === HTML5NotificationStatus(),
	dispatchMessage = data => {
		focus();
		if (data.Folder && data.Uid) {
			dispatchEvent(new CustomEvent('mailbox.message.show', {detail:data}));
		} else if (data.Url) {
			rl.route.setHash(data.Url);
		}
	};

let DesktopNotifications = false,
	WorkerNotifications = navigator.serviceWorker;

// Are Notifications supported in the service worker?
if (WorkerNotifications && ServiceWorkerRegistration && ServiceWorkerRegistration.prototype.showNotification) {
	/* Listen for close requests from the ServiceWorker */
	WorkerNotifications.addEventListener('message', event => {
		const obj = JSON.parse(event.data);
		obj && 'notificationclick' === obj.action && dispatchMessage(obj.data);
	});
} else {
	WorkerNotifications = null;
	console.log('ServiceWorker Notifications not supported');
}

export const NotificationUserStore = new class {
	constructor() {
		this.enableSoundNotification = ko.observable(false);

		this.enableDesktopNotification = ko.observable(false)/*.extend({ notify: 'always' })*/;

		this.isDesktopNotificationDenied = ko.observable(NotificationsDenied());

		this.enableDesktopNotification.subscribe(value => {
			DesktopNotifications = !!value;
			if (value && HTML5Notification && !NotificationsGranted()) {
				HTML5Notification.requestPermission(() =>
					this.isDesktopNotificationDenied(NotificationsDenied())
				);
			}
		});
	}

	/**
	 * Used with SoundNotification setting
	 */
	playSoundNotification(skipSetting) {
		if (skipSetting ? true : this.enableSoundNotification()) {
			SMAudio.playNotification();
		}
	}

	/**
	 * Used with DesktopNotifications setting
	 */
	displayDesktopNotification(title, text, messageData, imageSrc) {
		if (DesktopNotifications && NotificationsGranted()) {
			const options = {
				body: text,
				icon: imageSrc || Links.staticLink('css/images/icon-message-notification.png'),
				data: messageData
			};
			if (messageData && messageData.Uid) {
				options.tag = messageData.Uid;
			}
			if (WorkerNotifications) {
				// Service-Worker-Allowed HTTP header to allow the scope.
				WorkerNotifications.register('/serviceworker.js')
//				WorkerNotifications.register(Links.staticLink('js/serviceworker.js'), {scope:'/'})
				.then(() =>
					WorkerNotifications.ready.then(registration =>
						/* Show the notification */
						registration
							.showNotification(title, options)
							.then(() =>
								registration.getNotifications().then((/*notifications*/) => {
									/* Send an empty message so the Worker knows who the client is */
									registration.active.postMessage('');
								})
							)
					)
				)
				.catch(e => console.error(e));
			} else {
				const notification = new HTML5Notification(title, options);
				notification.show && notification.show();
				notification.onclick = messageData ? () => dispatchMessage(messageData) : null;
				setTimeout(() => notification.close(), 7000);
			}
		}
	}

	populate() {
		this.enableSoundNotification(!!SettingsGet('SoundNotification'));
		this.enableDesktopNotification(!!SettingsGet('DesktopNotifications'));
	}
};
