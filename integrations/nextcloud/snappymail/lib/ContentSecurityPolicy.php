<?php

namespace OCA\SnappyMail;

class ContentSecurityPolicy extends \OCP\AppFramework\Http\ContentSecurityPolicy {

	/** @var bool Whether inline JS snippets are allowed */
	protected $inlineScriptAllowed = false;
	/** @var bool Whether eval in JS scripts is allowed */
	protected $evalScriptAllowed = true;
	/** @var bool Whether strict-dynamic should be set */
//	protected $strictDynamicAllowed = true; // NC24+
	/** @var bool Whether inline CSS is allowed */
	protected $inlineStyleAllowed = true;

	function __construct() {
		$CSP = \RainLoop\Api::getCSP();

		$this->allowedScriptDomains = \array_unique(\array_merge($this->allowedScriptDomains, $CSP->get('script-src')));
		$this->allowedScriptDomains = \array_diff($this->allowedScriptDomains, ["'unsafe-inline'", "'unsafe-eval'"]);

		// Nextcloud only sets 'strict-dynamic' when browserSupportsCspV3() ?
		\method_exists($this, 'useStrictDynamic')
			? $this->useStrictDynamic(true) // NC24+
			: $this->addAllowedScriptDomain("'strict-dynamic'");

		$this->allowedImageDomains = \array_unique(\array_merge($this->allowedImageDomains, $CSP->get('img-src')));

		$this->allowedStyleDomains = \array_unique(\array_merge($this->allowedStyleDomains, $CSP->get('style-src')));
		$this->allowedStyleDomains = \array_diff($this->allowedStyleDomains, ["'unsafe-inline'"]);

		$this->allowedFrameDomains = \array_unique(\array_merge($this->allowedFrameDomains, $CSP->get('frame-src')));

		$this->reportTo = \array_unique(\array_merge($this->reportTo, $CSP->report_to));
	}

	public function getSnappyMailNonce() {
		static $sNonce;
		if (!$sNonce) {
			$cspManager = \OC::$server->getContentSecurityPolicyNonceManager();
			$sNonce = $cspManager->getNonce() ?: \SnappyMail\UUID::generate();
			if (\method_exists($cspManager, 'browserSupportsCspV3') && !$cspManager->browserSupportsCspV3()) {
				$this->addAllowedScriptDomain("'nonce-{$sNonce}'");
			}
		}
		return $sNonce;
	}

}
