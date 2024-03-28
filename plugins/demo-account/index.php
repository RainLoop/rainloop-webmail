<?php

class DemoAccountPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Demo Account Extension',
		CATEGORY = 'Login',
		REQUIRED = '2.23',
		DESCRIPTION = 'Extension to enable a demo account';

	/**
	 * @return void
	 */
	public function Init() : void
	{
		$this->addHook('filter.app-data', 'FilterAppData');
		$this->addHook('filter.action-params', 'FilterActionParams');
		$this->addHook('json.before-accountsetup', 'BeforeAccountSetup');
		$this->addHook('json.after-accountsandidentities', 'AfterAccountsAndIdentities');
		$this->addHook('filter.send-message', 'FilterSendMessage');
		$this->addHook('main.fabrica', 'MainFabrica');
	}

	/**
	 * @return array
	 */
	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('email')->SetLabel('Demo Email')
				->SetDefaultValue('demo@domain.com'),
			\RainLoop\Plugins\Property::NewInstance('password')->SetLabel('Demo Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD),
			\RainLoop\Plugins\Property::NewInstance('recipient_delimiter')->SetLabel('recipient_delimiter')
				->SetDefaultValue(''),
		);
	}

	/**
	 * @return void
	 */
	public function FilterAppData($bAdmin, &$aResult)
	{
		if (!$bAdmin && \is_array($aResult) && empty($aResult['Auth'])) {
			$aResult['DevEmail'] = $this->Config()->Get('plugin', 'email', $aResult['DevEmail']);
			$aResult['DevPassword'] = '********';
		}
	}

	/**
	 * @return void
	 */
	public function FilterActionParams($sMethodName, &$aActionParams)
	{
		if ('DoLogin' === $sMethodName
		 && isset($aActionParams['Email'])
		 && isset($aActionParams['Password'])
		 && $this->Config()->Get('plugin', 'email') === $aActionParams['Email']) {
			$aActionParams['Password'] = $this->Config()->Get('plugin', 'password');
		}
		else if ('DoFolderCreate' === $sMethodName || 'DoFolderRename' === $sMethodName) {
			// Block spam https://github.com/the-djmaze/snappymail/issues/371
			$latin = transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $aActionParams['folder']);
			if (false !== \strpos($latin, 'nigger')) {
				\error_log("blocked {$sMethodName} {$aActionParams['folder']}");
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DemoAccountError);
			}
		}
		else if ('DoFolderClear' === $sMethodName || 'DoMessageDelete' === $sMethodName) {
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DemoAccountError);
		}
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return bool
	 */
	private function isDemoAccount()
	{
		$oAccount = $this->Manager()->Actions()->GetAccount();
		return ($oAccount && $oAccount->Email() === $this->Config()->Get('plugin', 'email'));
	}

	public function BeforeAccountSetup()
	{
		throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DemoAccountError);
	}

	public function AfterAccountsAndIdentities(&$aResponse)
	{
		foreach ($aResponse['Result']['Identities'] as &$idenity) {
			$idenity['smimeKey'] = '-----BEGIN ENCRYPTED PRIVATE KEY-----
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
/ZYVVu8GG0wUcrvQizogAg==
-----END ENCRYPTED PRIVATE KEY-----
';
			$idenity['smimeCertificate'] = '-----BEGIN CERTIFICATE-----
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
r7HREQ/4hof+B0bTZCma/l0n
-----END CERTIFICATE-----
';
		}
	}

	public function FilterSendMessage($oMessage)
	{
		if ($oMessage && $this->isDemoAccount()) {
			$recipient_delimiter = $this->Config()->Get('plugin', 'recipient_delimiter');
			$regex = '/^' . \preg_quote($this->Config()->Get('plugin', 'email')) . '$/D';
			if ($recipient_delimiter) {
				$regex = \str_replace('@', '('.\preg_quote($recipient_delimiter).'.+)?@', $regex);
			}
			foreach ($oMessage->GetTo() as $oEmail) {
				if (!\preg_match($regex, $oEmail->GetEmail())) {
					throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DemoSendMessageError);
				}
			}
			foreach ($oMessage->GetCc() ?: [] as $oEmail) {
				if (!\preg_match($regex, $oEmail->GetEmail())) {
					throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DemoSendMessageError);
				}
			}
			foreach ($oMessage->GetBcc() ?: [] as $oEmail) {
				if (!\preg_match($regex, $oEmail->GetEmail())) {
					throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DemoSendMessageError);
				}
			}
//			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DemoSendMessageError);
		}
	}

	/**
	 * @param string $sName
	 * @param mixed $oDriver
	 */
	public function MainFabrica($sName, &$oDriver)
	{
		if ('storage' === $sName || 'storage-local' === $sName) {
			require_once __DIR__ . '/storage.php';
			$oDriver = new \DemoStorage(APP_PRIVATE_DATA.'storage', $sName === 'storage-local');
			$oDriver->setDemoEmail($this->Config()->Get('plugin', 'email'));
		}
	}
}
