<?php

namespace RainLoop\Common;

abstract class PdoAbstract
{
	/**
	 * @var \MailSo\Log\Logger
	 */
	protected $oLogger;
	
	/**
	 * @return bool
	 */
	public function IsSupported()
	{
		return !!\class_exists('PDO');
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 */
	public function SetLogger($oLogger)
	{
		$this->oLogger = $oLogger instanceof \MailSo\Log\Logger ? $oLogger : null;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 * @return array
	 */
	protected function getPdoAccessData(\RainLoop\Account $oAccount)
	{
		$aResult = array('mysql', '', '', '');
		return $aResult;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @staticvar array $aPdoCache
	 * 
	 * @return \PDO
	 * 
	 * @throws \Exception
	 */
	protected function getPDO(\RainLoop\Account $oAccount)
	{
		static $aPdoCache = array();

		$sEmail = $oAccount->ParentEmailHelper();
		if (isset($aPdoCache[$sEmail]))
		{
			return $aPdoCache[$sEmail];
		}

		if (!\class_exists('PDO'))
		{
			throw new \Exception('Class PDO does not exist');
		}

		// TODO
		$sType = $sDsn = $sDbLogin = $sDbPassword = '';
		list($sType, $sDsn, $sDbLogin, $sDbPassword) = $this->getPdoAccessData($oAccount);

		$oPdo = false;
		try
		{
			$oPdo = new \PDO($sDsn, $sDbLogin, $sDbPassword);
			if ($oPdo)
			{
				$oPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
				if ('mysql' === $sType)
				{
					
				}
			}
		}
		catch (\Exception $oException)
		{
			throw $oException;
		}

		if ($oPdo)
		{
			$aPdoCache[$sEmail] = $oPdo;
		}
		else
		{
			throw new \Exception('PDO = false');
		}

		return $oPdo;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sSql
	 * @param array $aParams
	 *
	 * @return \PDOStatement|null
	 */
	protected function prepareAndExecute(\RainLoop\Account $oAccount, $sSql, $aParams = array())
	{
		if ($this->oLogger)
		{
			$this->oLogger->Write($sSql, \MailSo\Log\Enumerations\Type::INFO, 'SQL');
		}

		$mResult = null;
		$oStmt = $this->getPDO($oAccount)->prepare($sSql);
		if ($oStmt)
		{
			foreach ($aParams as $sName => $aValue)
			{
				$oStmt->bindValue($sName, $aValue[0], $aValue[1]);
			}

			$mResult = $oStmt->execute() ? $oStmt : null;
		}

		return $mResult;
	}
	
	/**
	 * @param \RainLoop\Account $oAccount
	 * @param bool $bSkipInsert = false
	 *
	 * @return int
	 */
	protected function getUserId(\RainLoop\Account $oAccount, $bSkipInsert = false)
	{
		$sEmail = \strtolower($oAccount->ParentEmailHelper());
		
		$oStmt = $this->prepareAndExecute($oAccount,
			'SELECT `id_user` FROM `rainloop_users` WHERE `email` = :email LIMIT 1',
			array(
				':email' => array($sEmail, \PDO::PARAM_STR)
			));

		$mRow = $oStmt->fetch(\PDO::FETCH_ASSOC);
		if ($mRow && isset($mRow['id_user']) && \is_numeric($mRow['id_user']))
		{
			return (int) $mRow['id_user'];
		}

		if (!$bSkipInsert)
		{
			$oStmt->closeCursor();

			$oStmt = $this->prepareAndExecute($oAccount,
				'INSERT INTO rainloop_users (`email`) VALUES (:email)',
				array(
					':email' => array($sEmail, \PDO::PARAM_STR)
				));

			return $this->getUserId($oAccount, true);
		}

		throw new \Exception('id_user = 0');
	}

	/**
	 * @param string $sSearch
	 * 
	 * @return string
	 */
	protected function convertSearchValue($sSearch)
	{
		return '%'.$sSearch.'%';
	}

	/**
	 * @param string $sValue
	 *
	 * @return string
	 */
	protected function quoteValue($sValue)
	{
		return '\''.$sValue.'\'';
	}
}