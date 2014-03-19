
/**
 * @constructor
 * @param {Object} oElement
 * @param {Function=} fOnBlur
 * @param {Function=} fOnReady
 * @param {Function=} fOnModeChange
 */
function NewHtmlEditorWrapper(oElement, fOnBlur, fOnReady, fOnModeChange)
{
	var self = this;
	self.editor = null;
	self.iBlurTimer = 0;
	self.fOnBlur = fOnBlur || null;
	self.fOnReady = fOnReady || null;
	self.fOnModeChange = fOnModeChange || null;
	
	self.$element = $(oElement);

	self.init();
}

NewHtmlEditorWrapper.prototype.blurTrigger = function ()
{
	if (this.fOnBlur)
	{
		var self = this;
		window.clearTimeout(self.iBlurTimer);
		self.iBlurTimer = window.setTimeout(function () {
			self.fOnBlur();
		}, 200);
	}
};

NewHtmlEditorWrapper.prototype.focusTrigger = function ()
{
	if (this.fOnBlur)
	{
		window.clearTimeout(this.iBlurTimer);
	}
};

/**
 * @return {boolean}
 */
NewHtmlEditorWrapper.prototype.isHtml = function ()
{
	return this.editor ? 'wysiwyg' === this.editor.mode : false;
};

/**
 * @return {boolean}
 */
NewHtmlEditorWrapper.prototype.checkDirty = function ()
{
	return this.editor ? this.editor.checkDirty() : false;
};

NewHtmlEditorWrapper.prototype.resetDirty = function ()
{
	if (this.editor)
	{
		this.editor.resetDirty();
	}
};

/**
 * @return {string}
 */
NewHtmlEditorWrapper.prototype.getData = function ()
{
	if (this.editor)
	{
		if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain)
		{
			return this.editor.__plain.getRawData();
		}

		return this.editor.getData();
	}

	return '';
};

NewHtmlEditorWrapper.prototype.modeToggle = function (bPlain)
{
	if (this.editor)
	{
		if (bPlain)
		{
			if ('plain' === this.editor.mode)
			{
				this.editor.setMode('wysiwyg');
			}
		}
		else
		{
			if ('wysiwyg' === this.editor.mode)
			{
				this.editor.setMode('plain');
			}
		}
	}
};

NewHtmlEditorWrapper.prototype.setHtml = function (sHtml, bFocus)
{
	if (this.editor)
	{
		this.modeToggle(true);
		this.editor.setData(sHtml);

		if (bFocus)
		{
			this.focus();
		}
	}
};

NewHtmlEditorWrapper.prototype.setPlain = function (sPlain, bFocus)
{
	if (this.editor)
	{
		this.modeToggle(false);
		if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain)
		{
			return this.editor.__plain.setRawData(sPlain);
		}
		else
		{
			this.editor.setData(sPlain);
		}

		if (bFocus)
		{
			this.focus();
		}
	}
};

NewHtmlEditorWrapper.prototype.init = function ()
{
	if (this.$element && this.$element[0])
	{
		var
			self = this,
			oConfig = Globals.oHtmlEditorDefaultConfig,
			sLanguage = RL.settingsGet('Language'),
			bSource = !!RL.settingsGet('AllowHtmlEditorSourceButton')
		;
		
		if (bSource && oConfig.toolbarGroups && !oConfig.toolbarGroups.__SourceInited)
		{
			oConfig.toolbarGroups.__SourceInited = true;
			oConfig.toolbarGroups.push({name: 'document', groups: ['mode', 'document', 'doctools']});
		}

		oConfig.language = Globals.oHtmlEditorLangsMap[sLanguage] || 'en';
		self.editor = window.CKEDITOR.appendTo(self.$element[0], oConfig);
		
		self.editor.on('blur', function() {
			self.blurTrigger();
		});

		self.editor.on('mode', function() {
			self.blurTrigger();

			if (self.fOnModeChange)
			{
				self.fOnModeChange('plain' !== self.editor.mode);
			}
		});

		self.editor.on('focus', function() {
			self.focusTrigger();
		});

		if (self.fOnReady)
		{
			self.editor.on('instanceReady', function () {

				self.editor.setKeystroke(window.CKEDITOR.CTRL + 65/* A */, 'selectAll');

				self.fOnReady();
				self.resize();
			});
		}
	}
};

NewHtmlEditorWrapper.prototype.focus = function ()
{
	if (this.editor)
	{
		this.editor.focus();
	}
};

NewHtmlEditorWrapper.prototype.blur = function ()
{
	if (this.editor)
	{
		this.editor.focusManager.blur(true);
	}
};

NewHtmlEditorWrapper.prototype.resize = function ()
{
	if (this.editor)
	{
		this.editor.resize(this.$element.width(), this.$element.innerHeight());
	}
};

NewHtmlEditorWrapper.prototype.clear = function (bFocus)
{
	this.setHtml('', bFocus);
};

