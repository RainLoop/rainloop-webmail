import { AbstractViewSettings } from 'Knoin/AbstractViews';

export class AdminSettingsLogin extends AbstractViewSettings {
	constructor() {
		super();
		this.addSetting('LoginDefaultDomain');
		this.addSettings(['DetermineUserLanguage','DetermineUserDomain','AllowLanguagesOnLogin']);
	}
}
