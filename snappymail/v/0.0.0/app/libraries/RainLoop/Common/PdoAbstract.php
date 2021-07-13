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
	 * @var bool
	 */
	protected $bSqliteCollate = true;

	/**
	 * @var \MailSo\Log\Logger
	 */
	protected $oLogger;

	/**
	 * @var string
	 */
	protected $sDbType;

	public function IsSupported() : bool
	{
		return !!\class_exists('PDO');
	}

	public function SetLogger(?\MailSo\Log\Logger $oLogger)
	{
		$this->oLogger = $oLogger;
	}

	protected function getPdoAccessData() : array
	{
		return array('', '', '', '');
	}

	public function sqliteNoCaseCollationHelper(string $sStr1, string $sStr2) : int
	{
		$this->oLogger->WriteDump(array($sStr1, $sStr2));
		return \strcmp(\mb_strtoupper($sStr1, 'UTF-8'), \mb_strtoupper($sStr2, 'UTF-8'));
	}

	public static function getAvailableDrivers() : array
	{
		return \class_exists('PDO', false)
			? \array_values(\array_intersect(['mysql', 'pgsql', 'sqlite'], \PDO::getAvailableDrivers()))
			: [];
	}

	/**
	 *
	 * @throws \Exception
	 */
	protected function getPDO() : \PDO
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

		if (!\in_array($sType, static::getAvailableDrivers()))
		{
			throw new \Exception('Unknown PDO SQL connection type');
		}

		if (empty($sDsn))
		{
			throw new \Exception('Empty PDO DSN configuration');
		}

		$this->sDbType = $sType;

		$oPdo = false;
		try
		{
//			$bCaseFunc = false;
			$oPdo = new \PDO($sDsn, $sDbLogin, $sDbPassword);
			if ($oPdo)
			{
				$sPdoType = $oPdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
				$oPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

				if ('mysql' === $sType && 'mysql' === $sPdoType)
				{
					$oPdo->exec('SET NAMES utf8mb4 COLLATE utf8mb4_general_ci');
				}
//				else if ('sqlite' === $sType && 'sqlite' === $sPdoType && $this->bSqliteCollate)
//				{
//					if (\method_exists($oPdo, 'sqliteCreateCollation') && \MailSo\Base\Utils::FunctionExistsAndEnabled('mb_strtoupper'))
//					{
//						$oPdo->sqliteCreateCollation('SQLITE_NOCASE_UTF8', array($this, 'sqliteNoCaseCollationHelper'));
//						$bCaseFunc = true;
//					}
//				}
//
//				$this->oLogger->Write('PDO:'.$sPdoType.($bCaseFunc ? '/SQLITE_NOCASE_UTF8' : ''));
			}
		}
		catch (\Throwable $oException)
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

	protected function lastInsertId(?string $sTabelName = null, ?string $sColumnName = null) : string
	{
		$mName = null;
		if ('pgsql' === $this->sDbType &&
			null !== $sTabelName && $sColumnName !== null)
		{
			$mName = \strtolower($sTabelName.'_'.$sColumnName.'_seq');
		}

		return null === $mName ? $this->getPDO()->lastInsertId() : $this->getPDO()->lastInsertId($mName);
	}

	protected function beginTransaction() : bool
	{
		return $this->getPDO()->beginTransaction();
	}

	protected function commit() : bool
	{
		return $this->getPDO()->commit();
	}

	protected function rollBack() : bool
	{
		return $this->getPDO()->rollBack();
	}

	protected function prepareAndExecute(string $sSql, array $aParams = array(), bool $bMultiplyParams = false, bool $bLogParams = false) : ?\PDOStatement
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
			$aLogs = array();
			$aRootParams = $bMultiplyParams ? $aParams : array($aParams);
			foreach ($aRootParams as $aSubParams)
			{
				foreach ($aSubParams as $sName => $aValue)
				{
					if ($bLogParams)
					{
						$aLogs[$sName] = $aValue[0];
					}

					$oStmt->bindValue($sName, $aValue[0], $aValue[1]);
				}

				$mResult = $oStmt->execute() && !$bMultiplyParams ? $oStmt : null;
			}

			if ($bLogParams && $aLogs)
			{
				$this->writeLog('Params: '.\json_encode($aLogs, JSON_UNESCAPED_UNICODE));
			}
		}

		return $mResult;
	}

	protected function prepareAndExplain(string $sSql, array $aParams = array())
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
	 * @param mixed $mData
	 */
	protected function writeLog($mData)
	{
		if ($this->oLogger)
		{
			$this->oLogger->WriteMixed($mData, \MailSo\Log\Enumerations\Type::INFO, 'SQL');
		}
	}

	protected function getUserId(string $sEmail, bool $bSkipInsert = false, bool $bCache = true) : int
	{
		static $aCache = array();
		if ($bCache && isset($aCache[$sEmail]))
		{
			return $aCache[$sEmail];
		}

		$sEmail = \MailSo\Base\Utils::IdnToAscii(\trim($sEmail), true);
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

	public function quoteValue(string $sValue) : string
	{
		$oPdo = $this->getPDO();
		return $oPdo ? $oPdo->quote((string) $sValue, \PDO::PARAM_STR) : '\'\'';
	}

	protected function getSystemValue(string $sName, bool $bReturnIntValue = true) : int
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

	protected function getVersion(string $sName) : int
	{
		return $this->getSystemValue($sName.'_version', true);
	}

	protected function setVersion(string $sName, int $iVersion) : bool
	{
		$bResult = false;
		$oPdo = $this->getPDO();
		if ($oPdo)
		{
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
			switch ($this->sDbType)
			{
				case 'mysql':
					$aQ[] = 'CREATE TABLE IF NOT EXISTS rainloop_system (
id bigint UNSIGNED NOT NULL AUTO_INCREMENT,
sys_name varchar(50) NOT NULL,
value_int int UNSIGNED NOT NULL DEFAULT 0,
value_str varchar(128) NOT NULL DEFAULT \'\',
PRIMARY KEY(id),
INDEX sys_name_rainloop_system_index (sys_name)
) ENGINE=INNODB CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;';
					$aQ[] = 'CREATE TABLE IF NOT EXISTS rainloop_users (
id_user int UNSIGNED NOT NULL AUTO_INCREMENT,
rl_email varchar(128) NOT NULL DEFAULT \'\',
PRIMARY KEY(id_user),
INDEX rl_email_rainloop_users_index (rl_email)
) ENGINE=INNODB;';
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
				}
				catch (\Throwable $oException)
				{
					$this->writeLog($oException);
					throw $oException;
				}
			}
		}

		return $bResult;
	}

	protected function dataBaseUpgrade(string $sName, array $aData = array()) : bool
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

		$bResult = false;
		if (\is_int($iFromVersion) && 0 <= $iFromVersion)
		{
			$oPdo = false;

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
					}
					catch (\Throwable $oException)
					{
						$this->writeLog($oException);
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
