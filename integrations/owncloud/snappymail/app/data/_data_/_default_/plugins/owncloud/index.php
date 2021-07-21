<?php

class OwnCloudPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'OwnCloud',
		VERSION = '2.0',
		CATEGORY = 'Integrations',
		DESCRIPTION = 'Plugin that adds functionality to integrate with OwnCloud.';

	private static function IsOwnCloud() : bool
	{
		return !empty($_ENV['SNAPPYMAIL_OWNCLOUD']) && \class_exists('OC');
	}

	private static function IsOwnCloudLoggedIn() : bool
	{
		return static::IsOwnCloud() && \class_exists('OCP\User') && \OCP\User::isLoggedIn();
	}

	public function Init() : void
	{
		if (static::IsOwnCloud()) {
			$this->addHook('main.fabrica', 'MainFabrica');
			$this->addHook('filter.app-data', 'FilterAppData');
			$this->addHook('json.attachments', 'DoAttachmentsActions');

			$sAppPath = '';
			if (\class_exists('OC_App')) {
				$sAppPath = \rtrim(\trim(\OC_App::getAppWebPath('snappymail')), '\\/').'/app/';
			}
			if (!$sAppPath) {
				$sUrl = \MailSo\Base\Http::SingletonInstance()->GetUrl();
				if ($sUrl && \preg_match('/\/index\.php\/apps\/snappymail/', $sUrl)) {
					$sAppPath = \preg_replace('/\/index\.php\/apps\/snappymail.+$/',
						'/apps/snappymail/app/', $sUrl);
				}
			}
			$_SERVER['SCRIPT_NAME'] = $sAppPath;
		}
	}

	public function Supported() : string
	{
		if (!static::IsOwnCloud()) {
			return 'OwnCloud not found to use this plugin';
		}
		return '';
	}

	// DoAttachmentsActions
	public function DoAttachmentsActions(\SnappyMail\AttachmentsAction $data)
	{
		if ('owncloud' === $data->action) {
			if (static::IsOwnCloudLoggedIn() && \class_exists('OCP\Files')) {
				$oFiles = \OCP\Files::getStorage('files');
				if ($oFiles && $data->filesProvider->IsActive() && \method_exists($oFiles, 'file_put_contents')) {
					$sSaveFolder = $this->Config()->Get('plugin', 'save_folder', '') ?: 'Attachments';
					$oFiles->is_dir($sSaveFolder) || $oFiles->mkdir($sSaveFolder);
					$data->result = true;
					foreach ($data->items as $aItem) {
						$sSavedFileName = isset($aItem['FileName']) ? $aItem['FileName'] : 'file.dat';
						$sSavedFileHash = !empty($aItem['FileHash']) ? $aItem['FileHash'] : '';
						if (!empty($sSavedFileHash)) {
							$fFile = $data->filesProvider->GetFile($data->account, $sSavedFileHash, 'rb');
							if (\is_resource($fFile)) {
								$sSavedFileNameFull = \MailSo\Base\Utils::SmartFileExists($sSaveFolder.'/'.$sSavedFileName, function ($sPath) use ($oFiles) {
									return $oFiles->file_exists($sPath);
								});

								if (!$oFiles->file_put_contents($sSavedFileNameFull, $fFile)) {
									$data->result = false;
								}

								if (\is_resource($fFile)) {
									\fclose($fFile);
								}
							}
						}
					}
				}
			}

			foreach ($data->items as $aItem) {
				$sFileHash = (string) (isset($aItem['FileHash']) ? $aItem['FileHash'] : '');
				if (!empty($sFileHash)) {
					$data->filesProvider->Clear($data->account, $sFileHash);
				}
			}
		}
	}

	/**
	 * TODO: create pre-login auth hook
	 */
	public function ServiceOwnCloudAuth()
	{
/*
		$this->oHttp->ServerNoCache();

		if (!static::IsOwnCloud() ||
			!isset($_ENV['___snappymail_owncloud_email']) ||
			!isset($_ENV['___snappymail_owncloud_password']) ||
			empty($_ENV['___snappymail_owncloud_email'])
		)
		{
			$this->oActions->SetAuthLogoutToken();
			$this->oActions->Location('./');
			return '';
		}

		$bLogout = true;

		$sEmail = $_ENV['___snappymail_owncloud_email'];
		$sPassword = $_ENV['___snappymail_owncloud_password'];

		try
		{
			$oAccount = $this->oActions->LoginProcess($sEmail, $sPassword);
			$this->oActions->AuthToken($oAccount);

			$bLogout = !($oAccount instanceof \snappymail\Model\Account);
		}
		catch (\Exception $oException)
		{
			$this->oActions->Logger()->WriteException($oException);
		}

		if ($bLogout)
		{
			$this->oActions->SetAuthLogoutToken();
		}

		$this->oActions->Location('./');
		return '';
*/
	}

	/**
	 * @return void
	 */
	public function FilterAppData($bAdmin, &$aResult)
	{
		if (!$bAdmin && \is_array($aResult) && static::IsOwnCloud()) {
			$key = \array_search(\RainLoop\Enumerations\Capa::AUTOLOGOUT, $aResult['Capa']);
			if (false !== $key) {
				unset($aResult['Capa'][$key]);
			}
			if (static::IsOwnCloudLoggedIn() && \class_exists('OCP\Files')) {
				$aResult['System']['attachmentsActions'][] = 'owncloud';
			}
		}
	}

	/**
	 * @param string $sName
	 * @param mixed $mResult
	 */
	public function MainFabrica($sName, &$mResult)
	{
		if ('suggestions' === $sName && static::IsOwnCloud() && $this->Config()->Get('plugin', 'suggestions', true)) {
			include_once __DIR__.'/OwnCloudSuggestions.php';
			if (!\is_array($mResult)) {
				$mResult = array();
			}
			$mResult[] = new OwnCloudSuggestions();
		}
	}

	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('save_folder')->SetLabel('Save Folder')
				->SetDefaultValue('Attachments'),
			\RainLoop\Plugins\Property::NewInstance('suggestions')->SetLabel('Suggestions')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(true)
		);
	}
}
