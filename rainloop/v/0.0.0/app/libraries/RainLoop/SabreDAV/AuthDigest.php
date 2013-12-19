<?php

namespace RainLoop\SabreDAV;

class AuthBasic extends \Sabre\DAV\Auth\Backend\AbstractDigest
{
	/**
	 * @var \RainLoop\Providers\PersonalAddressBook
	 */
    private $oPersonalAddressBook;

    /**
     * @param \RainLoop\Providers\PersonalAddressBook $oPersonalAddressBook
     */
    public function __construct($oPersonalAddressBook)
	{
        $this->oPersonalAddressBook = $oPersonalAddressBook;
    }

    /**
     * @return bool
     */
    public function getDigestHash($sRealm, $sUserName)
	{
		$this->currentUser = $sUserName;
		return true; // TODO
	}
}
