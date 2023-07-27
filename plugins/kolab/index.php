<?php

class KolabPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Kolab',
		VERSION = '2.6',
		RELEASE  = '2023-02-10',
		CATEGORY = 'Contacts',
		DESCRIPTION = 'Use an Address Book of Kolab.',
		REQUIRED = '2.26.0';

	public function Init() : void
	{
//		\RainLoop\Api::Config()->Set('contacts', 'enable', true);
		if (\RainLoop\Api::Config()->Get('contacts', 'enable', false)) {
			$this->UseLangs(true);

			$this->addHook('filter.app-data', 'FilterAppData');
			$this->addHook('main.fabrica', 'MainFabrica');

			$this->addJs('js/settings.js');
			$this->addTemplate('templates/KolabSettings.html');
			$this->addJsonHook('KolabFolder', 'DoKolabFolder');
		}
	}

	public function Supported() : string
	{
		return '';
	}

	private function Account() : \RainLoop\Model\Account
	{
		return \RainLoop\Api::Actions()->getAccountFromToken();
	}

	private function SettingsProvider() : \RainLoop\Providers\Settings
	{
		return \RainLoop\Api::Actions()->SettingsProvider(true);
	}

	private function Settings() : \RainLoop\Settings
	{
		return $this->SettingsProvider()->Load($this->Account());
	}

	public function DoKolabFolder() : array
	{
//		\error_log(\print_r($this->Manager()->Actions()->GetActionParams(), 1));
		$sValue = $this->jsonParam('contact');
		$oSettings = $this->Settings();
		if (\is_string($sValue)) {
			$oSettings->SetConf('KolabContactFolder', $sValue);
			$this->SettingsProvider()->Save($this->Account(), $oSettings);
		}
		return $this->jsonResponse(__FUNCTION__, true);
	}

	public function FilterAppData($bAdmin, &$aResult) : void
	{
//		if ImapClient->hasCapability('METADATA')
		if (!$bAdmin && \is_array($aResult) && !empty($aResult['Auth'])) {
			$aResult['Capa']['Kolab'] = true;
			$aResult['KolabContactFolder'] = (string) $this->Settings()->GetConf('KolabContactFolder', '');
		}
	}

	/**
	 * @param mixed $mResult
	 */
	public function MainFabrica(string $sName, &$mResult)
	{
/*
		if ('suggestions' === $sName) {
			if (!\is_array($mResult)) {
				$mResult = array();
			}
//			$sFolder = \trim($this->Config()->Get('plugin', 'mailbox', ''));
//			if ($sFolder) {
				require_once __DIR__ . '/KolabContactsSuggestions.php';
				$mResult[] = new KolabContactsSuggestions();
//			}
		}
*/
		if ('address-book' === $sName) {
			$sFolderName = $this->Settings()->GetConf('KolabContactFolder', '');
			if ($sFolderName) {
				require_once __DIR__ . '/KolabAddressBook.php';
				$mResult = new KolabAddressBook($sFolderName);
			}
		}
	}
}
