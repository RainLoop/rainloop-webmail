<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\Capa;
use RainLoop\Utils;

trait Attachments
{
	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoAttachmentsActions() : array
	{
		$sAction = $this->GetActionParam('target', '');
		$sFolder = $this->GetActionParam('folder', '');
		$aHashes = $this->GetActionParam('hashes', null);
		$oFilesProvider = $this->FilesProvider();
		if (empty($sAction) || !$this->GetCapa(Capa::ATTACHMENTS_ACTIONS) || !$oFilesProvider || !$oFilesProvider->IsActive()) {
			return $this->FalseResponse();
		}

		$oAccount = $this->initMailClientConnection();

		$bError = false;
		$aData = [];
		$mUIDs = [];

		if (\is_array($aHashes) && \count($aHashes)) {
			foreach ($aHashes as $sZipHash) {
				$aResult = $this->getMimeFileByHash($oAccount, $sZipHash);
				if (empty($aResult['fileHash'])) {
					$bError = true;
					break;
				}
				$aData[] = $aResult;
				if (!empty($aResult['mimeIndex'])) {
					$mUIDs[$aResult['uid']] = $aResult['uid'];
				}
			}
		}
		$mUIDs = 1 < \count($mUIDs);

		if ($bError || !\count($aData)) {
			return $this->FalseResponse();
		}

		$mResult = false;
		switch (\strtolower($sAction))
		{
			case 'zip':

				$sZipHash = \MailSo\Base\Utils::Sha1Rand();
				$sZipFileName = $oFilesProvider->GenerateLocalFullFileName($oAccount, $sZipHash);

				if (!empty($sZipFileName)) {
					if (\class_exists('ZipArchive')) {
						$oZip = new \ZipArchive();
						$oZip->open($sZipFileName, \ZIPARCHIVE::CREATE | \ZIPARCHIVE::OVERWRITE);
						$oZip->setArchiveComment('SnappyMail/'.APP_VERSION);
						foreach ($aData as $aItem) {
							$sFullFileNameHash = $oFilesProvider->GetFileName($oAccount, $aItem['fileHash']);
							$sFileName = ($mUIDs ? "{$aItem['uid']}/" : ($sFolder ? "{$aItem['uid']}-" : '')) . $aItem['fileName'];
							if (!$oZip->addFile($sFullFileNameHash, $sFileName)) {
								$bError = true;
							}
						}

						if ($bError) {
							$oZip->close();
						} else {
							$bError = !$oZip->close();
						}
/*
					} else {
						@\unlink($sZipFileName);
						$oZip = new \SnappyMail\Stream\ZIP($sZipFileName);
//						$oZip->setArchiveComment('SnappyMail/'.APP_VERSION);
						foreach ($aData as $aItem) {
							if ($aItem['fileHash']) {
								$sFullFileNameHash = $oFilesProvider->GetFileName($oAccount, $aItem['fileHash']);
								if (!$oZip->addFile($sFullFileNameHash, $aItem['fileName'])) {
									$bError = true;
								}
							}
						}
						$oZip->close();
*/
					} else {
						@\unlink($sZipFileName);
						$oZip = new \PharData($sZipFileName . '.zip', 0, null, \Phar::ZIP);
						$oZip->compressFiles(\Phar::GZ);
						foreach ($aData as $aItem) {
							$oZip->addFile(
								$oFilesProvider->GetFileName($oAccount, $aItem['fileHash']),
								($mUIDs ? "{$aItem['uid']}/" : ($sFolder ? "{$aItem['uid']}-" : '')) . $aItem['fileName']
							);
						}
						$oZip->compressFiles(\Phar::GZ);
						unset($oZip);
						\rename($sZipFileName . '.zip', $sZipFileName);
					}

					foreach ($aData as $aItem) {
						$oFilesProvider->Clear($oAccount, $aItem['fileHash']);
					}

					if (!$bError) {
						$mResult = array(
							'fileHash' => $this->encodeRawKey($oAccount, array(
								'fileName' => ($sFolder ? 'messages' : 'attachments') . \date('-YmdHis') . '.zip',
								'mimeType' => 'application/zip',
								'fileHash' => $sZipHash
							))
						);
					}
				}
				break;

			default:
				$data = new \SnappyMail\AttachmentsAction;
				$data->action = $sAction;
				$data->items = $aData;
				$data->filesProvider = $oFilesProvider;
				$data->account = $oAccount;
				$this->Plugins()->RunHook('json.attachments', array($data));
				$mResult = $data->result;
				break;
		}

//		$this->requestSleep();
		return $this->DefaultResponse($bError ? false : $mResult);
	}

	private function getMimeFileByHash(\RainLoop\Model\Account $oAccount, string $sHash) : array
	{
		$aValues = $this->decodeRawKey($oAccount, $sHash);

		$sFolder = isset($aValues['folder']) ? (string) $aValues['folder'] : '';
		$iUid = isset($aValues['uid']) ? (int) $aValues['uid'] : 0;
		$sMimeIndex = isset($aValues['mimeIndex']) ? (string) $aValues['mimeIndex'] : '';

		$sContentTypeIn = isset($aValues['mimeType']) ? (string) $aValues['mimeType'] : '';
		$sFileNameIn = isset($aValues['fileName']) ? (string) $aValues['fileName'] : 'file.dat';

		$oFileProvider = $this->FilesProvider();

		$sResultHash = '';

		$mResult = $this->MailClient()->MessageMimeStream(function ($rResource, $sContentType, $sFileName, $sMimeIndex = '')
			use ($oAccount, $oFileProvider, $sFileNameIn, $sContentTypeIn, &$sResultHash) {

				unset($sContentType, $sFileName, $sMimeIndex);

				if (\is_resource($rResource))
				{
					$sHash = \MailSo\Base\Utils::Sha1Rand($sFileNameIn.'~'.$sContentTypeIn);
					$rTempResource = $oFileProvider->GetFile($oAccount, $sHash, 'wb+');

					if (\is_resource($rTempResource))
					{
						if (false !== \MailSo\Base\Utils::MultipleStreamWriter($rResource, array($rTempResource)))
						{
							$sResultHash = $sHash;
						}

						\fclose($rTempResource);
					}
				}

			}, $sFolder, $iUid, $sMimeIndex);

		$aValues['fileName'] = $sFileNameIn;
		$aValues['fileHash'] = $mResult ? $sResultHash : '';

		return $aValues;
	}
}
