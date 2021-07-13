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
		if (!($mResponse instanceof \JsonSerializable))
		{
			if (\is_object($mResponse))
			{
				return '["'.\get_class($mResponse).'"]';
			}

			if (\is_array($mResponse))
			{
				foreach ($mResponse as $iKey => $oItem)
				{
					$mResponse[$iKey] = $this->responseObject($oItem, $sParent, $aParameters);
				}
			}

			return $mResponse;
		}

		if ($mResponse instanceof \MailSo\Mail\Message)
		{
			$mResult = $mResponse->jsonSerialize();

			if (null === $this->oAccount) {
				$this->oAccount = $this->getAccountFromToken(false);
			}
			$oAccount = $this->oAccount;

			if (!$mResult['DateTimeStampInUTC'] || !!$this->Config()->Get('labs', 'date_from_headers', false)) {
				$iDateTimeStampInUTC = $mResponse->HeaderTimeStampInUTC();
				if ($iDateTimeStampInUTC) {
					$mResult['DateTimeStampInUTC'] = $iDateTimeStampInUTC;
				}
			}

			// \MailSo\Mime\EmailCollection
			foreach (['ReplyTo','From','To','Cc','Bcc','Sender','DeliveredTo','ReplyTo'] as $prop) {
				$mResult[$prop] = $this->responseObject($mResult[$prop], $sParent, $aParameters);
			}

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

			$sForwardedFlag = $this->Config()->Get('labs', 'imap_forwarded_flag', '');
			$sReadReceiptFlag = $this->Config()->Get('labs', 'imap_read_receipt_flag', '');

			$aFlags = $mResponse->FlagsLowerCase();
			$mResult['IsForwarded'] = \strlen($sForwardedFlag) && \in_array(\strtolower($sForwardedFlag), $aFlags);
			$mResult['IsReadReceipt'] = \strlen($sReadReceiptFlag) && \in_array(\strtolower($sReadReceiptFlag), $aFlags);

			if (!$this->GetCapa(false, Capa::COMPOSER, $oAccount))
			{
				$mResult['IsReadReceipt'] = true;
			}

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
//				$mResult['Plain'] = 0 === \strlen($sPlain) ? '' : \MailSo\Base\HtmlUtils::ConvertPlainToHtml($sPlain);

				$mResult['TextHash'] = \md5($mResult['Html'].$mResult['Plain']);

				$mResult['isPgpSigned'] = $mResponse->isPgpSigned();
				$mResult['isPgpEncrypted'] = $mResponse->isPgpEncrypted();
				$mResult['PgpSignature'] = $mResponse->PgpSignature();
				$mResult['PgpSignatureMicAlg'] = $mResponse->PgpSignatureMicAlg();

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

		if ($mResponse instanceof \MailSo\Mail\Attachment)
		{
			$mResult = $mResponse->jsonSerialize();

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

			$mResult['IsLinked'] = ($mFoundedCIDs && \in_array(\trim(\trim($mResponse->Cid()), '<>'), $mFoundedCIDs))
				|| ($mFoundedContentLocationUrls && \in_array(\trim($mResponse->ContentLocation()), $mFoundedContentLocationUrls));

			$mResult['Framed'] = $this->isFileHasFramedPreview($mResult['FileName']);
			$mResult['IsThumbnail'] = $this->GetCapa(false, Capa::ATTACHMENT_THUMBNAILS) && $this->isFileHasThumbnail($mResult['FileName']);

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

		if ($mResponse instanceof \MailSo\Mail\Folder)
		{
			$aExtended = null;

//			$mStatus = $mResponse->Status();
//			if (\is_array($mStatus) && isset($mStatus['MESSAGES'], $mStatus['UNSEEN'], $mStatus['UIDNEXT']))
//			{
//				$aExtended = array(
//					'MessageCount' => (int) $mStatus['MESSAGES'],
//					'MessageUnseenCount' => (int) $mStatus['UNSEEN'],
//					'UidNext' => (string) $mStatus['UIDNEXT'],
//					'Hash' => $this->MailClient()->GenerateFolderHash(
//						$mResponse->FullNameRaw(), $mStatus['MESSAGES'], $mStatus['UNSEEN'], $mStatus['UIDNEXT'],
//							empty($mStatus['HIGHESTMODSEQ']) ? '' : $mStatus['HIGHESTMODSEQ'])
//				);
//			}

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

			return \array_merge(
				$mResponse->jsonSerialize(),
				array(
					'FullNameHash' => $this->hashFolderFullName($mResponse->FullNameRaw(), $mResponse->FullName()),
					'Checkable' => \in_array($mResponse->FullNameRaw(), $this->aCheckableFolder),
					'Extended' => $aExtended,
					'SubFolders' => $this->responseObject($mResponse->SubFolders(), $sParent, $aParameters)
				)
			);
		}

		if ($mResponse instanceof \MailSo\Base\Collection)
		{
			$mResult = $mResponse->jsonSerialize();
			$mResult['@Collection'] = $this->responseObject($mResult['@Collection'], $sParent, $aParameters);
			if ($mResponse instanceof \MailSo\Mail\EmailCollection) {
				return array_slice($mResult['@Collection'], 0, 100);
			}
			if ($mResponse instanceof \MailSo\Mail\AttachmentCollection
			 || $mResponse instanceof \MailSo\Mail\FolderCollection
			 || $mResponse instanceof \MailSo\Mail\MessageCollection
			) {
				return $mResult;
			}
			return $mResult['@Collection'];
		}

		return $mResponse;
	}
}
