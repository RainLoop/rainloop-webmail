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
		$this->sDbType = $sType;

		$oPdo = false;
		try
		{
			$oPdo = @new \PDO($sDsn, $sDbLogin, $sDbPassword);
			if ($oPdo)
			{
				$oPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
				if ('mysql' === $oPdo->getAttribute(\PDO::ATTR_DRIVER_NAME))
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
	 * @return nool
	 */
	protected function beginTransaction()
	{
		return $this->getPDO()->beginTransaction();
	}

	/**
	 * @return nool
	 */
	protected function commit()
	{
		return $this->getPDO()->commit();
	}

	/**
	 * @return nool
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
	 * @param bool $bSkipUpdateTables = false
	 *
	 * @return int
	 */
	protected function getUserId($sEmail, $bSkipInsert = false)
	{
		$sEmail = \strtolower(\trim($sEmail));
		if (empty($sEmail))
		{
			throw new \InvalidArgumentException('Empty Email argument');
		}

		$oStmt = $this->prepareAndExecute('SELECT id_user FROM rainloop_users WHERE rl_email = :rl_email',
			array(':rl_email' => array($sEmail, \PDO::PARAM_STR)));

		$mRow = $oStmt->fetch(\PDO::FETCH_ASSOC);
		if ($mRow && isset($mRow['id_user']) && \is_numeric($mRow['id_user']))
		{
			return (int) $mRow['id_user'];
		}

		if (!$bSkipInsert)
		{
			$oStmt->closeCursor();

			$oStmt = $this->prepareAndExecute('INSERT INTO rainloop_users (rl_email) VALUES (:rl_email)',
				array(':rl_email' => array($sEmail, \PDO::PARAM_STR)));

			return $this->getUserId($sEmail, true);
		}

		throw new \Exception('id_user = 0');
	}

	/**
	 * @param string $sValue
	 *
	 * @return string
	 */
	protected function quoteValue($sValue)
	{
		$oPdo = $this->getPDO();
		return $oPdo ? $oPdo->quote((string) $sValue, \PDO::PARAM_STR) : '\'\'';
	}

	/**
	 * @param string $sType
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
	 * @param string $sType
	 *
	 * @return int|string|bool
	 */
	protected function getVersion($sName)
	{
		return $this->getSystemValue($sName.'_version', true);
	}

	/**
	 * @param string $sType
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
			$oPdo->beginTransaction();

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

			if ($bResult)
			{
				$oPdo->commit();
			}
			else
			{
				$oPdo->rollBack();
			}
		}

		return $bResult;
	}

	/**
	 * @throws \Exception
	 */
	protected function initSystemTables()
	{
		$bResult = true;

		$oPdo = $this->getPDO();
		if ($oPdo)
		{
			$aQ = array();
			if ('mysql' === $this->sDbType)
			{
				$aQ[] = 'CREATE TABLE IF NOT EXISTS rainloop_system (
	sys_name varchar(50) NOT NULL,
	value_int int UNSIGNED NOT NULL DEFAULT 0,
	value_str varchar(128) NOT NULL DEFAULT \'\',
	INDEX `sys_name_index` (`sys_name`)
) /*!40000 ENGINE=INNODB */ /*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;';

				$aQ[] = 'CREATE TABLE IF NOT EXISTS rainloop_users (
	id_user int UNSIGNED NOT NULL AUTO_INCREMENT,
	rl_email varchar(128) NOT NULL DEFAULT \'\',
	PRIMARY KEY(`id_user`),
	INDEX `rl_email_index` (`rl_email`)
) /*!40000 ENGINE=INNODB */;';
			}
			else if ('postgres' === $this->sDbType)
			{
				$aQ[] = 'CREATE TABLE rainloop_system (
	sys_name varchar(50) NOT NULL,
	value_int integer NOT NULL DEFAULT 0,
	value_str varchar(128) NOT NULL DEFAULT \'\'
);';

				$aQ[] = 'CREATE INDEX sys_name_index ON rainloop_system (sys_name);';
				
				$aQ[] = 'CREATE SEQUENCE rainloop_users_seq START WITH 1 INCREMENT BY 1 NO MAXVALUE NO MINVALUE CACHE 1;';

				$aQ[] = 'CREATE TABLE rainloop_users (
	id_user integer DEFAULT nextval(\'rainloop_users_seq\'::text) PRIMARY KEY,
	rl_email varchar(128) NOT NULL DEFAULT \'\'
);';
				$aQ[] = 'CREATE INDEX rl_email_index ON rainloop_users (rl_email);';
			}

			if (0 < \count($aQ))
			{
				try
				{
					$oPdo->beginTransaction();

					foreach ($aQ as $sQuery)
					{
						if ($bResult)
						{
							$this->writeLog($sQuery);
							$bResult = false !== $oPdo->exec($sQuery);
						}
					}

					if ($bResult)
					{
						$oPdo->rollBack();
					}
					else
					{
						$oPdo->commit();
					}
				}
				catch (\Exception $oException)
				{
					$oPdo->rollBack();

					$this->writeLog($oException);
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
			
			$this->initSystemTables();
			
			$iFromVersion = $this->getVersion($sName);
		}

		if (0 <= $iFromVersion)
		{
			$oPdo = false;
			$bResult = false;
			foreach ($aData as $iVersion => $aQuery)
			{
				if (!$oPdo)
				{
					$oPdo = $this->getPDO();
					$bResult = true;
				}

				if ($iFromVersion < $iVersion && $oPdo)
				{
					try
					{
						$oPdo->beginTransaction();

						foreach ($aQuery as $sQuery)
						{
							$this->writeLog($sQuery);
							if (false === $oPdo->exec($sQuery))
							{
								$bResult = false;
								break;
							}
						}

						if ($bResult)
						{
							$oPdo->commit();
						}
						else
						{
							$oPdo->rollBack();
						}
					}
					catch (\Exception $oException)
					{
						$oPdo->rollBack();
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