import ko from 'ko';
import { Capa } from 'Common/Enums';

class CapaAdminStore {
	constructor() {
		this.additionalAccounts = ko.observable(false);
		this.identities = ko.observable(false);
		this.attachmentThumbnails = ko.observable(false);
		this.sieve = ko.observable(false);
		this.filters = ko.observable(false);
		this.themes = ko.observable(true);
		this.userBackground = ko.observable(false);
		this.openPGP = ko.observable(false);
		this.twoFactorAuth = ko.observable(false);
		this.twoFactorAuthForce = ko.observable(false);
		this.templates = ko.observable(false);
	}

	populate() {
		let capa = rl.settings.capa;
		this.additionalAccounts(capa(Capa.AdditionalAccounts));
		this.identities(capa(Capa.Identities));
		this.attachmentThumbnails(capa(Capa.AttachmentThumbnails));
		this.sieve(capa(Capa.Sieve));
		this.filters(capa(Capa.Filters));
		this.themes(capa(Capa.Themes));
		this.userBackground(capa(Capa.UserBackground));
		this.openPGP(capa(Capa.OpenPGP));
		this.twoFactorAuth(capa(Capa.TwoFactor));
		this.twoFactorAuthForce(capa(Capa.TwoFactorForce));
		this.templates(capa(Capa.Templates));
	}
}

export default new CapaAdminStore();
