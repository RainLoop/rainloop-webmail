<?php
/**
 * Based on Sabre\DAV\Client
 * @copyright Copyright (C) 2007-2015 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://sabre.io/license/ Modified BSD License
 */

namespace SnappyMail\DAV;

class Client
{
	/**
	 * The propertyMap is a key-value array.
	 *
	 * If you use the propertyMap, any {DAV:}multistatus responses with the
	 * proeprties listed in this array, will automatically be mapped to a
	 * respective class.
	 *
	 * The {DAV:}resourcetype property is automatically added. This maps to
	 * Sabre\DAV\Property\ResourceType
	 *
	 * @var array
	 */
	public $propertyMap = array(
//		'{DAV:}resourcetype' => 'SnappyMail\\DAV\\Property\\ResourceType'
	);

	protected $baseUri;

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
	 */
	function __construct(array $settings)
	{
		if (!isset($settings['baseUri'])) {
			throw new \InvalidArgumentException('A baseUri must be provided');
		}
		$this->baseUri = $settings['baseUri'];

		$this->HTTP = \SnappyMail\HTTP\Request::factory('socket');
		$this->HTTP->proxy = $settings['proxy'] ?? null;
		$this->HTTP->setAuth(3, $settings['userName'] ?? '', $settings['password'] ?? '');
		$this->HTTP->max_response_kb = 0;
		$this->HTTP->timeout = 15; // timeout in seconds.
		$this->HTTP->max_redirects = 1;
	}

	/**
	 * Enable/disable SSL peer verification
	 */
	public function setVerifyPeer(bool $value) : void
	{
		$this->HTTP->verify_peer = $value;
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
	 */
	public function propFind(string $url, array $properties, int $depth = 0) : array
	{
		$body = '<?xml version="1.0"?>' . "\n";
		$body.= '<d:propfind xmlns:d="DAV:">' . "\n";
		$body.= '  <d:prop>' . "\n";

		foreach ($properties as $property) {
			if (!\preg_match('/^{([^}]*)}(.*)$/', $property, $match)) {
				throw new \InvalidArgumentException('\'' . $property . '\' is not a valid clark-notation formatted string');
			}
			if ('DAV:' === $match[1]) {
				$body .= "    <d:{$match[2]} />\n";
			} else {
				$body .= "    <x:{$match[2]} xmlns:x=\"{$match[1]}\"/>\n";
			}
		}

		$body .= '  </d:prop>' . "\n";
		$body .= '</d:propfind>';

		if (!\preg_match('/^http(s?):\/\//', $url)) {
			// If the url starts with a slash, we must calculate the url based off
			// the root of the base url.
			if (0 === \strpos($url, '/')) {
				$parts = \parse_url($this->baseUri);
				$url = $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port'])?':' . $parts['port']:'') . $url;
			} else {
				$url = $this->baseUri . $url;
			}
		}
		$response = $this->HTTP->doRequest('PROPFIND', $url, $body, array(
			"Depth: {$depth}",
			'Content-Type: application/xml'
		));
		if (300 <= $response->status) {
			throw new \SnappyMail\HTTP\Exception('', $response->status, $response);
		}

		/**
		 * Parse the WebDAV multistatus response body
		 */
		$responseXML = \simplexml_load_string(
			/**
			 * Convert all instances of the DAV: namespace to urn:DAV
			 *
			 * This is unfortunately needed, because the DAV: namespace violates the xml namespaces
			 * spec, and causes the DOM to throw errors
			 *
			 * This is used to map the DAV: namespace to urn:DAV. This is needed, because the DAV:
			 * namespace is actually a violation of the XML namespaces specification, and will cause errors
			 */
			\preg_replace("/xmlns(:[A-Za-z0-9_]*)?=(\"|\')DAV:(\\2)/", "xmlns\\1=\\2urn:DAV\\2", $response->body),
			null, LIBXML_NOBLANKS | LIBXML_NOCDATA);

		if (false === $responseXML) {
			throw new \InvalidArgumentException('The passed data is not valid XML');
		}

		$responseXML->registerXPathNamespace('d', 'urn:DAV');

		$result = array();

		foreach ($responseXML->xpath('d:response') as $response) {
			$response->registerXPathNamespace('d', 'urn:DAV');
			$href = $response->xpath('d:href');
			$href = (string) $href[0];

			$properties = array();

			foreach ($response->xpath('d:propstat') as $propStat) {
				$propStat->registerXPathNamespace('d', 'urn:DAV');
				$status = $propStat->xpath('d:status');
				list($httpVersion, $statusCode, $message) = \explode(' ', (string)$status[0], 3);

				// Only using the propertymap for results with status 200.
				$propertyMap = $statusCode === '200' ? $this->propertyMap : array();

				$properties[$statusCode] = static::parseProperties(\dom_import_simplexml($propStat), $propertyMap);
			}

			$result[$href] = $properties;
		}

		if (0 === $depth) {
			\reset($result);
			return \current($result)[200] ?? array();
		}

		return \array_map(function($statusList){
			return $statusList[200] ?? array();
		}, $result);
	}

	/**
	 * Returns the 'clark notation' for an element.
	 *
	 * For example, and element encoded as:
	 * <b:myelem xmlns:b="http://www.example.org/" />
	 * will be returned as:
	 * {http://www.example.org}myelem
	 *
	 * This format is used throughout the SabreDAV sourcecode.
	 * Elements encoded with the urn:DAV namespace will
	 * be returned as if they were in the DAV: namespace. This is to avoid
	 * compatibility problems.
	 *
	 * This function will return null if a nodetype other than an Element is passed.
	 */
	public static function toClarkNotation(\DOMNode $dom) : ?string
	{
		// Mapping back to the real namespace, in case it was dav
		// Mapping to clark notation
		return XML_ELEMENT_NODE === $dom->nodeType
			? '{' . ('urn:DAV' == $dom->namespaceURI ? 'DAV:' : $dom->namespaceURI) . '}' . $dom->localName
			: null;
	}

	/**
	 * Parses all WebDAV properties out of a DOM Element
	 *
	 * Generally WebDAV properties are enclosed in {DAV:}prop elements. This
	 * method helps by going through all these and pulling out the actual
	 * propertynames, making them array keys and making the property values,
	 * well.. the array values.
	 *
	 * If no value was given (self-closing element) null will be used as the
	 * value. This is used in for example PROPFIND requests.
	 *
	 * Complex values are supported through the propertyMap argument. The
	 * propertyMap should have the clark-notation properties as it's keys, and
	 * classnames as values.
	 *
	 * When any of these properties are found, the fromDOMElement() method will be
	 * (statically) called. The result of this method is used as the value.
	 */
	protected static function parseProperties(\DOMElement $parentNode, array $propertyMap = array()) : array
	{
		$propList = array();
		foreach ($parentNode->childNodes as $propNode) {
			if ('{DAV:}prop' === self::toClarkNotation($propNode)) {
				foreach ($propNode->childNodes as $propNodeData) {
					/* If there are no elements in here, we actually get 1 text node, this special case is dedicated to netdrive */
					if (XML_ELEMENT_NODE == $propNodeData->nodeType) {
						$propertyName = self::toClarkNotation($propNodeData);
						if (isset($propertyMap[$propertyName])) {
							$propList[$propertyName] = \call_user_func(array($propertyMap[$propertyName], 'fromDOMElement'), $propNodeData);
						} else {
							$propList[$propertyName] = $propNodeData->textContent;
						}
					}
				}
			}
		}
		return $propList;
	}

}
