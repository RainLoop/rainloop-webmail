<?php

class LdapContactsSuggestions implements \RainLoop\Providers\Suggestions\ISuggestions
{
	/**
	 * @var string
	 */
	private $sHostName = '127.0.0.1';

	/**
	 * @var int
	 */
	private $iHostPort = 389;

	/**
	 * @var string
	 */
	private $sAccessDn = null;

	/**
	 * @var string
	 */
	private $sAccessPassword = null;

	/**
	 * @var string
	 */
	private $sUsersDn = '';

	/**
	 * @var string
	 */
	private $sObjectClass = 'inetOrgPerson';

	/**
	 * @var string
	 */
	private $sUidField = 'uid';

	/**
	 * @var string
	 */
	private $sNameField = 'givenname';

	/**
	 * @var string
	 */
	private $sEmailField = 'mail';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	/**
	 * @var string
	 */
	private $sAllowedEmails = '';

	/**
	 * @param string $sHostName
	 * @param int $iHostPort
	 * @param string $sAccessDn
	 * @param string $sAccessPassword
	 * @param string $sUsersDn
	 * @param string $sObjectClass
	 * @param string $sNameField
	 * @param string $sEmailField
	 *
	 * @return \LdapContactsSuggestions
	 */
	public function SetConfig($sHostName, $iHostPort, $sAccessDn, $sAccessPassword, $sUsersDn, $sObjectClass, $sUidField, $sNameField, $sEmailField)
	{
		$this->sHostName = $sHostName;
		$this->iHostPort = $iHostPort;
		if (0 < \strlen($sAccessDn))
		{
			$this->sAccessDn = $sAccessDn;
			$this->sAccessPassword = $sAccessPassword;
		}
		$this->sUsersDn = $sUsersDn;
		$this->sObjectClass = $sObjectClass;
		$this->sUidField = $sUidField;
		$this->sNameField = $sNameField;
		$this->sEmailField = $sEmailField;

		return $this;
	}

	/**
	 * @param string $sAllowedEmails
	 *
	 * @return \LdapContactsSuggestions
	 */
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;

		return $this;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sQuery
	 * @param int $iLimit = 20
	 *
	 * @return array
	 */
	public function Process($oAccount, $sQuery, $iLimit = 20)
	{
		$sQuery = \trim($sQuery);

		if (2 > \strlen($sQuery))
		{
			return array();
		}
		else if (!$oAccount || !\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $this->sAllowedEmails))
		{
			return array();
		}

		$aResult = $this->ldapSearch($oAccount, $sQuery);

		$aResult = \RainLoop\Utils::RemoveSuggestionDuplicates($aResult);
		if ($iLimit < \count($aResult))
		{
			$aResult = \array_slice($aResult, 0, $iLimit);
		}

		return $aResult;
	}

	/**
	 * @param array $aLdapItem
	 * @param array $aEmailFields
	 * @param array $aNameFields
	 *
	 * @return array
	 */
	private function findNameAndEmail($aLdapItem, $aEmailFields, $aNameFields, $aUidFields)
	{
		$sEmail = $sName = $sUid = '';
		if ($aLdapItem)
		{
			foreach ($aEmailFields as $sField)
			{
				if (!empty($aLdapItem[$sField][0]))
				{
					$sEmail = \trim($aLdapItem[$sField][0]);
					if (!empty($sEmail))
					{
						break;
					}
				}
			}

			foreach ($aNameFields as $sField)
			{
				if (!empty($aLdapItem[$sField][0]))
				{
					$sName = \trim($aLdapItem[$sField][0]);
					if (!empty($sName))
					{
						break;
					}
				}
			}

			foreach ($aUidFields as $sField)
			{
				if (!empty($aLdapItem[$sField][0]))
				{
					$sUid = \trim($aLdapItem[$sField][0]);
					if (!empty($sUid))
					{
						break;
					}
				}
			}
		}

		return array($sEmail, $sName, $sUid);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sQuery
	 *
	 * @return array
	 */
	private function ldapSearch($oAccount, $sQuery)
	{
		$sSearchEscaped = $this->escape($sQuery);

		$aResult = array();
		$oCon = @\ldap_connect($this->sHostName, $this->iHostPort);
		if ($oCon)
		{
			$this->oLogger->Write('ldap_connect: connected', \MailSo\Log\Enumerations\Type::INFO, 'LDAP');

			@\ldap_set_option($oCon, LDAP_OPT_PROTOCOL_VERSION, 3);

			if (!@\ldap_bind($oCon, $this->sAccessDn, $this->sAccessPassword))
			{
				if (is_null($this->sAccessDn))
				{
					$this->logLdapError($oCon, 'ldap_bind (anonymous)');
				}
				else
				{
					$this->logLdapError($oCon, 'ldap_bind');
				}

				return $aResult;
			}

			$sDomain = \MailSo\Base\Utils::GetDomainFromEmail($oAccount->Email());
			$sSearchDn = \strtr($this->sUsersDn, array(
				'{domain}' => $sDomain,
				'{domain:dc}' => 'dc='.\strtr($sDomain, array('.' => ',dc=')),
				'{email}' => $oAccount->Email(),
				'{email:user}' => \MailSo\Base\Utils::GetAccountNameFromEmail($oAccount->Email()),
				'{email:domain}' => $sDomain,
				'{login}' => $oAccount->Login(),
				'{imap:login}' => $oAccount->Login(),
				'{imap:host}' => $oAccount->DomainIncHost(),
				'{imap:port}' => $oAccount->DomainIncPort()
			));

			$aEmails = empty($this->sEmailField) ? array() : \explode(',', $this->sEmailField);
			$aNames = empty($this->sNameField) ? array() : \explode(',', $this->sNameField);
			$aUIDs = empty($this->sUidField) ? array() : \explode(',', $this->sUidField);

			$aEmails = \array_map('trim', $aEmails);
			$aNames = \array_map('trim', $aNames);
			$aUIDs = \array_map('trim', $aUIDs);

			$aFields = \array_merge($aEmails, $aNames, $aUIDs);

			$aItems = array();
			$sSubFilter = '';
			foreach ($aFields as $sItem)
			{
				if (!empty($sItem))
				{
					$aItems[] = $sItem;
					$sSubFilter .= '('.$sItem.'=*'.$sSearchEscaped.'*)';
				}
			}

			$sFilter = '(&(objectclass='.$this->sObjectClass.')';
			$sFilter .= (1 < count($aItems) ? '(|' : '').$sSubFilter.(1 < count($aItems) ? ')' : '');
			$sFilter .= ')';

			$this->oLogger->Write('ldap_search: start: '.$sSearchDn.' / '.$sFilter, \MailSo\Log\Enumerations\Type::INFO, 'LDAP');
			$oS = @\ldap_search($oCon, $sSearchDn, $sFilter, $aItems, 0, 30, 30);
			if ($oS)
			{
				$aEntries = @\ldap_get_entries($oCon, $oS);
				if (is_array($aEntries))
				{
					if (isset($aEntries['count']))
					{
						unset($aEntries['count']);
					}

					foreach ($aEntries as $aItem)
					{
						if ($aItem)
						{
							$sName = $sEmail = '';
							list ($sEmail, $sName) = $this->findNameAndEmail($aItem, $aEmails, $aNames, $aUIDs);
							if (!empty($sEmail))
							{
								$aResult[] = array($sEmail, $sName);
							}
						}
					}
				}
				else
				{
					$this->logLdapError($oCon, 'ldap_get_entries');
				}
			}
			else
			{
				$this->logLdapError($oCon, 'ldap_search');
			}
		}
		else
		{
			return $aResult;
		}

		return $aResult;
	}

	/**
	 * @param string $sStr
	 *
	 * @return string
	 */
	public function escape($sStr)
	{
		$aNewChars = array();
		$aChars = array('\\', '*', '(', ')', \chr(0));

		foreach ($aChars as $iIndex => $sValue)
		{
			$aNewChars[$iIndex] = '\\'.\str_pad(\dechex(\ord($sValue)), 2, '0');
		}

		return \str_replace($aChars, $aNewChars, $sStr);
	}

	/**
	 * @param mixed $oCon
	 * @param string $sCmd
	 *
	 * @return string
	 */
	public function logLdapError($oCon, $sCmd)
	{
		if ($this->oLogger)
		{
			$sError = $oCon ? @\ldap_error($oCon) : '';
			$iErrno = $oCon ? @\ldap_errno($oCon) : 0;

			$this->oLogger->Write($sCmd.' error: '.$sError.' ('.$iErrno.')',
				\MailSo\Log\Enumerations\Type::WARNING, 'LDAP');
		}
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \LdapContactsSuggestions
	 */
	public function SetLogger($oLogger)
	{
		if ($oLogger instanceof \MailSo\Log\Logger)
		{
			$this->oLogger = $oLogger;
		}

		return $this;
	}
}
