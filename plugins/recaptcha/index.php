<?php

class RecaptchaPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	/**
	 * @return void
	 */
	public function Init()
	{
		$this->UseLangs(true);
		
		$this->addJs('js/recaptcha.js');
		
		$this->addHook('ajax.action-pre-call', 'AjaxActionPreCall');
		$this->addHook('filter.ajax-response', 'FilterAjaxResponse');

		$this->addTemplate('templates/PluginLoginReCaptchaGroup.html');
		$this->addTemplateHook('Login', 'BottomControlGroup', 'PluginLoginReCaptchaGroup');
	}
	
	/**
	 * @return array
	 */
	public function configMapping()
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('public_key')->SetLabel('Public Key')
				->SetAllowedInJs(true)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('private_key')->SetLabel('Private Key')
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('error_limit')->SetLabel('Limit')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECTION)
				->SetDefaultValue(array(0, 1, 2, 3, 4, 5))
				->SetDescription('')
		);
	}

	/**
	 * @return string
	 */
	private function getCaptchaCacherKey()
	{
		return 'Captcha/Login/'.\RainLoop\Utils::GetConnectionToken();
	}

	/**
	 * @return int
	 */
	private function getLimit()
	{
		$iConfigLimit = $this->Config()->Get('plugin', 'error_limit', 0);
		if (0 < $iConfigLimit)
		{
			$oCacher = $this->Manager()->Actions()->Cacher();
			$sLimit = $oCacher && $oCacher->IsInited() ? $oCacher->Get($this->getCaptchaCacherKey()) : '0';
			
			if (0 < strlen($sLimit) && is_numeric($sLimit))
			{
				$iConfigLimit -= (int) $sLimit;
			}
		}

		return $iConfigLimit;
	}

	/**
	 * @return void
	 */
	public function FilterAppDataPluginSection($bAdmin, $bAuth, &$aData)
	{
		if (!$bAdmin && !$bAuth && is_array($aData))
		{
			$aData['show_captcha_on_login'] = 1 > $this->getLimit();
		}
	}

	/**
	 * @param string $sAction
	 */
	public function AjaxActionPreCall($sAction)
	{
		if ('Login' === $sAction && 0 >= $this->getLimit())
		{
			require_once __DIR__.'/recaptchalib.php';

			$oResp = recaptcha_check_answer(
				$this->Config()->Get('plugin', 'private_key', ''),
				isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '',
				$this->Manager()->Actions()->GetActionParam('RecaptchaChallenge', ''),
				$this->Manager()->Actions()->GetActionParam('RecaptchaResponse', '')
			);

			if (!$oResp || !isset($oResp->is_valid) || !$oResp->is_valid)
			{
				$this->Manager()->Actions()->Logger()->WriteDump($oResp);
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CaptchaError);
			}
		}
	}

	/**
	 * @param string $sAction
	 * @param array $aResponseItem
	 */
	public function FilterAjaxResponse($sAction, &$aResponseItem)
	{
		if ('Login' === $sAction && $aResponseItem && isset($aResponseItem['Result']))
		{
			$oCacher = $this->Manager()->Actions()->Cacher();
			$iConfigLimit = (int) $this->Config()->Get('plugin', 'error_limit', 0);
			$sKey = $this->getCaptchaCacherKey();

			if (0 < $iConfigLimit && $oCacher && $oCacher->IsInited())
			{
				if (false === $aResponseItem['Result'])
				{
					$iLimit = 0;
					$sLimut = $oCacher->Get($sKey);
					if (0 < strlen($sLimut) && is_numeric($sLimut))
					{
						$iLimit = (int) $sLimut;
					}

					$oCacher->Set($sKey, ++$iLimit);

					if ($iConfigLimit <= $iLimit)
					{
						$aResponseItem['Captcha'] = true;
					}
				}
				else
				{
					$oCacher->Delete($sKey);
				}
			}
		}
	}
}
