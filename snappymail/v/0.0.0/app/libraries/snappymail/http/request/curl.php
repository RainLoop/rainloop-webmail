<?php

namespace SnappyMail\HTTP\Request;

use \SnappyMail\HTTP\Response;

class CURL extends \SnappyMail\HTTP\Request
{
	private
		$response_headers = array(),
		$response_body = '';

	public function supportsSSL() : bool
	{
		$v = \curl_version();
		if (\is_array($v)) {
			return \in_array('https', $v['protocols']);
		}
		return \is_string($v) ? !!\preg_match('/OpenSSL/i', $v) : false;
	}

	protected function __doRequest(string &$method, string &$request_url, &$body, array $extra_headers) : Response
	{
		$c = \curl_init();
		if (false === $c) {
			throw new \RuntimeException("Could not initialize CURL for URL '{$request_url}'");
		}

		$cv = \curl_version();
		// php.net/curl_setopt
		\curl_setopt_array($c, array(
			CURLOPT_USERAGENT      => $this->user_agent,
			CURLOPT_CONNECTTIMEOUT => $this->timeout,
			CURLOPT_TIMEOUT        => $this->timeout,
			CURLOPT_URL            => $request_url,
			CURLOPT_HEADERFUNCTION => array($this, 'fetchHeader'),
			CURLOPT_WRITEFUNCTION  => array($this, \is_resource($this->stream) ? 'streamData' : 'fetchData'),
			CURLOPT_SSL_VERIFYPEER => ($this->verify_peer || $this->ca_bundle),
//			CURLOPT_SSL_VERIFYHOST => $this->verify_peer ? 2 : 0,
//			CURLOPT_FOLLOWLOCATION => false,       // follow redirects
//			CURLOPT_MAXREDIRS      => 0,           // stop after 0 redirects
		));
//		\curl_setopt($c, CURLOPT_ENCODING , 'gzip');
		if (\defined('CURLOPT_NOSIGNAL')) {
			\curl_setopt($c, CURLOPT_NOSIGNAL, true);
		}
		if ($this->ca_bundle) {
			\curl_setopt($c, CURLOPT_CAINFO, $this->ca_bundle);
		}
		if ($extra_headers) {
			\curl_setopt($c, CURLOPT_HTTPHEADER, $extra_headers);
		}
        if ($this->auth['user'] && $this->auth['type']) {
            $auth = 0;
            if ($this->auth['type'] & self::AUTH_BASIC) {
                $auth |= CURLAUTH_BASIC;
            }
            if ($this->auth['type'] & self::AUTH_DIGEST) {
                $auth |= CURLAUTH_DIGEST;
            }
            \curl_setopt($c, CURLOPT_HTTPAUTH, $auth);
            \curl_setopt($c, CURLOPT_USERPWD,  $this->auth['user'] . ':' . $this->auth['pass']);
        }
		if ($this->proxy) {
            \curl_setopt($c, CURLOPT_PROXY, $this->proxy);
		}
		if ('HEAD' === $method) {
			\curl_setopt($c, CURLOPT_NOBODY, true);
		} else if ('GET' !== $method) {
			if ('POST' === $method) {
				\curl_setopt($c, CURLOPT_POST, true);
			} else {
				\curl_setopt($c, CURLOPT_CUSTOMREQUEST, $method);
			}
			if (!\is_null($body)) {
				\curl_setopt($c, CURLOPT_POSTFIELDS, $body);
			}
		}

		\curl_exec($c);

		try {
			$code = \curl_getinfo($c, CURLINFO_RESPONSE_CODE);
			if (!$code) {
				throw new \RuntimeException("Error " . \curl_errno($c) . ": " . \curl_error($c) . " for {$request_url}");
			}
			return new Response($request_url, $code, $this->response_headers, $this->response_body);
		} finally {
			\curl_close($c);
			$this->response_headers = array();
			$this->response_body = '';
		}
	}

	protected function fetchHeader($ch, $header)
	{
		static $headers = [];
		if (!\strlen(\rtrim($header))) {
			$this->response_headers = $headers;
			$headers = [];
		} else {
			$headers[] = \rtrim($header);
		}
		return \strlen($header);
	}

	protected function fetchData($ch, $data)
	{
		if ($this->max_response_kb) {
			$data = \substr($data, 0, \min(\strlen($data), ($this->max_response_kb*1024) - \strlen($this->response_body)));
		}
		$this->response_body .= $data;
		return \strlen($data);
	}

	protected function streamData($ch, $data)
	{
		return \fwrite($this->stream, $data);
	}

}
