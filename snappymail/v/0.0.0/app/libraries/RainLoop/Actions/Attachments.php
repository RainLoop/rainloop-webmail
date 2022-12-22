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
		$sAction = $this->GetActionParam('Do', '');
		$sFolder = $this->GetActionParam('Folder', '');
		$aHashes = $this->GetActionParam('Hashes', null);
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
				if (empty($aResult['FileHash'])) {
					$bError = true;
					break;
				}
				$aData[] = $aResult;
				if (!empty($aResult['MimeIndex'])) {
					$mUIDs[$aResult['Uid']] = $aResult['Uid'];
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
							$sFullFileNameHash = $oFilesProvider->GetFileName($oAccount, $aItem['FileHash']);
							$sFileName = ($mUIDs ? "{$aItem['Uid']}/" : ($sFolder ? "{$aItem['Uid']}-" : '')) . $aItem['FileName'];
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
							if ($aItem['FileHash']) {
								$sFullFileNameHash = $oFilesProvider->GetFileName($oAccount, $aItem['FileHash']);
								if (!$oZip->addFile($sFullFileNameHash, $aItem['FileName'])) {
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
								$oFilesProvider->GetFileName($oAccount, $aItem['FileHash']),
								($mUIDs ? "{$aItem['Uid']}/" : ($sFolder ? "{$aItem['Uid']}-" : '')) . $aItem['FileName']
							);
						}
						$oZip->compressFiles(\Phar::GZ);
						unset($oZip);
						\rename($sZipFileName . '.zip', $sZipFileName);
					}

					foreach ($aData as $aItem) {
						$oFilesProvider->Clear($oAccount, $aItem['FileHash']);
					}

					if (!$bError) {
						$mResult = array(
							'FileHash' => $this->encodeRawKey($oAccount, array(
								'FileName' => ($sFolder ? 'messages' : 'attachments') . \date('-YmdHis') . '.zip',
								'MimeType' => 'application/zip',
								'FileHash' => $sZipHash
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

		$sFolder = isset($aValues['Folder']) ? (string) $aValues['Folder'] : '';
		$iUid = isset($aValues['Uid']) ? (int) $aValues['Uid'] : 0;
		$sMimeIndex = isset($aValues['MimeIndex']) ? (string) $aValues['MimeIndex'] : '';

		$sContentTypeIn = isset($aValues['MimeType']) ? (string) $aValues['MimeType'] : '';
		$sFileNameIn = isset($aValues['FileName']) ? (string) $aValues['FileName'] : 'file.dat';

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

		$aValues['FileName'] = $sFileNameIn;
		$aValues['FileHash'] = $mResult ? $sResultHash : '';

		return $aValues;
	}
}
