<?php

class ChangePasswordMailcowDriver
{
    const
        NAME        = 'Mailcow',
        DESCRIPTION = 'Driver to change the email account password on Mailcow.';

    private $sHostName = '';
    private $sApiToken = '';

    /**
     * @var \MailSo\Log\Logger
     */
    private $oLogger = null;

    function __construct(\RainLoop\Config\Plugin $oConfig, \MailSo\Log\Logger $oLogger)
    {
        $this->oLogger = $oLogger;
        $this->sHostName = $oConfig->Get('plugin', 'mailcow_api_hostname', '');
        $this->sApiToken = $oConfig->Get('plugin', 'mailcow_api_token', '');
    }

    public static function isSupported() : bool
    {
        return true;
    }

    public static function configMapping() : array
    {
        return array(
            \RainLoop\Plugins\Property::NewInstance('mailcow_api_hostname')
                ->SetLabel('Mailcow API hostname'),
            \RainLoop\Plugins\Property::NewInstance('mailcow_api_token')
                ->SetLabel('API token')
                ->SetDescription('The Read/Write API token'),
        );
    }

    public function ChangePassword(\RainLoop\Model\Account $oAccount, string $sPrevPassword, string $sNewPassword) : bool
    {
        $url = 'https://'.$this->sHostName.'/api/v1/edit/mailbox';
        $headers = [
            'content-type' => 'application/json',
            'accept' => 'application/json',
            'X-API-Key' => $this->sApiToken,
        ];
        $body = array(
            'items' => [ $oAccount->Email() ],
            'attr' => [
                'password' => (string)$sNewPassword,
                'password2' => (string)$sNewPassword,
            ],
        );

        $ch = curl_init($url);
        $payload = json_encode($body);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array_map(function($k, $v) {return "$k: $v";}, array_keys($headers), $headers));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $result = curl_exec($ch);
        curl_close($ch);

        $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

        if ($status === 200 && $result && ($res = json_decode($result, true)) && $res[0]['type'] === 'success') {
            return true;
        }

        $this->oLogger->Write("Mailcow[Error]: Response: {$status} {$result}");
        return false;
    }
}
