import ko from 'ko';

import Remote from 'Remote/Admin/Fetch';
import { forEachObjectEntry } from 'Common/Utils';

export class AdminSettingsConfig /*extends AbstractViewSettings*/ {

	constructor() {
		this.config = ko.observableArray();
	}

	onBeforeShow() {
		Remote.request('AdminSettingsGet', (iError, data) => {
			if (!iError) {
				const cfg = [],
					getInputType = (value, pass) => {
						switch (typeof value)
						{
						case 'boolean': return 'checkbox';
						case 'number': return 'number';
						}
						return pass ? 'password' : 'text';
					};
				forEachObjectEntry(data.Result, (key, items) => {
					const section = {
						name: key,
						items: []
					};
					forEachObjectEntry(items, (skey, item) => {
						section.items.push({
							key: `config[${key}][${skey}]`,
							name: skey,
							value: item[0],
							type: getInputType(item[0], skey.includes('password')),
							comment: item[1]
						});
					});
					cfg.push(section);
				});
				this.config(cfg);
			}
		});
	}

	saveConfig(form) {
		Remote.post('AdminSettingsSet', null, new FormData(form));
	}
}
