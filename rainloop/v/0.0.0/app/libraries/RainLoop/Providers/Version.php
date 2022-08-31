<?php

namespace RainLoop\Providers;

class Version
{
	/**
	 * @return void
	 */
	public function __construct($oConfig, $oLogger)
	{
		$this->oConfig = $oConfig;
		$this->oLogger = $oLogger;
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return true;
	}

	public function ClearOldVersion()
	{
		$sVPath = APP_INDEX_ROOT_PATH.'rainloop/v/';

		if ($this->oLogger)
		{
			$this->oLogger->Write('Versions GC: Begin');
		}

		$aDirs = @\array_map('basename', @\array_filter(@\glob($sVPath.'*'), 'is_dir'));

		if ($this->oLogger)
		{
			$this->oLogger->Write('Versions GC: Count:'.(\is_array($aDirs) ? \count($aDirs) : 0));
		}

		if (\is_array($aDirs) && 5 < \count($aDirs))
		{
			\uasort($aDirs, 'version_compare');

			foreach ($aDirs as $sName)
			{
				if (APP_DEV_VERSION !== $sName && APP_VERSION !== $sName)
				{
					if ($this->oLogger)
					{
						$this->oLogger->Write('Versions GC: Begin to remove  "'.$sVPath.$sName.'" version');
					}

					if (@\unlink($sVPath.$sName.'/index.php'))
					{
						@\MailSo\Base\Utils::RecRmDir($sVPath.$sName);
					}
					else
					{
						if ($this->oLogger)
						{
							$this->oLogger->Write('Versions GC (Error): index file cant be removed from"'.$sVPath.$sName.'"',
								\MailSo\Log\Enumerations\Type::ERROR);
						}
					}

					if ($this->oLogger)
					{
						$this->oLogger->Write('Versions GC: End to remove  "'.$sVPath.$sName.'" version');
					}

					break;
				}
			}
		}

		if ($this->oLogger)
		{
			$this->oLogger->Write('Versions GC: End');
		}
	}

	public function UpdateCore($oActions, $sFile)
	{
		$bResult = false;

		$sNewVersion = '';
		$sTmp = $oActions->downloadRemotePackageByUrl($sFile);
		if (!empty($sTmp))
		{
			include_once APP_VERSION_ROOT_PATH.'app/libraries/pclzip/pclzip.lib.php';

			$oArchive = new \PclZip($sTmp);
			$sTmpFolder = APP_PRIVATE_DATA.\md5($sTmp);

			\mkdir($sTmpFolder);
			if (\is_dir($sTmpFolder))
			{
				$bResult = 0 !== $oArchive->extract(PCLZIP_OPT_PATH, $sTmpFolder);
				if (!$bResult)
				{
					if ($this->oLogger)
					{
						$this->oLogger->Write('Cannot extract package files: '.$oArchive->errorInfo(), \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					}
				}

				if ($bResult && \file_exists($sTmpFolder.'/index.php') &&
					\is_writable(APP_INDEX_ROOT_PATH.'rainloop/') &&
					\is_writable(APP_INDEX_ROOT_PATH.'index.php') &&
					\is_dir($sTmpFolder.'/rainloop/'))
				{
					$aMatch = array();
					$sIndexFile = \file_get_contents($sTmpFolder.'/index.php');
					if (\preg_match('/\'APP_VERSION\', \'([^\']+)\'/', $sIndexFile, $aMatch) && !empty($aMatch[1]))
					{
						$sNewVersion = \trim($aMatch[1]);
					}

					if (empty($sNewVersion))
					{
						if ($this->oLogger)
						{
							$this->oLogger->Write('Unknown version', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
						}
					}
					else if (!\is_dir(APP_INDEX_ROOT_PATH.'rainloop/v/'.$sNewVersion))
					{
						\MailSo\Base\Utils::CopyDir($sTmpFolder.'/rainloop/', APP_INDEX_ROOT_PATH.'rainloop/');

						if (\is_dir(APP_INDEX_ROOT_PATH.'rainloop/v/'.$sNewVersion) &&
							\is_file(APP_INDEX_ROOT_PATH.'rainloop/v/'.$sNewVersion.'/index.php'))
						{
							$bResult = \copy($sTmpFolder.'/index.php', APP_INDEX_ROOT_PATH.'index.php');

							if ($bResult)
							{
								if (\MailSo\Base\Utils::FunctionExistsAndEnabled('opcache_invalidate'))
								{
									@\opcache_invalidate(APP_INDEX_ROOT_PATH.'index.php', true);
								}

								if (\MailSo\Base\Utils::FunctionExistsAndEnabled('apc_delete_file'))
								{
									@\apc_delete_file(APP_INDEX_ROOT_PATH.'index.php');
								}
							}
						}
						else
						{
							if ($this->oLogger)
							{
								$this->oLogger->Write('Cannot copy new package files', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
								$this->oLogger->Write($sTmpFolder.'/rainloop/ -> '.APP_INDEX_ROOT_PATH.'rainloop/', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
							}
						}
					}
					else if (!empty($sNewVersion))
					{
						if ($this->oLogger)
						{
							$this->oLogger->Write('"'.$sNewVersion.'" version already installed', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
						}
					}
				}
				else if ($bResult)
				{
					if ($this->oLogger)
					{
						$this->oLogger->Write('Cannot validate package files', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					}
				}

				\MailSo\Base\Utils::RecRmDir($sTmpFolder);
			}
			else
			{
				if ($this->oLogger)
				{
					$this->oLogger->Write('Cannot create tmp folder: '.$sTmpFolder, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
				}
			}

			@\unlink($sTmp);
		}

		return $bResult;
	}
}
