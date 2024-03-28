<?php

class RecaptchaPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'reCaptcha',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '2.16',
		RELEASE  = '2024-03-12',
		REQUIRED = '2.35.3',
		CATEGORY = 'General',
		LICENSE  = 'MIT',
		DESCRIPTION = 'A CAPTCHA (v2) is a program that can generate and grade tests that humans can pass but current computer programs cannot. For example, humans can read distorted text as the one shown below, but current computer programs can\'t. More info at https://developers.google.com/recaptcha';

	/**
	 * @return void
	 */
	public function Init() : void
	{
		$this->UseLangs(true);

		$this->addJs('js/recaptcha.js');

		$this->addHook('json.before-login', 'BeforeLogin');
		$this->addHook('json.after-login', 'AfterLogin');
		$this->addHook('main.content-security-policy', 'ContentSecurityPolicy');
	}

	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('public_key')->SetLabel('Site key')
				->SetAllowedInJs(true)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('private_key')->SetLabel('Secret key')
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('theme')->SetLabel('Theme')
				->SetAllowedInJs(true)
				->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECTION)
				->SetDefaultValue(array('light', 'dark')),
			\RainLoop\Plugins\Property::NewInstance('error_limit')->SetLabel('Limit')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECTION)
				->SetDefaultValue(array('0', 1, 2, 3, 4, 5))
				->SetDescription('')
		);
	}

	/**
	 * @return string
	 */
	private function getCaptchaCacherKey()
	{
		return 'CaptchaNew/Login/'.\RainLoop\Utils::GetConnectionToken();
	}

	/**
	 * @return int
	 */
	private function getLimit()
	{
		$iConfigLimit = $this->Config()->Get('plugin', 'error_limit', 0);
		if (0 < $iConfigLimit) {
			$oCacher = $this->Manager()->Actions()->Cacher();
			$sLimit = $oCacher && $oCacher->IsInited() ? $oCacher->Get($this->getCaptchaCacherKey()) : '0';

			if (\is_numeric($sLimit)) {
				$iConfigLimit -= (int) $sLimit;
			}
		}

		return $iConfigLimit;
	}

	/**
	 * @return void
	 */
	public function FilterAppDataPluginSection(bool $bAdmin, bool $bAuth, array &$aConfig) : void
	{
		if (!$bAdmin && !$bAuth) {
			$aConfig['show_captcha_on_login'] = 1 > $this->getLimit();;
		}
	}

	public function BeforeLogin()
	{
		if (0 >= $this->getLimit()) {
			$bResult = false;

			$HTTP = \SnappyMail\HTTP\Request::factory();
			$oResponse = $HTTP->doRequest('POST', 'https://www.recaptcha.net/recaptcha/api/siteverify', array(
				'secret' => $this->Config()->Get('plugin', 'private_key', ''),
				'response' => $this->Manager()->Actions()->GetActionParam('RecaptchaResponse', '')
			));

			if ($oResponse) {
				$aResp = \json_decode($oResponse->body, true);
				if (\is_array($aResp) && isset($aResp['success']) && $aResp['success']) {
					$bResult = true;
				}
			}

			if (!$bResult) {
				$this->Manager()->Actions()->Logger()->Write('RecaptchaResponse:'.$sResult);
				throw new \RainLoop\Exceptions\ClientException(105);
			}
		}
	}

	/**
	 * @param string $sAction
	 * @param array $aResponse
	 */
	public function AfterLogin(array &$aResponse)
	{
		if (isset($aResponse['Result'])) {
			$oCacher = $this->Manager()->Actions()->Cacher();
			$iConfigLimit = (int) $this->Config()->Get('plugin', 'error_limit', 0);

			$sKey = $this->getCaptchaCacherKey();

			if (0 < $iConfigLimit && $oCacher && $oCacher->IsInited()) {
				if (false === $aResponse['Result']) {
					$iLimit = 0;
					$sLimut = $oCacher->Get($sKey);
					if (\is_numeric($sLimut)) {
						$iLimit = (int) $sLimut;
					}

					$oCacher->Set($sKey, ++$iLimit);

					if ($iConfigLimit <= $iLimit) {
						$aResponse['Captcha'] = true;
					}
				} else {
					$oCacher->Delete($sKey);
				}
			}
		}
	}

	public function ContentSecurityPolicy(\SnappyMail\HTTP\CSP $CSP)
	{
		$CSP->add('script-src', 'https://www.gstatic.com/recaptcha/');
		$CSP->add('script-src', 'https://www.recaptcha.net/recaptcha/');
		$CSP->add('frame-src', 'https://www.recaptcha.net/recaptcha/');
	}

}
