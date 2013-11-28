<?php

namespace RainLoop\Providers\PersonalAddressBook;

class MySqlPersonalAddressBook implements \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface
{
	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger;

	/**
	 * @param \MailSo\Log\Logger $oLogger = null
	 */
	public function __construct($oLogger = null)
	{
		$this->oLogger = $oLogger instanceof \MailSo\Log\Logger ? $oLogger : null;
	}

	/**
	 * @return bool
	 */
	public function IsSupported()
	{
		$aDrivers = \class_exists('PDO') ? \PDO::getAvailableDrivers() : array();
		return \is_array($aDrivers) ? \in_array('mysql', $aDrivers) : false;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @staticvar array $aPdoCache
	 * @return \PDO
	 */
	private function getPDO($oAccount)
	{
		static $aPdoCache = array();

		$sEmail = $oAccount->ParentEmailHelper();
		if (isset($aPdoCache[$sEmail]))
		{
			return $aPdoCache[$sEmail];
		}

		if (!\class_exists('PDO'))
		{
			throw new \Exception('class_exists=PDO');
		}

		$sDsn = '';
		$sDbLogin = '';
		$sDbPassword = '';

		$oPdo = false;
		try
		{
			$oPdo = new \PDO($sDsn, $sDbLogin, $sDbPassword);
			if ($oPdo)
			{
				$oPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
			}
		}
		catch (\Exception $oException)
		{
//			throw $oException;
			$oPdo = false;
		}

		if ($oPdo)
		{
			$aPdoCache[$oAccount->ParentEmailHelper()] = $oPdo;
		}

		return $oPdo;
	}
}