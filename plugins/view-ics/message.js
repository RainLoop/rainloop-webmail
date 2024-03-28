(rl => {
	const templateId = 'MailMessageView';

	addEventListener('rl-view-model.create', e => {
		if (templateId === e.detail.viewModelTemplateID) {

			const
				template = document.getElementById(templateId),
				view = e.detail,
				attachmentsPlace = template.content.querySelector('.attachmentsPlace'),
				dateRegEx = /(TZID=(?<tz>[^:]+):)?(?<year>[0-9]{4})(?<month>[0-9]{2})(?<day>[0-9]{2})T(?<hour>[0-9]{2})(?<minute>[0-9]{2})(?<second>[0-9]{2})(?<utc>Z?)/,
				parseDate = str => {
					let parts = dateRegEx.exec(str)?.groups,
						options = {dateStyle: 'long', timeStyle: 'short'};
					parts?.tz && (options.timeZone = parts.tz);
					return (parts ? new Date(
						parseInt(parts.year, 10),
						parseInt(parts.month, 10) - 1,
						parseInt(parts.day, 10),
						parseInt(parts.hour, 10),
						parseInt(parts.minute, 10),
						parseInt(parts.second, 10)
					) : new Date(str)).format(options);
				};

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
										DTSTART: parseDate(item["ical:dtstart"]),
//										DTEND: parseDate(item["ical:dtend"]),
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
							let VEVENT,
								VALARM,
								multiple = ['ATTACH','ATTENDEE','CATEGORIES','COMMENT','CONTACT','EXDATE',
									'EXRULE','RSTATUS','RELATED','RESOURCES','RDATE','RRULE'],
								lines = text.split(/\r?\n/),
								i = lines.length;
							while (i--) {
								let line = lines[i];
								if (VEVENT) {
									while (line.startsWith(' ') && i--) {
										line = lines[i] + line.slice(1);
									}
									if (line.startsWith('END:VALARM')) {
										VALARM = {};
										continue;
									} else if (line.startsWith('BEGIN:VALARM')) {
										VEVENT.VALARM || (VEVENT.VALARM = []);
										VEVENT.VALARM.push(VALARM);
										VALARM = null;
										continue;
									} else if (line.startsWith('BEGIN:VEVENT')) {
										break;
									}
									line = line.match(/^([^:;]+)[:;](.+)$/);
									if (line) {
										if (VALARM) {
											VALARM[line[1]] = line[2];
										} else if (multiple.includes(line[1]) || 'X-' == line[1].slice(0,2)) {
											VEVENT[line[1]] || (VEVENT[line[1]] = []);
											VEVENT[line[1]].push(line[2]);
										} else {
											if ('DTSTART' === line[1] || 'DTEND' === line[1]) {
												line[2] = parseDate(line[2]);
											}
											VEVENT[line[1]] = line[2];
										}
									}
								} else if (line.startsWith('END:VEVENT')) {
									VEVENT = {};
								}
							}
//							METHOD:REPLY || METHOD:REQUEST
//							console.dir({VEVENT:VEVENT});
							if (VEVENT) {
								VEVENT.rawText = text;
								VEVENT.isCancelled = () => VEVENT.STATUS?.includes('CANCELLED');
								VEVENT.isConfirmed = () => VEVENT.STATUS?.includes('CONFIRMED');
								VEVENT.shouldReply = () => VEVENT.METHOD?.includes('REPLY');
								console.dir({
									isCancelled: VEVENT.isCancelled(),
									shouldReply: VEVENT.shouldReply()
								});
								view.viewICS(VEVENT);
							}
						});
					}
				}
			});
		}
	});

})(window.rl);
