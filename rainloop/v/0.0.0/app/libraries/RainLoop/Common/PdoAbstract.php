<?php

namespace RainLoop\Common;

abstract class PdoAbstract
{
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
		$aResult = array('mysql', 'mysql:host=127.0.0.1;port=3306;dbname=rainloop', 'root', '');
		return $aResult;
	}

	/**
	 * @return \PDO
	 *
	 * @throws \Exception
	 */
	protected function getPDO()
	{
		static $aPdoCache = null;
		if ($aPdoCache)
		{
			return $aPdoCache;
		}
		
		if (!\class_exists('PDO'))
		{
			throw new \Exception('Class PDO does not exist');
		}

		// TODO
		$sType = $sDsn = $sDbLogin = $sDbPassword = '';
		list($sType, $sDsn, $sDbLogin, $sDbPassword) = $this->getPdoAccessData();
		$this->sDbType = $sType;

		$oPdo = false;
		try
		{
			$oPdo = new \PDO($sDsn, $sDbLogin, $sDbPassword);
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
			$aPdoCache = $oPdo;
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
	protected function prepareAndExecute($sSql, $aParams = array())
	{
		$mResult = null;

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

		return $mResult;
	}
	
	/**
	 * @param string $sSql
	 */
	protected function writeLog($sSql)
	{
		if ($this->oLogger)
		{
			$this->oLogger->Write($sSql, \MailSo\Log\Enumerations\Type::INFO, 'SQL');
		}
	}
	
	/**
	 * @param string $sEmail
	 * @param bool $bSkipInsert = false
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
			$sQuery = 'SELECT * FROM rainloop_system WHERE sys_name = ?';
			$this->writeLog($sQuery);
			
			$oStmt = $oPdo->prepare($sQuery);
			if ($oStmt->execute(array($sName)))
			{
				$mRow = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
				if ($mRow && isset($mRow[0]['sys_name'], $mRow[0]['value_int'], $mRow[0]['value_str']))
				{
					return $bReturnIntValue ? (int) $mRow[0]['value_int'] : (string) $mRow[0]['value_str'];
				}
			}
		}

		return false;
	}

	/**
	 * @param string $sType
	 * @param bool $bReturnIntValue = true
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
				$aQ[] = 'CREATE TABLE IF NOT EXISTS `rainloop_system` (
		`sys_name` varchar(50) NOT NULL,
		`value_int` int(11) UNSIGNED NOT NULL DEFAULT \'0\',
		`value_str` varchar(255) NOT NULL DEFAULT \'\'
		) /*!40000 ENGINE=INNODB */ /*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;';

				$aQ[] = 'CREATE TABLE IF NOT EXISTS `rainloop_users` (
		`id_user` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
		`rl_email` varchar(255) NOT NULL,
		UNIQUE `email_unique` (`rl_email`),
		PRIMARY KEY(`id_user`)
		) /*!40000 ENGINE=INNODB */ /*!40101 CHARACTER SET ascii COLLATE ascii_general_ci */ ;';
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

					$this->oLogger->WriteException($oException);
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
		$this->initSystemTables();

		$iFromVersion = $this->getVersion($sName);

		$bResult = false;
		$oPdo = $this->getPDO();
		if ($oPdo)
		{
			$bResult = true;
			foreach ($aData as $iVersion => $aQuery)
			{
				if ($iFromVersion < $iVersion)
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