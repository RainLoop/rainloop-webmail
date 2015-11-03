<?php

namespace RailLoop\Providers\AccountManagement;

use \RailLoop\Providers\AccountManagement\ProperType;

class PdoAccountManagement
    extends \RainLoop\Common\PdoAbstract
    implements \RainLoop\Providers\AccountManagement\AccountManagementInterface
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

        $this->bExplain = false; // debug
    }

    /**
     * @return bool
     */
    public function IsSupported()
    {
        $aDrivers = \class_exists('PDO') ? \PDO::getAvailableDrivers() : array();
        return \is_array($aDrivers) ? \in_array($this->sDsnType, $aDrivers) : false;
    }

    public function GetEmailAndPassword($sLogin = '')
    {
       $aResult = array();
       //TODO add sLogin string check
       $oStmt = $this->prepareAndExecute('SELECT * FROM rainloop_users WHERE rl_login = :rl_login',
        array(
            ':rl_login' => array($sLogin, \PDO::PARAM_VAR)
            ));

       if ($oStmt)
       {
        $aFetch = $oStmt->fetchAll(\PDO::FETECH_ASSOC);
        if (\is_array($aFetch) && 0 < \count($aFetch))
            {
                $aResult['email'] = $aFetch['rl_email'];
                $aResult['passwd'] = $aFetch['email_password'];

                retrun $aResult;
            }
       }
    }


}