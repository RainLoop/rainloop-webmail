<?php

namespace RainLoop\Pdo;

abstract class Base
{
	use \MailSo\Log\Inherit;

	protected ?\PDO $oPDO = null;

	protected bool $bExplain = false;

	protected bool $bSqliteCollate = true;

	protected string $sDbType;

	public function IsSupported() : bool
	{
		return !!\class_exists('PDO');
	}

	abstract protected function getPdoSettings() : \RainLoop\Pdo\Settings;

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
		if ($this->oPDO) {
			return $this->oPDO;
		}

		if (!\class_exists('PDO')) {
			throw new \Exception('Class PDO does not exist');
		}

		$oSettings = $this->getPdoSettings();

		if (!\in_array($oSettings->driver, static::getAvailableDrivers())) {
			throw new \Exception('Unknown PDO SQL connection type');
		}

		if (empty($oSettings->dsn)) {
			throw new \Exception('Empty PDO DSN configuration');
		}

		$this->sDbType = $oSettings->driver;

		$options = [];
		if ('mysql' === $oSettings->driver) {
			if ($oSettings->sslCa) {
				$options[\PDO::MYSQL_ATTR_SSL_CA] = $oSettings->sslCa;
			}
			// PHP 8.0 https://github.com/the-djmaze/snappymail/issues/1205
			if (\defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')) {
				$options[\PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = $oSettings->sslVerify;
			}
			if ($oSettings->sslCiphers) {
				$options[\PDO::MYSQL_ATTR_SSL_CIPHER] = $oSettings->sslCiphers;
			}
/*
			$options[\PDO::MYSQL_ATTR_SSL_CAPATH] = '';
			// mutual (two-way) authentication
			$options[\PDO::MYSQL_ATTR_SSL_KEY] = '';
			$options[\PDO::MYSQL_ATTR_SSL_CERT] = '';
*/
		}

		$oPdo = new \PDO($oSettings->dsn, $oSettings->user, $oSettings->password, $options);
		$sPdoType = $oPdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
		$oPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

//		$bCaseFunc = false;
		if ('mysql' === $oSettings->driver && 'mysql' === $sPdoType) {
			$oPdo->exec('SET NAMES utf8mb4 COLLATE utf8mb4_general_ci');
		}
//		else if ('sqlite' === $oSettings->driver && 'sqlite' === $sPdoType && $this->bSqliteCollate) {
//			if (\method_exists($oPdo, 'sqliteCreateCollation')) {
//				$oPdo->sqliteCreateCollation('SQLITE_NOCASE_UTF8', array($this, 'sqliteNoCaseCollationHelper'));
//				$bCaseFunc = true;
//			}
//		}
//		$this->logWrite('PDO:'.$sPdoType.($bCaseFunc ? '/SQLITE_NOCASE_UTF8' : ''));

		$this->oPDO = $oPdo;
		return $oPdo;
	}

	protected function lastInsertId(?string $sTabelName = null, ?string $sColumnName = null) : string
	{
		$mName = null;
		if ('pgsql' === $this->sDbType && null !== $sTabelName && $sColumnName !== null) {
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
		if ($this->bExplain && !$bMultiplyParams) {
			$this->prepareAndExplain($sSql, $aParams);
		}

		$mResult = null;

		$this->writeLog($sSql);
		$oStmt = $this->getPDO()->prepare($sSql);
		if ($oStmt) {
			$aLogs = array();
			$aRootParams = $bMultiplyParams ? $aParams : array($aParams);
			foreach ($aRootParams as $aSubParams) {
				foreach ($aSubParams as $sName => $aValue) {
					if ($bLogParams) {
						$aLogs[$sName] = $aValue[0];
					}
					$oStmt->bindValue($sName, $aValue[0], $aValue[1]);
				}
				$mResult = $oStmt->execute() && !$bMultiplyParams ? $oStmt : null;
			}
			if ($bLogParams && $aLogs) {
				$this->writeLog('Params: '.\json_encode($aLogs, JSON_UNESCAPED_UNICODE));
			}
		}

		return $mResult;
	}

	protected function prepareAndExplain(string $sSql, array $aParams = array())
	{
		$mResult = null;
		if (0 === \strpos($sSql, 'SELECT ')) {
			$sSql = 'EXPLAIN '.$sSql;
			$this->writeLog($sSql);
			$oStmt = $this->getPDO()->prepare($sSql);
			if ($oStmt) {
				foreach ($aParams as $sName => $aValue) {
					$oStmt->bindValue($sName, $aValue[0], $aValue[1]);
				}

				$mResult = $oStmt->execute() ? $oStmt : null;
			}
		}

		if ($mResult) {
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
		if ($this->oLogger) {
			if ($mData instanceof \Throwable) {
				$this->logException($mData, \LOG_ERR, 'SQL');
			} else if (\is_scalar($mData)) {
				$this->logWrite((string) $mData, \LOG_INFO, 'SQL');
			} else {
				$this->oLogger->WriteDump($mData, \LOG_INFO, 'SQL');
			}
		}
	}

	public function quoteValue(string $sValue) : string
	{
		$oPdo = $this->getPDO();
		return $oPdo ? $oPdo->quote((string) $sValue, \PDO::PARAM_STR) : '\'\'';
	}

	protected function getVersion(string $sName) : ?int
	{
		$oPdo = $this->getPDO();
		if ($oPdo) {
			$sQuery = 'SELECT MAX(value_int) FROM rainloop_system WHERE sys_name = ?';

			$this->writeLog($sQuery);

			$oStmt = $oPdo->prepare($sQuery);
			if ($oStmt->execute(array($sName.'_version'))) {
				$mRow = $oStmt->fetch(\PDO::FETCH_NUM);
				if ($mRow && isset($mRow[0])) {
					return (int) $mRow[0];
				}

				return 0;
			}
		}

		return null;
	}

	protected function setVersion(string $sName, int $iVersion) : bool
	{
		$bResult = false;
		$oPdo = $this->getPDO();
		if ($oPdo) {
			$sQuery = 'DELETE FROM rainloop_system WHERE sys_name = ? AND value_int <= ?;';
			$this->writeLog($sQuery);

			$oStmt = $oPdo->prepare($sQuery);
			$bResult = !!$oStmt->execute(array($sName.'_version', $iVersion));
			if ($bResult) {
				$sQuery = 'INSERT INTO rainloop_system (sys_name, value_int) VALUES (?, ?);';
				$this->writeLog($sQuery);

				$oStmt = $oPdo->prepare($sQuery);
				if ($oStmt) {
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
		if ($oPdo) {
			$aQ = Schema::getForDbType($this->sDbType);
			if (\count($aQ)) {
				try
				{
					foreach ($aQ as $sQuery) {
						$this->writeLog($sQuery);
						$bResult = false !== $oPdo->exec($sQuery);
						if (!$bResult) {
							$this->writeLog('Result=false');
							break;
						} else {
							$this->writeLog('Result=true');
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
//			$this->writeLog($oException);
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
		if (\is_int($iFromVersion) && 0 <= $iFromVersion) {
			$oPdo = false;
			foreach ($aData as $iVersion => $aQuery) {
				if ($iFromVersion < $iVersion) {
					if (\count($aQuery)) {
						if (!$oPdo) {
							$oPdo = $this->getPDO();
							$bResult = true;
						}
						if ($oPdo) {
							try
							{
								foreach ($aQuery as $sQuery) {
									$this->writeLog($sQuery);
									$bExec = $oPdo->exec($sQuery);
									if (false === $bExec) {
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
							if (!$bResult) {
								break;
							}
						}
					}
					$this->setVersion($sName, $iVersion);
				}
			}
		}

		return $bResult;
	}
}
