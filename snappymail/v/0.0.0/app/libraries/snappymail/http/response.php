<?php

namespace SnappyMail\HTTP;

class Response
{
	public
		$request_uri,       # The URI that was passed to the fetcher
		$final_uri;         # The result of following redirects from the request_uri
	protected
		$status = 0,        # The HTTP status code returned from the final_uri
		$headers = array(), # The headers returned from the final_uri
		$body;              # The body returned from the final_uri

	function __construct(string $request_uri, int $status = 0, array $headers = null, $body = null)
	{
		if ($headers) {
			$name = null;
			$this->headers = array();
			foreach ($headers as $header) {
				if (\strpos($header, ':')) {
					list($name, $value) = \explode(':', $header, 2);
					$name = \strtolower(\trim($name));
					$value = \trim($value);
					if (isset($this->headers[$name])) {
						if (\is_array($this->headers[$name])) {
							$this->headers[$name][] = $value;
						} else {
							$this->headers[$name] = array($this->headers[$name], $value);
						}
					} else {
						$this->headers[$name] = $value;
					}
				} else if ($name) {
//					$this->headers[$name] .= \trim($header);
				}
			}
		}
		$this->request_uri = $request_uri;
		$this->final_uri   = $request_uri;
		$this->status      = (int) $status;
		if (\function_exists('gzinflate') && isset($this->headers['content-encoding'])
		 && (false !== \stripos($this->headers['content-encoding'], 'gzip'))) {
			$this->body = \gzinflate(\substr($body, 10, -4));
		} else {
			$this->body = $body;
		}
	}

	function __get($k)
	{
		return \property_exists($this, $k) ? $this->$k : null;
	}

	/**
	 * returns string, array or null
	 */
	public function getHeader($names)
	{
		$names = \is_array($names) ? $names : array($names);
		foreach ($names as $n) {
			$n = \strtolower($n);
			if (isset($this->headers[$n])) {
				return $this->headers[$n];
			}
		}
		return null;
	}

	public function getRedirectLocation() : ?string
	{
		if ($location = $this->getHeader('location')) {
			$uri = \is_array($location) ? $location[0] : $location;
			if (!\preg_match('#^[a-z][a-z0-9\\+\\.\\-]+://[^/]+#i', $uri)) {
				// no host
				\preg_match('#^([a-z][a-z0-9\\+\\.\\-]+://[^/]+)(/[^\\?\\#]*)#i', $this->final_uri, $match);
				if ('/' === $uri[0]) {
					// absolute path
					$uri = $match[1] . $uri;
				} else {
					// relative path
					$rpos = \strrpos($match[2], '/');
					$uri  = $match[1] . \substr($match[2], 0, $rpos+1) . $uri;
				}
			}
			return $uri;
		}
		return null;
	}

}
