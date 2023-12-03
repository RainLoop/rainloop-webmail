<?php

namespace SnappyMail\HTTP;

abstract class Request
{
	const
		/**
		 * Authentication
		 */
		AUTH_BASIC = 1,
		AUTH_DIGEST = 2;

	public
		$timeout = 5, // timeout in seconds.
		$max_response_kb = 1024,
		$user_agent,
		$max_redirects = 0,
		$verify_peer = false,
		$proxy = null,
		$proxy_auth = null;

	protected
		$auth = [
			'type' => 0,
			'user' => '',
			'pass' => ''
		],
		$stream = null,
		$headers = array(),
		$ca_bundle = null;

	protected static $scheme_ports = array(
		'http'  => 80,
		'https' => 443
	);

	public static function factory(string $type = 'curl')
	{
		if ('curl' === $type && \function_exists('curl_init')) {
			return new Request\CURL();
		}
		return new Request\Socket();
	}

	function __construct()
	{
		$this->user_agent = 'SnappyMail/' . APP_VERSION;
	}

	public function setAuth(int $type, string $user,
		#[\SensitiveParameter]
		string $pass
	) : void
	{
		$this->auth = [
			'type' => $type,
			'user' => $user,
			'pass' => $pass
		];
	}

	public function addHeader($header)
	{
		$this->headers[] = $header;
		return $this;
	}

	public function streamBodyTo($stream)
	{
		if (!\is_resource($stream)) {
			throw new \Exception('Invalid body target');
		}
		$this->stream = $stream;
	}

	public function setCABundleFile($file)
	{
		$this->ca_bundle = $file;
	}

	/**
	 * Return whether a URI can be fetched.  Returns false if the URI scheme is not allowed
	 * or is not supported by this fetcher implementation; returns true otherwise.
	 *
	 * @return bool
	 */
	public function canFetchURI($uri)
	{
		if ('https:' === \substr($uri, 0, 6) && !$this->supportsSSL()) {
			\trigger_error('HTTPS URI unsupported fetching '.$uri, E_USER_WARNING);
			return false;
		}
		if (!self::URIHasAllowedScheme($uri)) {
			\trigger_error('URI fetching not allowed for '.$uri, E_USER_WARNING);
			return false;
		}
		return true;
	}

	/**
	 * Does this fetcher implementation (and runtime) support fetching HTTPS URIs?
	 * May inspect the runtime environment.
	 *
	 * @return bool $support True if this fetcher supports HTTPS
	 * fetching; false if not.
	 */
	abstract public function supportsSSL() : bool;

	abstract protected function __doRequest(string &$method, string &$request_url, &$body, array $extra_headers) : Response;

	public function doRequest($method, $request_url, $body = null, array $extra_headers = array()) : ?Response
	{
		$method = \strtoupper($method);
		$url    = $request_url;
		$etime  = \time() + $this->timeout;
		$redirects = \max(0, $this->max_redirects);
		if (\is_array($body)) {
			$body = \http_build_query($body, '', '&');
		}
		if ($body && 'GET' === $method) {
			$url .= (\strpos($url, '?') ? '&' : '?') . $body;
			$body = null;
		}
		do
		{
			if (!$this->canFetchURI($url)) {
				throw new \RuntimeException("Can't fetch URL: {$url}");
			}

			if (!self::URIHasAllowedScheme($url)) {
				throw new \RuntimeException("Fetching URL not allowed: {$url}");
			}

			$this->stream && \rewind($this->stream);
			$result = $this->__doRequest($method, $url, $body, \array_merge($this->headers, $extra_headers));

			// http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3
			// In response to a request other than GET or HEAD, the user agent MUST NOT
			// automatically redirect the request unless it can be confirmed by the user
			if ($redirects-- && \in_array($result->status, array(301, 302, 303, 307)) && \in_array($method, ['GET','HEAD'])) {
				$url = $result->getRedirectLocation();
			} else {
				$result->final_uri = $url;
				$result->request_uri = $request_url;
				return $result;
			}

		} while ($etime-time() > 0);

		return null;
	}

	/**
	 * Return whether a URI should be allowed. Override this method to conform to your local policy.
	 * By default, will attempt to fetch any http or https URI.
	 */
	public static function URIHasAllowedScheme($uri) : bool
	{
		return (bool) \preg_match('#^https?://#i', $uri);
	}

	public static function getSchemePort($scheme) : int
	{
		return self::$scheme_ports[$scheme] ?? 0;
	}
}
