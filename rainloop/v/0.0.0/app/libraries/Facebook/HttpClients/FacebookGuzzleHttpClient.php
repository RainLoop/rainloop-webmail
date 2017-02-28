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

use GuzzleHttp\Client;
use GuzzleHttp\Message\ResponseInterface;
use GuzzleHttp\Ring\Exception\RingException;
use GuzzleHttp\Exception\RequestException;

class FacebookGuzzleHttpClient implements FacebookHttpClientInterface
{
    /**
     * @var \GuzzleHttp\Client The Guzzle client.
     */
    protected $guzzleClient;

    /**
     * @param \GuzzleHttp\Client|null The Guzzle client.
     */
    public function __construct(Client $guzzleClient = null)
    {
        $this->guzzleClient = $guzzleClient ?: new Client();
    }

    /**
     * @inheritdoc
     */
    public function send($url, $method, $body, array $headers, $timeOut)
    {
        $options = [
            'headers' => $headers,
            'body' => $body,
            'timeout' => $timeOut,
            'connect_timeout' => 10,
            'verify' => __DIR__ . '/certs/DigiCertHighAssuranceEVRootCA.pem',
        ];
        $request = $this->guzzleClient->createRequest($method, $url, $options);

        try {
            $rawResponse = $this->guzzleClient->send($request);
        } catch (RequestException $e) {
            $rawResponse = $e->getResponse();

            if ($e->getPrevious() instanceof RingException || !$rawResponse instanceof ResponseInterface) {
                throw new FacebookSDKException($e->getMessage(), $e->getCode());
            }
        }

        $rawHeaders = $this->getHeadersAsString($rawResponse);
        $rawBody = $rawResponse->getBody();
        $httpStatusCode = $rawResponse->getStatusCode();

        return new GraphRawResponse($rawHeaders, $rawBody, $httpStatusCode);
    }

    /**
     * Returns the Guzzle array of headers as a string.
     *
     * @param ResponseInterface $response The Guzzle response.
     *
     * @return string
     */
    public function getHeadersAsString(ResponseInterface $response)
    {
        $headers = $response->getHeaders();
        $rawHeaders = [];
        foreach ($headers as $name => $values) {
            $rawHeaders[] = $name . ": " . implode(", ", $values);
        }

        return implode("\r\n", $rawHeaders);
    }
}
