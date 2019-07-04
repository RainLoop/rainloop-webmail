import ko from 'ko';
import { Capa } from 'Common/Enums';
import * as Settings from 'Storage/Settings';

class CapaAdminStore {
	constructor() {
		this.additionalAccounts = ko.observable(false);
		this.identities = ko.observable(false);
		this.gravatar = ko.observable(false);
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
		this.additionalAccounts(Settings.capa(Capa.AdditionalAccounts));
		this.identities(Settings.capa(Capa.Identities));
		this.gravatar(Settings.capa(Capa.Gravatar));
		this.attachmentThumbnails(Settings.capa(Capa.AttachmentThumbnails));
		this.sieve(Settings.capa(Capa.Sieve));
		this.filters(Settings.capa(Capa.Filters));
		this.themes(Settings.capa(Capa.Themes));
		this.userBackground(Settings.capa(Capa.UserBackground));
		this.openPGP(Settings.capa(Capa.OpenPGP));
		this.twoFactorAuth(Settings.capa(Capa.TwoFactor));
		this.twoFactorAuthForce(Settings.capa(Capa.TwoFactorForce));
		this.templates(Settings.capa(Capa.Templates));
	}
}

export default new CapaAdminStore();
