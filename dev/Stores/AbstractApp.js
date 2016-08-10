
import ko from 'ko';
import {$html, bMobileDevice} from 'Common/Globals';
import * as Settings from 'Storage/Settings';

class AbstractAppStore
{
	constructor() {
		this.allowLanguagesOnSettings = ko.observable(true);
		this.allowLanguagesOnLogin = ko.observable(true);

		this.interfaceAnimation = ko.observable(true);

		this.interfaceAnimation.subscribe(function(bValue) {
			const bAnim = bMobileDevice || !bValue;
			$html.toggleClass('rl-anim', !bAnim).toggleClass('no-rl-anim', bAnim);
		});

		this.interfaceAnimation.valueHasMutated();

		this.prem = ko.observable(false);
		this.community = ko.observable(true);
	}

	populate() {
		this.allowLanguagesOnLogin(!!Settings.settingsGet('AllowLanguagesOnLogin'));
		this.allowLanguagesOnSettings(!!Settings.settingsGet('AllowLanguagesOnSettings'));

		this.interfaceAnimation(!!Settings.settingsGet('InterfaceAnimation'));

		this.prem(!!Settings.settingsGet('PremType'));
		this.community(!!Settings.settingsGet('Community'));
	}
}

export {AbstractAppStore, AbstractAppStore as default};
