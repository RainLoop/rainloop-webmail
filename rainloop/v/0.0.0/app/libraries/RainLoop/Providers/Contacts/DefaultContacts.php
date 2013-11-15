<?php

namespace RainLoop\Providers\Contacts;

class DefaultContacts implements \RainLoop\Providers\Contacts\ContactsInterface
{
	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger;

	/**
	 * @var bool
	 */
	private $bUseDbPerUser;

	/**
	 * @param \MailSo\Log\Logger $oLogger = null
	 */
	public function __construct($oLogger = null)
	{
		$this->oLogger = $oLogger instanceof \MailSo\Log\Logger ? $oLogger : null;
		$this->bUseDbPerUser = true;
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

		$sVersionFile = '';
		$sDsn = '';
		
		if ($this->bUseDbPerUser)
		{
			$sSubPath = APP_PRIVATE_DATA.'storage/contacts/'.\rtrim(\substr($sEmail, 0, 2), '@').'/'.$sEmail.'/';
			if (!\is_dir($sSubPath))
			{
				if (\mkdir($sSubPath, 0755, true) && \is_dir($sSubPath))
				{
					$sVersionFile = $sSubPath.'.version';
					$sDsn = 'sqlite:'.$sSubPath.'contacts.sqlite';
				}
			}
			else
			{
				$sVersionFile = $sSubPath.'.version';
				$sDsn = 'sqlite:'.$sSubPath.'contacts.sqlite';
			}
		}
		else
		{
			$sVersionFile = APP_PRIVATE_DATA.'.version';
			$sDsn = 'sqlite:'.APP_PRIVATE_DATA.'contacts.sqlite';
		}
		
		$sDbLogin = '';
		$sDbPassword = '';

		$oPdo = false;
		try
		{
			$oPdo = new \PDO($sDsn, $sDbLogin, $sDbPassword);
			if ($oPdo)
			{
				$oPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

				if (!@\file_exists($sVersionFile) ||
					(string) @file_get_contents($sVersionFile) !== (string) \RainLoop\Providers\Contacts\Classes\Db::Version())
				{
					$this->syncTables($oPdo, $sVersionFile);
				}

				$oPdo->sqliteCreateFunction('SIMPLESEARCH', function ($sEmailValue, $sNameValue, $sMask) {
					return \preg_match('/'.\preg_quote($sMask, '/').'/ui',
						$sEmailValue.' '.$sNameValue) ? 1 : 0;
				});

			}
		}
		catch (\Exception $oException)
		{
			throw $oException;
			$oPdo = false;
		}

		if ($oPdo)
		{
			$aPdoCache[$oAccount->ParentEmailHelper()] = $oPdo;
		}

		return $oPdo;
	}

	protected function getWantedColumnsInfo($sTableName, $aCurrent)
	{
		$aColumns = array();
		foreach ($aCurrent as $sName => $sType)
		{
			$sSql = $sName.' '.$sType;
			switch ($sType)
			{
				case 'INTEGER':
					$sSql .= ' DEFAILT \'0\'';
					break;
				case 'TEXT':
					$sSql .= ' DEFAILT \'\'';
					break;
			}

			$aColumns[$sName] = $sSql;
		}

		if (0 === \count($aColumns))
		{
			return '';
		}

		return 'CREATE TABLE '.$sTableName.' (' .\implode(', ', $aColumns).')';
	}

	/**
	 * @param \PDO $oAccount
	 * @param string $sTableName
	 */
	protected function getCurrentColumnsInfo($oPdo, $sTableName)
	{
		$oStmt = $this->prepareAndExecute($oPdo, 'SELECT `sql` FROM `sqlite_master` WHERE `tbl_name` = :TableName AND `type` = :Type', array(
			':TableName' => array($sTableName, \PDO::PARAM_STR),
			':Type' => array('table', \PDO::PARAM_STR)
		));

		if ($oStmt)
		{
			$mRow = $oStmt->fetch(\PDO::FETCH_ASSOC);
			if ($mRow && isset($mRow['sql']))
			{
				return (string) $mRow['sql'];
			}
		}

		return '';
	}

	/**
	 * @param \PDO $oPdo
	 * @param string $sVersionFile = ''
	 */
	private function syncTables($oPdo, $sVersionFile = '')
	{
		if ($this->oLogger)
		{
			$this->oLogger->Write('Start to sync', \MailSo\Log\Enumerations\Type::INFO);
		}
		
		$aStrucure = \RainLoop\Providers\Contacts\Classes\Db::Strucure();
		foreach ($aStrucure as $sTableName => $aField)
		{
			$sCurrent = $this->getCurrentColumnsInfo($oPdo, $sTableName);
			$sWanted = $this->getWantedColumnsInfo($sTableName, $aField);

			if (empty($sCurrent))
			{
				$this->prepareAndExecute($oPdo, $sWanted);
			}
			else if ($sCurrent !== $sWanted)
			{
				$this->prepareAndExecute($oPdo, 'DROP TABLE IF EXISTS `'.$sTableName.'_old`');
				$this->prepareAndExecute($oPdo, 'ALTER TABLE `'.$sTableName.'` RENAME TO `'.$sTableName.'_old`');
				$this->prepareAndExecute($oPdo, $sWanted);

				$aNewKeys = array();
				$aOldKeys = array();
				foreach ($aField as $sKey => $sType)
				{
					$aNewKeys[] = $sKey;
					$aOldKeys[] = false !== \strpos($sCurrent, $sKey.' ') ? $sKey :
						(0 === \strpos($sType, 'INT') ? '\'0\'' : '\'\'');
				}

				$sNewKeys = \implode(', ', $aNewKeys);
				$sOldKeys = \implode(', ', $aOldKeys);
				$this->prepareAndExecute($oPdo, 'INSERT INTO `'.$sTableName.'` ('.$sNewKeys.') SELECT '.$sOldKeys.' FROM `'.$sTableName.'_old`');

				$this->prepareAndExecute($oPdo, 'DROP TABLE `'.$sTableName.'_old`');
			}
		}

		@\file_put_contents($sVersionFile, \RainLoop\Providers\Contacts\Classes\Db::Version());

		if ($this->oLogger)
		{
			$this->oLogger->Write('Stop to sync', \MailSo\Log\Enumerations\Type::INFO);
		}
	}

	/**
	 * @param \RainLoop\Account|\PDO $oAccountOrPdo
	 * @param string $sSql
	 * @param array $aParams
	 *
	 * @return \PDOStatement|null
	 */
	private function prepareAndExecute($oAccountOrPdo, $sSql, $aParams = array())
	{
		if ($this->oLogger)
		{
			$this->oLogger->Write($sSql, \MailSo\Log\Enumerations\Type::INFO, 'SQLITE');
		}
		
		$oPdo = $oAccountOrPdo instanceof \PDO ? $oAccountOrPdo : $this->getPDO($oAccountOrPdo);
		$oStmt = $oPdo->prepare($sSql);
		foreach ($aParams as $sName => $aValue)
		{
			$oStmt->bindValue($sName, $aValue[0], $aValue[1]);
		}

//		$sLogSql = $sSql;
//		foreach($aParams as $sName => $aValue)
//		{
//			$sLogSql = \str_replace($sName, $aValue[1] === \PDO::PARAM_INT ? $aValue[0] : '\''.$aValue[0].'\'', $sLogSql);
//		}
//
//		if ($this->oLogger)
//		{
//			$this->oLogger->Write($sLogSql, \MailSo\Log\Enumerations\Type::INFO, 'SQLITE');
//		}

		$mResult = $oStmt->execute() ? $oStmt : null;
		
//		if ($this->oLogger)
//		{
//			$this->oLogger->Write('RESULT: '.($mResult ? 'true' : 'false'), \MailSo\Log\Enumerations\Type::INFO, 'SQLITE');
//		}

		return $mResult;
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param bool $bSkipInsert = false
	 *
	 * @return int
	 */
	private function getUserId($oAccount, $bSkipInsert = false)
	{
		if (!$this->bUseDbPerUser)
		{
			$oStmt = $this->prepareAndExecute($oAccount,
				'SELECT IdUser FROM rlContactsUsers WHERE Email = :Email LIMIT 1',
				array(
					':Email' => array($oAccount->ParentEmailHelper(), \PDO::PARAM_STR)
				));

			$mRow = $oStmt->fetch(\PDO::FETCH_ASSOC);
			if ($mRow && isset($mRow['IdUser']) && \is_numeric($mRow['IdUser']))
			{
				return (int) $mRow['IdUser'];
			}

			if (!$bSkipInsert)
			{
				$oStmt->closeCursor();

				$oStmt = $this->prepareAndExecute($oAccount,
					'INSERT INTO rlContactsUsers (Email) VALUES (:Email)',
					array(
						':Email' => array($oAccount->ParentEmailHelper(), \PDO::PARAM_STR)
					));

				return $this->getUserId($oAccount, true);
			}

			throw new \Exception('IdUser=0');
		}
		
		return 0;
	}

	/**
	 * @param string $sSearch
	 * @return string
	 */
	private function convertSearchValue($sSearch)
	{
		return '%'.$sSearch.'%';
	}

	private function populateContactFromDB($iUserID, $aItem)
	{
		$oContact = null;
		if (isset($aItem['IdContact']))
		{
			$oContact = new \RainLoop\Providers\Contacts\Classes\Contact();
			$oContact->IdContact = (int) $aItem['IdContact'];
			$oContact->IdUser = $iUserID;
			$oContact->Type = (int) $aItem['Type'];
			$oContact->Frec = (int) $aItem['Frec'];
			$oContact->ListName = (string) $aItem['ListName'];
			$oContact->Name = (string) $aItem['Name'];
			$oContact->Emails = \explode(' ', \trim((string) $aItem['Emails']));
			$oContact->ImageHash = (string) $aItem['ImageHash'];
			
			$oContact->ParseData($aItem['Data']);
		}

		return $oContact;
	}
	
	/**
	 * @param \RainLoop\Account $oAccount
	 * @param int $iIdContact
	 *
	 * @return $oContact|null
	 */
	public function GetContactById($oAccount, $iIdContact)
	{
		$oResultContact = null;

		$iUserID = $this->getUserId($oAccount);
	
		$oStmt = $this->prepareAndExecute($oAccount,
			'SELECT IdContact, Type, Frec, ListName, Name, Emails, ImageHash, Data'.
			' FROM rlContactsItems WHERE IdContact = :IdContact AND IdUser = :IdUser LIMIT 1',
			array(
				':IdContact' => array($iIdContact, \PDO::PARAM_INT),
				':IdUser' => array($iUserID, \PDO::PARAM_INT)
			));
		
		$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
		if (\is_array($aFetch) && isset($aFetch[0]) && \is_array($aFetch[0]))
		{
			$oContact = $this->populateContactFromDB($iUserID, $aFetch[0]);
			if ($oContact instanceof \RainLoop\Providers\Contacts\Classes\Contact)
			{
				$oResultContact = $oContact;
			}
		}

		return $oResultContact;
	}
	
	/**
	 * @param \RainLoop\Account $oAccount
	 * @param int $iOffset = 0
	 * @param int $iLimit = 20
	 * @param string $sSearch = ''
	 *
	 * @return array
	 */
	public function GetContacts($oAccount, $iOffset = 0, $iLimit = 20, $sSearch = '')
	{
		$iOffset = 0 <= $iOffset ? $iOffset : 0;
		$iLimit = 0 < $iLimit ? (int) $iLimit : 0;
		$sSearch = \trim($sSearch);

		$iUserID = $this->getUserId($oAccount);

		$sSql = 'SELECT IdContact, Type, Frec, ListName, Name, Emails, ImageHash, Data'.
			' FROM rlContactsItems WHERE IdUser = :IdUser'
		;

		$aParams = array(
			':IdUser' => array($iUserID, \PDO::PARAM_INT),
			':limit' => array($iLimit, \PDO::PARAM_INT),
			':offset' => array($iOffset, \PDO::PARAM_INT)
		);

		if (0 < strlen($sSearch))
		{
			if (\MailSo\Base\Utils::IsAscii($sSearch))
			{
				$sSql .= ' AND Name LIKE :Search OR Emails LIKE :Search';
				$aParams[':Search'] = array($this->convertSearchValue($sSearch), \PDO::PARAM_STR);
			}
			else
			{
				$sSql .= ' AND SIMPLESEARCH(Emails, Name, :Search)';
				$aParams[':Search'] = array($sSearch, \PDO::PARAM_STR);
			}
		}

		$sSql .= ' ORDER BY ListName ASC LIMIT :limit OFFSET :offset';

		$oStmt = $this->prepareAndExecute($oAccount, $sSql, $aParams);
		
		$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
		$aResult = array();
		if (\is_array($aFetch) && 0 < \count($aFetch))
		{
			foreach ($aFetch as $aItem)
			{
				$oContact = $this->populateContactFromDB($iUserID, $aItem);
				if ($oContact instanceof \RainLoop\Providers\Contacts\Classes\Contact)
				{
					$aResult[] = $oContact;
				}
			}
		}

		unset($aFetch);
		return $aResult;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 * @return array
	 */
	public function GetContactsImageHashes($oAccount)
	{
		$iUserID = $this->getUserId($oAccount);

		$oStmt = $this->prepareAndExecute($oAccount,
			'SELECT Emails, ImageHash FROM rlContactsItems WHERE IdUser = :IdUser AND ImageHash <> :ImageHash',
			array(
				':IdUser' => array($iUserID, \PDO::PARAM_INT),
				':ImageHash' => array('', \PDO::PARAM_STR)
			));

		$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
		$aResult = array();
		
		if (\is_array($aFetch) && 0 < \count($aFetch))
		{
			foreach ($aFetch as $aItem)
			{
				if (!empty($aItem['Emails']) && !empty($aItem['ImageHash']))
				{
					$aEmails = \explode(' ', $aItem['Emails']);
					foreach ($aEmails as $sEmail)
					{
						$sEmail = \trim($sEmail);
						if (0 < strlen($sEmail))
						{
							$aResult[$sEmail] = $aItem['ImageHash'];
						}
					}
				}
			}
		}

		unset($aFetch);
		return $aResult;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param \RainLoop\Providers\Contacts\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function CreateContact($oAccount, &$oContact)
	{
		$iUserID = $this->getUserId($oAccount);

		$oContact->IdUser = $iUserID;

		$oStmt = $this->prepareAndExecute($oAccount,
			'INSERT INTO rlContactsItems '.
			'( IdUser,  Type, Frec,  ListName,  Name,  Emails,  ImageHash,  Data) VALUES '.
			'(:IdUser, :Type, 0,    :ListName, :Name, :Emails, :ImageHash, :Data)',
			array(
				':IdUser' => array($oContact->IdUser, \PDO::PARAM_INT),
				':Type' => array($oContact->Type, \PDO::PARAM_INT),
				':ListName' => array($oContact->GenarateListName(), \PDO::PARAM_STR),
				':Name' => array($oContact->Name, \PDO::PARAM_STR),
				':Emails' => array($oContact->EmailsAsString(), \PDO::PARAM_STR),
				':ImageHash' => array($oContact->ImageHash, \PDO::PARAM_STR),
				':Data' => array($oContact->DataAsString(), \PDO::PARAM_STR),
			));

		if ($oStmt)
		{
			$iContactID = $this->getPDO($oAccount)->lastInsertId('IdContact');
			if (is_numeric($iContactID) && 0 < (int) $iContactID)
			{
				$oContact->IdContact = (int) $iContactID;
				return true;
			}
		}

		throw new \Exception('CreateContact');
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param \RainLoop\Providers\Contacts\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function UpdateContact($oAccount, &$oContact)
	{
		$iUserID = $this->getUserId($oAccount);

		$oContact->IdUser = $iUserID;

		return !!$this->prepareAndExecute($oAccount,
			'UPDATE rlContactsItems SET'.
			' Type = :Type, ListName = :ListName, Name = :Name, Emails = :Emails,'.
			' ImageHash = :ImageHash, Data = :Data'.
			' WHERE IdContact = :IdContact AND IdUser = :IdUser',
			array(
				':IdContact' => array($oContact->IdContact, \PDO::PARAM_INT),
				':IdUser' => array($oContact->IdUser, \PDO::PARAM_INT),
				':Type' => array($oContact->Type, \PDO::PARAM_INT),
				':ListName' => array($oContact->GenarateListName(), \PDO::PARAM_STR),
				':Name' => array($oContact->Name, \PDO::PARAM_STR),
				':Emails' => array($oContact->EmailsAsString(), \PDO::PARAM_STR),
				':ImageHash' => array($oContact->ImageHash, \PDO::PARAM_STR),
				':Data' => array($oContact->DataAsString(), \PDO::PARAM_STR),
			));
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aContactIds
	 *
	 * @return bool
	 */
	public function DeleteContacts($oAccount, $aContactIds)
	{
		$iUserID = $this->getUserId($oAccount);

		$aParams = array(
			':IdUser' => array($iUserID, \PDO::PARAM_INT),
		);

		$aInQuery = array();
		foreach ($aContactIds as $iIndex => $iId)
		{
			$aInQuery[] = ':IdContact_'.$iIndex;
			$aParams[':IdContact_'.$iIndex] = array($iId, \PDO::PARAM_INT);
		}

		if (0 === \count($aInQuery))
		{
			return false;
		}
		
		return !!$this->prepareAndExecute($oAccount,
			'DELETE FROM rlContactsItems WHERE IdUser = :IdUser AND IdContact IN ('.\implode(', ', $aInQuery).')',
			$aParams);
	}
	
	/**
	 * @return bool
	 */
	public function IsSupported()
	{
		$aDrivers = \class_exists('PDO') ? \PDO::getAvailableDrivers() : array();
		return \is_array($aDrivers) ? \in_array('sqlite', $aDrivers) : false;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aContactIds
	 *
	 * @return bool
	 */
	public function IncFrec($oAccount, $aContactIds)
	{
		if (\is_array($aContactIds) && 0 < \count($aContactIds))
		{
			$iUserID = $this->getUserId($oAccount);

			$aParams = array(
				':IdUser' => array($iUserID, \PDO::PARAM_INT),
			);

			$aInQuery = array();
			foreach ($aContactIds as $iIndex => $iId)
			{
				$aInQuery[] = ':IdContact_'.$iIndex;
				$aParams[':IdContact_'.$iIndex] = array($iId, \PDO::PARAM_INT);
			}

			return !!$this->prepareAndExecute($oAccount,
				'UPDATE rlContactsItems SET Frec = Frec + 1 WHERE IdUser = :IdUser AND IdContact IN ('.\implode(', ', $aInQuery).')',
				$aParams);
		}

		return false;
	}
}