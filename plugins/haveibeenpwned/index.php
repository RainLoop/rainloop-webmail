<?php
/**
 * https://haveibeenpwned.com/API/v3
 */

use SnappyMail\Hibp;
use SnappyMail\SensitiveString;

class HaveibeenpwnedPlugin extends \RainLoop\Plugins\AbstractPlugin
{
//	use \MailSo\Log\Inherit;

	const
		NAME     = 'Have i been pwned',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '0.1',
		RELEASE  = '2024-04-22',
		REQUIRED = '2.36.1',
		CATEGORY = 'General',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Check if your passphrase or email address is in a data breach';

	public function Init() : void
	{
//		$this->UseLangs(true);
		$this->addJs('hibp.js');
		$this->addJsonHook('HibpCheck');
	}

	public function HibpCheck()
	{
//		$oAccount = $this->Manager()->Actions()->GetAccount();
		$oAccount = $this->Manager()->Actions()->getAccountFromToken();
//		$oAccount = \RainLoop\Api::Actions()->getAccountFromToken();

		$api_key = \trim($this->Config()->Get('plugin', 'hibp-api-key', ''));
		$breaches = $api_key ? Hibp::account($api_key, $oAccount->Email()) : null;

		$pwned = Hibp::password(new SensitiveString($oAccount->ImapPass()));

		return $this->jsonResponse(__FUNCTION__, array(
			'pwned' => $pwned,
			'breaches' => $breaches
		));
	}

	public function configMapping() : array
	{
		return [
			\RainLoop\Plugins\Property::NewInstance("hibp-api-key")
				->SetLabel('API key')
				->SetDescription('https://haveibeenpwned.com/API/Key')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING)
		];
	}
}
