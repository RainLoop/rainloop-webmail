import { AbstractViewSettings } from 'Knoin/AbstractViews';

export class AdminSettingsBranding extends AbstractViewSettings {
	constructor() {
		super();
		this.addSetting('title');
		this.addSetting('loadingDescription');
		this.addSetting('faviconUrl');
	}
}
