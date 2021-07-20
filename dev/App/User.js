import 'External/User/ko';

import { isArray, isNonEmptyArray, pInt, pString } from 'Common/Utils';
import { isPosNumeric, delegateRunOnDestroy, mailToHelper } from 'Common/UtilsUser';

import {
	Capa,
	Notification,
	Scope
} from 'Common/Enums';

import {
	Layout,
	FolderType,
	SetSystemFoldersNotification,
	MessageSetAction,
	ClientSideKeyName
} from 'Common/EnumsUser';

import {
	doc,
	elementById,
	createElement,
	$htmlCL,
	Settings,
	SettingsGet,
	leftPanelDisabled
} from 'Common/Globals';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';

import {
	MessageFlagsCache,
	setFolderHash,
	getFolderHash,
	getFolderInboxName,
	getFolderFromCacheList
} from 'Common/Cache';

import {
	mailBox,
	root,
	openPgpWorkerJs,
	openPgpJs
} from 'Common/Links';

import { getNotification, i18n } from 'Common/Translator';

import { SettingsUserStore } from 'Stores/User/Settings';
import { NotificationUserStore } from 'Stores/User/Notification';
import { AccountUserStore } from 'Stores/User/Account';
import { ContactUserStore } from 'Stores/User/Contact';
import { IdentityUserStore } from 'Stores/User/Identity';
import { TemplateUserStore } from 'Stores/User/Template';
import { FolderUserStore } from 'Stores/User/Folder';
import { PgpUserStore } from 'Stores/User/Pgp';
import { MessageUserStore } from 'Stores/User/Message';
import { QuotaUserStore } from 'Stores/User/Quota';
import { ThemeStore } from 'Stores/Theme';

import * as Local from 'Storage/Client';

import Remote from 'Remote/User/Fetch';

import { EmailModel } from 'Model/Email';
import { AccountModel } from 'Model/Account';
import { IdentityModel } from 'Model/Identity';
import { TemplateModel } from 'Model/Template';
import { OpenPgpKeyModel } from 'Model/OpenPgpKey';

import { LoginUserScreen } from 'Screen/User/Login';
import { MailBoxUserScreen } from 'Screen/User/MailBox';
import { SettingsUserScreen } from 'Screen/User/Settings';

import { startScreens, showScreenPopup } from 'Knoin/Knoin';

import { AbstractApp } from 'App/Abstract';

import { ComposePopupView } from 'View/Popup/Compose';
import { FolderSystemPopupView } from 'View/Popup/FolderSystem';
import { AskPopupView } from 'View/Popup/Ask';

import { timeToNode } from 'Common/Momentor';

// Every 5 minutes
const refreshFolders = 300000;

class AppUser extends AbstractApp {
	constructor() {
		super(Remote);

		this.moveCache = {};

		this.quotaDebounce = this.quota.debounce(30000);
		this.moveOrDeleteResponseHelper = this.moveOrDeleteResponseHelper.bind(this);

		this.messagesMoveTrigger = this.messagesMoveTrigger.debounce(500);

		// wakeUp
		const interval = 3600000; // 60m
		var lastTime = Date.now();
		setInterval(() => {
			const currentTime = Date.now();
			if (currentTime > (lastTime + interval + 1000)) {
				Remote.jsVersion(iError => {
					if (100 < iError) {
						this.reload();
					}
				}, Settings.app('version'));
			}
			lastTime = currentTime;
		}, interval);

		const fn = (ev=>$htmlCL.toggle('rl-ctrl-key-pressed', ev.ctrlKey)).debounce(500);
		['keydown','keyup'].forEach(t => doc.addEventListener(t, fn));

		shortcuts.add('escape,enter', '', Scope.All, () => rl.Dropdowns.detectVisibility());
	}

	reload() {
		(Settings.app('inIframe') ? parent : window).location.reload();
	}

	reloadFlagsCurrentMessageListAndMessageFromCache() {
		MessageUserStore.list.forEach(message =>
			MessageFlagsCache.initMessage(message)
		);
		MessageFlagsCache.initMessage(MessageUserStore.message());
		MessageUserStore.messageViewTrigger(!MessageUserStore.messageViewTrigger());
	}

	/**
	 * @param {boolean=} bDropPagePosition = false
	 * @param {boolean=} bDropCurrenFolderCache = false
	 */
	reloadMessageList(bDropPagePosition = false, bDropCurrenFolderCache = false) {
		let iOffset = (MessageUserStore.listPage() - 1) * SettingsUserStore.messagesPerPage();

		if (bDropCurrenFolderCache) {
			setFolderHash(FolderUserStore.currentFolderFullNameRaw(), '');
		}

		if (bDropPagePosition) {
			MessageUserStore.listPage(1);
			MessageUserStore.listPageBeforeThread(1);
			iOffset = 0;

			rl.route.setHash(
				mailBox(
					FolderUserStore.currentFolderFullNameHash(),
					MessageUserStore.listPage(),
					MessageUserStore.listSearch(),
					MessageUserStore.listThreadUid()
				),
				true,
				true
			);
		}

		MessageUserStore.listLoading(true);
		MessageUserStore.listError('');
		Remote.messageList(
			(iError, oData, bCached) => {
				if (iError) {
					if (Notification.RequestAborted !== iError) {
						MessageUserStore.list([]);
						MessageUserStore.listError(getNotification(iError));
					}
				} else {
					MessageUserStore.setMessageList(oData, bCached);
				}
				MessageUserStore.listLoading(false);
			},
			{
				Folder: FolderUserStore.currentFolderFullNameRaw(),
				Offset: iOffset,
				Limit: SettingsUserStore.messagesPerPage(),
				Search: MessageUserStore.listSearch(),
				ThreadUid: MessageUserStore.listThreadUid()
			}
		);
	}

	recacheInboxMessageList() {
		Remote.messageList(null, {Folder: getFolderInboxName()}, true);
	}

	/**
	 * @param {Function} fResultFunc
	 * @returns {boolean}
	 */
	contactsSync(fResultFunc) {
		if (
			ContactUserStore.importing() ||
			ContactUserStore.syncing() ||
			!ContactUserStore.enableSync() ||
			!ContactUserStore.allowSync()
		) {
			return false;
		}

		ContactUserStore.syncing(true);

		Remote.contactsSync((sResult, oData) => {
			ContactUserStore.syncing(false);

			if (fResultFunc) {
				fResultFunc(sResult, oData);
			}
		});

		return true;
	}

	messagesMoveTrigger() {
		const sTrashFolder = FolderUserStore.trashFolder(),
			sSpamFolder = FolderUserStore.spamFolder();

		Object.values(this.moveCache).forEach(item => {
			const isSpam = sSpamFolder === item.To,
				isTrash = sTrashFolder === item.To,
				isHam = !isSpam && sSpamFolder === item.From && getFolderInboxName() === item.To;

			Remote.messagesMove(
				this.moveOrDeleteResponseHelper,
				item.From,
				item.To,
				item.Uid,
				isSpam ? 'SPAM' : isHam ? 'HAM' : '',
				isSpam || isTrash
			);
		});

		this.moveCache = {};
	}

	messagesMoveHelper(fromFolderFullNameRaw, toFolderFullNameRaw, uidsForMove) {
		const hash = '$$' + fromFolderFullNameRaw + '$$' + toFolderFullNameRaw + '$$';
		if (!this.moveCache[hash]) {
			this.moveCache[hash] = {
				From: fromFolderFullNameRaw,
				To: toFolderFullNameRaw,
				Uid: []
			};
		}

		this.moveCache[hash].Uid = this.moveCache[hash].Uid.concat(uidsForMove).unique();
		this.messagesMoveTrigger();
	}

	messagesCopyHelper(sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForCopy) {
		Remote.messagesCopy(this.moveOrDeleteResponseHelper, sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForCopy);
	}

	messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove) {
		Remote.messagesDelete(this.moveOrDeleteResponseHelper, sFromFolderFullNameRaw, aUidForRemove);
	}

	moveOrDeleteResponseHelper(iError, oData) {
		if (iError) {
			setFolderHash(FolderUserStore.currentFolderFullNameRaw(), '');
			alert(getNotification(iError));
		} else if (FolderUserStore.currentFolder()) {
			if (isArray(oData.Result) && 2 === oData.Result.length) {
				setFolderHash(oData.Result[0], oData.Result[1]);
			} else {
				setFolderHash(FolderUserStore.currentFolderFullNameRaw(), '');
			}
			this.reloadMessageList(!MessageUserStore.list.length);
			this.quotaDebounce();
		}
	}

	/**
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForRemove
	 */
	deleteMessagesFromFolderWithoutCheck(sFromFolderFullNameRaw, aUidForRemove) {
		this.messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove);
		MessageUserStore.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove);
	}

	/**
	 * @param {number} iDeleteType
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForRemove
	 * @param {boolean=} bUseFolder = true
	 */
	deleteMessagesFromFolder(iDeleteType, sFromFolderFullNameRaw, aUidForRemove, bUseFolder) {
		let oMoveFolder = null,
			nSetSystemFoldersNotification = null;

		switch (iDeleteType) {
			case FolderType.Spam:
				oMoveFolder = getFolderFromCacheList(FolderUserStore.spamFolder());
				nSetSystemFoldersNotification = SetSystemFoldersNotification.Spam;
				break;
			case FolderType.NotSpam:
				oMoveFolder = getFolderFromCacheList(getFolderInboxName());
				break;
			case FolderType.Trash:
				oMoveFolder = getFolderFromCacheList(FolderUserStore.trashFolder());
				nSetSystemFoldersNotification = SetSystemFoldersNotification.Trash;
				break;
			case FolderType.Archive:
				oMoveFolder = getFolderFromCacheList(FolderUserStore.archiveFolder());
				nSetSystemFoldersNotification = SetSystemFoldersNotification.Archive;
				break;
			// no default
		}

		bUseFolder = undefined === bUseFolder ? true : !!bUseFolder;
		if (bUseFolder) {
			if (
				(FolderType.Spam === iDeleteType && UNUSED_OPTION_VALUE === FolderUserStore.spamFolder()) ||
				(FolderType.Trash === iDeleteType && UNUSED_OPTION_VALUE === FolderUserStore.trashFolder()) ||
				(FolderType.Archive === iDeleteType && UNUSED_OPTION_VALUE === FolderUserStore.archiveFolder())
			) {
				bUseFolder = false;
			}
		}

		if (!oMoveFolder && bUseFolder) {
			showScreenPopup(FolderSystemPopupView, [nSetSystemFoldersNotification]);
		} else if (
			!bUseFolder ||
			(FolderType.Trash === iDeleteType &&
				(sFromFolderFullNameRaw === FolderUserStore.spamFolder()
				 || sFromFolderFullNameRaw === FolderUserStore.trashFolder()))
		) {
			showScreenPopup(AskPopupView, [
				i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'),
				() => {
					this.messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove);
					MessageUserStore.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove);
				}
			]);
		} else if (oMoveFolder) {
			this.messagesMoveHelper(sFromFolderFullNameRaw, oMoveFolder.fullNameRaw, aUidForRemove);
			MessageUserStore.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove, oMoveFolder.fullNameRaw);
		}
	}

	/**
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForMove
	 * @param {string} sToFolderFullNameRaw
	 * @param {boolean=} bCopy = false
	 */
	moveMessagesToFolder(sFromFolderFullNameRaw, aUidForMove, sToFolderFullNameRaw, bCopy) {
		if (sFromFolderFullNameRaw !== sToFolderFullNameRaw && isArray(aUidForMove) && aUidForMove.length) {
			const oFromFolder = getFolderFromCacheList(sFromFolderFullNameRaw),
				oToFolder = getFolderFromCacheList(sToFolderFullNameRaw);

			if (oFromFolder && oToFolder) {
				if (undefined === bCopy ? false : !!bCopy) {
					this.messagesCopyHelper(oFromFolder.fullNameRaw, oToFolder.fullNameRaw, aUidForMove);
				} else {
					this.messagesMoveHelper(oFromFolder.fullNameRaw, oToFolder.fullNameRaw, aUidForMove);
				}

				MessageUserStore.removeMessagesFromList(oFromFolder.fullNameRaw, aUidForMove, oToFolder.fullNameRaw, bCopy);
				return true;
			}
		}

		return false;
	}

	/**
	 * @param {Function=} callback = null
	 */
	foldersReload(callback = null) {
		Remote.foldersReload(callback);
	}

	foldersPromisesActionHelper(promise, errorDefCode) {
		Remote.abort('Folders')
			.fastResolve(true)
			.then(() => promise)
			.then(
				() => Remote.foldersReloadWithTimeout(),
				errorCode => {
					FolderUserStore.folderListError(getNotification(errorCode, '', errorDefCode));
					Remote.foldersReloadWithTimeout();
				}
			);
	}

	reloadOpenPgpKeys() {
		if (PgpUserStore.capaOpenPGP()) {
			const keys = [],
				email = new EmailModel(),
				openpgpKeyring = PgpUserStore.openpgpKeyring,
				openpgpKeys = openpgpKeyring ? openpgpKeyring.getAllKeys() : [];

			openpgpKeys.forEach((oItem, iIndex) => {
				if (oItem && oItem.primaryKey) {
					const aEmails = [],
						aUsers = [],
						primaryUser = oItem.getPrimaryUser(),
						user =
							primaryUser && primaryUser.user
								? primaryUser.user.userId.userid
								: oItem.users && oItem.users[0]
								? oItem.users[0].userId.userid
								: '';

					if (oItem.users) {
						oItem.users.forEach(item => {
							if (item.userId) {
								email.clear();
								email.parse(item.userId.userid);
								if (email.validate()) {
									aEmails.push(email.email);
									aUsers.push(item.userId.userid);
								}
							}
						});
					}

					if (aEmails.length) {
						keys.push(
							new OpenPgpKeyModel(
								iIndex,
								oItem.primaryKey.getFingerprint(),
								oItem.primaryKey
									.getKeyId()
									.toHex()
									.toLowerCase(),
								oItem.getKeyIds()
									.map(item => (item && item.toHex ? item.toHex() : null))
									.validUnique(),
								aUsers,
								aEmails,
								oItem.isPrivate(),
								oItem.armor(),
								user
							)
						);
					}
				}
			});

			delegateRunOnDestroy(PgpUserStore.openpgpkeys());
			PgpUserStore.openpgpkeys(keys);
		}
	}

	accountsAndIdentities() {
		AccountUserStore.loading(true);
		IdentityUserStore.loading(true);

		Remote.accountsAndIdentities((iError, oData) => {
			AccountUserStore.loading(false);
			IdentityUserStore.loading(false);

			if (!iError) {
				const counts = {},
					sAccountEmail = AccountUserStore.email();
				let parentEmail = SettingsGet('ParentEmail') || sAccountEmail;

				if (isArray(oData.Result.Accounts)) {
					AccountUserStore.accounts.forEach(oAccount =>
						counts[oAccount.email] = oAccount.count()
					);

					delegateRunOnDestroy(AccountUserStore.accounts());

					AccountUserStore.accounts(
						oData.Result.Accounts.map(
							sValue => new AccountModel(sValue, sValue !== parentEmail, counts[sValue] || 0)
						)
					);
				}

				if (isArray(oData.Result.Identities)) {
					delegateRunOnDestroy(IdentityUserStore());

					IdentityUserStore(
						oData.Result.Identities.map(identityData => {
							const id = pString(identityData.Id),
								email = pString(identityData.Email),
								identity = new IdentityModel(id, email);

							identity.name(pString(identityData.Name));
							identity.replyTo(pString(identityData.ReplyTo));
							identity.bcc(pString(identityData.Bcc));
							identity.signature(pString(identityData.Signature));
							identity.signatureInsertBefore(!!identityData.SignatureInsertBefore);

							return identity;
						})
					);
				}
			}
		});
	}

	templates() {
		TemplateUserStore.templates.loading(true);

		Remote.templates((iError, data) => {
			TemplateUserStore.templates.loading(false);

			if (!iError && isArray(data.Result.Templates)) {
				delegateRunOnDestroy(TemplateUserStore.templates());

				TemplateUserStore.templates(
					data.Result.Templates.map(templateData =>
						TemplateModel.reviveFromJson(templateData)
					).filter(v => v)
				);
			}
		});
	}

	quota() {
		Remote.quota((iError, data) => {
			if (
				!iError &&
				isArray(data.Result) &&
				1 < data.Result.length &&
				isPosNumeric(data.Result[0], true) &&
				isPosNumeric(data.Result[1], true)
			) {
				QuotaUserStore.populateData(pInt(data.Result[1]), pInt(data.Result[0]));
			}
		});
	}

	/**
	 * @param {string} folder
	 * @param {Array=} list = []
	 */
	folderInformation(folder, list) {
		if (folder && folder.trim()) {
			Remote.folderInformation(
				(iError, data) => {
					if (!iError && data.Result.Hash && data.Result.Folder) {
						let uid = '',
							check = false,
							unreadCountChange = false;

						const folderFromCache = getFolderFromCacheList(data.Result.Folder);
						if (folderFromCache) {
							folderFromCache.expires = Date.now();

							if (data.Result.Hash) {
								setFolderHash(data.Result.Folder, data.Result.Hash);
							}

							if (null != data.Result.MessageCount) {
								folderFromCache.messageCountAll(data.Result.MessageCount);
							}

							if (null != data.Result.MessageUnseenCount) {
								if (pInt(folderFromCache.messageCountUnread()) !== pInt(data.Result.MessageUnseenCount)) {
									unreadCountChange = true;
								}

								folderFromCache.messageCountUnread(data.Result.MessageUnseenCount);
							}

							if (unreadCountChange) {
								MessageFlagsCache.clearFolder(folderFromCache.fullNameRaw);
							}

							if (data.Result.Flags) {
								for (uid in data.Result.Flags) {
									if (Object.prototype.hasOwnProperty.call(data.Result.Flags, uid)) {
										check = true;
										const flags = data.Result.Flags[uid];
										MessageFlagsCache.storeByFolderAndUid(folderFromCache.fullNameRaw, uid.toString(), [
											!!flags.IsUnseen,
											!!flags.IsFlagged,
											!!flags.IsAnswered,
											!!flags.IsForwarded,
											!!flags.IsReadReceipt
										]);
									}
								}

								if (check) {
									this.reloadFlagsCurrentMessageListAndMessageFromCache();
								}
							}

							MessageUserStore.initUidNextAndNewMessages(
								folderFromCache.fullNameRaw,
								data.Result.UidNext,
								data.Result.NewMessages
							);

							const hash = getFolderHash(data.Result.Folder);
							if (!hash || unreadCountChange || data.Result.Hash !== hash) {
								if (folderFromCache.fullNameRaw === FolderUserStore.currentFolderFullNameRaw()) {
									this.reloadMessageList();
								} else if (getFolderInboxName() === folderFromCache.fullNameRaw) {
									this.recacheInboxMessageList();
								}
							}
						}
					}
				},
				folder,
				list
			);
		}
	}

	/**
	 * @param {boolean=} boot = false
	 */
	folderInformationMultiply(boot = false) {
		const folders = FolderUserStore.getNextFolderNames(refreshFolders);
		if (isNonEmptyArray(folders)) {
			Remote.folderInformationMultiply((iError, oData) => {
				if (!iError && isNonEmptyArray(oData.Result.List)) {
					const utc = Date.now();
					oData.Result.List.forEach(item => {
						const hash = getFolderHash(item.Folder),
							folder = getFolderFromCacheList(item.Folder);
						let unreadCountChange = false;

						if (folder) {
							folder.expires = utc;

							if (item.Hash) {
								setFolderHash(item.Folder, item.Hash);
							}

							if (null != item.MessageCount) {
								folder.messageCountAll(item.MessageCount);
							}

							if (null != item.MessageUnseenCount) {
								if (pInt(folder.messageCountUnread()) !== pInt(item.MessageUnseenCount)) {
									unreadCountChange = true;
								}

								folder.messageCountUnread(item.MessageUnseenCount);
							}

							if (unreadCountChange) {
								MessageFlagsCache.clearFolder(folder.fullNameRaw);
							}

							if (!hash || item.Hash !== hash) {
								if (folder.fullNameRaw === FolderUserStore.currentFolderFullNameRaw()) {
									this.reloadMessageList();
								}
							} else if (unreadCountChange
							 && folder.fullNameRaw === FolderUserStore.currentFolderFullNameRaw()
							 && MessageUserStore.list.length) {
								this.folderInformation(folder.fullNameRaw, MessageUserStore.list());
							}
						}
					});

					if (boot) {
						setTimeout(() => this.folderInformationMultiply(true), 2000);
					}
				}
			}, folders);
		}
	}

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {number} iSetAction
	 * @param {Array=} messages = null
	 */
	messageListAction(sFolderFullNameRaw, iSetAction, messages) {
		let folder = null,
			alreadyUnread = 0,
			rootUids = [];

		if (undefined === messages || !messages) {
			messages = MessageUserStore.listChecked();
		}

		rootUids = messages.map(oMessage => oMessage && oMessage.uid ? oMessage.uid : null)
			.validUnique();

		if (sFolderFullNameRaw && rootUids.length) {
			switch (iSetAction) {
				case MessageSetAction.SetSeen:
					rootUids.forEach(sSubUid =>
						alreadyUnread += MessageFlagsCache.storeBySetAction(sFolderFullNameRaw, sSubUid, iSetAction)
					);

					folder = getFolderFromCacheList(sFolderFullNameRaw);
					if (folder) {
						folder.messageCountUnread(folder.messageCountUnread() - alreadyUnread);
					}

					Remote.messageSetSeen(()=>{}, sFolderFullNameRaw, rootUids, true);
					break;

				case MessageSetAction.UnsetSeen:
					rootUids.forEach(sSubUid =>
						alreadyUnread += MessageFlagsCache.storeBySetAction(sFolderFullNameRaw, sSubUid, iSetAction)
					);

					folder = getFolderFromCacheList(sFolderFullNameRaw);
					if (folder) {
						folder.messageCountUnread(folder.messageCountUnread() - alreadyUnread + rootUids.length);
					}

					Remote.messageSetSeen(()=>{}, sFolderFullNameRaw, rootUids, false);
					break;

				case MessageSetAction.SetFlag:
					rootUids.forEach(sSubUid =>
						MessageFlagsCache.storeBySetAction(sFolderFullNameRaw, sSubUid, iSetAction)
					);

					Remote.messageSetFlagged(()=>{}, sFolderFullNameRaw, rootUids, true);
					break;

				case MessageSetAction.UnsetFlag:
					rootUids.forEach(sSubUid =>
						MessageFlagsCache.storeBySetAction(sFolderFullNameRaw, sSubUid, iSetAction)
					);

					Remote.messageSetFlagged(()=>{}, sFolderFullNameRaw, rootUids, false);
					break;
				// no default
			}

			this.reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	}

	/**
	 * @param {string} query
	 * @param {Function} autocompleteCallback
	 */
	getAutocomplete(query, autocompleteCallback) {
		Remote.suggestions((iError, data) => {
			if (!iError && isArray(data.Result)) {
				autocompleteCallback(
					data.Result.map(item => (item && item[0] ? new EmailModel(item[0], item[1]) : null)).filter(v => v)
				);
			} else if (Notification.RequestAborted !== iError) {
				autocompleteCallback([]);
			}
		}, query);
	}

	/**
	 * @param {string} sFullNameHash
	 * @param {boolean} bExpanded
	 */
	setExpandedFolder(sFullNameHash, bExpanded) {
		let aExpandedList = Local.get(ClientSideKeyName.ExpandedFolders);
		if (!isArray(aExpandedList)) {
			aExpandedList = [];
		}

		if (bExpanded) {
			if (!aExpandedList.includes(sFullNameHash))
				aExpandedList.push(sFullNameHash);
		} else {
			aExpandedList = aExpandedList.filter(value => value !== sFullNameHash);
		}

		Local.set(ClientSideKeyName.ExpandedFolders, aExpandedList);
	}

	setLayoutResizer(source, target, sClientSideKeyName, mode) {
		if (mode) {
			source.classList.add('resizable');
			if (!source.querySelector('.resizer')) {
				const resizer = createElement('div', {'class':'resizer'}),
					cssint = s => parseFloat(getComputedStyle(source, null).getPropertyValue(s).replace('px', ''));
				source.append(resizer);
				resizer.addEventListener('mousedown', {
					source: source,
					mode: mode,
					handleEvent: function(e) {
						if ('mousedown' == e.type) {
							e.preventDefault();
							this.pos = ('width' == this.mode) ? e.pageX : e.pageY;
							this.min = cssint('min-'+this.mode);
							this.max = cssint('max-'+this.mode);
							this.org = cssint(this.mode);
							addEventListener('mousemove', this);
							addEventListener('mouseup', this);
						} else if ('mousemove' == e.type) {
							const length = this.org + (('width' == this.mode ? e.pageX : e.pageY) - this.pos);
							if (length >= this.min && length <= this.max ) {
								this.source.style[this.mode] = length + 'px';
							}
						} else if ('mouseup' == e.type) {
							removeEventListener('mousemove', this);
							removeEventListener('mouseup', this);
						}
					}
				});
				if ('width' == mode) {
					source.observer = new ResizeObserver(() => {
						target.style.left = source.offsetWidth + 'px';
						Local.set(sClientSideKeyName, source.offsetWidth);
					});
				} else {
					source.observer = new ResizeObserver(() => {
						target.style.top = (4 + source.offsetTop + source.offsetHeight) + 'px';
						Local.set(sClientSideKeyName, source.offsetHeight);
					});
				}
			}
			source.observer.observe(source, { box: 'border-box' });
			const length = Local.get(sClientSideKeyName);
			if (length) {
				if ('width' == mode) {
					source.style.width = length + 'px';
				} else {
					source.style.height = length + 'px';
				}
			}
		} else {
			source.observer && source.observer.disconnect();
			source.classList.remove('resizable');
			target.removeAttribute('style');
			source.removeAttribute('style');
		}
	}

	initHorizontalLayoutResizer() {
		const top = doc.querySelector('.b-message-list-wrapper'),
			bottom = doc.querySelector('.b-message-view-wrapper'),
			fToggle = () => {
				this.setLayoutResizer(top, bottom, ClientSideKeyName.MessageListSize,
					(ThemeStore.isMobile() || Layout.BottomPreview !== SettingsUserStore.layout()) ? null : 'height');
			};
		if (top && bottom) {
			fToggle();
			addEventListener('rl-layout', fToggle);
		}
	}

	initVerticalLayoutResizer() {
		const left = elementById('rl-left'),
			right = elementById('rl-right'),
			fToggle = () =>
				this.setLayoutResizer(left, right, ClientSideKeyName.FolderListSize,
					(ThemeStore.isMobile() || leftPanelDisabled()) ? null : 'width');
		if (left && right) {
			fToggle();
			leftPanelDisabled.subscribe(fToggle);
		}
	}

	/**
	 * @param {string} link
	 * @returns {boolean}
	 */
	download(link) {
		if (ThemeStore.isMobile()) {
			open(link, '_self');
			focus();
		} else {
			const oLink = createElement('a');
			oLink.href = link;
			doc.body.appendChild(oLink).click();
			oLink.remove();
		}
		return true;
	}

	logout() {
		Remote.logout(() => rl.logoutReload((SettingsGet('ParentEmail')||{length:0}).length));
	}

	bootstart() {
		super.bootstart();

		addEventListener('resize', () => leftPanelDisabled(ThemeStore.isMobile() || 1000 > innerWidth));

		NotificationUserStore.populate();
		AccountUserStore.populate();
		ContactUserStore.populate();

		let contactsSyncInterval = pInt(SettingsGet('ContactsSyncInterval'));

		const startupUrl = pString(SettingsGet('StartupUrl'));

		rl.setWindowTitle();
		if (SettingsGet('Auth')) {
			rl.setWindowTitle(i18n('GLOBAL/LOADING'));

			this.foldersReload(value => {
				try {
					if (value) {
						if (startupUrl) {
							rl.route.setHash(root(startupUrl), true);
						}

						if (window.crypto && crypto.getRandomValues && Settings.capa(Capa.OpenPGP)) {
							const openpgpCallback = () => {
								if (!window.openpgp) {
									return false;
								}
								PgpUserStore.openpgp = openpgp;

								if (window.Worker) {
									try {
										PgpUserStore.openpgp.initWorker({ path: openPgpWorkerJs() });
									} catch (e) {
										console.error(e);
									}
								}

								PgpUserStore.openpgpKeyring = new openpgp.Keyring();
								PgpUserStore.capaOpenPGP(true);

								this.reloadOpenPgpKeys();

								return true;
							};

							if (!openpgpCallback()) {
								const script = createElement('script', {src:openPgpJs()});
								script.onload = openpgpCallback;
								script.onerror = () => console.error(script.src);
								doc.head.append(script);
							}
						} else {
							PgpUserStore.capaOpenPGP(false);
						}

						startScreens([
							MailBoxUserScreen,
							Settings.capa(Capa.Settings) ? SettingsUserScreen : null
							// false ? AboutUserScreen : null
						]);
						this.hideLoading();

						setInterval(() => {
							const cF = FolderUserStore.currentFolderFullNameRaw(),
								iF = getFolderInboxName();
							this.folderInformation(iF);
							if (iF !== cF) {
								this.folderInformation(cF);
							}
							this.folderInformationMultiply();
						}, refreshFolders);

						// Every 15 minutes
						setInterval(this.quota, 900000);
						// Every 20 minutes
						setInterval(this.foldersReload, 1200000);

						setTimeout(this.contactsSync, 10000);
						contactsSyncInterval = 5 <= contactsSyncInterval ? contactsSyncInterval : 20;
						contactsSyncInterval = 320 >= contactsSyncInterval ? contactsSyncInterval : 320;
						setInterval(this.contactsSync, contactsSyncInterval * 60000 + 5000);

						this.accountsAndIdentities(true);

						setTimeout(() => {
							const cF = FolderUserStore.currentFolderFullNameRaw();
							if (getFolderInboxName() !== cF) {
								this.folderInformation(cF);
							}
							this.folderInformationMultiply(true);
						}, 1000);

						setTimeout(this.quota, 5000);
						setTimeout(() => Remote.appDelayStart(()=>{}), 35000);

						// When auto-login is active
						if (
							!!SettingsGet('AccountSignMe') &&
							navigator.registerProtocolHandler &&
							Settings.capa(Capa.Composer)
						) {
							setTimeout(() => {
								try {
									navigator.registerProtocolHandler(
										'mailto',
										location.protocol + '//' + location.host + location.pathname + '?mailto&to=%s',
										(SettingsGet('Title') || 'SnappyMail')
									);
								} catch (e) {} // eslint-disable-line no-empty

								if (SettingsGet('MailToEmail')) {
									mailToHelper(SettingsGet('MailToEmail'));
								}
							}, 500);
						}

						['touchstart','mousedown','mousemove','keydown'].forEach(
							t => doc.addEventListener(t, SettingsUserStore.delayLogout, {passive:true})
						);
						SettingsUserStore.delayLogout();

						setTimeout(() => this.initVerticalLayoutResizer(), 1);
					} else {
						this.logout();
					}
				} catch (e) {
					console.error(e);
				}
			});

		} else {
			startScreens([LoginUserScreen]);
			this.hideLoading();
		}

		setInterval(this.reloadTime(), 60000);
	}

	reloadTime()
	{
		setTimeout(() =>
			doc.querySelectorAll('[data-bind*="moment:"]').forEach(element => timeToNode(element))
			, 1)
	}

	showMessageComposer(params = [])
	{
		Settings.capa(Capa.Composer) && showScreenPopup(ComposePopupView, params);
	}
}

export default new AppUser();
