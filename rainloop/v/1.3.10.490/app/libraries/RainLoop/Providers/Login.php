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
	 * @param bool $sSignMeToken = ''
	 *
	 * @return \RainLoop\Account|null
	 */
	public function Provide($sEmail, $sLogin, $sPassword, $sSignMeToken = '')
	{
		$oResult = null;

		if ($this->oDriver->ProvideParameters($sEmail, $sLogin, $sPassword))
		{
			$oDomain = $this->oDomainProvider->Load(\MailSo\Base\Utils::GetDomainFromEmail($sEmail));
			if ($oDomain instanceof \RainLoop\Domain && !$oDomain->Disabled() && $oDomain->ValidateWhiteList($sEmail, $sLogin))
			{
				$oResult = \RainLoop\Account::NewInstance($sEmail, $sLogin, $sPassword, $oDomain, $sSignMeToken);
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