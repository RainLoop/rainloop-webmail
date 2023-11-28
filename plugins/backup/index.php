<?php

class BackupPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Backup',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '1.0',
		RELEASE  = '2023-11-27',
		REQUIRED = '2.30.0',
		CATEGORY = 'General',
		LICENSE  = 'MIT',
		DESCRIPTION = '';

	public function Init() : void
	{
		// Admin Settings tab
		$this->addJs('js/BackupAdminSettings.js', true); // add js file
		$this->addJsonHook('JsonAdminGetData');
		$this->addJsonHook('JsonAdminRestoreData');
		$this->addTemplate('templates/BackupAdminSettingsTab.html', true);
	}

	public function JsonAdminGetData()
	{
		if (!($this->Manager()->Actions() instanceof \RainLoop\ActionsAdmin)) {
			return $this->jsonResponse(__FUNCTION__, false);
		}

		$sZipHash = \MailSo\Base\Utils::Sha1Rand();
		$sZipFileName = APP_PRIVATE_DATA . $sZipHash . '.zip';

		\touch(APP_PRIVATE_DATA.'cache/CACHEDIR.TAG');

		if (\class_exists('ZipArchive')) {
//			$oZip = new \ZipArchive();
//			$oZip->open($sZipFileName, \ZIPARCHIVE::CREATE | \ZIPARCHIVE::OVERWRITE);
//			$oZip->setArchiveComment('SnappyMail/'.APP_VERSION);
		}

		$oZip = new \SnappyMail\Stream\ZIP($sZipFileName);
//		$oZip->addRecursive(APP_PRIVATE_DATA, '#/(cache.*)#');
		$oZip->addRecursive(APP_PRIVATE_DATA.'configs', 'configs');
		$oZip->addRecursive(APP_PRIVATE_DATA.'domains', 'domains');
		$oZip->addRecursive(APP_PRIVATE_DATA.'plugins', 'plugins');
		$oZip->addRecursive(APP_PRIVATE_DATA.'storage', 'storage');
		$oZip->close();

		$data = \base64_encode(\file_get_contents($sZipFileName));
		\unlink($sZipFileName);

		return $this->jsonResponse(__FUNCTION__, array(
			'zip' => $data
		));
	}

	public function JsonAdminRestoreData()
	{
		if (!($this->Manager()->Actions() instanceof \RainLoop\ActionsAdmin)
		 || empty($_FILES['backup'])
		 || 'application/zip' !== $_FILES['backup']['type']
		 || !\is_uploaded_file($_FILES['backup']['tmp_name'])
		) {
			return $this->jsonResponse(__FUNCTION__, false);
		}

		if (\class_exists('ZipArchive')) {
			$oArchive = new \ZipArchive();
			$oArchive->open($_FILES['backup']['tmp_name'], \ZIPARCHIVE::CREATE);
			$oArchive->extractTo(APP_PRIVATE_DATA);
		} else if (\class_exists('PharData')) {
			$oArchive = new \PharData($sTmp, 0, null, \Phar::GZ);
			$oArchive->extractTo(APP_PRIVATE_DATA);
		}

		return $this->jsonResponse(__FUNCTION__, array(
			'$_FILES' => $_FILES
		));
	}

}
