(rl => {
//	if (rl.settings.get('Nextcloud'))
	const templateId = 'MailMessageView';

	addEventListener('rl-view-model.create', e => {
		if (templateId === e.detail.viewModelTemplateID) {

			const
				template = document.getElementById(templateId),
				cfg = rl.settings.get('Nextcloud'),
				attachmentsControls = template.content.querySelector('.attachmentsControls'),
				msgMenu = template.content.querySelector('#more-view-dropdown-id + menu');

			if (attachmentsControls) {
				attachmentsControls.append(Element.fromHTML(`<span>
					<i class="fontastic iconcolor-red" data-bind="visible: saveNextcloudError">✖</i>
					<i class="fontastic" data-bind="visible: !saveNextcloudError(),
						css: {'icon-spinner': saveNextcloudLoading()}">💾</i>
					<span class="g-ui-link" data-bind="click: saveNextcloud" data-i18n="NEXTCLOUD/SAVE_ATTACHMENTS"></span>
				</span>`));

				// https://github.com/nextcloud/calendar/issues/4684
				if (cfg.CalDAV) {
					attachmentsControls.append(Element.fromHTML(`<span data-bind="visible: nextcloudICS" data-icon="📅">
						<span class="g-ui-link" data-bind="click: nextcloudSaveICS" data-i18n="NEXTCLOUD/SAVE_ICS"></span>
					</span>`));
				}
			}
/*
			// https://github.com/the-djmaze/snappymail/issues/592
			if (cfg.CalDAV) {
				const attachmentsPlace = template.content.querySelector('.attachmentsPlace');
				attachmentsPlace.after(Element.fromHTML(`
				<table data-bind="if: nextcloudICS, visible: nextcloudICS"><tbody style="white-space:pre">
					<tr><td>Summary</td><td data-icon="📅" data-bind="text: nextcloudICS().SUMMARY"></td></tr>
					<tr><td>Organizer</td><td data-bind="text: nextcloudICS().ORGANIZER"></td></tr>
					<tr><td>Start</td><td data-bind="text: nextcloudICS().DTSTART"></td></tr>
					<tr><td>End</td><td data-bind="text: nextcloudICS().DTEND"></td></tr>
					<tr><td>Transparency</td><td data-bind="text: nextcloudICS().TRANSP"></td></tr>
					<tr data-bind="foreach: nextcloudICS().ATTENDEE">
						<td></td><td data-bind="text: $data.replace(/;/g,';\\n')"></td>
					</tr>
				</tbody></table>`));
			}
*/
			if (msgMenu) {
				msgMenu.append(Element.fromHTML(`<li role="presentation">
					<a href="#" tabindex="-1" data-icon="📥" data-bind="click: nextcloudSaveMsg" data-i18n="NEXTCLOUD/SAVE_EML"></a>
				</li>`));
			}

			let view = e.detail;
			view.saveNextcloudError = ko.observable(false).extend({ falseTimeout: 7000 });
			view.saveNextcloudLoading = ko.observable(false);
			view.saveNextcloud = () => {
				const
					hashes = (view.message()?.attachments || [])
					.map(item => item?.checked() /*&& !item?.isLinked()*/ ? item.download : '')
					.filter(v => v);
				if (hashes.length) {
					view.saveNextcloudLoading(true);
					rl.nextcloud.selectFolder().then(folder => {
						if (folder) {
							rl.fetchJSON('./?/Json/&q[]=/0/', {}, {
								Action: 'AttachmentsActions',
								Do: 'nextcloud',
								Hashes: hashes,
								NcFolder: folder
							})
							.then(result => {
								view.saveNextcloudLoading(false);
								if (result?.Result) {
									// success
								} else {
									view.saveNextcloudError(true);
								}
							})
							.catch(() => {
								view.saveNextcloudLoading(false);
								view.saveNextcloudError(true);
							});
						} else {
							view.saveNextcloudLoading(false);
						}
					});
				}
			};

			view.nextcloudSaveMsg = () => {
				rl.nextcloud.selectFolder().then(folder => {
					let msg = view.message();
					folder && rl.pluginRemoteRequest(
						(iError, data) => {
							console.dir({
								iError:iError,
								data:data
							});
						},
						'NextcloudSaveMsg',
						{
							'msgHash': msg.requestHash,
							'folder': folder,
							'filename': msg.subject()
						}
					);
				});
			};

			view.nextcloudICS = ko.observable(null);

			view.nextcloudSaveICS = () => {
				let VEVENT = view.nextcloudICS();
				VEVENT && rl.nextcloud.selectCalendar()
				.then(href => href && rl.nextcloud.calendarPut(href, VEVENT));
			}

			/**
			 * TODO
			 */
			view.message.subscribe(msg => {
				view.nextcloudICS(null);
				if (msg && cfg.CalDAV) {
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
								view.nextcloudICS(VEVENT);
							}
						});
					}
				}
			});
		}
	});

})(window.rl);
