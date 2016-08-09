
var
	_ = require('_'),
	$ = require('$'),
	ko = require('ko'),
	key = require('key'),

	Utils = require('Common/Utils'),
	Enums = require('Common/Enums'),
	Translator = require('Common/Translator'),

	PgpStore = require('Stores/User/Pgp'),

	EmailModel = require('Model/Email').default,

	kn = require('Knoin/Knoin'),
	AbstractView = require('Knoin/AbstractView');

/**
 * @constructor
 * @extends AbstractView
 */
function ComposeOpenPgpPopupView()
{
	AbstractView.call(this, 'Popups', 'PopupsComposeOpenPgp');

	var self = this;

	this.publicKeysOptionsCaption = Translator.i18n('PGP_NOTIFICATIONS/ADD_A_PUBLICK_KEY');
	this.privateKeysOptionsCaption = Translator.i18n('PGP_NOTIFICATIONS/SELECT_A_PRIVATE_KEY');

	this.notification = ko.observable('');

	this.sign = ko.observable(false);
	this.encrypt = ko.observable(false);

	this.password = ko.observable('');
	this.password.focus = ko.observable(false);
	this.buttonFocus = ko.observable(false);

	this.text = ko.observable('');
	this.selectedPrivateKey = ko.observable(null);
	this.selectedPublicKey = ko.observable(null);

	this.signKey = ko.observable(null);
	this.encryptKeys = ko.observableArray([]);

	this.encryptKeysView = ko.computed(function() {
		return _.compact(_.map(this.encryptKeys(), function(oKey) {
			return oKey ? oKey.key : null;
		}));
	}, this);

	this.privateKeysOptions = ko.computed(function() {
		return _.compact(_.flatten(_.map(PgpStore.openpgpkeysPrivate(), function(oKey, iIndex) {
			return self.signKey() && self.signKey().key.id === oKey.id ? null : _.map(oKey.users, function(sUser) {
				return {
					'id': oKey.guid,
					'name': '(' + oKey.id.substr(-8).toUpperCase() + ') ' + sUser,
					'key': oKey,
					'class': iIndex % 2 ? 'odd' : 'even'
				};
			});
		}), true));
	});

	this.publicKeysOptions = ko.computed(function() {
		return _.compact(_.flatten(_.map(PgpStore.openpgpkeysPublic(), function(oKey, iIndex) {
			return -1 < Utils.inArray(oKey, self.encryptKeysView()) ? null : _.map(oKey.users, function(sUser) {
				return {
					'id': oKey.guid,
					'name': '(' + oKey.id.substr(-8).toUpperCase() + ') ' + sUser,
					'key': oKey,
					'class': iIndex % 2 ? 'odd' : 'even'
				};
			});
		}), true));
	});

	this.submitRequest = ko.observable(false);

	this.resultCallback = null;

	// commands
	this.doCommand = Utils.createCommand(this, function() {

		var
			bResult = true,
			oPrivateKey = null,
			aPublicKeys = [];

		this.submitRequest(true);

		if (bResult && this.sign())
		{
			if (!this.signKey())
			{
				this.notification(Translator.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND'));
				bResult = false;
			}
			else if (!this.signKey().key)
			{
				this.notification(Translator.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND_FOR', {
					'EMAIL': this.signKey().email
				}));

				bResult = false;
			}

			if (bResult)
			{
				var aPrivateKeys = this.signKey().key.getNativeKeys();
				oPrivateKey = aPrivateKeys[0] || null;

				try
				{
					if (oPrivateKey)
					{
						oPrivateKey.decrypt(Utils.pString(this.password()));
					}
				}
				catch (e)
				{
					oPrivateKey = null;
				}

				if (!oPrivateKey)
				{
					this.notification(Translator.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND'));
					bResult = false;
				}
			}
		}

		if (bResult && this.encrypt())
		{
			if (0 === this.encryptKeys().length)
			{
				this.notification(Translator.i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND'));
				bResult = false;
			}
			else if (this.encryptKeys())
			{
				aPublicKeys = [];

				_.each(this.encryptKeys(), function(oKey) {
					if (oKey && oKey.key)
					{
						aPublicKeys = aPublicKeys.concat(_.compact(_.flatten(oKey.key.getNativeKeys())));
					}
					else if (oKey && oKey.email)
					{
						self.notification(Translator.i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND_FOR', {
							'EMAIL': oKey.email
						}));

						bResult = false;
					}
				});

				if (bResult && (0 === aPublicKeys.length || this.encryptKeys().length !== aPublicKeys.length))
				{
					bResult = false;
				}
			}
		}

		if (bResult && self.resultCallback)
		{
			_.delay(function() {

				var oPromise = null;

				try
				{
					if (oPrivateKey && 0 === aPublicKeys.length)
					{
						oPromise = PgpStore.openpgp.sign({
							data: self.text(),
							privateKeys: [oPrivateKey]
						});
					}
					else if (oPrivateKey && 0 < aPublicKeys.length)
					{
						oPromise = PgpStore.openpgp.encrypt({
							data: self.text(),
							publicKeys: aPublicKeys,
							privateKeys: [oPrivateKey]
						});
					}
					else if (!oPrivateKey && 0 < aPublicKeys.length)
					{
						oPromise = PgpStore.openpgp.encrypt({
							data: self.text(),
							publicKeys: aPublicKeys
						});
					}
				}
				catch (e)
				{
					Utils.log(e);

					self.notification(Translator.i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
						'ERROR': '' + e
					}));
				}

				if (oPromise)
				{
					try
					{
						oPromise.then(function(mData) {

							self.resultCallback(mData.data);
							self.cancelCommand();

						}).then(null, function(e) {
							self.notification(Translator.i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
								'ERROR': '' + e
							}));
						});
					}
					catch (e)
					{
						self.notification(Translator.i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
							'ERROR': '' + e
						}));
					}
				}

				self.submitRequest(false);

			}, Enums.Magics.Time20ms);
		}
		else
		{
			self.submitRequest(false);
		}

		return bResult;

	}, function() {
		return !this.submitRequest() &&	(this.sign() || this.encrypt());
	});

	this.selectCommand = Utils.createCommand(this, function() {

		var
			sKeyId = this.selectedPrivateKey(),
			oOption = sKeyId ? _.find(this.privateKeysOptions(), function(oItem) {
				return oItem && sKeyId === oItem.id;
			}) : null;

		if (oOption)
		{
			this.signKey({
				'empty': !oOption.key,
				'selected': ko.observable(!!oOption.key),
				'users': oOption.key.users,
				'hash': oOption.key.id.substr(-8).toUpperCase(),
				'key': oOption.key
			});
		}
	});

	this.addCommand = Utils.createCommand(this, function() {

		var
			sKeyId = this.selectedPublicKey(),
			aKeys = this.encryptKeys(),
			oOption = sKeyId ? _.find(this.publicKeysOptions(), function(oItem) {
				return oItem && sKeyId === oItem.id;
			}) : null;

		if (oOption)
		{
			aKeys.push({
				'empty': !oOption.key,
				'selected': ko.observable(!!oOption.key),
				'removable': ko.observable(!this.sign() || !this.signKey() || this.signKey().key.id !== oOption.key.id),
				'users': oOption.key.users,
				'hash': oOption.key.id.substr(-8).toUpperCase(),
				'key': oOption.key
			});

			this.encryptKeys(aKeys);
		}
	});

	this.updateCommand = Utils.createCommand(this, function() {
		_.each(this.encryptKeys(), function(oKey) {
			oKey.removable(!self.sign() || !self.signKey() || self.signKey().key.id !== oKey.key.id);
		});
	});

	this.selectedPrivateKey.subscribe(function(sValue) {
		if (sValue)
		{
			this.selectCommand();
			this.updateCommand();
		}
	}, this);

	this.selectedPublicKey.subscribe(function(sValue) {
		if (sValue)
		{
			this.addCommand();
		}
	}, this);

	this.sDefaultKeyScope = Enums.KeyState.PopupComposeOpenPGP;

	this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

	this.addOptionClass = function(oDomOption, oItem) {

		self.defautOptionsAfterRender(oDomOption, oItem);

		if (oItem && !Utils.isUnd(oItem.class) && oDomOption)
		{
			$(oDomOption).addClass(oItem.class);
		}
	};

	this.deletePublickKey = _.bind(this.deletePublickKey, this);

	kn.constructorEnd(this);
}

kn.extendAsViewModel(['View/Popup/ComposeOpenPgp', 'PopupsComposeOpenPgpViewModel'], ComposeOpenPgpPopupView);
_.extend(ComposeOpenPgpPopupView.prototype, AbstractView.prototype);

ComposeOpenPgpPopupView.prototype.deletePublickKey = function(oKey)
{
	this.encryptKeys.remove(oKey);
};

ComposeOpenPgpPopupView.prototype.clearPopup = function()
{
	this.notification('');

	this.sign(false);
	this.encrypt(false);

	this.password('');
	this.password.focus(false);
	this.buttonFocus(false);

	this.signKey(null);
	this.encryptKeys([]);
	this.text('');

	this.resultCallback = null;
};

ComposeOpenPgpPopupView.prototype.onBuild = function()
{
	key('tab,shift+tab', Enums.KeyState.PopupComposeOpenPGP, _.bind(function() {

		switch (true)
		{
			case this.password.focus():
				this.buttonFocus(true);
				break;
			case this.buttonFocus():
				this.password.focus(true);
				break;
			// no default
		}

		return false;

	}, this));
};

ComposeOpenPgpPopupView.prototype.onHideWithDelay = function()
{
	this.clearPopup();
};

ComposeOpenPgpPopupView.prototype.onShowWithDelay = function()
{
	if (this.sign())
	{
		this.password.focus(true);
	}
	else
	{
		this.buttonFocus(true);
	}
};

ComposeOpenPgpPopupView.prototype.onShow = function(fCallback, sText, oIdentity, sTo, sCc, sBcc)
{
	this.clearPopup();

	var
		self = this,
		aRec = [],
		sEmail = '',
		oEmail = new EmailModel();

	this.resultCallback = fCallback;

	if ('' !== sTo)
	{
		aRec.push(sTo);
	}

	if ('' !== sCc)
	{
		aRec.push(sCc);
	}

	if ('' !== sBcc)
	{
		aRec.push(sBcc);
	}

	aRec = aRec.join(', ').split(',');
	aRec = _.compact(_.map(aRec, function(sValue) {
		oEmail.clear();
		oEmail.mailsoParse(Utils.trim(sValue));
		return '' === oEmail.email ? false : oEmail.email;
	}));

	if (oIdentity && oIdentity.email())
	{
		sEmail = oIdentity.email();
		aRec.unshift(sEmail);

		var aKeys = PgpStore.findAllPrivateKeysByEmailNotNative(sEmail);
		if (aKeys && aKeys[0])
		{
			this.signKey({
				'users': aKeys[0].users || [sEmail],
				'hash': aKeys[0].id.substr(-8).toUpperCase(),
				'key': aKeys[0]
			});
		}
	}

	if (this.signKey())
	{
		this.sign(true);
	}

	if (aRec && 0 < aRec.length)
	{
		this.encryptKeys(_.uniq(_.compact(_.flatten(_.map(aRec, function(sRecEmail) {
			var keys = PgpStore.findAllPublicKeysByEmailNotNative(sRecEmail);
			return keys ? _.map(keys, function(oKey) {
				return {
					'empty': !oKey,
					'selected': ko.observable(!!oKey),
					'removable': ko.observable(!self.sign() || !self.signKey() || self.signKey().key.id !== oKey.id),
					'users': oKey ? (oKey.users || [sRecEmail]) : [sRecEmail],
					'hash': oKey ? oKey.id.substr(-8).toUpperCase() : '',
					'key': oKey
				};
			}) : [];
		}), true)), function(oEncryptKey) {
			return oEncryptKey.hash;
		}));

		if (0 < this.encryptKeys().length)
		{
			this.encrypt(true);
		}
	}

	this.text(sText);
};

module.exports = ComposeOpenPgpPopupView;
