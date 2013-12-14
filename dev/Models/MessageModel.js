/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function MessageModel()
{
	this.folderFullNameRaw = '';
	this.uid = '';
	this.requestHash = '';
	this.subject = ko.observable('');
	this.size = ko.observable(0);
	this.dateTimeStampInUTC = ko.observable(0);
	this.priority = ko.observable(Enums.MessagePriority.Normal);

	this.fromEmailString = ko.observable('');
	this.toEmailsString = ko.observable('');
	this.senderEmailsString = ko.observable('');

	this.prefetched = false;

	this.emails = [];

	this.from = [];
	this.to = [];
	this.cc = [];
	this.bcc = [];
	this.replyTo = [];

	this.newForAnimation = ko.observable(false);

	this.deleted = ko.observable(false);
	this.unseen = ko.observable(false);
	this.flagged = ko.observable(false);
	this.answered = ko.observable(false);
	this.forwarded = ko.observable(false);

	this.selected = ko.observable(false);
	this.checked = ko.observable(false);
	this.hasAttachments = ko.observable(false);
	this.attachmentsMainType = ko.observable('');

	this.moment = ko.observable(moment());

	this.attachmentIconClass = ko.computed(function () {
		var sClass = '';
		if (this.hasAttachments())
		{
			sClass = 'icon-attachment';
			switch (this.attachmentsMainType())
			{
				case 'image':
					sClass = 'icon-image';
					break;
				case 'archive':
					sClass = 'icon-file-zip';
					break;
				case 'doc':
					sClass = 'icon-file-text';
					break;
//				case 'pdf':
//					sClass = 'icon-file-pdf';
//					break;
			}
		}
		return sClass;
	}, this);
	
	this.fullFormatDateValue = ko.computed(function () {
		return MessageModel.calculateFullFromatDateValue(this.dateTimeStampInUTC());
	}, this);

	this.fullFormatDateValue = ko.computed(function () {
		return MessageModel.calculateFullFromatDateValue(this.dateTimeStampInUTC());
	}, this);

	this.momentDate = Utils.createMomentDate(this);
	this.momentShortDate = Utils.createMomentShortDate(this);

	this.dateTimeStampInUTC.subscribe(function (iValue) {
		var iNow = moment().unix();
		this.moment(moment.unix(iNow < iValue ? iNow : iValue));
	}, this);

	this.body = null;
	this.isRtl = ko.observable(false);
	this.isHtml = ko.observable(false);
	this.hasImages = ko.observable(false);
	this.attachments = ko.observableArray([]);

	this.priority = ko.observable(Enums.MessagePriority.Normal);
	this.aDraftInfo = [];
	this.sMessageId = '';
	this.sInReplyTo = '';
	this.sReferences = '';
	
	this.parentUid = ko.observable(0);
	this.threads = ko.observableArray([]);
	this.threadsLen = ko.observable(0);
	this.hasUnseenSubMessage = ko.observable(false);
	this.hasFlaggedSubMessage = ko.observable(false);

	this.lastInCollapsedThread = ko.observable(false);
	this.lastInCollapsedThreadLoading = ko.observable(false);
	
	this.threadsLenResult = ko.computed(function () {
		var iCount = this.threadsLen();
		return 0 === this.parentUid() && 0 < iCount ? iCount + 1 : '';
	}, this);
}

/**
 * @static
 * @param {AjaxJsonMessage} oJsonMessage
 * @return {?MessageModel}
 */
MessageModel.newInstanceFromJson = function (oJsonMessage)
{
	var oMessageModel = new MessageModel();
	return oMessageModel.initByJson(oJsonMessage) ? oMessageModel : null;
};

/**
 * @static
 * @param {number} iTimeStampInUTC
 * @return {string}
 */
MessageModel.calculateFullFromatDateValue = function (iTimeStampInUTC)
{
	return moment.unix(iTimeStampInUTC).format('LLL');
};

/**
 * @static
 * @param {Array} aEmail
 * @param {boolean=} bFriendlyView
 * @param {boolean=} bWrapWithLink = false
 * @return {string}
 */
MessageModel.emailsToLine = function (aEmail, bFriendlyView, bWrapWithLink)
{
	var
		aResult = [],
		iIndex = 0,
		iLen = 0
	;

	if (Utils.isNonEmptyArray(aEmail))
	{
		for (iIndex = 0, iLen = aEmail.length; iIndex < iLen; iIndex++)
		{
			aResult.push(aEmail[iIndex].toLine(bFriendlyView, bWrapWithLink));
		}
	}

	return aResult.join(', ');
};

/**
 * @static
 * @param {?Array} aJsonEmails
 * @return {Array}
 */
MessageModel.initEmailsFromJson = function (aJsonEmails)
{
	var
		iIndex = 0,
		iLen = 0,
		oEmailModel = null,
		aResult = []
	;

	if (Utils.isNonEmptyArray(aJsonEmails))
	{
		for (iIndex = 0, iLen = aJsonEmails.length; iIndex < iLen; iIndex++)
		{
			oEmailModel = EmailModel.newInstanceFromJson(aJsonEmails[iIndex]);
			if (oEmailModel)
			{
				aResult.push(oEmailModel);
			}
		}
	}

	return aResult;
};

/**
 * @static
 * @param {Array.<EmailModel>} aMessageEmails
 * @param {Object} oLocalUnic
 * @param {Array} aLocalEmails
 */
MessageModel.replyHelper = function (aMessageEmails, oLocalUnic, aLocalEmails)
{
	if (aMessageEmails && 0 < aMessageEmails.length)
	{
		var
			iIndex = 0,
			iLen = aMessageEmails.length
		;

		for (; iIndex < iLen; iIndex++)
		{
			if (Utils.isUnd(oLocalUnic[aMessageEmails[iIndex].email]))
			{
				oLocalUnic[aMessageEmails[iIndex].email] = true;
				aLocalEmails.push(aMessageEmails[iIndex]);
			}
		}
	}
};

/**
 * @param {AjaxJsonMessage} oJsonMessage
 * @return {boolean}
 */
MessageModel.prototype.initByJson = function (oJsonMessage)
{
	var bResult = false;
	if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
	{
		this.folderFullNameRaw = oJsonMessage.Folder;
		this.uid = oJsonMessage.Uid;
		this.requestHash = oJsonMessage.RequestHash;
		
		this.prefetched = false;

		this.size(Utils.pInt(oJsonMessage.Size));

		this.from = MessageModel.initEmailsFromJson(oJsonMessage.From);
		this.to = MessageModel.initEmailsFromJson(oJsonMessage.To);
		this.cc = MessageModel.initEmailsFromJson(oJsonMessage.Cc);
		this.bcc = MessageModel.initEmailsFromJson(oJsonMessage.Bcc);
		this.replyTo = MessageModel.initEmailsFromJson(oJsonMessage.ReplyTo);

		this.subject(oJsonMessage.Subject);
		this.dateTimeStampInUTC(Utils.pInt(oJsonMessage.DateTimeStampInUTC));
		this.hasAttachments(!!oJsonMessage.HasAttachments);
		this.attachmentsMainType(oJsonMessage.AttachmentsMainType);

		this.fromEmailString(MessageModel.emailsToLine(this.from, true));
		this.toEmailsString(MessageModel.emailsToLine(this.to, true));

		this.parentUid(Utils.pInt(oJsonMessage.ParentThread));
		this.threads(Utils.isArray(oJsonMessage.Threads) ? oJsonMessage.Threads : []);
		this.threadsLen(Utils.pInt(oJsonMessage.ThreadsLen));

		this.initFlagsByJson(oJsonMessage);
		this.computeSenderEmail();
		
		bResult = true;
	}

	return bResult;
};

MessageModel.prototype.computeSenderEmail = function ()
{
	var
		sSent = RL.data().sentFolder(),
		sDraft = RL.data().draftFolder()
	;

	this.senderEmailsString(this.folderFullNameRaw === sSent || this.folderFullNameRaw === sDraft ?
		this.toEmailsString() : this.fromEmailString());
};

/**
 * @param {AjaxJsonMessage} oJsonMessage
 * @return {boolean}
 */
MessageModel.prototype.initUpdateByMessageJson = function (oJsonMessage)
{
	var
		bResult = false,
		iPriority = Enums.MessagePriority.Normal
	;

	if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
	{
		iPriority = Utils.pInt(oJsonMessage.Priority);
		this.priority(-1 < Utils.inArray(iPriority, [Enums.MessagePriority.High, Enums.MessagePriority.Low]) ?
			iPriority : Enums.MessagePriority.Normal);

		this.aDraftInfo = oJsonMessage.DraftInfo;

		this.sMessageId = oJsonMessage.MessageId;
		this.sInReplyTo = oJsonMessage.InReplyTo;
		this.sReferences = oJsonMessage.References;

		this.hasAttachments(!!oJsonMessage.HasAttachments);
		this.attachmentsMainType(oJsonMessage.AttachmentsMainType);

		this.foundedCIDs = Utils.isArray(oJsonMessage.FoundedCIDs) ? oJsonMessage.FoundedCIDs : [];
		this.attachments(this.initAttachmentsFromJson(oJsonMessage.Attachments));

		this.computeSenderEmail();

		bResult = true;
	}

	return bResult;
};

/**
 * @param {(AjaxJsonAttachment|null)} oJsonAttachments
 * @return {Array}
 */
MessageModel.prototype.initAttachmentsFromJson = function (oJsonAttachments)
{
	var
		iIndex = 0,
		iLen = 0,
		oAttachmentModel = null,
		aResult = []
	;

	if (oJsonAttachments && 'Collection/AttachmentCollection' === oJsonAttachments['@Object'] &&
		Utils.isNonEmptyArray(oJsonAttachments['@Collection']))
	{
		for (iIndex = 0, iLen = oJsonAttachments['@Collection'].length; iIndex < iLen; iIndex++)
		{
			oAttachmentModel = AttachmentModel.newInstanceFromJson(oJsonAttachments['@Collection'][iIndex]);
			if (oAttachmentModel)
			{
				if ('' !== oAttachmentModel.cidWithOutTags && 0 < this.foundedCIDs.length &&
					0 <= Utils.inArray(oAttachmentModel.cidWithOutTags, this.foundedCIDs))
				{
					oAttachmentModel.isLinked = true;
				}

				aResult.push(oAttachmentModel);
			}
		}
	}

	return aResult;
};

/**
 * @param {AjaxJsonMessage} oJsonMessage
 * @return {boolean}
 */
MessageModel.prototype.initFlagsByJson = function (oJsonMessage)
{
	var bResult = false;

	if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
	{
		this.unseen(!oJsonMessage.IsSeen);
		this.flagged(!!oJsonMessage.IsFlagged);
		this.answered(!!oJsonMessage.IsAnswered);
		this.forwarded(!!oJsonMessage.IsForwarded);

		bResult = true;
	}

	return bResult;
};

/**
 * @param {boolean} bFriendlyView
 * @param {boolean=} bWrapWithLink = false
 * @return {string}
 */
MessageModel.prototype.fromToLine = function (bFriendlyView, bWrapWithLink)
{
	return MessageModel.emailsToLine(this.from, bFriendlyView, bWrapWithLink);
};

/**
 * @param {boolean} bFriendlyView
 * @param {boolean=} bWrapWithLink = false
 * @return {string}
 */
MessageModel.prototype.toToLine = function (bFriendlyView, bWrapWithLink)
{
	return MessageModel.emailsToLine(this.to, bFriendlyView, bWrapWithLink);
};

/**
 * @param {boolean} bFriendlyView
 * @param {boolean=} bWrapWithLink = false
 * @return {string}
 */
MessageModel.prototype.ccToLine = function (bFriendlyView, bWrapWithLink)
{
	return MessageModel.emailsToLine(this.cc, bFriendlyView, bWrapWithLink);
};

/**
 * @param {boolean} bFriendlyView
 * @param {boolean=} bWrapWithLink = false
 * @return {string}
 */
MessageModel.prototype.bccToLine = function (bFriendlyView, bWrapWithLink)
{
	return MessageModel.emailsToLine(this.bcc, bFriendlyView, bWrapWithLink);
};

/**
 * @return string
 */
MessageModel.prototype.lineAsCcc = function ()
{
	var aResult = [];
	if (this.deleted())
	{
		aResult.push('deleted');
	}
	if (this.selected())
	{
		aResult.push('selected');
	}
	if (this.checked())
	{
		aResult.push('checked');
	}
	if (this.flagged())
	{
		aResult.push('flagged');
	}
	if (this.unseen())
	{
		aResult.push('unseen');
	}
	if (this.answered())
	{
		aResult.push('answered');
	}
	if (this.forwarded())
	{
		aResult.push('forwarded');
	}
	if (this.hasAttachments())
	{
		aResult.push('withAttachments');
		switch (this.attachmentsMainType())
		{
			case 'image':
				aResult.push('imageOnlyAttachments');
				break;
			case 'archive':
				aResult.push('archiveOnlyAttachments');
				break;
		}
	}
	if (this.newForAnimation())
	{
		aResult.push('new');
	}
	if ('' === this.subject())
	{
		aResult.push('emptySubject');
	}
	if (0 < this.parentUid())
	{
		aResult.push('hasParentMessage');
	}
	if (0 < this.threadsLen() && 0 === this.parentUid())
	{
		aResult.push('hasChildrenMessage');
	}
	if (this.hasUnseenSubMessage())
	{
		aResult.push('hasUnseenSubMessage');
	}
	if (this.hasFlaggedSubMessage())
	{
		aResult.push('hasFlaggedSubMessage');
	}

	return aResult.join(' ');
};

/**
 * @return {boolean}
 */
MessageModel.prototype.hasVisibleAttachments = function ()
{
	return !!_.find(this.attachments(), function (oAttachment) {
		return !oAttachment.isLinked;
	});
//	return 0 < this.attachments().length;
};

/**
 * @param {string} sCid
 * @return {*}
 */
MessageModel.prototype.findAttachmentByCid = function (sCid)
{
	var
		oResult = null,
		aAttachments = this.attachments()
	;

	if (Utils.isNonEmptyArray(aAttachments))
	{
		sCid = sCid.replace(/^<+/, '').replace(/>+$/, '');
		oResult = _.find(aAttachments, function (oAttachment) {
			return sCid === oAttachment.cidWithOutTags;
		});
	}

	return oResult || null;
};

/**
 * @param {string} sContentLocation
 * @return {*}
 */
MessageModel.prototype.findAttachmentByContentLocation = function (sContentLocation)
{
	var
		oResult = null,
		aAttachments = this.attachments()
	;

	if (Utils.isNonEmptyArray(aAttachments))
	{
		oResult = _.find(aAttachments, function (oAttachment) {
			return sContentLocation === oAttachment.contentLocation;
		});
	}

	return oResult || null;
};


/**
 * @return {string}
 */
MessageModel.prototype.messageId = function ()
{
	return this.sMessageId;
};

/**
 * @return {string}
 */
MessageModel.prototype.inReplyTo = function ()
{
	return this.sInReplyTo;
};

/**
 * @return {string}
 */
MessageModel.prototype.references = function ()
{
	return this.sReferences;
};

/**
 * @return {string}
 */
MessageModel.prototype.fromAsSingleEmail = function ()
{
	return Utils.isArray(this.from) && this.from[0] ? this.from[0].email : '';
};

/**
 * @return {string}
 */
MessageModel.prototype.viewLink = function ()
{
	return RL.link().messageViewLink(this.requestHash);
};

/**
 * @return {string}
 */
MessageModel.prototype.downloadLink = function ()
{
	return RL.link().messageDownloadLink(this.requestHash);
};

/**
 * @param {Object} oExcludeEmails
 * @return {Array}
 */
MessageModel.prototype.replyEmails = function (oExcludeEmails)
{
	var
		aResult = [],
		oUnic = Utils.isUnd(oExcludeEmails) ? {} : oExcludeEmails
	;

	MessageModel.replyHelper(this.replyTo, oUnic, aResult);
	if (0 === aResult.length)
	{
		MessageModel.replyHelper(this.from, oUnic, aResult);
	}

	return aResult;
};

/**
 * @param {Object} oExcludeEmails
 * @return {Array.<Array>}
 */
MessageModel.prototype.replyAllEmails = function (oExcludeEmails)
{
	var
		aToResult = [],
		aCcResult = [],
		oUnic = Utils.isUnd(oExcludeEmails) ? {} : oExcludeEmails
	;

	MessageModel.replyHelper(this.replyTo, oUnic, aToResult);
	if (0 === aToResult.length)
	{
		MessageModel.replyHelper(this.from, oUnic, aToResult);
	}

	MessageModel.replyHelper(this.to, oUnic, aToResult);
	MessageModel.replyHelper(this.cc, oUnic, aCcResult);

	return [aToResult, aCcResult];
};

/**
 * @return {string}
 */
MessageModel.prototype.textBodyToString = function ()
{
	return this.body ? this.body.html() : '';
};

/**
 * @return {string}
 */
MessageModel.prototype.attachmentsToStringLine = function ()
{
	var aAttachLines = _.map(this.attachments(), function (oItem) {
		return oItem.fileName + ' (' + oItem.friendlySize + ')';
	});

	return aAttachLines && 0 < aAttachLines.length ? aAttachLines.join(', ') : '';
};

/**
 * @return {Object}
 */
MessageModel.prototype.getDataForWindowPopup = function ()
{
	return {
		'popupFrom': this.fromToLine(false),
		'popupTo': this.toToLine(false),
		'popupCc': this.ccToLine(false),
		'popupBcc': this.bccToLine(false),
		'popupSubject': this.subject(),
		'popupDate': this.fullFormatDateValue(),
		'popupAttachments': this.attachmentsToStringLine(),
		'popupBody': this.textBodyToString()
	};
};

/**
 * @param {boolean=} bPrint = false
 */
MessageModel.prototype.viewPopupMessage = function (bPrint)
{
	Utils.windowPopupKnockout(this.getDataForWindowPopup(), 'PopupsWindowSimpleMessage', this.subject(), function (oPopupWin) {
		if (oPopupWin && oPopupWin.document && oPopupWin.document.body)
		{
			$('img.lazy', oPopupWin.document.body).each(function (iIndex, oImg) {

				var
					$oImg = $(oImg),
					sOrig = $oImg.data('original'),
					sSrc = $oImg.attr('src')
				;

				if (0 <= iIndex && sOrig && !sSrc)
				{
					$oImg.attr('src', sOrig);
				}
			});

			if (bPrint)
			{
				window.setTimeout(function () {
					oPopupWin.print();
				}, 100);
			}
		}
	});
};

MessageModel.prototype.printMessage = function ()
{
	this.viewPopupMessage(true);
};

/**
 * @returns {string}
 */
MessageModel.prototype.generateUid = function ()
{
	return this.folderFullNameRaw + '/' + this.uid;
};

/**
 * @param {MessageModel} oMessage
 * @return {MessageModel}
 */
MessageModel.prototype.populateByMessageListItem = function (oMessage)
{
	this.folderFullNameRaw = oMessage.folderFullNameRaw;
	this.uid = oMessage.uid;
	this.requestHash = oMessage.requestHash;
	this.subject(oMessage.subject());
	this.size(oMessage.size());
	this.dateTimeStampInUTC(oMessage.dateTimeStampInUTC());
	this.priority(oMessage.priority());

	this.fromEmailString(oMessage.fromEmailString());
	this.toEmailsString(oMessage.toEmailsString());

	this.emails = oMessage.emails;

	this.from = oMessage.from;
	this.to = oMessage.to;
	this.cc = oMessage.cc;
	this.bcc = oMessage.bcc;
	this.replyTo = oMessage.replyTo;

	this.unseen(oMessage.unseen());
	this.flagged(oMessage.flagged());
	this.answered(oMessage.answered());
	this.forwarded(oMessage.forwarded());

	this.selected(oMessage.selected());
	this.checked(oMessage.checked());
	this.hasAttachments(oMessage.hasAttachments());
	this.attachmentsMainType(oMessage.attachmentsMainType());

	this.moment(oMessage.moment());

	this.body = null;
//	this.isRtl(oMessage.isRtl());
//	this.isHtml(false);
//	this.hasImages(false);
//	this.attachments([]);

	this.priority(Enums.MessagePriority.Normal);
	this.aDraftInfo = [];
	this.sMessageId = '';
	this.sInReplyTo = '';
	this.sReferences = '';

	this.parentUid(oMessage.parentUid());
	this.threads(oMessage.threads());
	this.threadsLen(oMessage.threadsLen());

	this.computeSenderEmail();

	return this;
};

MessageModel.prototype.showExternalImages = function (bLazy)
{
	if (this.body && this.body.data('rl-has-images'))
	{
		bLazy = Utils.isUnd(bLazy) ? false : bLazy;

		this.hasImages(false);
		this.body.data('rl-has-images', false);

		$('[data-x-src]', this.body).each(function () {
			if (bLazy && $(this).is('img'))
			{
				$(this)
					.addClass('lazy')
					.attr('data-original', $(this).attr('data-x-src'))
					.removeAttr('data-x-src')
				;
			}
			else
			{
				$(this).attr('src', $(this).attr('data-x-src')).removeAttr('data-x-src');
			}
		});

		$('[data-x-style-url]', this.body).each(function () {
			var sStyle = Utils.trim($(this).attr('style'));
			sStyle = '' === sStyle ? '' : (';' === sStyle.substr(-1) ? sStyle + ' ' : sStyle + '; ');
			$(this).attr('style', sStyle + $(this).attr('data-x-style-url')).removeAttr('data-x-style-url');
		});

		if (bLazy)
		{
			$('img.lazy', this.body).addClass('lazy-inited').lazyload({
				'threshold' : 400,
				'effect' : 'fadeIn',
				'skip_invisible' : false,
				'container': $('.RL-MailMessageView .messageView .messageItem .content')[0]
			});

			$window.resize();
		}

		Utils.windowResize(500);
	}
};

MessageModel.prototype.showInternalImages = function (bLazy)
{
	if (this.body && !this.body.data('rl-init-internal-images'))
	{
		bLazy = Utils.isUnd(bLazy) ? false : bLazy;

		var self = this;
		
		this.body.data('rl-init-internal-images', true);

		$('[data-x-src-cid]', this.body).each(function () {

			var oAttachment = self.findAttachmentByCid($(this).attr('data-x-src-cid'));
			if (oAttachment && oAttachment.download)
			{
				if (bLazy && $(this).is('img'))
				{
					$(this)
						.addClass('lazy')
						.attr('data-original', oAttachment.linkPreview());
				}
				else
				{
					$(this).attr('src', oAttachment.linkPreview());
				}
			}
		});
		
		$('[data-x-src-location]', this.body).each(function () {

			var oAttachment = self.findAttachmentByContentLocation($(this).attr('data-x-src-location'));
			if (!oAttachment)
			{
				oAttachment = self.findAttachmentByCid($(this).attr('data-x-src-location'));
			}
			
			if (oAttachment && oAttachment.download)
			{
				if (bLazy && $(this).is('img'))
				{
					$(this)
						.addClass('lazy')
						.attr('data-original', oAttachment.linkPreview());
				}
				else
				{
					$(this).attr('src', oAttachment.linkPreview());
				}
			}
		});

		$('[data-x-style-cid]', this.body).each(function () {

			var
				sStyle = '',
				sName = '',
				oAttachment = self.findAttachmentByCid($(this).attr('data-x-style-cid'))
			;

			if (oAttachment && oAttachment.linkPreview)
			{
				sName = $(this).attr('data-x-style-cid-name');
				if ('' !== sName)
				{
					sStyle = Utils.trim($(this).attr('style'));
					sStyle = '' === sStyle ? '' : (';' === sStyle.substr(-1) ? sStyle + ' ' : sStyle + '; ');
					$(this).attr('style', sStyle + sName + ': url(\'' + oAttachment.linkPreview() + '\')');
				}
			}
		});

		if (bLazy)
		{
			(function ($oImg, oContainer) {
				_.delay(function () {
					$oImg.addClass('lazy-inited').lazyload({
						'threshold' : 400,
						'effect' : 'fadeIn',
						'skip_invisible' : false,
						'container': oContainer
					});
				}, 300);
			}($('img.lazy', self.body), $('.RL-MailMessageView .messageView .messageItem .content')[0]));
		}

		Utils.windowResize(500);
	}
};
