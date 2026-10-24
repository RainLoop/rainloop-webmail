(rl => {
	const templateId = 'MailMessageView';

	addEventListener('rl-view-model.create', e => {
		if (templateId === e.detail.viewModelTemplateID) {

			const
				template = document.getElementById(templateId),
				view = e.detail,
				attachmentsPlace = template.content.querySelector('.attachmentsPlace');

			attachmentsPlace.after(Element.fromHTML(`
			<details data-bind="if: viewICS, visible: viewICS">
				<summary data-icon="📅" data-bind="text: viewICS().SUMMARY"></summary>
				<table><tbody style="white-space:pre">
					<tr data-bind="visible: viewICS().ORGANIZER"><td>Organizer</td><td data-bind="text: viewICS().ORGANIZER"></td></tr>
					<tr><td>Start</td><td data-bind="text: viewICS().DTSTART"></td></tr>
					<tr><td>End</td><td data-bind="text: viewICS().DTEND"></td></tr>
<!--				<tr><td>Transparency</td><td data-bind="text: viewICS().TRANSP"></td></tr>-->
					<tr data-bind="foreach: viewICS().ATTENDEE">
						<td></td><td data-bind="text: $data.replace(/;/g,';\\n')"></td>
					</tr>
				</tbody></table>
			</details>`));

			view.viewICS = ko.observable(null);

			view.saveICS = () => {
				let VEVENT = view.VEVENT();
				if (VEVENT) {
					if (rl.nextcloud && VEVENT.rawText) {
						rl.nextcloud.selectCalendar()
							.then(href => href && rl.nextcloud.calendarPut(href, VEVENT));
					} else {
						// TODO
					}
				}
			}

			/**
			 * TODO
			 */
			view.message.subscribe(msg => {
				view.viewICS(null);
				if (msg) {
					// JSON-LD after parsing HTML
					// See http://schema.org/
					msg.linkedData.subscribe(data => {
						if (!view.viewICS()) {
							data.forEach(item => {
								if (item["ical:summary"]) {
									let VEVENT = {
										SUMMARY: item["ical:summary"],
										DTSTART: rl.ICS.parseDate(item["ical:dtstart"]),
//										DTEND: rl.ICS.parseDate(item["ical:dtend"]),
//										TRANSP: item["ical:transp"],
//										LOCATION: item["ical:location"],
										ATTENDEE: []
									}
									view.viewICS(VEVENT);
									return;
								}
							});
						}
					});
					// ICS attachment
//					let ics = msg.attachments.find(attachment => 'application/ics' == attachment.mimeType);
					let ics = msg.attachments.find(attachment => 'text/calendar' == attachment.mimeType);
					if (ics && ics.download) {
						// fetch it and parse the VEVENT
						rl.fetch(ics.linkDownload())
						.then(response => (response.status < 400) ? response.text() : Promise.reject(new Error({ response })))
						.then(text => {
							let VEVENT = rl.ICS.parseEvent(text);
							if (VEVENT) {
								view.viewICS(VEVENT);
							}
						});
					}
				}
			});
		}
	});

})(window.rl);
