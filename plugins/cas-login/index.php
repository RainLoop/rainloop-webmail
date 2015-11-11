<?php
class CasLoginPlugin extends \RainLoop\Plugins\AbstractPlugin
{
    public function Init()
    {
        // $this->addHook('filter.login-credentials', 'FilterLoginCredentials');
        // $this->addHook('main.farbrica', 'MainFabrica');
        // $this->addHook('filter.app-data', FilterAppData);
        // $this->addHook('filter.http-paths', FilterHttpPaths)
        $this->addHook('filter.application-config', FilterApplicationConfig);
        $this->addJs('js/include.js');
    }

    // public function Support()                    
    // {
    //     if(!\class_exists(phpCas))
    //     {
    //         return 'phpCas extension should be installed before user this plugin';
    //     }
    // }
    // public function MainFabrica($sName, &$mResult)
    // public function FilterHttpPaths(&$aPaths)


    public function AccountManagementProvider($oConfig)
    {
        $sDsn = \trim($oConfig->get('contacts', 'pdo_dsn', ''));
        $sUser = \trim($oConfig->get('contacts', 'pdo_user', ''));
        $sPassword = (string) $oConfig->get('contacts', 'pdo_password', '');

        $sDsnType = \trim($oConfig->get('contacts', 'type', 'sqlite'));
        
        RainLoop\ChromePhp::log("in AMP:".$sDsn.";".$sUser.";".$sPassword.";".$sDsnType);
        $oDriver = new \RainLoop\Providers\AccountManagement\PdoAccountManagement($sDsn, $sUser, $sPassword, $sDsnType);
        RainLoop\ChromePhp::log("after oDriver");

        $oAccountManagementProvider = new \RainLoop\Providers\AccountManagement($oDriver);
        return $oAccountManagementProvider;
    }

    public function FilterApplicationConfig(&$oConfig)
    {

        phpCAS::setDebug('/tmp/phpCAS-rl.log'); // Schrijft debug informatie naar een log-file

        // Parameters: CAS version, CAS server url, CAS server port, CAS server URI (same as host), 
        // boolean indicating session start, communication protocol (SAML) between application and CAS server
        phpCAS::client(CAS_VERSION_3_0,'192.168.31.173',8443,'', true, 'saml');

        // Server from which logout requests are sent
        // phpCAS::handleLogoutRequests(true, array('cas1.ugent.be','cas2.ugent.be','cas3.ugent.be','cas4.ugent.be','cas5.ugent.be','cas6.ugent.be'));
        phpCAS::handleLogoutRequests(true,array('http://localhost:8080/php_cas_login/home.html'));

        // Path to the "trusted certificate authorities" file:
        // phpCAS::setCasServerCACert('/etc/ssl/certs/ca-certificates.crt');
        // No server verification (less safe!):
        phpCAS::setNoCasServerValidation();
        // The actual user authentication
        phpCAS::forceAuthentication(); 

        // Handle logout requests
        if (isset($_REQUEST['logout'])) {
                phpCAS::logout();
        }
        RainLoop\ChromePhp::log("in cas login");

        $sUser = phpCAS::getUser();

        $oAccountManagementProvider = $this->AccountManagementProvider($oConfig);

        $aResult = array();


        $aResult = $oAccountManagementProvider->GetEmailAndPassword($sUser);

        $oConfig->set('labs','dev_email',$aResult['email']);
        $oConfig->set('labs','dev_password',$aResult['passwd']);

        RainLoop\ChromePhp::log('aResult:'.$aResult['email']);


        //////////////////////////////////////////////////////////////////
        /////////////////////////////////////////////////////////////////
        // //?????????????????????????????????????
       

        // ChromePhp::log('hello world');
        // ChromePhp::log($oConfig);

        // echo "in cas login funciton.user is ".phpCAS::getUser();
        // $attr = phpCAS::getAttributes();
        // var_dump($attr);
        // foreach ($attr as $key => $value)
        // {
        //     if(!is_array($value))
        //     {
        //             echo '<li>' . $key . ' => ' . $value . '</li>';
        //     }
        //     else
        //     {
        //             echo '<li>' . $key . '</li>';
        //             echo '<ul>';
        //             foreach($value as $v)
        //             {
        //                     echo '<li>' . $v . '</li>';
        //             }
        //             echo '</ul>';
        //     }
        // }
        // echo '</ul>';
    }

    public function configMapping()
    {
        return Array(
            \RainLoop\Plugins\Property::NewInstance('label_1')->SetLabel('lable_1')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
                ->SetDescription('Throw an label 1 error instead of an access error.')
                ->SetDefaultValue(true),
            \RainLoop\Plugins\Property::NewInstance('label_2')->SetLabel('lable_2')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
                ->SetDescription('Throw an label 2 error instead of an access error.')
                ->SetDefaultValue('label 2 string'),
            \RainLoop\Plugins\Property::NewInstance('label_3')->SetLabel('lable_3')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
                ->SetDescription('Throw an label 3 error instead of an access error.')
                ->SetDefaultValue(true)
                ); 
    }
}

