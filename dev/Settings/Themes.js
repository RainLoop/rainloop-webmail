/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsThemes()
{
	var
		self = this,
		oData = RL.data()
	;
	
	this.mainTheme = oData.mainTheme;
	this.customThemeType = ko.observable(RL.settingsGet('CustomThemeType'));
	this.customThemeImg = ko.observable(RL.settingsGet('CustomThemeImg'));

	this.themesObjects = ko.observableArray([]);

	this.customThemeUploaderProgress = ko.observable(false);
	this.customThemeUploaderButton = ko.observable(null);
	
	this.showCustomThemeConfig = ko.computed(function () {
		return 'Custom' === this.mainTheme();
	}, this);

	this.showCustomThemeConfig.subscribe(function () {
		Utils.windowResize();
	});

	this.themeTrigger = ko.observable(Enums.SaveSettingsStep.Idle).extend({'throttle': 100});

	this.oLastAjax = null;
	this.iTimer = 0;

	RL.data().theme.subscribe(function (sValue) {

		_.each(this.themesObjects(), function (oTheme) {
			oTheme.selected(sValue === oTheme.name);
		});

		var
			oThemeLink = $('#rlThemeLink'),
			oThemeStyle = $('#rlThemeStyle'),
			sUrl = oThemeLink.attr('href')
		;

		if (!sUrl)
		{
			sUrl = oThemeStyle.attr('data-href');
		}

		if (sUrl)
		{
			sUrl = sUrl.toString().replace(/\/-\/[^\/]+\/\-\//, '/-/' + sValue + '/-/');
			sUrl = sUrl.toString().replace(/\/Css\/[^\/]+\/User\//, '/Css/' + ('Custom' === sValue && window.__rlah ? window.__rlah() || '0' : '0') + '/User/');
			
			if ('Json/' !== sUrl.substring(sUrl.length - 5, sUrl.length))
			{
				sUrl += 'Json/';
			}

			window.clearTimeout(self.iTimer);
			self.themeTrigger(Enums.SaveSettingsStep.Animate);

			if (this.oLastAjax && this.oLastAjax.abort)
			{
				this.oLastAjax.abort();
			}

			this.oLastAjax = $.ajax({
				'url': sUrl,
				'dataType': 'json'
			}).done(function(aData) {
				if (aData && Utils.isArray(aData) && 2 === aData.length)
				{
					if (oThemeLink && oThemeLink[0] && (!oThemeStyle || !oThemeStyle[0]))
					{
						oThemeStyle = $('<style id="rlThemeStyle"></style>');
						oThemeLink.after(oThemeStyle);
						oThemeLink.remove();
					}

					if (oThemeStyle && oThemeStyle[0])
					{
						oThemeStyle.attr('data-href', sUrl).attr('data-theme', aData[0]).text(aData[1]);
					}

					self.themeTrigger(Enums.SaveSettingsStep.TrueResult);
				}

			}).always(function() {

				self.iTimer = window.setTimeout(function () {
					self.themeTrigger(Enums.SaveSettingsStep.Idle);
				}, 1000);

				self.oLastAjax = null;
			});
		}

		RL.remote().saveSettings(null, {
			'Theme': sValue
		});

	}, this);
}

Utils.addSettingsViewModel(SettingsThemes, 'SettingsThemes', 'SETTINGS_LABELS/LABEL_THEMES_NAME', 'themes');

SettingsThemes.prototype.removeCustomThemeImg = function ()
{
	this.customThemeImg('');
};

SettingsThemes.prototype.onBuild = function ()
{
	var
		self = this,
		sCurrentTheme = RL.data().theme()
	;
	
	this.themesObjects(_.map(RL.data().themes(), function (sTheme) {
		return {
			'name': sTheme,
			'nameDisplay': Utils.convertThemeName(sTheme),
			'selected': ko.observable(sTheme === sCurrentTheme),
			'themePreviewSrc': RL.link().themePreviewLink(sTheme)
		};
	}));

	_.delay(function () {

		self.customThemeType.subscribe(function (sValue) {
			RL.remote().saveSettings(function () {
				RL.data().theme.valueHasMutated();
			}, {
				'CustomThemeType': sValue
			});
		});

		self.customThemeImg.subscribe(function (sValue) {
			RL.remote().saveSettings(function () {
				RL.data().theme.valueHasMutated();
			}, {
				'CustomThemeImg': sValue
			});
		});

	}, 50);

	this.initCustomThemeUploader();
};

SettingsThemes.prototype.initCustomThemeUploader = function ()
{
	if (this.customThemeUploaderButton())
	{
		var
			oJua = new Jua({
				'action': RL.link().uploadBackground(),
				'name': 'uploader',
				'queueSize': 1,
				'multipleSizeLimit': 1,
				'disableFolderDragAndDrop': true,
				'clickElement': this.customThemeUploaderButton(),
				'onSelect': _.bind(function (sId, oData) {

					var
						sFileName = Utils.isUnd(oData.FileName) ? '' : oData.FileName.toString(),
						sFileNameExt = sFileName.substring(sFileName.length - 4, sFileName.length),
						mSize = Utils.isNormal(oData.Size) ? Utils.pInt(oData.Size) : null
					;

					if (-1 === Utils.inArray(sFileNameExt, ['jpeg', '.jpg', '.png']))
					{
						window.alert(Utils.i18n('SETTINGS_THEMES/ERROR_FILE_TYPE_ERROR'));
						return false;
					}

					if (1024 * 1024 < mSize)
					{
						window.alert(Utils.i18n('SETTINGS_THEMES/ERROR_FILE_IS_TOO_BIG'));
						return false;
					}

					return true;

				}, this),

				'onStart': _.bind(function () {
					this.customThemeUploaderProgress(true);
				}, this),

				'onComplete': _.bind(function (sId, bResult, oData) {
					if (!bResult || !oData || !oData.Result)
					{
						window.alert(
							oData && oData.ErrorCode ? Utils.getUploadErrorDescByCode(oData.ErrorCode) : Utils.getUploadErrorDescByCode(Enums.UploadErrorCode.Unknown)
						);
					}
					else
					{
						this.customThemeImg(oData.Result);
					}

					this.customThemeUploaderProgress(false);
				}, this)
			})
		;

		return !!oJua;
	}

	return false;
};

