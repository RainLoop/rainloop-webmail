import * as Links from 'Common/Links';
import { addObservablesTo } from 'External/ko';
import { fireEvent } from 'Common/Globals';

/**
 * Might not work due to the new ServiceWorkerRegistration.showNotification
 */
const HTML5Notification = window.Notification,
	HTML5NotificationStatus = () => HTML5Notification?.permission || 'denied',
	NotificationsDenied = () => 'denied' === HTML5NotificationStatus(),
	NotificationsGranted = () => 'granted' === HTML5NotificationStatus(),
	dispatchMessage = data => {
		focus();
		if (data.folder && data.uid) {
			fireEvent('mailbox.message.show', data);
		} else if (data.Url) {
			hasher.setHash(data.Url);
		}
	};

let DesktopNotifications = false,
	WorkerNotifications = navigator.serviceWorker;

// Are Notifications supported in the service worker?
if (WorkerNotifications && ServiceWorkerRegistration && ServiceWorkerRegistration.prototype.showNotification) {
	/* Listen for close requests from the ServiceWorker */
	WorkerNotifications.addEventListener('message', event => {
		const obj = JSON.parse(event.data);
		'notificationclick' === obj?.action && dispatchMessage(obj.data);
	});
} else {
	WorkerNotifications = null;
	console.log('ServiceWorker Notifications not supported');
}

export const NotificationUserStore = new class {
	constructor() {
		addObservablesTo(this, {
			enabled: false,/*.extend({ notify: 'always' })*/
			allowed: !NotificationsDenied()
		});

		this.enabled.subscribe(value => {
			DesktopNotifications = !!value;
			if (value && HTML5Notification && !NotificationsGranted()) {
				HTML5Notification.requestPermission(() =>
					this.allowed(!NotificationsDenied())
				);
			}
		});
	}

	/**
	 * Used with DesktopNotifications setting
	 */
	display(title, text, messageData, imageSrc) {
		if (DesktopNotifications && NotificationsGranted()) {
			const options = {
				body: text,
				icon: imageSrc || Links.staticLink('css/images/icon-message-notification.png'),
				data: messageData
			};
			if (messageData?.uid) {
				options.tag = messageData.uid;
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
				notification.show?.();
				notification.onclick = messageData ? () => dispatchMessage(messageData) : null;
				setTimeout(() => notification.close(), 7000);
			}
		}
	}
};
