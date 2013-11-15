/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @param {string=} sEmail
 * @param {string=} sName
 *
 * @constructor
 */
function EmailModel(sEmail, sName)
{
	this.email = sEmail || '';
	this.name = sName || '';
	this.privateType = null;

	this.clearDuplicateName();
}

/**
 * @static
 * @param {AjaxJsonEmail} oJsonEmail
 * @return {?EmailModel}
 */
EmailModel.newInstanceFromJson = function (oJsonEmail)
{
	var oEmailModel = new EmailModel();
	return oEmailModel.initByJson(oJsonEmail) ? oEmailModel : null;
};

/**
 * @type {string}
 */
EmailModel.prototype.name = '';

/**
 * @type {string}
 */
EmailModel.prototype.email = '';

/**
 * @type {(number|null)}
 */
EmailModel.prototype.privateType = null;

/**
 * @returns {boolean}
 */
EmailModel.prototype.validate = function ()
{
	return '' !== this.name || '' !== this.email;
};

/**
 * @param {boolean} bWithoutName = false
 * @return {string}
 */
EmailModel.prototype.hash = function (bWithoutName)
{
	return '#' + (bWithoutName ? '' : this.name) + '#' + this.email + '#';
};

EmailModel.prototype.clearDuplicateName = function ()
{
	if (this.name === this.email)
	{
		this.name = '';
	}
};

/**
 * @return {number}
 */
EmailModel.prototype.type = function ()
{
	if (null === this.privateType)
	{
		if (this.email && '@facebook.com' === this.email.substr(-13))
		{
			this.privateType = Enums.EmailType.Facebook;
		}

		if (null === this.privateType)
		{
			this.privateType = Enums.EmailType.Default;
		}
	}
	
	return this.privateType;
};

/**
 * @param {string} sQuery
 * @return {boolean}
 */
EmailModel.prototype.search = function (sQuery)
{
	return -1 < (this.name + ' ' + this.email).toLowerCase().indexOf(sQuery.toLowerCase());
};

/**
 * @param {string} sString
 */
EmailModel.prototype.parse = function (sString)
{
	sString = Utils.trim(sString);

	var
		mRegex = /(?:"([^"]+)")? ?<?(.*?@[^>,]+)>?,? ?/g,
		mMatch = mRegex.exec(sString)
	;

	if (mMatch)
	{
		this.name = mMatch[1] || '';
		this.email = mMatch[2] || '';

		this.clearDuplicateName();
	}
	else if ((/^[^@]+@[^@]+$/).test(sString))
	{
		this.name = '';
		this.email = sString;
	}
};

/**
 * @param {AjaxJsonEmail} oJsonEmail
 * @return {boolean}
 */
EmailModel.prototype.initByJson = function (oJsonEmail)
{
	var bResult = false;
	if (oJsonEmail && 'Object/Email' === oJsonEmail['@Object'])
	{
		this.name = Utils.trim(oJsonEmail.Name);
		this.email = Utils.trim(oJsonEmail.Email);

		bResult = '' !== this.email;
		this.clearDuplicateName();
	}

	return bResult;
};

/**
 * @param {boolean} bFriendlyView
 * @param {boolean=} bWrapWithLink = false
 * @return {string}
 */
EmailModel.prototype.toLine = function (bFriendlyView, bWrapWithLink)
{
	var sResult = '';
	if ('' !== this.email)
	{
		bWrapWithLink = Utils.isUnd(bWrapWithLink) ? false : !!bWrapWithLink;
		if (bFriendlyView && '' !== this.name)
		{
			sResult = bWrapWithLink ? '<a href="mailto:' + Utils.encodeHtml('"' + this.name + '" <' + this.email + '>') +
				'" target="_blank" tabindex="-1">' + Utils.encodeHtml(this.name) + '</a>' : this.name;
		}
		else
		{
			sResult = this.email;
			if ('' !== this.name)
			{
				if (bWrapWithLink)
				{
					sResult = Utils.encodeHtml('"' + this.name + '" <') +
						'<a href="mailto:' + Utils.encodeHtml('"' + this.name + '" <' + this.email + '>') + '" target="_blank" tabindex="-1">' + Utils.encodeHtml(sResult) + '</a>' + Utils.encodeHtml('>');
				}
				else
				{
					sResult = '"' + this.name + '" <' + sResult + '>';
				}
			}
			else if (bWrapWithLink)
			{
				sResult = '<a href="mailto:' + Utils.encodeHtml(this.email) + '" target="_blank" tabindex="-1">' + Utils.encodeHtml(this.email) + '</a>';
			}
		}
	}

	return sResult;
};

/**
 * @return {string}
 */
EmailModel.prototype.select2Result = function ()
{
	var 
		sResult = '',
		sImg = RL.cache().getUserPic(this.email)
	;

	if ('' !== sImg)
	{
		sResult += '<img class="select2-user-pic pull-left" src="' + Utils.encodeHtml(sImg) + '" />';
	}
	else
	{
		sResult += '<img class="select2-user-pic pull-left" src="' + RL.link().emptyContactPic() + '" />';
	}
	
	if (Enums.EmailType.Facebook === this.type())
	{
		sResult += '' + (0 < this.name.length ? this.name : this.email);
		sResult += '<i class="icon-facebook pull-right select2-icon-result" />';
	}
	else
	{
		sResult += '' + (0 < this.name.length ? this.email + ' <span class="select2-subname">(' + this.name + ')</span>' : this.email);
	}
	
	return sResult + '';
};

/**
 * @param {Object} oContainer
 * @return {string|null}
 */
EmailModel.prototype.select2Selection = function (oContainer)
{
	var sResult = '';
	if (Enums.EmailType.Facebook === this.type())
	{
		sResult =  0 < this.name.length ? this.name : this.email;
		if ('' !== sResult)
		{
			$('<pan>').text(sResult).appendTo(oContainer);
			oContainer.append('<i class="icon-facebook select2-icon"></i>');
			return null;
		}
	}
	else
	{
		sResult =  0 < this.name.length ? this.name + ' (' + this.email + ')' : this.email;
	}

	return sResult;
};
