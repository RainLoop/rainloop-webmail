
(function () {

	'use strict';

	var
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function SocialStore()
	{
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

		this.google.loggined = ko.computed(function () {
			return '' !== this.google.userName();
		}, this);

		this.google.capa = {};
		this.google.capa.auth = ko.observable(false);
		this.google.capa.authFast = ko.observable(false);
		this.google.capa.drive = ko.observable(false);
		this.google.capa.preview = ko.observable(false);

		this.google.require = {};
		this.google.require.clientSettings = ko.computed(function () {
			return this.google.enabled() && (this.google.capa.auth() || this.google.capa.drive());
		}, this);

		this.google.require.apiKeySettings = ko.computed(function () {
			return this.google.enabled() && this.google.capa.drive();
		}, this);

		// Facebook
		this.facebook.enabled = ko.observable(false);
		this.facebook.appID = ko.observable('');
		this.facebook.appSecret = ko.observable('');
		this.facebook.loading = ko.observable(false);
		this.facebook.userName = ko.observable('');
		this.facebook.supported = ko.observable(false);

		this.facebook.loggined = ko.computed(function () {
			return '' !== this.facebook.userName();
		}, this);

		// Twitter
		this.twitter.enabled = ko.observable(false);
		this.twitter.consumerKey = ko.observable('');
		this.twitter.consumerSecret = ko.observable('');
		this.twitter.loading = ko.observable(false);
		this.twitter.userName = ko.observable('');

		this.twitter.loggined = ko.computed(function () {
			return '' !== this.twitter.userName();
		}, this);

		// Dropbox
		this.dropbox.enabled = ko.observable(false);
		this.dropbox.apiKey = ko.observable('');
	}

	SocialStore.prototype.google = {};
	SocialStore.prototype.twitter = {};
	SocialStore.prototype.facebook = {};
	SocialStore.prototype.dropbox = {};

	SocialStore.prototype.populate = function ()
	{
		var Settings = require('Storage/Settings');

		this.google.enabled(!!Settings.settingsGet('AllowGoogleSocial'));
		this.google.clientID(Settings.settingsGet('GoogleClientID'));
		this.google.clientSecret(Settings.settingsGet('GoogleClientSecret'));
		this.google.apiKey(Settings.settingsGet('GoogleApiKey'));

		this.google.capa.auth(!!Settings.settingsGet('AllowGoogleSocialAuth'));
		this.google.capa.authFast(!!Settings.settingsGet('AllowGoogleSocialAuthFast'));
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
	};

	module.exports = new SocialStore();

}());
