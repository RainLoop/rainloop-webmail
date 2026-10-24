<?php

namespace RainLoop\Providers;

class Filters extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Filters\FiltersInterface
	 */
	private $oDriver;

	public function __construct(\RainLoop\Providers\Filters\FiltersInterface $oDriver)
	{
		$this->oDriver = $oDriver;
	}

	private static function handleException(\Throwable $oException, int $defNotification) : void
	{
		if ($oException instanceof \MailSo\Net\Exceptions\SocketCanNotConnectToHostException) {
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ConnectionError, $oException);
		}

		if ($oException instanceof \MailSo\Sieve\Exceptions\NegativeResponseException) {
			throw new \RainLoop\Exceptions\ClientException(
				\RainLoop\Notifications::ClientViewError, $oException, \implode("\r\n", $oException->GetResponses())
			);
		}

		throw new \RainLoop\Exceptions\ClientException($defNotification, $oException);
	}

	public function Load(\RainLoop\Model\Account $oAccount) : array
	{
		try
		{
			return $this->IsActive() ? $this->oDriver->Load($oAccount) : array();
		}
		catch (\Throwable $oException)
		{
			static::handleException($oException, \RainLoop\Notifications::CantGetFilters);
		}
	}

	public function Save(\RainLoop\Model\Account $oAccount, string $sScriptName, string $sRaw) : bool
	{
		try
		{
			return $this->IsActive()
				? $this->oDriver->Save($oAccount, $sScriptName, $sRaw)
				: false;
		}
		catch (\Throwable $oException)
		{
			static::handleException($oException, \RainLoop\Notifications::CantSaveFilters);
		}
	}

	public function ActivateScript(\RainLoop\Model\Account $oAccount, string $sScriptName)
	{
		try
		{
			return $this->IsActive()
				? $this->oDriver->Activate($oAccount, $sScriptName)
				: false;
		}
		catch (\Throwable $oException)
		{
			static::handleException($oException, \RainLoop\Notifications::CantActivateFiltersScript);
		}
	}

	public function DeleteScript(\RainLoop\Model\Account $oAccount, string $sScriptName)
	{
		try
		{
			return $this->IsActive()
				? $this->oDriver->Delete($oAccount, $sScriptName)
				: false;
		}
		catch (\Throwable $oException)
		{
			static::handleException($oException, \RainLoop\Notifications::CantDeleteFiltersScript);
		}
	}

	public function IsActive() : bool
	{
		return $this->oDriver instanceof \RainLoop\Providers\Filters\FiltersInterface;
	}
}
