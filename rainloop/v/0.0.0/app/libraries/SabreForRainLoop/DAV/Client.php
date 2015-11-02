<?php

namespace SabreForRainLoop\DAV;

/**
 * SabreDAV DAV client
 *
 * This client wraps around Curl to provide a convenient API to a WebDAV
 * server.
 *
 * NOTE: This class is experimental, it's api will likely change in the future.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class Client {

    /**
     * The propertyMap is a key-value array.
     *
     * If you use the propertyMap, any {DAV:}multistatus responses with the
     * proeprties listed in this array, will automatically be mapped to a
     * respective class.
     *
     * The {DAV:}resourcetype property is automatically added. This maps to
     * SabreForRainLoop\DAV\Property\ResourceType
     *
     * @var array
     */
    public $propertyMap = array();

    protected $baseUri;
    protected $userName;
    protected $password;
    protected $proxy;
    protected $trustedCertificates;

    /**
     * Basic authentication
     */
    const AUTH_BASIC = 1;

    /**
     * Digest authentication
     */
    const AUTH_DIGEST = 2;

    /**
     * The authentication type we're using.
     *
     * This is a bitmask of AUTH_BASIC and AUTH_DIGEST.
     *
     * If DIGEST is used, the client makes 1 extra request per request, to get
     * the authentication tokens.
     *
     * @var int
     */
    protected $authType;

    /**
     * Indicates if SSL verification is enabled or not.
     *
     * @var boolean
     */
    protected $verifyPeer;

    /**
     * Constructor
     *
     * Settings are provided through the 'settings' argument. The following
     * settings are supported:
     *
     *   * baseUri
     *   * userName (optional)
     *   * password (optional)
     *   * proxy (optional)
     *
     * @param array $settings
     */
    public function __construct(array $settings) {

        if (!isset($settings['baseUri'])) {
            throw new \InvalidArgumentException('A baseUri must be provided');
        }

        $validSettings = array(
            'baseUri',
            'userName',
            'password',
            'proxy',
        );

        foreach($validSettings as $validSetting) {
            if (isset($settings[$validSetting])) {
                $this->$validSetting = $settings[$validSetting];
            }
        }

        if (isset($settings['authType'])) {
            $this->authType = $settings['authType'];
        } else {
            $this->authType = self::AUTH_BASIC | self::AUTH_DIGEST;
        }

        $this->propertyMap['{DAV:}resourcetype'] = 'SabreForRainLoop\\DAV\\Property\\ResourceType';

    }

    /**
     * Add trusted root certificates to the webdav client.
     *
     * The parameter certificates should be a absolute path to a file
     * which contains all trusted certificates
     *
     * @param string $certificates
     */
    public function addTrustedCertificates($certificates) {
        $this->trustedCertificates = $certificates;
    }

    /**
     * Enables/disables SSL peer verification
     *
     * @param boolean $value
     */
    public function setVerifyPeer($value) {
        $this->verifyPeer = $value;
    }

    /**
     * Does a PROPFIND request
     *
     * The list of requested properties must be specified as an array, in clark
     * notation.
     *
     * The returned array will contain a list of filenames as keys, and
     * properties as values.
     *
     * The properties array will contain the list of properties. Only properties
     * that are actually returned from the server (without error) will be
     * returned, anything else is discarded.
     *
     * Depth should be either 0 or 1. A depth of 1 will cause a request to be
     * made to the server to also return all child resources.
     *
     * @param string $url
     * @param array $properties
     * @param int $depth
     * @return array
     */
    public function propFind($url, array $properties, $depth = 0) {

        $body = '<?xml version="1.0"?>' . "\n";
        $body.= '<d:propfind xmlns:d="DAV:">' . "\n";
        $body.= '  <d:prop>' . "\n";

        foreach($properties as $property) {

            list(
                $namespace,
                $elementName
            ) = XMLUtil::parseClarkNotation($property);

            if ($namespace === 'DAV:') {
                $body.='    <d:' . $elementName . ' />' . "\n";
            } else {
                $body.="    <x:" . $elementName . " xmlns:x=\"" . $namespace . "\"/>\n";
            }

        }

        $body.= '  </d:prop>' . "\n";
        $body.= '</d:propfind>';

        $response = $this->request('PROPFIND', $url, $body, array(
            'Depth' => $depth,
            'Content-Type' => 'application/xml'
        ));

        $result = $this->parseMultiStatus($response['body']);

        // If depth was 0, we only return the top item
        if ($depth===0) {
            reset($result);
            $result = current($result);
            return isset($result[200])?$result[200]:array();
        }

        $newResult = array();
        foreach($result as $href => $statusList) {

            $newResult[$href] = isset($statusList[200])?$statusList[200]:array();

        }

        return $newResult;

    }

    /**
     * Updates a list of properties on the server
     *
     * The list of properties must have clark-notation properties for the keys,
     * and the actual (string) value for the value. If the value is null, an
     * attempt is made to delete the property.
     *
     * @todo Must be building the request using the DOM, and does not yet
     *       support complex properties.
     * @param string $url
     * @param array $properties
     * @return void
     */
    public function propPatch($url, array $properties) {

        $body = '<?xml version="1.0"?>' . "\n";
        $body.= '<d:propertyupdate xmlns:d="DAV:">' . "\n";

        foreach($properties as $propName => $propValue) {

            list(
                $namespace,
                $elementName
            ) = XMLUtil::parseClarkNotation($propName);

            if ($propValue === null) {

                $body.="<d:remove><d:prop>\n";

                if ($namespace === 'DAV:') {
                    $body.='    <d:' . $elementName . ' />' . "\n";
                } else {
                    $body.="    <x:" . $elementName . " xmlns:x=\"" . $namespace . "\"/>\n";
                }

                $body.="</d:prop></d:remove>\n";

            } else {

                $body.="<d:set><d:prop>\n";
                if ($namespace === 'DAV:') {
                    $body.='    <d:' . $elementName . '>';
                } else {
                    $body.="    <x:" . $elementName . " xmlns:x=\"" . $namespace . "\">";
                }
                // Shitty.. i know
                $body.=htmlspecialchars($propValue, ENT_NOQUOTES, 'UTF-8');
                if ($namespace === 'DAV:') {
                    $body.='</d:' . $elementName . '>' . "\n";
                } else {
                    $body.="</x:" . $elementName . ">\n";
                }
                $body.="</d:prop></d:set>\n";

            }

        }

        $body.= '</d:propertyupdate>';

        $this->request('PROPPATCH', $url, $body, array(
            'Content-Type' => 'application/xml'
        ));

    }

    /**
     * Performs an HTTP options request
     *
     * This method returns all the features from the 'DAV:' header as an array.
     * If there was no DAV header, or no contents this method will return an
     * empty array.
     *
     * @return array
     */
    public function options() {

        $result = $this->request('OPTIONS');
        if (!isset($result['headers']['dav'])) {
            return array();
        }

        $features = explode(',', $result['headers']['dav']);
        foreach($features as &$v) {
            $v = trim($v);
        }
        return $features;

    }

    /**
     * Performs an actual HTTP request, and returns the result.
     *
     * If the specified url is relative, it will be expanded based on the base
     * url.
     *
     * The returned array contains 3 keys:
     *   * body - the response body
     *   * httpCode - a HTTP code (200, 404, etc)
     *   * headers - a list of response http headers. The header names have
     *     been lowercased.
     *
     * @param string $method
     * @param string $url
     * @param string $body
     * @param array $headers
     * @return array
     */
    public function request($method, $url = '', $body = null, $headers = array()) {

        $url = $this->getAbsoluteUrl($url);

        $curlSettings = array(
            CURLOPT_RETURNTRANSFER => true,
            // Return headers as part of the response
            CURLOPT_HEADER => true,
            CURLOPT_POSTFIELDS => $body,
			CURLOPT_USERAGENT => 'RainLoop DAV Client', // TODO rainloop
            // Automatically follow redirects
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
        );

        if($this->verifyPeer !== null) {
            $curlSettings[CURLOPT_SSL_VERIFYPEER] = $this->verifyPeer;
	        // TODO rainloop
	        if (!$this->verifyPeer) {
		        $curlSettings[CURLOPT_SSL_VERIFYHOST] = 0;
	        } // ---
        }

	    if($this->trustedCertificates) {
            $curlSettings[CURLOPT_CAINFO] = $this->trustedCertificates;
        }

        switch ($method) {
            case 'HEAD' :

                // do not read body with HEAD requests (this is necessary because cURL does not ignore the body with HEAD
                // requests when the Content-Length header is given - which in turn is perfectly valid according to HTTP
                // specs...) cURL does unfortunately return an error in this case ("transfer closed transfer closed with
                // ... bytes remaining to read") this can be circumvented by explicitly telling cURL to ignore the
                // response body
                $curlSettings[CURLOPT_NOBODY] = true;
                $curlSettings[CURLOPT_CUSTOMREQUEST] = 'HEAD';
                break;

            default:
                $curlSettings[CURLOPT_CUSTOMREQUEST] = $method;
                break;

        }

        // Adding HTTP headers
        $nHeaders = array();
        foreach($headers as $key=>$value) {

            $nHeaders[] = $key . ': ' . $value;

        }
        $curlSettings[CURLOPT_HTTPHEADER] = $nHeaders;

        if ($this->proxy) {
            $curlSettings[CURLOPT_PROXY] = $this->proxy;
        }

        if ($this->userName && $this->authType) {
            $curlType = 0;
            if ($this->authType & self::AUTH_BASIC) {
                $curlType |= CURLAUTH_BASIC;
            }
            if ($this->authType & self::AUTH_DIGEST) {
                $curlType |= CURLAUTH_DIGEST;
            }
            $curlSettings[CURLOPT_HTTPAUTH] = $curlType;
            $curlSettings[CURLOPT_USERPWD] = $this->userName . ':' . $this->password;
        }

//		var_dump($url);
//		var_dump($curlSettings);

        list(
            $response,
            $curlInfo,
            $curlErrNo,
            $curlError
        ) = $this->curlRequest($url, $curlSettings);

//		var_dump($response);

        $headerBlob = substr($response, 0, $curlInfo['header_size']);
        $response = substr($response, $curlInfo['header_size']);


        // In the case of 100 Continue, or redirects we'll have multiple lists
        // of headers for each separate HTTP response. We can easily split this
        // because they are separated by \r\n\r\n
        $headerBlob = explode("\r\n\r\n", trim($headerBlob, "\r\n"));

        // We only care about the last set of headers
        $headerBlob = $headerBlob[count($headerBlob)-1];

        // Splitting headers
        $headerBlob = explode("\r\n", $headerBlob);

        $headers = array();
        foreach($headerBlob as $header) {
            $parts = explode(':', $header, 2);
            if (count($parts)==2) {
                $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
            }
        }

        $response = array(
            'body' => $response,
            'statusCode' => $curlInfo['http_code'],
            'headers' => $headers
        );

        if ($curlErrNo) {
            throw new Exception('[CURL] Error while making request: ' . $curlError . ' (error code: ' . $curlErrNo . ')');
        }

        if ($response['statusCode']>=400) {
            switch ($response['statusCode']) {
                case 400 :
                    throw new Exception\BadRequest('Bad request');
                case 401 :
                    throw new Exception\NotAuthenticated('Not authenticated');
                case 402 :
                    throw new Exception\PaymentRequired('Payment required');
                case 403 :
                    throw new Exception\Forbidden('Forbidden');
                case 404:
                    throw new Exception\NotFound('Resource not found.');
                case 405 :
                    throw new Exception\MethodNotAllowed('Method not allowed');
                case 409 :
                    throw new Exception\Conflict('Conflict');
                case 412 :
                    throw new Exception\PreconditionFailed('Precondition failed');
                case 416 :
                    throw new Exception\RequestedRangeNotSatisfiable('Requested Range Not Satisfiable');
                case 500 :
                    throw new Exception('Internal server error');
                case 501 :
                    throw new Exception\NotImplemented('Not Implemented');
                case 507 :
                    throw new Exception\InsufficientStorage('Insufficient storage');
                default:
                    throw new Exception('HTTP error response. (errorcode ' . $response['statusCode'] . ')');
            }
        }

        return $response;

    }

    /**
     * Wrapper for all curl functions.
     *
     * The only reason this was split out in a separate method, is so it
     * becomes easier to unittest.
     *
     * @param string $url
     * @param array $settings
     * @return array
     */
    // @codeCoverageIgnoreStart
    protected function curlRequest($url, $settings) {

	    // TODO rainloop
        $curl = curl_init($url);
		$sSafeMode = strtolower(trim(@ini_get('safe_mode')));
		$bSafeMode = 'on' === $sSafeMode || '1' === $sSafeMode;

		if (!$bSafeMode && ini_get('open_basedir') === '')
		{
			curl_setopt_array($curl, $settings);
			$data = curl_exec($curl);
		}
		else
		{
			$settings[CURLOPT_FOLLOWLOCATION] = false;
			curl_setopt_array($curl, $settings);

			$max_redirects = isset($settings[CURLOPT_MAXREDIRS]) ? $settings[CURLOPT_MAXREDIRS] : 5;
			$mr = $max_redirects;
			if ($mr > 0)
			{
				$newurl = curl_getinfo($curl, CURLINFO_EFFECTIVE_URL);

				$rcurl = curl_copy_handle($curl);
				curl_setopt($rcurl, CURLOPT_HEADER, true);
				curl_setopt($rcurl, CURLOPT_NOBODY, true);
				curl_setopt($rcurl, CURLOPT_FORBID_REUSE, false);
				curl_setopt($rcurl, CURLOPT_RETURNTRANSFER, true);
				do
				{
					curl_setopt($rcurl, CURLOPT_URL, $newurl);
					$header = curl_exec($rcurl);
					if (curl_errno($rcurl))
					{
						$code = 0;
					}
					else
					{
						$code = curl_getinfo($rcurl, CURLINFO_HTTP_CODE);
						if ($code == 301 || $code == 302)
						{
							$matches = array();
							preg_match('/Location:(.*?)\n/', $header, $matches);
							$newurl = trim(array_pop($matches));
						}
						else
						{
							$code = 0;
						}
					}
				} while ($code && --$mr);

				curl_close($rcurl);
				if ($mr > 0)
				{
					curl_setopt($curl, CURLOPT_URL, $newurl);
				}
			}

			if ($mr == 0 && $max_redirects > 0)
			{
				$data = false;
			}
			else
			{
				$data = curl_exec($curl);
			}
		}

        return array(
            $data,
            curl_getinfo($curl),
            curl_errno($curl),
            curl_error($curl)
        );

    }
    // @codeCoverageIgnoreEnd

    /**
     * Returns the full url based on the given url (which may be relative). All
     * urls are expanded based on the base url as given by the server.
     *
     * @param string $url
     * @return string
     */
    protected function getAbsoluteUrl($url) {

        // If the url starts with http:// or https://, the url is already absolute.
        if (preg_match('/^http(s?):\/\//', $url)) {
            return $url;
        }

        // If the url starts with a slash, we must calculate the url based off
        // the root of the base url.
        if (strpos($url,'/') === 0) {
            $parts = parse_url($this->baseUri);
            return $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port'])?':' . $parts['port']:'') . $url;
        }

        // Otherwise...
        return $this->baseUri . $url;

    }

    /**
     * Parses a WebDAV multistatus response body
     *
     * This method returns an array with the following structure
     *
     * array(
     *   'url/to/resource' => array(
     *     '200' => array(
     *        '{DAV:}property1' => 'value1',
     *        '{DAV:}property2' => 'value2',
     *     ),
     *     '404' => array(
     *        '{DAV:}property1' => null,
     *        '{DAV:}property2' => null,
     *     ),
     *   )
     *   'url/to/resource2' => array(
     *      .. etc ..
     *   )
     * )
     *
     *
     * @param string $body xml body
     * @return array
     */
    public function parseMultiStatus($body) {

        $body = XMLUtil::convertDAVNamespace($body);

        $responseXML = simplexml_load_string($body, null, LIBXML_NOBLANKS | LIBXML_NOCDATA);
        if ($responseXML===false) {
            throw new \InvalidArgumentException('The passed data is not valid XML');
        }

        $responseXML->registerXPathNamespace('d', 'urn:DAV');

        $propResult = array();

        foreach($responseXML->xpath('d:response') as $response) {
            $response->registerXPathNamespace('d', 'urn:DAV');
            $href = $response->xpath('d:href');
            $href = (string)$href[0];

            $properties = array();

            foreach($response->xpath('d:propstat') as $propStat) {

                $propStat->registerXPathNamespace('d', 'urn:DAV');
                $status = $propStat->xpath('d:status');
                list($httpVersion, $statusCode, $message) = explode(' ', (string)$status[0],3);

                // Only using the propertymap for results with status 200.
                $propertyMap = $statusCode==='200' ? $this->propertyMap : array();

                $properties[$statusCode] = XMLUtil::parseProperties(dom_import_simplexml($propStat), $propertyMap);

            }

            $propResult[$href] = $properties;

        }

        return $propResult;

    }

}
