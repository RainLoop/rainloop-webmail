<?php

class NextcloudPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Nextcloud',
		VERSION = '2.21',
		RELEASE  = '2023-03-18',
		CATEGORY = 'Integrations',
		DESCRIPTION = 'Integrate with Nextcloud v20+',
		REQUIRED = '2.25.1';

	public function Init() : void
	{
		if (static::IsIntegrated()) {
			$this->UseLangs(true);

			$this->addHook('main.fabrica', 'MainFabrica');
			$this->addHook('filter.app-data', 'FilterAppData');

			$this->addCss('style.css');

			$this->addJs('js/webdav.js');

			$this->addJs('js/message.js');
			$this->addHook('json.attachments', 'DoAttachmentsActions');
			$this->addJsonHook('NextcloudSaveMsg', 'NextcloudSaveMsg');

			$this->addJs('js/composer.js');
			$this->addJsonHook('NextcloudAttachFile', 'NextcloudAttachFile');

			$this->addJs('js/messagelist.js');

			$this->addTemplate('templates/PopupsNextcloudFiles.html');
			$this->addTemplate('templates/PopupsNextcloudCalendars.html');

		} else {
			// \OC::$server->getConfig()->getAppValue('snappymail', 'snappymail-no-embed');
			$this->addHook('main.content-security-policy', 'ContentSecurityPolicy');
		}
	}

	public function ContentSecurityPolicy(\SnappyMail\HTTP\CSP $CSP)
	{
		if (\method_exists($CSP, 'add')) {
			$CSP->add('frame-ancestors', "'self'");
		}
	}

	public function Supported() : string
	{
		return static::IsIntegrated() ? '' : 'Nextcloud not found to use this plugin';
	}

	public static function IsIntegrated()
	{
		return \class_exists('OC') && isset(\OC::$server);
	}

	public static function IsLoggedIn()
	{
		return static::IsIntegrated() && \OC::$server->getUserSession()->isLoggedIn();
	}

	/*
	\OC::$server->getCalendarManager();
	\OC::$server->getLDAPProvider();
	*/

	public function NextcloudAttachFile() : array
	{
		$aResult = [
			'success' => false,
			'tempName' => ''
		];
		$sFile = $this->jsonParam('file', '');
		$oFiles = \OCP\Files::getStorage('files');
		if ($oFiles && $oFiles->is_file($sFile) && $fp = $oFiles->fopen($sFile, 'rb')) {
			$oActions = \RainLoop\Api::Actions();
			$oAccount = $oActions->getAccountFromToken();
			if ($oAccount) {
				$sSavedName = 'nextcloud-file-' . \sha1($sFile . \microtime());
				if (!$oActions->FilesProvider()->PutFile($oAccount, $sSavedName, $fp)) {
					$aResult['error'] = 'failed';
				} else {
					$aResult['tempName'] = $sSavedName;
					$aResult['success'] = true;
				}
			}
		}
		return $this->jsonResponse(__FUNCTION__, $aResult);
	}

	public function NextcloudSaveMsg() : array
	{
		$sSaveFolder = \ltrim($this->jsonParam('folder', ''), '/');
		$aValues = \RainLoop\Utils::DecodeKeyValuesQ($this->jsonParam('msgHash', ''));
		$aResult = [
			'folder' => '',
			'filename' => '',
			'success' => false
		];
		if ($sSaveFolder && !empty($aValues['folder']) && !empty($aValues['uid'])) {
			$oActions = \RainLoop\Api::Actions();
			$oMailClient = $oActions->MailClient();
			if (!$oMailClient->IsLoggined()) {
				$oAccount = $oActions->getAccountFromToken();
				$oAccount->ImapConnectAndLogin($oActions->Plugins(), $oMailClient->ImapClient(), $oActions->Config());
			}

			$sSaveFolder = $sSaveFolder ?: 'Emails';
			$oFiles = \OCP\Files::getStorage('files');
			if ($oFiles) {
				$oFiles->is_dir($sSaveFolder) || $oFiles->mkdir($sSaveFolder);
			}
			$aResult['folder'] = $sSaveFolder;

			$sFilename = $sSaveFolder . '/' . ($this->jsonParam('filename', '') ?: \date('YmdHis')) . '.eml';
			$aResult['folder'] = $sFilename;

			$oMailClient->MessageMimeStream(
				function ($rResource) use ($oFiles, $sFilename, $aResult) {
					if (\is_resource($rResource)) {
						$aResult['success'] = $oFiles->file_put_contents($sFilename, $rResource);
					}
				},
				(string) $aValues['folder'],
				(int) $aValues['uid'],
				isset($aValues['mimeIndex']) ? (string) $aValues['mimeIndex'] : ''
			);
		}

		return $this->jsonResponse(__FUNCTION__, $aResult);
	}

	public function DoAttachmentsActions(\SnappyMail\AttachmentsAction $data)
	{
		if (static::isLoggedIn() && 'nextcloud' === $data->action) {
			$oFiles = \OCP\Files::getStorage('files');
			if ($oFiles && \method_exists($oFiles, 'file_put_contents')) {
				$sSaveFolder = \ltrim($this->jsonParam('NcFolder', ''), '/');
				$sSaveFolder = $sSaveFolder ?: 'Attachments';
				$oFiles->is_dir($sSaveFolder) || $oFiles->mkdir($sSaveFolder);
				$data->result = true;
				foreach ($data->items as $aItem) {
					$sSavedFileName = isset($aItem['fileName']) ? $aItem['fileName'] : 'file.dat';
					$sSavedFileHash = !empty($aItem['fileHash']) ? $aItem['fileHash'] : '';
					if (!empty($sSavedFileHash)) {
						$fFile = $data->filesProvider->GetFile($data->account, $sSavedFileHash, 'rb');
						if (\is_resource($fFile)) {
							$sSavedFileNameFull = static::SmartFileExists($sSaveFolder.'/'.$sSavedFileName, $oFiles);
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

			foreach ($data->items as $aItem) {
				$sFileHash = (string) (isset($aItem['fileHash']) ? $aItem['fileHash'] : '');
				if (!empty($sFileHash)) {
					$data->filesProvider->Clear($data->account, $sFileHash);
				}
			}
		}
	}

	public function FilterAppData($bAdmin, &$aResult) : void
	{
		if (!$bAdmin && \is_array($aResult)) {
			$sUID = \OC::$server->getUserSession()->getUser()->getUID();
			$sWebDAV = \OC::$server->getURLGenerator()->linkTo('', 'remote.php') . '/dav';
//			$sWebDAV = \OCP\Util::linkToRemote('dav');
			$aResult['Nextcloud'] = [
				'UID' => $sUID,
				'WebDAV' => $sWebDAV,
				'CalDAV' => $this->Config()->Get('plugin', 'calendar', false)
//				'WebDAV_files' => $sWebDAV . '/files/' . $sUID
			];
			if (empty($aResult['Auth'])) {
				$config = \OC::$server->getConfig();
				$sEmail = '';
				// Only store the user's password in the current session if they have
				// enabled auto-login using Nextcloud username or email address.
				if ($config->getAppValue('snappymail', 'snappymail-autologin', false)) {
					$sEmail = $sUID;
				} else if ($config->getAppValue('snappymail', 'snappymail-autologin-with-email', false)) {
					$sEmail = $config->getUserValue($sUID, 'settings', 'email', '');
				}
				// If the user has set credentials for SnappyMail in their personal
				// settings, override everything before and use those instead.
				$sCustomEmail = $config->getUserValue($sUID, 'snappymail', 'snappymail-email', '');
				if ($sCustomEmail) {
					$sEmail = $sCustomEmail;
				}
				$aResult['DevEmail'] = $sEmail ?: '';
			} else if (!empty($aResult['ContactsSync'])) {
				$bSave = false;
				if (empty($aResult['ContactsSync']['Url'])) {
					$aResult['ContactsSync']['Url'] = "{$sWebDAV}/addressbooks/users/{$sUID}/contacts/";
					$bSave = true;
				}
				if (empty($aResult['ContactsSync']['User'])) {
					$aResult['ContactsSync']['User'] = $sUID;
					$bSave = true;
				}
				if (empty($aResult['ContactsSync']['Password'])) {
					$aResult['ContactsSync']['Password'] = '';
				}
				if ($bSave) {
					$oActions = \RainLoop\Api::Actions();
					$oActions->setContactsSyncData(
						$oActions->getAccountFromToken(),
						array(
							'Mode' => $aResult['ContactsSync']['Mode'],
							'User' => $aResult['ContactsSync']['User'],
							'Password' => $aResult['ContactsSync']['Password'],
							'Url' => $aResult['ContactsSync']['Url']
						)
					);
				}
			}
		}
	}

	/**
	 * @param mixed $mResult
	 */
	public function MainFabrica(string $sName, &$mResult)
	{
		if (static::isLoggedIn()) {
			if ('suggestions' === $sName && $this->Config()->Get('plugin', 'suggestions', true)) {
				if (!\is_array($mResult)) {
					$mResult = array();
				}
				include_once __DIR__ . '/NextcloudContactsSuggestions.php';
				$mResult[] = new NextcloudContactsSuggestions(
					$this->Config()->Get('plugin', 'ignoreSystemAddressbook', true)
				);
			}
		}
	}

	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('suggestions')->SetLabel('Suggestions')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(true),
			\RainLoop\Plugins\Property::NewInstance('ignoreSystemAddressbook')->SetLabel('Ignore system addressbook')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(true),
			\RainLoop\Plugins\Property::NewInstance('calendar')->SetLabel('Enable "Put ICS in calendar"')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(false)
		);
	}

	private static function SmartFileExists(string $sFilePath, $oFiles) : string
	{
		$sFilePath = \str_replace('\\', '/', \trim($sFilePath));

		if (!$oFiles->file_exists($sFilePath)) {
			return $sFilePath;
		}

		$aFileInfo = \pathinfo($sFilePath);

		$iIndex = 0;

		while (true) {
			++$iIndex;
			$sFilePathNew = $aFileInfo['dirname'].'/'.
				\preg_replace('/\(\d{1,2}\)$/', '', $aFileInfo['filename']).
				' ('.$iIndex.')'.
				(empty($aFileInfo['extension']) ? '' : '.'.$aFileInfo['extension'])
			;
			if (!$oFiles->file_exists($sFilePathNew)) {
				return $sFilePathNew;
			}
			if (10 < $iIndex) {
				break;
			}
		}
		return $sFilePath;
	}
}
