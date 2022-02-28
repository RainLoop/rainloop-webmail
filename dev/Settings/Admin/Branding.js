import { AbstractViewSettings } from 'Knoin/AbstractViews';

export class BrandingAdminSettings extends AbstractViewSettings {
	constructor() {
		super();
		this.addSetting('Title');
		this.addSetting('LoadingDescription');
		this.addSetting('FaviconUrl');
	}
}
