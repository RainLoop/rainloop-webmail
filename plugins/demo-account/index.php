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
			$latin = transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $aActionParams['Folder']);
			if (false !== \strpos($latin, 'nigger')) {
				\error_log("blocked {$sMethodName} {$aActionParams['Folder']}");
				exit;
			}
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
