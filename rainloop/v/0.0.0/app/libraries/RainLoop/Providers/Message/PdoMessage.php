<?php

namespace RainLoop\Providers\Message;

class PdoMessage
	extends \RainLoop\Common\PdoAbstract
	implements \RainLoop\Providers\Message\MessageInterface
{
	/**
	 * @var string
	 */
	private $sDsn;

	/**
	 * @var string
	 */
	private $sDsnType;

	/**
	 * @var string
	 */
	private $sUser;

	/**
	 * @var string
	 */
	private $sPassword;


	public function __construct($sDsn, $sUser = '', $sPassword = '', $sDsnType = 'mysql')
	{
		$this->sDsn = $sDsn;
		$this->sUser = $sUser;
		$this->sPassword = $sPassword;
		$this->sDsnType = $sDsnType;
	}

	/**
	 * @return bool
	 */
	public function IsSupported()
	{
		$aDrivers = \class_exists('PDO') ? \PDO::getAvailableDrivers() : array();
		return \is_array($aDrivers) ? \in_array($this->sDsnType, $aDrivers) : false;
	}

	/**
	 * @return bool
	 */
	public function IsSharingAllowed()
	{
		return $this->IsSupported() && false; // TODO
	}

	private function syncMessageList($oMessageList)
	{
		\Rainloop\ChromePhp::log("pdomessage sync message list!!!");
		// var_dump($oMessageList);
		return $this->prepareAndExecute('INSERT FROM :table WHERE uid = :uid AND deleted = 1', array(
			':table' => MYSQL_TABLE,
			':uid' => array($oMessage->uid, \PDO::PARAM_INT)
		));
	}

	private function createMessage()
	{
		\Rainloop\ChromePhp::log("pdomessage create message!!!");
		return $this->prepareAndExecute('INSERT FROM :table WHERE uid = :uid AND deleted = 1', array(
			':table' => MYSQL_TABLE,
			':uid' => array($oMessage->uid, \PDO::PARAM_INT)
		));
	}

	private function prepearDatabaseSyncData($iUserID)
	{
		$aResult = array();
		$oStmt = $this->prepareAndExecute('SELECT id_contact, id_contact_str, changed, deleted, etag FROM rainloop_ab_contacts WHERE id_user = :id_user', array(
			':id_user' => array($iUserID, \PDO::PARAM_INT)
		));

		if ($oStmt)
		{
			$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
			if (\is_array($aFetch) && 0 < \count($aFetch))
			{
				foreach ($aFetch as $aItem)
				{
					if ($aItem && isset($aItem['id_contact'], $aItem['id_contact_str'], $aItem['changed'], $aItem['deleted'], $aItem['etag']) &&
						!empty($aItem['id_contact_str']))
					{
						$sKeyID = $aItem['id_contact_str'];

						$aResult[$sKeyID] = array(
							'deleted' => '1' === (string) $aItem['deleted'],
							'id_contact' => $aItem['id_contact'],
							'uid' => $sKeyID,
							'etag' => $aItem['etag'],
							'changed' => (int) $aItem['changed'],
						);

						$aResult[$sKeyID]['changed_'] = \gmdate('c', $aResult[$sKeyID]['changed']);
					}
				}
			}
		}

		return $aResult;
	}

	/**
	 * @return string
	 */
	public function Test()
	{
		$sResult = '';
		try
		{
			$this->SyncDatabase();
			if (0 >= $this->getVersion($this->sDsnType.'-ab-version'))
			{
				$sResult = 'Unknown database error';
			}
		}
		catch (\Exception $oException)
		{
			$sResult = $oException->getMessage();
			if (!empty($sResult) && !\MailSo\Base\Utils::IsAscii($sResult) && !\MailSo\Base\Utils::IsUtf8($sResult))
			{
				$sResult = @\utf8_encode($sResult);
			}

			if (!\is_string($sResult) || empty($sResult))
			{
				$sResult = 'Unknown database error';
			}
		}

		return $sResult;
	}

	private function getInitialTablesArray($sDbType)
	{
		switch ($sDbType)
		{
			case 'mysql':
				$sInitial = <<<MYSQLINITIAL

CREATE TABLE IF NOT EXISTS rainloop_ab_message (

	id			bigint UNSIGNED		NOT NULL AUTO_INCREMENT,
	uid			bigint UNSIGNED		NOT NULL,
	folder		varchar(128)		NOT NULL DEFAULT '',
	subject		varchar(128)		NOT NULL DEFAULT '',
	message_id	varchar(128)		NOT NULL DEFAULT '',
	content_type	varchar(128)	NOT NULL DEFAULT '',
	size		bigint UNSIGNED		NOT NULL DEFAULT 1024,

	PRIMARY KEY(id),
	INDEX id_rainloop_ab_message_index (message_id)

)/*!40000 ENGINE=INNODB *//*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;

MYSQLINITIAL;
				break;

			case 'pgsql':
				$sInitial = <<<POSTGRESINITIAL

CREATE TABLE rainloop_ab_message (
	id		bigserial		PRIMARY KEY,
	uid		bigserial	NOT NULL DEFAULT '',
);

CREATE INDEX id_rainloop_ab_message_index ON rainloop_ab_message (id_user);

POSTGRESINITIAL;
				break;

			case 'sqlite':
				$sInitial = <<<SQLITEINITIAL

CREATE TABLE rainloop_ab_message (
	id		integer		NOT NULL PRIMARY KEY,
	uid			integer		NOT NULL,
);

CREATE INDEX id_rainloop_ab_message_index ON rainloop_ab_message (id_user);

SQLITEINITIAL;
				break;
		}

		if (0 < \strlen($sInitial))
		{
			$aList = \explode(';', \trim($sInitial));
			foreach ($aList as $sV)
			{
				$sV = \trim($sV);
				if (0 < \strlen($sV))
				{
					$aResult[] = $sV;
				}
			}
		}
		\Rainloop\ChromePhp::log("getInitialTablesArray", $sDbType, $aResult);
		return $aResult;
	}

	/**
	 * @return bool
	 */
	public function SyncDatabase()
	{
		static $mCache = null;
		if (null !== $mCache)
		{
			return $mCache;
		}

		$mCache = false;
		\Rainloop\ChromePhp::log("SyncDatabase");
		switch ($this->sDsnType)
		{
			case 'mysql':
				$mCache = $this->dataBaseUpgrade($this->sDsnType.'-ab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType),
					2 => array(
'ALTER TABLE rainloop_ab_message CHANGE subject subject varchar(255) NOT NULL DEFAULT \'\';'
					),
				));
				break;
			case 'pgsql':
				$mCache = $this->dataBaseUpgrade($this->sDsnType.'-ab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType),
					2 => array()
				));
				break;
			case 'sqlite':
				$mCache = $this->dataBaseUpgrade($this->sDsnType.'-ab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType),
					2 => array()
				));
				break;
		}

		return $mCache;
	}

	/**
	 * @return array
	 */
	protected function getPdoAccessData()
	{
		return array($this->sDsnType, $this->sDsn, $this->sUser, $this->sPassword);
	}
}