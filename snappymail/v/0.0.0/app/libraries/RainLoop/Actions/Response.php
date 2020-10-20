<?php

namespace RainLoop\Actions;

use \RainLoop\Enumerations\Capa;
use \RainLoop\Notifications;
use \RainLoop\Utils;

trait Response
{
	/**
	 * @param mixed $mResult = false
	 */
	public function DefaultResponse(string $sActionName, $mResult = false, array $aAdditionalParams = array()) : array
	{
		$this->Plugins()->RunHook('main.default-response-data', array($sActionName, &$mResult));
		$aResponseItem = $this->mainDefaultResponse($sActionName, $mResult, $aAdditionalParams);
		$this->Plugins()->RunHook('main.default-response', array($sActionName, &$aResponseItem));
		return $aResponseItem;
	}

	public function TrueResponse(string $sActionName, array $aAdditionalParams = array()) : array
	{
		$mResult = true;
		$this->Plugins()->RunHook('main.default-response-data', array($sActionName, &$mResult));
		$aResponseItem = $this->mainDefaultResponse($sActionName, $mResult, $aAdditionalParams);
		$this->Plugins()->RunHook('main.default-response', array($sActionName, &$aResponseItem));
		return $aResponseItem;
	}

	public function FalseResponse(string $sActionName, ?int $iErrorCode = null, ?string $sErrorMessage = null, ?string $sAdditionalErrorMessage = null) : array
	{
		$mResult = false;
		$this->Plugins()
			->RunHook('main.default-response-data', array($sActionName, &$mResult))
			->RunHook('main.default-response-error-data', array($sActionName, &$iErrorCode, &$sErrorMessage))
		;

		$aAdditionalParams = array();
		if (null !== $iErrorCode)
		{
			$aAdditionalParams['ErrorCode'] = (int) $iErrorCode;
			$aAdditionalParams['ErrorMessage'] = null === $sErrorMessage ? '' : (string) $sErrorMessage;
			$aAdditionalParams['ErrorMessageAdditional'] = null === $sAdditionalErrorMessage ? '' : (string) $sAdditionalErrorMessage;
		}

		$aResponseItem = $this->mainDefaultResponse($sActionName, $mResult, $aAdditionalParams);

		$this->Plugins()->RunHook('main.default-response', array($sActionName, &$aResponseItem));
		return $aResponseItem;
	}

	public function ExceptionResponse(string $sActionName, \Throwable $oException) : array
	{
		$iErrorCode = null;
		$sErrorMessage = null;
		$sErrorMessageAdditional = null;

		if ($oException instanceof \RainLoop\Exceptions\ClientException)
		{
			$iErrorCode = $oException->getCode();
			$sErrorMessage = null;

			if ($iErrorCode === Notifications::ClientViewError)
			{
				$sErrorMessage = $oException->getMessage();
			}

			$sErrorMessageAdditional = $oException->getAdditionalMessage();
			if (empty($sErrorMessageAdditional))
			{
				$sErrorMessageAdditional = null;
			}
		}
		else
		{
			$iErrorCode = Notifications::UnknownError;
			$sErrorMessage = $oException->getCode().' - '.$oException->getMessage();
		}

		$oPrevious = $oException->getPrevious();
		if ($oPrevious)
		{
			$this->Logger()->WriteException($oPrevious);
		}
		else
		{
			$this->Logger()->WriteException($oException);
		}

		return $this->FalseResponse($sActionName, $iErrorCode, $sErrorMessage, $sErrorMessageAdditional);
	}

	/**
	 * @param mixed $mResult = false
	 */
	private function mainDefaultResponse(string $sActionName, $mResult = false, array $aAdditionalParams = array()) : array
	{
		$sActionName = 'Do' === \substr($sActionName, 0, 2) ? \substr($sActionName, 2) : $sActionName;
		$sActionName = \preg_replace('/[^a-zA-Z0-9_]+/', '', $sActionName);

		$aResult = array(
			'Action' => $sActionName,
			'Result' => $this->responseObject($mResult, $sActionName)
		);

		foreach ($aAdditionalParams as $sKey => $mValue)
		{
			$aResult[$sKey] = $mValue;
		}

		return $aResult;
	}

	private function isFileHasFramedPreview(string $sFileName) : bool
	{
		$sExt = \MailSo\Base\Utils::GetFileExtension($sFileName);
		return \in_array($sExt, array('doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'));
	}

	private function isFileHasThumbnail(string $sFileName) : bool
	{
		static $aCache = array();

		$sExt = \MailSo\Base\Utils::GetFileExtension($sFileName);
		if (isset($aCache[$sExt]))
		{
			return $aCache[$sExt];
		}

		$bResult = \function_exists('gd_info');
		if ($bResult)
		{
			$bResult = false;
			switch ($sExt)
			{
				case 'png':
					$bResult = \function_exists('imagecreatefrompng');
					break;
				case 'gif':
					$bResult = \function_exists('imagecreatefromgif');
					break;
				case 'jpg':
				case 'jpeg':
					$bResult = \function_exists('imagecreatefromjpeg');
					break;
			}
		}

		$aCache[$sExt] = $bResult;

		return $bResult;
	}

	private function hashFolderFullName(string $sFolderFullName) : string
	{
		return \in_array(\strtolower($sFolderFullName), array('inbox', 'sent', 'send', 'drafts',
			'spam', 'junk', 'bin', 'trash', 'archive', 'allmail', 'all')) ?
				$sFolderFullName : \md5($sFolderFullName);
	}

	private function objectData(object $oData, string $sParent, array $aParameters = array()) : array
	{
		$mResult = array();
		if (\is_object($oData))
		{
			$aNames = \explode('\\', \get_class($oData));
			$mResult = array(
				'@Object' => \end($aNames)
			);

			if ($oData instanceof \MailSo\Base\Collection)
			{
				$mResult['@Object'] = 'Collection/'.$mResult['@Object'];
				$mResult['@Count'] = $oData->Count();
				$mResult['@Collection'] = $this->responseObject($oData->getArrayCopy(), $sParent, $aParameters);
			}
			else
			{
				$mResult['@Object'] = 'Object/'.$mResult['@Object'];
			}
		}

		return $mResult;
	}

	/**
	 * @param mixed $mResponse
	 *
	 * @return mixed
	 */
	private $oAccount = null;
	private $aCheckableFolder = null;
	private function responseObject($mResponse, string $sParent = '', array $aParameters = array())
	{
		/**
			\MailSo\Mime\Email
			\RainLoop\Model\Domain
			\RainLoop\Model\Identity
			\RainLoop\Model\Template
			\RainLoop\Providers\AddressBook\Classes\Contact
			\RainLoop\Providers\AddressBook\Classes\Property
			\RainLoop\Providers\AddressBook\Classes\Tag
			\RainLoop\Providers\Filters\Classes\Filter
			\RainLoop\Providers\Filters\Classes\FilterCondition
		 */
		if ($mResponse instanceof \JsonSerializable) {
//			return $mResponse->jsonSerialize();
			return $mResponse;
		}

		if (\is_object($mResponse))
		{
			$sClassName = \get_class($mResponse);

			if ('MailSo\Mail\Message' === $sClassName)
			{
				if (null === $this->oAccount) {
					$this->oAccount = $this->getAccountFromToken(false);
				}
				$oAccount = $this->oAccount;

				$iDateTimeStampInUTC = $mResponse->InternalTimeStampInUTC();
				if (0 === $iDateTimeStampInUTC || !!$this->Config()->Get('labs', 'date_from_headers', false))
				{
					$iDateTimeStampInUTC = $mResponse->HeaderTimeStampInUTC();
					if (0 === $iDateTimeStampInUTC)
					{
						$iDateTimeStampInUTC = $mResponse->InternalTimeStampInUTC();
					}
				}

				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Folder' => $mResponse->Folder(),
					'Uid' => (string) $mResponse->Uid(),
					'Subject' => \trim(\MailSo\Base\Utils::Utf8Clear($mResponse->Subject())),
					'MessageId' => $mResponse->MessageId(),
					'Size' => $mResponse->Size(),
					'DateTimeStampInUTC' => $iDateTimeStampInUTC,
					'ReplyTo' => $this->responseObject($mResponse->ReplyTo(), $sParent, $aParameters),
					'From' => $this->responseObject($mResponse->From(), $sParent, $aParameters),
					'To' => $this->responseObject($mResponse->To(), $sParent, $aParameters),
					'Cc' => $this->responseObject($mResponse->Cc(), $sParent, $aParameters),
					'Bcc' => $this->responseObject($mResponse->Bcc(), $sParent, $aParameters),
					'Sender' => $this->responseObject($mResponse->Sender(), $sParent, $aParameters),
					'DeliveredTo' => $this->responseObject($mResponse->DeliveredTo(), $sParent, $aParameters),
					'Priority' => $mResponse->Priority(),
					'Threads' => $mResponse->Threads(),
					'Sensitivity' => $mResponse->Sensitivity(),
					'UnsubsribeLinks' => $mResponse->UnsubsribeLinks(),
					'ExternalProxy' => false,
					'ReadReceipt' => ''
				));

				$mResult['SubjectParts'] = $this->explodeSubject($mResult['Subject']);

				$oAttachments = $mResponse->Attachments();
				$iAttachmentsCount = $oAttachments ? $oAttachments->Count() : 0;

				$mResult['HasAttachments'] = 0 < $iAttachmentsCount;
				$mResult['AttachmentsSpecData'] = $mResult['HasAttachments'] ? $oAttachments->SpecData() : array();

				$sSubject = $mResult['Subject'];
				$mResult['Hash'] = \md5($mResult['Folder'].$mResult['Uid']);
				$mResult['RequestHash'] = Utils::EncodeKeyValuesQ(array(
					'V' => APP_VERSION,
					'Account' => $oAccount ? \md5($oAccount->Hash()) : '',
					'Folder' => $mResult['Folder'],
					'Uid' => $mResult['Uid'],
					'MimeType' => 'message/rfc822',
					'FileName' => (0 === \strlen($sSubject) ? 'message-'.$mResult['Uid'] : \MailSo\Base\Utils::ClearXss($sSubject)).'.eml'
				));

				// Flags
				$aFlags = $mResponse->FlagsLowerCase();
				$mResult['IsSeen'] = \in_array('\\seen', $aFlags);
				$mResult['IsFlagged'] = \in_array('\\flagged', $aFlags);
				$mResult['IsAnswered'] = \in_array('\\answered', $aFlags);
				$mResult['IsDeleted'] = \in_array('\\deleted', $aFlags);

				$sForwardedFlag = $this->Config()->Get('labs', 'imap_forwarded_flag', '');
				$sReadReceiptFlag = $this->Config()->Get('labs', 'imap_read_receipt_flag', '');

				$mResult['IsForwarded'] = 0 < \strlen($sForwardedFlag) && \in_array(\strtolower($sForwardedFlag), $aFlags);
				$mResult['IsReadReceipt'] = 0 < \strlen($sReadReceiptFlag) && \in_array(\strtolower($sReadReceiptFlag), $aFlags);

				if (!$this->GetCapa(false, false, Capa::COMPOSER, $oAccount))
				{
					$mResult['IsReadReceipt'] = true;
				}

				$mResult['TextPartIsTrimmed'] = false;

				if ('Message' === $sParent)
				{
					$oAttachments = /* @var \MailSo\Mail\AttachmentCollection */  $mResponse->Attachments();

					$bHasExternals = false;
					$mFoundedCIDs = array();
					$aContentLocationUrls = array();
					$mFoundedContentLocationUrls = array();

					if ($oAttachments && 0 < $oAttachments->Count())
					{
						foreach ($oAttachments as /* @var \MailSo\Mail\Attachment */ $oAttachment)
						{
							if ($oAttachment)
							{
								$sContentLocation = $oAttachment->ContentLocation();
								if ($sContentLocation && 0 < \strlen($sContentLocation))
								{
									$aContentLocationUrls[] = $oAttachment->ContentLocation();
								}
							}
						}
					}

					$sPlain = '';
					$sHtml = \trim($mResponse->Html());

					if (0 === \strlen($sHtml))
					{
						$sPlain = \trim($mResponse->Plain());
					}

					$mResult['DraftInfo'] = $mResponse->DraftInfo();
					$mResult['InReplyTo'] = $mResponse->InReplyTo();
					$mResult['UnsubsribeLinks'] = $mResponse->UnsubsribeLinks();
					$mResult['References'] = $mResponse->References();

					$fAdditionalExternalFilter = null;
					if (!!$this->Config()->Get('labs', 'use_local_proxy_for_external_images', false))
					{
						$fAdditionalExternalFilter = function ($sUrl) {
							return './?/ProxyExternal/'.Utils::EncodeKeyValuesQ(array(
								'Rnd' => \md5(\microtime(true)),
								'Token' => Utils::GetConnectionToken(),
								'Url' => $sUrl
							)).'/';
						};
					}

					$sHtml = \preg_replace_callback('/(<pre[^>]*>)([\s\S\r\n\t]*?)(<\/pre>)/mi', function ($aMatches) {
						return \preg_replace('/[\r\n]+/', '<br />', $aMatches[1].\trim($aMatches[2]).$aMatches[3]);
					}, $sHtml);

					$mResult['Html'] = 0 === \strlen($sHtml) ? '' : \MailSo\Base\HtmlUtils::ClearHtml(
						$sHtml, $bHasExternals, $mFoundedCIDs, $aContentLocationUrls, $mFoundedContentLocationUrls, false, false,
						$fAdditionalExternalFilter, null, !!$this->Config()->Get('labs', 'try_to_detect_hidden_images', false)
					);

					$mResult['ExternalProxy'] = null !== $fAdditionalExternalFilter;

					$mResult['Plain'] = $sPlain;
//					$mResult['Plain'] = 0 === \strlen($sPlain) ? '' : \MailSo\Base\HtmlUtils::ConvertPlainToHtml($sPlain);

					$mResult['TextHash'] = \md5($mResult['Html'].$mResult['Plain']);

					$mResult['TextPartIsTrimmed'] = $mResponse->TextPartIsTrimmed();

					$mResult['PgpSigned'] = $mResponse->PgpSigned();
					$mResult['PgpEncrypted'] = $mResponse->PgpEncrypted();
					$mResult['PgpSignature'] = $mResponse->PgpSignature();

					unset($sHtml, $sPlain);

					$mResult['HasExternals'] = $bHasExternals;
					$mResult['HasInternals'] = (\is_array($mFoundedCIDs) && 0 < \count($mFoundedCIDs)) ||
						(\is_array($mFoundedContentLocationUrls) && 0 < \count($mFoundedContentLocationUrls));
					$mResult['FoundedCIDs'] = $mFoundedCIDs;
					$mResult['Attachments'] = $this->responseObject($oAttachments, $sParent, \array_merge($aParameters, array(
						'FoundedCIDs' => $mFoundedCIDs,
						'FoundedContentLocationUrls' => $mFoundedContentLocationUrls
					)));

					$mResult['ReadReceipt'] = $mResponse->ReadReceipt();
					if (0 < \strlen($mResult['ReadReceipt']) && !$mResult['IsReadReceipt'])
					{
						if (0 < \strlen($mResult['ReadReceipt']))
						{
							try
							{
								$oReadReceipt = \MailSo\Mime\Email::Parse($mResult['ReadReceipt']);
								if (!$oReadReceipt)
								{
									$mResult['ReadReceipt'] = '';
								}
							}
							catch (\Throwable $oException) { unset($oException); }
						}

						if (0 < \strlen($mResult['ReadReceipt']) && '1' === $this->Cacher($oAccount)->Get(
							\RainLoop\KeyPathHelper::ReadReceiptCache($oAccount->Email(), $mResult['Folder'], $mResult['Uid']), '0'))
						{
							$mResult['ReadReceipt'] = '';
						}
					}
				}
				return $mResult;
			}

			if ('MailSo\Mail\Attachment' === $sClassName)
			{
				if (null === $this->oAccount) {
					$this->oAccount = $this->getAccountFromToken(false);
				}

				$mFoundedCIDs = isset($aParameters['FoundedCIDs']) && \is_array($aParameters['FoundedCIDs']) &&
					0 < \count($aParameters['FoundedCIDs']) ?
						$aParameters['FoundedCIDs'] : null;

				$mFoundedContentLocationUrls = isset($aParameters['FoundedContentLocationUrls']) &&
					\is_array($aParameters['FoundedContentLocationUrls']) &&
					0 < \count($aParameters['FoundedContentLocationUrls']) ?
						$aParameters['FoundedContentLocationUrls'] : null;

				if ($mFoundedCIDs || $mFoundedContentLocationUrls)
				{
					$mFoundedCIDs = \array_merge($mFoundedCIDs ? $mFoundedCIDs : array(),
						$mFoundedContentLocationUrls ? $mFoundedContentLocationUrls : array());

					$mFoundedCIDs = 0 < \count($mFoundedCIDs) ? $mFoundedCIDs : null;
				}

				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Folder' => $mResponse->Folder(),
					'Uid' => (string) $mResponse->Uid(),
					'Framed' => false,
					'MimeIndex' => (string) $mResponse->MimeIndex(),
					'MimeType' => $mResponse->MimeType(),
					'FileName' => \MailSo\Base\Utils::ClearFileName(
						\MailSo\Base\Utils::ClearXss($mResponse->FileName(true))),
					'EstimatedSize' => $mResponse->EstimatedSize(),
					'CID' => $mResponse->Cid(),
					'ContentLocation' => $mResponse->ContentLocation(),
					'IsInline' => $mResponse->IsInline(),
					'IsThumbnail' => $this->GetCapa(false, false, Capa::ATTACHMENT_THUMBNAILS),
					'IsLinked' => ($mFoundedCIDs && \in_array(\trim(\trim($mResponse->Cid()), '<>'), $mFoundedCIDs)) ||
						($mFoundedContentLocationUrls && \in_array(\trim($mResponse->ContentLocation()), $mFoundedContentLocationUrls))
				));

				$mResult['Framed'] = $this->isFileHasFramedPreview($mResult['FileName']);

				if ($mResult['IsThumbnail'])
				{
					$mResult['IsThumbnail'] = $this->isFileHasThumbnail($mResult['FileName']);
				}

				$mResult['Download'] = Utils::EncodeKeyValuesQ(array(
					'V' => APP_VERSION,
					'Account' => $this->oAccount ? \md5($this->oAccount->Hash()) : '',
					'Folder' => $mResult['Folder'],
					'Uid' => $mResult['Uid'],
					'MimeIndex' => $mResult['MimeIndex'],
					'MimeType' => $mResult['MimeType'],
					'FileName' => $mResult['FileName'],
					'Framed' => $mResult['Framed']
				));
				return $mResult;
			}

			if ('MailSo\Mail\Folder' === $sClassName)
			{
				$aExtended = null;

//				$mStatus = $mResponse->Status();
//				if (\is_array($mStatus) && isset($mStatus['MESSAGES'], $mStatus['UNSEEN'], $mStatus['UIDNEXT']))
//				{
//					$aExtended = array(
//						'MessageCount' => (int) $mStatus['MESSAGES'],
//						'MessageUnseenCount' => (int) $mStatus['UNSEEN'],
//						'UidNext' => (string) $mStatus['UIDNEXT'],
//						'Hash' => $this->MailClient()->GenerateFolderHash(
//							$mResponse->FullNameRaw(), $mStatus['MESSAGES'], $mStatus['UNSEEN'], $mStatus['UIDNEXT'],
//								empty($mStatus['HIGHESTMODSEQ']) ? '' : $mStatus['HIGHESTMODSEQ'])
//					);
//				}

				if (null === $this->aCheckableFolder)
				{
					if (null === $this->oAccount) {
						$this->oAccount = $this->getAccountFromToken(false);
					}
					$aCheckable = \json_decode(
						$this->SettingsProvider(true)
						->Load($this->oAccount)
						->GetConf('CheckableFolder', '[]')
					);
					$this->aCheckableFolder = \is_array($aCheckable) ? $aCheckable : array();
				}

				return \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Name' => $mResponse->Name(),
					'FullName' => $mResponse->FullName(),
					'FullNameRaw' => $mResponse->FullNameRaw(),
					'FullNameHash' => $this->hashFolderFullName($mResponse->FullNameRaw(), $mResponse->FullName()),
					'Delimiter' => (string) $mResponse->Delimiter(),
					'HasVisibleSubFolders' => $mResponse->HasVisibleSubFolders(),
					'IsSubscribed' => $mResponse->IsSubscribed(),
					'IsExists' => $mResponse->IsExists(),
					'IsSelectable' => $mResponse->IsSelectable(),
					'Flags' => $mResponse->FlagsLowerCase(),
					'Checkable' => \in_array($mResponse->FullNameRaw(), $this->aCheckableFolder),
					'Extended' => $aExtended,
					'SubFolders' => $this->responseObject($mResponse->SubFolders(), $sParent, $aParameters)
				));
			}

			if ('MailSo\Mail\MessageCollection' === $sClassName)
			{
				return \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'MessageCount' => $mResponse->MessageCount,
					'MessageUnseenCount' => $mResponse->MessageUnseenCount,
					'MessageResultCount' => $mResponse->MessageResultCount,
					'Folder' => $mResponse->FolderName,
					'FolderHash' => $mResponse->FolderHash,
					'UidNext' => $mResponse->UidNext,
					'ThreadUid' => $mResponse->ThreadUid,
					'NewMessages' => $this->responseObject($mResponse->NewMessages),
					'Filtered' => $mResponse->Filtered,
					'Offset' => $mResponse->Offset,
					'Limit' => $mResponse->Limit,
					'Search' => $mResponse->Search
				));
			}

			if ('MailSo\Mail\AttachmentCollection' === $sClassName)
			{
				return \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'InlineCount' => $mResponse->InlineCount()
				));
			}

			if ('MailSo\Mail\FolderCollection' === $sClassName)
			{
				return \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Namespace' => $mResponse->GetNamespace(),
					'FoldersHash' => isset($mResponse->FoldersHash) ? $mResponse->FoldersHash : '',
					'IsThreadsSupported' => $mResponse->IsThreadsSupported,
					'Optimized' => $mResponse->Optimized,
					'CountRec' => $mResponse->CountRec(),
					'SystemFolders' => isset($mResponse->SystemFolders) && \is_array($mResponse->SystemFolders) ?
						$mResponse->SystemFolders : array()
				));
			}

			if ('MailSo\Mime\EmailCollection' === $sClassName)
			{
				$mResult = array();
				if (100 < \count($mResponse)) {
					$mResponse = $mResponse->Slice(0, 100);
				}
				foreach ($mResponse as $iKey => $oItem) {
					$mResult[$iKey] = $this->responseObject($oItem, $sParent, $aParameters);
				}
				return $mResult;
			}

			if ($mResponse instanceof \MailSo\Base\Collection)
			{
				$mResult = array();
				foreach ($mResponse as $iKey => $oItem) {
					$mResult[$iKey] = $this->responseObject($oItem, $sParent, $aParameters);
				}
				return $mResult;
			}

			return '["'.$sClassName.'"]';
		}

		if (\is_array($mResponse))
		{
			foreach ($mResponse as $iKey => $oItem)
			{
				$mResponse[$iKey] = $this->responseObject($oItem, $sParent, $aParameters);
			}

			return $mResponse;
		}

		return $mResponse;
	}

	private function explodeSubject(string $sSubject) : array
	{
		$aResult = array('', '');
		if (0 < \strlen($sSubject))
		{
			$bDrop = false;
			$aPrefix = array();
			$aSuffix = array();

			$aParts = \explode(':', $sSubject);
			foreach ($aParts as $sPart)
			{
				if (!$bDrop &&
					(\preg_match('/^(RE|FWD)$/i', \trim($sPart)) || \preg_match('/^(RE|FWD)[\[\(][\d]+[\]\)]$/i', \trim($sPart))))
				{
					$aPrefix[] = $sPart;
				}
				else
				{
					$aSuffix[] = $sPart;
					$bDrop = true;
				}
			}

			if (0 < \count($aPrefix))
			{
				$aResult[0] = \rtrim(\trim(\implode(':', $aPrefix)), ':').': ';
			}

			if (0 < \count($aSuffix))
			{
				$aResult[1] = \trim(\implode(':', $aSuffix));
			}

			if (0 === \strlen($aResult[1]))
			{
				$aResult = array('', $sSubject);
			}
		}

		return $aResult;
	}

}
