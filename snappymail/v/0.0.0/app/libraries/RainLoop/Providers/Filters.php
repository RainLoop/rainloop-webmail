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

	public function Load(\RainLoop\Model\Account $oAccount, bool $bAllowRaw = false) : array
	{
		try
		{
			return $this->IsActive() ? $this->oDriver->Load($oAccount, $bAllowRaw) : array();
		}
		catch (\MailSo\Net\Exceptions\SocketCanNotConnectToHostException $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ConnectionError, $oException);
		}
		catch (\Throwable $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantGetFilters, $oException);
		}

		return false;
	}

	public function Save(\RainLoop\Model\Account $oAccount, array $aFilters, string $sRaw = '', bool $bRawIsActive = false) : bool
	{
		try
		{
			return $this->IsActive() ? $this->oDriver->Save(
				$oAccount, $aFilters, $sRaw, $bRawIsActive) : false;
		}
		catch (\MailSo\Net\Exceptions\SocketCanNotConnectToHostException $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ConnectionError, $oException);
		}
		catch (\MailSo\Sieve\Exceptions\NegativeResponseException $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(
				\RainLoop\Notifications::ClientViewError, $oException,
					\implode("\r\n", $oException->GetResponses()));
		}
		catch (\Throwable $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantSaveFilters, $oException);
		}

		return false;
	}

	public function IsActive() : bool
	{
		return $this->oDriver instanceof \RainLoop\Providers\Filters\FiltersInterface;
	}
}
