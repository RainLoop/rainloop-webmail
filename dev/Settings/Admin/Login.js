import { AbstractViewSettings } from 'Knoin/AbstractViews';

export class LoginAdminSettings extends AbstractViewSettings {
	constructor() {
		super();
		this.addSetting('LoginDefaultDomain');
		this.addSettings(['DetermineUserLanguage','DetermineUserDomain','AllowLanguagesOnLogin','hideSubmitButton']);
	}
}
