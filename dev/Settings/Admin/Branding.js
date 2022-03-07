import { AbstractViewSettings } from 'Knoin/AbstractViews';

export class AdminSettingsBranding extends AbstractViewSettings {
	constructor() {
		super();
		this.addSetting('Title');
		this.addSetting('LoadingDescription');
		this.addSetting('FaviconUrl');
	}
}
