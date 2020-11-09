import ko from 'ko';

import Audio from 'Common/Audio';
import * as Links from 'Common/Links';

/**
 * Might not work due to the new ServiceWorkerRegistration.showNotification
 */
const HTML5Notification = window.Notification ? Notification : null,
	HTML5NotificationStatus = () => (HTML5Notification && HTML5Notification.permission) || 'denied',
	dispatchMessage = data => {
		focus();
		if (data.Folder && data.Uid) {
			dispatchEvent(new CustomEvent('mailbox.message.show', {detail:data}));
		}
	};

let DesktopNotifications = false,
	WorkerNotifications = navigator.serviceWorker;

// Are Notifications supported in the service worker?
if (WorkerNotifications && ServiceWorkerRegistration && ServiceWorkerRegistration.prototype.showNotification) {
	console.log('ServiceWorker supported');
	/* Listen for close requests from the ServiceWorker */
	WorkerNotifications.addEventListener('message', event => {
		const obj = JSON.parse(event.data);
		obj && 'notificationclick' === obj.action && dispatchMessage(obj.data);
	});
} else {
	WorkerNotifications = null;
	console.log('WorkerNotifications not supported');
}

class NotificationUserStore {
	constructor() {
		this.enableSoundNotification = ko.observable(false);

		this.enableDesktopNotification = ko.observable(false)/*.extend({ notify: 'always' })*/;

		this.isDesktopNotificationDenied = ko.observable('denied' === HTML5NotificationStatus());

		this.enableDesktopNotification.subscribe(value => {
			DesktopNotifications = !!value;
			if (value && HTML5Notification && 'granted' !== HTML5Notification.permission) {
				HTML5Notification.requestPermission(() =>
					this.isDesktopNotificationDenied('denied' === HTML5Notification.permission)
				);
			}
		});
	}

	/**
	 * Used with SoundNotification setting
	 */
	playSoundNotification(skipSetting) {
		if (skipSetting ? true : this.enableSoundNotification()) {
			Audio.playNotification();
		}
	}

	/**
	 * Used with DesktopNotifications setting
	 */
	displayDesktopNotification(title, text, messageData, imageSrc) {
		if (DesktopNotifications && 'granted' === HTML5NotificationStatus()) {
			const options = {
				body: text,
				icon: imageSrc || Links.notificationMailIcon(),
				data: messageData
			};
			if (WorkerNotifications) {
				// Service-Worker-Allowed HTTP header to allow the scope.
				WorkerNotifications.register('/serviceworker.js')
//				WorkerNotifications.register(Links.staticPrefix('js/serviceworker.js'), {scope:'/'})
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
		this.enableSoundNotification(!!rl.settings.get('SoundNotification'));
		this.enableDesktopNotification(!!rl.settings.get('DesktopNotifications'));
	}
}

export default new NotificationUserStore();
