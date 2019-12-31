import window from 'window';
import ko from 'ko';
import $ from '$';
import * as Settings from 'Storage/Settings';

class SocialStore {
	constructor() {
		this.google = {};
		this.twitter = {};
		this.facebook = {};
		this.dropbox = {};

		// Google
		this.google.enabled = ko.observable(false);

		this.google.clientID = ko.observable('');
		this.google.clientSecret = ko.observable('');
		this.google.apiKey = ko.observable('');

		this.google.loading = ko.observable(false);
		this.google.userName = ko.observable('');

		this.google.loggined = ko.computed(() => '' !== this.google.userName());

		this.google.capa = {};
		this.google.capa.auth = ko.observable(false);
		this.google.capa.authGmail = ko.observable(false);
		this.google.capa.drive = ko.observable(false);
		this.google.capa.preview = ko.observable(false);

		this.google.require = {};
		this.google.require.clientSettings = ko.computed(
			() =>
				this.google.enabled() && (this.google.capa.auth() || this.google.capa.authGmail() || this.google.capa.drive())
		);

		this.google.require.apiKeySettings = ko.computed(() => this.google.enabled() && this.google.capa.drive());

		// Facebook
		this.facebook.enabled = ko.observable(false);
		this.facebook.appID = ko.observable('');
		this.facebook.appSecret = ko.observable('');
		this.facebook.loading = ko.observable(false);
		this.facebook.userName = ko.observable('');
		this.facebook.supported = ko.observable(false);

		this.facebook.loggined = ko.computed(() => '' !== this.facebook.userName());

		// Twitter
		this.twitter.enabled = ko.observable(false);
		this.twitter.consumerKey = ko.observable('');
		this.twitter.consumerSecret = ko.observable('');
		this.twitter.loading = ko.observable(false);
		this.twitter.userName = ko.observable('');

		this.twitter.loggined = ko.computed(() => '' !== this.twitter.userName());

		// Dropbox
		this.dropbox.enabled = ko.observable(false);
		this.dropbox.apiKey = ko.observable('');
	}

	populate() {
		this.google.enabled(!!Settings.settingsGet('AllowGoogleSocial'));
		this.google.clientID(Settings.settingsGet('GoogleClientID'));
		this.google.clientSecret(Settings.settingsGet('GoogleClientSecret'));
		this.google.apiKey(Settings.settingsGet('GoogleApiKey'));

		this.google.capa.auth(!!Settings.settingsGet('AllowGoogleSocialAuth'));
		this.google.capa.authGmail(!!Settings.settingsGet('AllowGoogleSocialAuthGmail'));
		this.google.capa.drive(!!Settings.settingsGet('AllowGoogleSocialDrive'));
		this.google.capa.preview(!!Settings.settingsGet('AllowGoogleSocialPreview'));

		this.facebook.enabled(!!Settings.settingsGet('AllowFacebookSocial'));
		this.facebook.appID(Settings.settingsGet('FacebookAppID'));
		this.facebook.appSecret(Settings.settingsGet('FacebookAppSecret'));
		this.facebook.supported(!!Settings.settingsGet('SupportedFacebookSocial'));

		this.twitter.enabled = ko.observable(!!Settings.settingsGet('AllowTwitterSocial'));
		this.twitter.consumerKey = ko.observable(Settings.settingsGet('TwitterConsumerKey'));
		this.twitter.consumerSecret = ko.observable(Settings.settingsGet('TwitterConsumerSecret'));

		this.dropbox.enabled(!!Settings.settingsGet('AllowDropboxSocial'));
		this.dropbox.apiKey(Settings.settingsGet('DropboxApiKey'));
	}

	appendDropbox() {
		if (!window.Dropbox && this.dropbox.enabled() && this.dropbox.apiKey()) {
			if (!window.document.getElementById('dropboxjs')) {
				const script = window.document.createElement('script');
				script.type = 'text/javascript';
				script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
				$(script)
					.attr('id', 'dropboxjs')
					.attr('data-app-key', this.dropbox.apiKey());

				window.document.body.appendChild(script);
			}
		}
	}
}

export default new SocialStore();
