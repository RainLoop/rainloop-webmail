import { AbstractViewSettings } from 'Knoin/AbstractViews';

export class AdminSettingsLogin extends AbstractViewSettings {
	constructor() {
		super();
		this.addSetting('loginDefaultDomain');
		this.addSettings(['determineUserLanguage','determineUserDomain','allowLanguagesOnLogin']);
	}
}
