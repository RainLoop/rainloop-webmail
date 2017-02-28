<?php
/**
 * Copyright 2014 Facebook, Inc.
 *
 * You are hereby granted a non-exclusive, worldwide, royalty-free license to
 * use, copy, modify, and distribute this software in source code or binary
 * form for use in connection with the web services and APIs provided by
 * Facebook.
 *
 * As with any software that integrates with the Facebook platform, your use
 * of this software is subject to the Facebook Developer Principles and
 * Policies [http://developers.facebook.com/policy/]. This copyright notice
 * shall be included in all copies or substantial portions of the software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */
namespace Facebook\HttpClients;

use Facebook\Http\GraphRawResponse;
use Facebook\Exceptions\FacebookSDKException;

/**
 * Class FacebookCurlHttpClient
 *
 * @package Facebook
 */
class FacebookCurlHttpClient implements FacebookHttpClientInterface
{
    /**
     * @var string The client error message
     */
    protected $curlErrorMessage = '';

    /**
     * @var int The curl client error code
     */
    protected $curlErrorCode = 0;

    /**
     * @var string|boolean The raw response from the server
     */
    protected $rawResponse;

    /**
     * @var FacebookCurl Procedural curl as object
     */
    protected $facebookCurl;

    /**
     * @const Curl Version which is unaffected by the proxy header length error.
     */
    const CURL_PROXY_QUIRK_VER = 0x071E00;

    /**
     * @const "Connection Established" header text
     */
    const CONNECTION_ESTABLISHED = "HTTP/1.0 200 Connection established\r\n\r\n";

    /**
     * @param FacebookCurl|null Procedural curl as object
     */
    public function __construct(FacebookCurl $facebookCurl = null)
    {
        $this->facebookCurl = $facebookCurl ?: new FacebookCurl();
    }

    /**
     * @inheritdoc
     */
    public function send($url, $method, $body, array $headers, $timeOut)
    {
        $this->openConnection($url, $method, $body, $headers, $timeOut);
        $this->sendRequest();

        if ($curlErrorCode = $this->facebookCurl->errno()) {
            throw new FacebookSDKException($this->facebookCurl->error(), $curlErrorCode);
        }

        // Separate the raw headers from the raw body
        list($rawHeaders, $rawBody) = $this->extractResponseHeadersAndBody();

        $this->closeConnection();

        return new GraphRawResponse($rawHeaders, $rawBody);
    }

    /**
     * Opens a new curl connection.
     *
     * @param string $url     The endpoint to send the request to.
     * @param string $method  The request method.
     * @param string $body    The body of the request.
     * @param array  $headers The request headers.
     * @param int    $timeOut The timeout in seconds for the request.
     */
    public function openConnection($url, $method, $body, array $headers, $timeOut)
    {
        $options = [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $this->compileRequestHeaders($headers),
            CURLOPT_URL => $url,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => $timeOut,
            CURLOPT_RETURNTRANSFER => true, // Follow 301 redirects
            CURLOPT_HEADER => true, // Enable header processing
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_CAINFO => __DIR__ . '/certs/DigiCertHighAssuranceEVRootCA.pem',
        ];

        if ($method !== "GET") {
            $options[CURLOPT_POSTFIELDS] = $body;
        }

        $this->facebookCurl->init();
        $this->facebookCurl->setoptArray($options);
    }

    /**
     * Closes an existing curl connection
     */
    public function closeConnection()
    {
        $this->facebookCurl->close();
    }

    /**
     * Send the request and get the raw response from curl
     */
    public function sendRequest()
    {
        $this->rawResponse = $this->facebookCurl->exec();
    }

    /**
     * Compiles the request headers into a curl-friendly format.
     *
     * @param array $headers The request headers.
     *
     * @return array
     */
    public function compileRequestHeaders(array $headers)
    {
        $return = [];

        foreach ($headers as $key => $value) {
            $return[] = $key . ': ' . $value;
        }

        return $return;
    }

    /**
     * Extracts the headers and the body into a two-part array
     *
     * @return array
     */
    public function extractResponseHeadersAndBody()
    {
        $headerSize = $this->getHeaderSize();

        $rawHeaders = mb_substr($this->rawResponse, 0, $headerSize);
        $rawBody = mb_substr($this->rawResponse, $headerSize);

        return [trim($rawHeaders), trim($rawBody)];
    }

    /**
     * Return proper header size
     *
     * @return integer
     */
    private function getHeaderSize()
    {
        $headerSize = $this->facebookCurl->getinfo(CURLINFO_HEADER_SIZE);
        // This corrects a Curl bug where header size does not account
        // for additional Proxy headers.
        if ($this->needsCurlProxyFix()) {
            // Additional way to calculate the request body size.
            if (preg_match('/Content-Length: (\d+)/', $this->rawResponse, $m)) {
                $headerSize = mb_strlen($this->rawResponse) - $m[1];
            } elseif (stripos($this->rawResponse, self::CONNECTION_ESTABLISHED) !== false) {
                $headerSize += mb_strlen(self::CONNECTION_ESTABLISHED);
            }
        }

        return $headerSize;
    }

    /**
     * Detect versions of Curl which report incorrect header lengths when
     * using Proxies.
     *
     * @return boolean
     */
    private function needsCurlProxyFix()
    {
        $ver = $this->facebookCurl->version();
        $version = $ver['version_number'];

        return $version < self::CURL_PROXY_QUIRK_VER;
    }
}
