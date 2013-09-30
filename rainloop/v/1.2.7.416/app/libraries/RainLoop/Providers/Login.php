<?php

namespace RainLoop\Providers;

class Login extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Login\LoginInterface
	 */
	private $oDriver;

	/**
	 * @var \RainLoop\Providers\Domain
	 */
	private $oDomainProvider;

	/**
	 * @param \RainLoop\Providers\Login\LoginInterface $oDriver
	 * @param \RainLoop\Providers\Domain $oDomainProvider
	 *
	 * @return void
	 */
	public function __construct(\RainLoop\Providers\Login\LoginInterface $oDriver,
		\RainLoop\Providers\Domain $oDomainProvider)
	{
		$this->oDriver = $oDriver;
		$this->oDomainProvider = $oDomainProvider;
	}

	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 * @param bool $bPasswordIsXOAuth2 = false
	 * @param bool $sSignMeToken = ''
	 *
	 * @return \RainLoop\Account|null
	 */
	public function Provide($sEmail, $sLogin, $sPassword, $bPasswordIsXOAuth2 = false, $sSignMeToken = '')
	{
		$oResult = null;

		if ($this->oDriver->ProvideParameters($sEmail, $sLogin, $sPassword))
		{
			$oDomain = $this->oDomainProvider->Load(\MailSo\Base\Utils::GetDomainFromEmail($sEmail));
			if ($oDomain instanceof \RainLoop\Domain && !$oDomain->Disabled())
			{
				$oResult = \RainLoop\Account::NewInstance($sEmail, $sLogin, $sPassword, $oDomain, $bPasswordIsXOAuth2, $sSignMeToken);
			}
		}

		return $oResult;
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Login\LoginInterface;
	}
}