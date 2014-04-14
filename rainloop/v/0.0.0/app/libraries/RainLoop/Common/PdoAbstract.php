<?php

namespace RainLoop\Common;

abstract class PdoAbstract
{
	/**
	 * @var \PDO
	 */
	protected $oPDO = null;

	/**
	 * @var bool
	 */
	protected $bExplain = false;

	/**
	 * @var \MailSo\Log\Logger
	 */
	protected $oLogger;

	/**
	 * @var string
	 */
	protected $sDbType;
	
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
	 * @return array
	 */
	protected function getPdoAccessData()
	{
		return array('', '', '', '');
	}

	/**
	 * @return bool
	 */
	protected function isTransactionSupported()
	{
		return \in_array($this->sDbType, array('mysql'));
	}

	/**
	 * @return \PDO
	 *
	 * @throws \Exception
	 */
	protected function getPDO()
	{
		if ($this->oPDO)
		{
			return $this->oPDO;
		}
		
		if (!\class_exists('PDO'))
		{
			throw new \Exception('Class PDO does not exist');
		}

		$sType = $sDsn = $sDbLogin = $sDbPassword = '';
		list($sType, $sDsn, $sDbLogin, $sDbPassword) = $this->getPdoAccessData();
		if (!\in_array($sType, array('mysql', 'sqlite', 'pgsql')))
		{
			throw new \Exception('Unknown PDO SQL connection type');
		}

		$this->sDbType = $sType;

		$oPdo = false;
		try
		{
			$oPdo = @new \PDO($sDsn, $sDbLogin, $sDbPassword);
			if ($oPdo)
			{
				$oPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
				if ('mysql' === $sType && 'mysql' === $oPdo->getAttribute(\PDO::ATTR_DRIVER_NAME))
				{
					$oPdo->exec('SET NAMES utf8 COLLATE utf8_general_ci');
//					$oPdo->exec('SET NAMES utf8');
				}
			}
		}
		catch (\Exception $oException)
		{
			throw $oException;
		}
		
		if ($oPdo)
		{
			$this->oPDO = $oPdo;
		}
		else
		{
			throw new \Exception('PDO = false');
		}

		return $oPdo;
	}

	/**
	 * @param string $sName = null
	 *
	 * @return string
	 */
	protected function lastInsertId($sName = null)
	{
		return $this->getPDO()->lastInsertId($sName);
	}

	/**
	 * @return bool
	 */
	protected function beginTransaction()
	{
		return $this->getPDO()->beginTransaction();
	}

	/**
	 * @return bool
	 */
	protected function commit()
	{
		return $this->getPDO()->commit();
	}

	/**
	 * @return bool
	 */
	protected function rollBack()
	{
		return $this->getPDO()->rollBack();
	}

	/**
	 * @param string $sSql
	 * @param array $aParams
	 * @param bool $bMultiplyParams = false
	 *
	 * @return \PDOStatement|null
	 */
	protected function prepareAndExecute($sSql, $aParams = array(), $bMultiplyParams = false)
	{
		if ($this->bExplain && !$bMultiplyParams)
		{
			$this->prepareAndExplain($sSql, $aParams);
		}

		$mResult = null;

		$this->writeLog($sSql);
		$oStmt = $this->getPDO()->prepare($sSql);
		if ($oStmt)
		{
			$aRootParams = $bMultiplyParams ? $aParams : array($aParams);
			foreach ($aRootParams as $aSubParams)
			{
				foreach ($aSubParams as $sName => $aValue)
				{
					$oStmt->bindValue($sName, $aValue[0], $aValue[1]);
				}

				$mResult = $oStmt->execute() && !$bMultiplyParams ? $oStmt : null;
			}
		}

		return $mResult;
	}

	/**
	 * @param string $sSql
	 * @param array $aParams
	 */
	protected function prepareAndExplain($sSql, $aParams = array())
	{
		$mResult = null;
		if (0 === strpos($sSql, 'SELECT '))
		{
			$sSql = 'EXPLAIN '.$sSql;
			$this->writeLog($sSql);
			$oStmt = $this->getPDO()->prepare($sSql);
			if ($oStmt)
			{
				foreach ($aParams as $sName => $aValue)
				{
					$oStmt->bindValue($sName, $aValue[0], $aValue[1]);
				}

				$mResult = $oStmt->execute() ? $oStmt : null;
			}
		}

		if ($mResult)
		{
			$aFetch = $mResult->fetchAll(\PDO::FETCH_ASSOC);
			$this->oLogger->WriteDump($aFetch);

			unset($aFetch);
			$mResult->closeCursor();
		}
	}
	
	/**
	 * @param string $sSql
	 */
	protected function writeLog($sSql)
	{
		if ($this->oLogger)
		{
			$this->oLogger->WriteMixed($sSql, \MailSo\Log\Enumerations\Type::INFO, 'SQL');
		}
	}

	/**
	 * @param string $sEmail
	 * @param bool $bSkipInsert = false
	 * @param bool $bCache = true
	 *
	 * @return int
	 */
	protected function getUserId($sEmail, $bSkipInsert = false, $bCache = true)
	{
		static $aCache = array();
		if ($bCache && isset($aCache[$sEmail]))
		{
			return $aCache[$sEmail];
		}

		$sEmail = \strtolower(\trim($sEmail));
		if (empty($sEmail))
		{
			throw new \InvalidArgumentException('Empty Email argument');
		}

		$oStmt = $this->prepareAndExecute('SELECT id_user FROM rainloop_users WHERE rl_email = :rl_email',
			array(
				':rl_email' => array($sEmail, \PDO::PARAM_STR)
			)
		);

		$mRow = $oStmt->fetch(\PDO::FETCH_ASSOC);
		if ($mRow && isset($mRow['id_user']) && \is_numeric($mRow['id_user']))
		{
			$iResult = (int) $mRow['id_user'];
			if (0 >= $iResult)
			{
				throw new \Exception('id_user <= 0');
			}

			if ($bCache)
			{
				$aCache[$sEmail] = $iResult;
			}

			return $iResult;
		}

		if (!$bSkipInsert)
		{
			$oStmt->closeCursor();

			$oStmt = $this->prepareAndExecute('INSERT INTO rainloop_users (rl_email) VALUES (:rl_email)',
				array(':rl_email' => array($sEmail, \PDO::PARAM_STR))
			);

			return $this->getUserId($sEmail, true);
		}

		throw new \Exception('id_user = 0');
	}

	/**
	 * @param string $sValue
	 *
	 * @return string
	 */
	public function quoteValue($sValue)
	{
		$oPdo = $this->getPDO();
		return $oPdo ? $oPdo->quote((string) $sValue, \PDO::PARAM_STR) : '\'\'';
	}

	/**
	 * @param string $sName
	 * @param bool $bReturnIntValue = true
	 *
	 * @return int|string|bool
	 */
	protected function getSystemValue($sName, $bReturnIntValue = true)
	{
		$oPdo = $this->getPDO();
		if ($oPdo)
		{
			if ($bReturnIntValue)
			{
				$sQuery = 'SELECT value_int FROM rainloop_system WHERE sys_name = ?';
			}
			else
			{
				$sQuery = 'SELECT value_str FROM rainloop_system WHERE sys_name = ?';
			}

			$this->writeLog($sQuery);
			
			$oStmt = $oPdo->prepare($sQuery);
			if ($oStmt->execute(array($sName)))
			{
				$mRow = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
				$sKey = $bReturnIntValue ? 'value_int' : 'value_str';
				if ($mRow && isset($mRow[0][$sKey]))
				{
					return $bReturnIntValue ? (int) $mRow[0][$sKey] : (string) $mRow[0][$sKey];
				}

				return $bReturnIntValue ? 0 : '';
			}
		}

		return false;
	}

	/**
	 * @param string $sName
	 *
	 * @return int|string|bool
	 */
	protected function getVersion($sName)
	{
		return $this->getSystemValue($sName.'_version', true);
	}

	/**
	 * @param string $sName
	 * @param int $iVersion
	 * 
	 * @return bool
	 */
	protected function setVersion($sName, $iVersion)
	{
		$bResult = false;
		$oPdo = $this->getPDO();
		if ($oPdo)
		{
			if ($this->isTransactionSupported())
			{
				$oPdo->beginTransaction();
			}

			$sQuery = 'DELETE FROM rainloop_system WHERE sys_name = ? AND value_int <= ?;';
			$this->writeLog($sQuery);
			
			$oStmt = $oPdo->prepare($sQuery);
			$bResult = !!$oStmt->execute(array($sName.'_version', $iVersion));
			if ($bResult)
			{
				$sQuery = 'INSERT INTO rainloop_system (sys_name, value_int) VALUES (?, ?);';
				$this->writeLog($sQuery);

				$oStmt = $oPdo->prepare($sQuery);
				if ($oStmt)
				{
					$bResult = !!$oStmt->execute(array($sName.'_version', $iVersion));
				}
			}

			if ($this->isTransactionSupported())
			{
				if ($bResult)
				{
					$oPdo->commit();
				}
				else
				{
					$oPdo->rollBack();
				}
			}
		}

		return $bResult;
	}

	/**
	 * @param bool $bWatchVersion = true
	 *
	 * @throws \Exception
	 */
	protected function initSystemTables()
	{
		$bResult = true;

		$oPdo = $this->getPDO();
		if ($oPdo)
		{
			$aQ = array();
			switch ($this->sDbType)
			{
				case 'mysql':
					$aQ[] = 'CREATE TABLE IF NOT EXISTS rainloop_system (
sys_name varchar(50) NOT NULL,
value_int int UNSIGNED NOT NULL DEFAULT 0,
value_str varchar(128) NOT NULL DEFAULT \'\',
INDEX sys_name_rainloop_system_index (sys_name)
) /*!40000 ENGINE=INNODB *//*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;';
					$aQ[] = 'CREATE TABLE IF NOT EXISTS rainloop_users (
id_user int UNSIGNED NOT NULL AUTO_INCREMENT,
rl_email varchar(128) NOT NULL DEFAULT \'\',
PRIMARY KEY(id_user),
INDEX rl_email_rainloop_users_index (rl_email)
) /*!40000 ENGINE=INNODB */;';
					break;

				case 'pgsql':
					$aQ[] = 'CREATE TABLE rainloop_system (
sys_name varchar(50) NOT NULL,
value_int integer NOT NULL DEFAULT 0,
value_str varchar(128) NOT NULL DEFAULT \'\'
);';
					$aQ[] = 'CREATE INDEX sys_name_rainloop_system_index ON rainloop_system (sys_name);';
					$aQ[] = 'CREATE SEQUENCE id_user START WITH 1 INCREMENT BY 1 NO MAXVALUE NO MINVALUE CACHE 1;';
					$aQ[] = 'CREATE TABLE rainloop_users (
id_user integer DEFAULT nextval(\'id_user\'::text) PRIMARY KEY,
rl_email varchar(128) NOT NULL DEFAULT \'\'
);';
					$aQ[] = 'CREATE INDEX rl_email_rainloop_users_index ON rainloop_users (rl_email);';
					break;

				case 'sqlite':
					$aQ[] = 'CREATE TABLE rainloop_system (
sys_name text NOT NULL,
value_int integer NOT NULL DEFAULT 0,
value_str text NOT NULL DEFAULT \'\'
);';
					$aQ[] = 'CREATE INDEX sys_name_rainloop_system_index ON rainloop_system (sys_name);';
					$aQ[] = 'CREATE TABLE rainloop_users (
id_user integer NOT NULL PRIMARY KEY,
rl_email text NOT NULL DEFAULT \'\'
);';
					$aQ[] = 'CREATE INDEX rl_email_rainloop_users_index ON rainloop_users (rl_email);';
					break;
			}

			if (0 < \count($aQ))
			{
				try
				{
					if ($this->isTransactionSupported())
					{
						$oPdo->beginTransaction();
					}

					foreach ($aQ as $sQuery)
					{
						if ($bResult)
						{
							$this->writeLog($sQuery);
							$bResult = false !== $oPdo->exec($sQuery);
							if (!$bResult)
							{
								$this->writeLog('Result=false');
							}
							else
							{
								$this->writeLog('Result=true');
							}
						}
					}

					if ($this->isTransactionSupported())
					{
						if ($bResult)
						{
							$oPdo->rollBack();
						}
						else
						{
							$oPdo->commit();
						}
					}
				}
				catch (\Exception $oException)
				{
					$this->writeLog($oException);
					if ($this->isTransactionSupported())
					{
						$oPdo->rollBack();
					}
					
					throw $oException;
				}
			}
		}

		return $bResult;
	}

	/**
	 * @param string $sName
	 * @param array $aData = array()
	 *
	 * @return bool
	 */
	protected function dataBaseUpgrade($sName, $aData = array())
	{
		$iFromVersion = null;
		try
		{
			$iFromVersion = $this->getVersion($sName);
		}
		catch (\PDOException $oException)
		{
			$this->writeLog($oException);

			try
			{
				$this->initSystemTables();

				$iFromVersion = $this->getVersion($sName);
			}
			catch (\PDOException $oSubException)
			{
				$this->writeLog($oSubException);
				throw $oSubException;
			}
		}

		if (\is_int($iFromVersion) && 0 <= $iFromVersion)
		{
			$oPdo = false;
			$bResult = false;
			
			foreach ($aData as $iVersion => $aQuery)
			{
				if (0 === \count($aQuery))
				{
					continue;
				}

				if (!$oPdo)
				{
					$oPdo = $this->getPDO();
					$bResult = true;
				}

				if ($iFromVersion < $iVersion && $oPdo)
				{
					try
					{
						if ($this->isTransactionSupported())
						{
							$oPdo->beginTransaction();
						}

						foreach ($aQuery as $sQuery)
						{
							$this->writeLog($sQuery);
							$bExec = $oPdo->exec($sQuery);
							if (false === $bExec)
							{
								$this->writeLog('Result: false');
								
								$bResult = false;
								break;
							}
						}

						if ($this->isTransactionSupported())
						{
							if ($bResult)
							{
								$oPdo->commit();
							}
							else
							{
								$oPdo->rollBack();
							}
						}
					}
					catch (\Exception $oException)
					{
						$this->writeLog($oException);
						if ($this->isTransactionSupported())
						{
							$oPdo->rollBack();
						}
						
						throw $oException;
					}

					if (!$bResult)
					{
						break;
					}

					$this->setVersion($sName, $iVersion);
				}
			}
		}

		return $bResult;
	}
}