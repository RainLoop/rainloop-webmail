import ko from 'ko';

import Remote from 'Remote/Admin/Fetch';
import { forEachObjectEntry } from 'Common/Utils';
import { SettingsAdmin } from 'Common/Globals';
import { LanguageStore } from 'Stores/Language';
import { ThemeStore } from 'Stores/Theme';

export class AdminSettingsConfig /*extends AbstractViewSettings*/ {

	constructor() {
		this.config = ko.observableArray();
		this.search = ko.observableArray();
		this.saved = ko.observable(false).extend({ falseTimeout: 5000 });

		this.search.subscribe(value => {
			const v = value.toLowerCase(),
				qsa = (node, selector, fn) => node.querySelectorAll(selector).forEach(fn),
				match = node => node.textContent.toLowerCase().includes(v);
			if (v.length) {
				qsa(this.viewModelDom, 'tbody', tbody => {
					let show = match(tbody.querySelector('th'));
					if (show) {
						qsa(tbody, '[hidden]', n => n.hidden = false);
					} else {
						qsa(tbody, 'tbody td:first-child', td => {
							let hide = !match(td);
							show = show || !hide;
//							td.closest('tr').hidden = hide;
							td.parentNode.hidden = hide;
						});
					}
					tbody.hidden = !show;
				});
			} else {
				qsa(this.viewModelDom, 'table [hidden]', n => n.hidden = false);
			}
		});
	}

	beforeShow() {
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
						if ('language' === skey) {
							item[2] = ('webmail' === key) ? LanguageStore.languages : SettingsAdmin('languages');
						} else if ('theme' === skey) {
							item[2] = ThemeStore.themes;
						}
						'admin_password' === skey ||
						section.items.push({
							key: `config[${key}][${skey}]`,
							name: skey,
							value: item[0],
							type: getInputType(item[0], skey.includes('password')),
							comment: item[1],
							options: item[2]
						});
					});
					cfg.push(section);
				});
				this.config(cfg);
			}
		});
	}

	saveConfig(form) {
		const data = new FormData(form),
			config = {};
		this.config.forEach(section => {
			if (!config[section.name]) {
				config[section.name] = {};
			}
			section.items.forEach(item => {
				let value = data.get(item.key);
				switch (typeof item.value) {
					case 'boolean':
						value = 'on' == value;
						break;
					case 'number':
						value = parseInt(value, 10);
						break;
				}
				config[section.name][item.name] = value;
			})
		});
		Remote.post('AdminSettingsSet', null, {config:config}).then(result => {
			result.Result && this.saved(true);
		});
	}
}
