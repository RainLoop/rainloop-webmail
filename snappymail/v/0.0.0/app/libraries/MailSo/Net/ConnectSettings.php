<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2022 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Net;

/**
 * @category MailSo
 * @package Net
 */
class ConnectSettings
{
	public
		$host,

		$port,

		// none, TLS, STARTTLS
		$type = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT,

		// https://www.php.net/context.ssl
		$ssl = [
//			'peer_name' => '',
//			'peer_fingerprint' => '', // string | array
			'verify_peer' => true,
			'verify_peer_name' => true,
			'allow_self_signed' => false,
//			'cafile' => '',
//			'capath' => '',

//			'ciphers' => 'HIGH:!SSLv2:!SSLv3',
			'SNI_enabled' => true,
			'disable_compression' => true,
			'security_level' => 1,

//			'local_cert' => '',
//			'local_pk' => '',
//			'passphrase' => '',

//			'verify_depth' => 0,
//			'capture_peer_cert' => false,
//			'capture_peer_cert_chain' => false,
		];

	function __construct()
	{
		// TODO: This should be moved to \RainLoop\Model\Domain
		$oConfig = \RainLoop\API::Config();
		$this->ssl['verify_peer'] = !!$oConfig->Get('ssl', 'verify_certificate', false);
		$this->ssl['verify_peer_name'] = !!$oConfig->Get('ssl', 'verify_certificate', false);
		$this->ssl['allow_self_signed'] = !!$oConfig->Get('ssl', 'allow_self_signed', true);
		$this->ssl['security_level'] = (int) $oConfig->Get('ssl', 'security_level', 1);
//		$this->ssl['local_cert'] = (string) $oConfig->Get('ssl', 'client_cert', '');
//		$this->ssl['cafile'] = (string) $oConfig->Get('ssl', 'cafile', '');
//		$this->ssl['capath'] = (string) $oConfig->Get('ssl', 'capath', '');
	}

	public static function fromArray(array $aSettings) : self
	{
		$object = new self;
		$object->host = $aSettings['Host'];
		$object->port = $aSettings['Port'];
		$object->type = $aSettings['Secure'];
		$object->ssl['verify_peer'] = !empty($aSettings['VerifySsl']);
		$object->ssl['verify_peer_name'] = !empty($aSettings['VerifySsl']);
		$object->ssl['allow_self_signed'] = !empty($aSettings['AllowSelfSigned']);
		if (!empty($aSettings['ClientCert'])) {
			$object->ssl['local_cert'] = $aSettings['ClientCert'];
		}
		return $object;
	}

}
