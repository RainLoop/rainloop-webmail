'use strict';

self.addEventListener('message', event => self.client = event.source);

const fn = event => {
	self.client.postMessage(
		JSON.stringify({
			data: event.notification.data,
			action: event.type
		})
	);
};

self.onnotificationclose = fn;
self.onnotificationclick = fn;
