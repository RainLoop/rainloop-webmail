<?php


namespace RainLoop\Providers;

use \RainLoop\Providers\AccountManagement\Enumerations\PropertyType as PropertyType;

class AccountManagement extends \RainLoop\Providers\AbstractProvider
{
  /**
     * @var \RainLoop\Providers\AccountManagement\AccountManagementInterface
     */
    private $oDriver;

    /**
     * @param \RainLoop\Providers\AccountManagement\Interface $oDriver
     *
     * @return void
     */
    public function __construct($oDriver)
    {
        $this->oDriver = null;
        if ($oDriver instanceof \RainLoop\Providers\AccountManagement\AccountManagementInterface)
        {
            $this->oDriver = $oDriver;
        }
    } 

    /**
     * @return bool
     */
    public function IsActive()
    {
        return $this->oDriver instanceof \RainLoop\Providers\AccountManagement\AccountManagementInterface;
    }

    public function GetEmailAndPassword($sLogin)
    {
        return $this->IsActive() ? $this->oDriver->GetEmailAndPassword($sLogin) : false;
    }
}