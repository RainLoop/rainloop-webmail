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
namespace Facebook;

use Facebook\HttpClients\FacebookHttpClientInterface;
use Facebook\HttpClients\FacebookCurlHttpClient;
use Facebook\HttpClients\FacebookStreamHttpClient;
use Facebook\Exceptions\FacebookSDKException;

/**
 * Class FacebookClient
 *
 * @package Facebook
 */
class FacebookClient
{
    /**
     * @const string Production Graph API URL.
     */
    const BASE_GRAPH_URL = 'https://graph.facebook.com';

    /**
     * @const string Graph API URL for video uploads.
     */
    const BASE_GRAPH_VIDEO_URL = 'https://graph-video.facebook.com';

    /**
     * @const string Beta Graph API URL.
     */
    const BASE_GRAPH_URL_BETA = 'https://graph.beta.facebook.com';

    /**
     * @const string Beta Graph API URL for video uploads.
     */
    const BASE_GRAPH_VIDEO_URL_BETA = 'https://graph-video.beta.facebook.com';

    /**
     * @const int The timeout in seconds for a normal request.
     */
    const DEFAULT_REQUEST_TIMEOUT = 60;

    /**
     * @const int The timeout in seconds for a request that contains file uploads.
     */
    const DEFAULT_FILE_UPLOAD_REQUEST_TIMEOUT = 3600;

    /**
     * @const int The timeout in seconds for a request that contains video uploads.
     */
    const DEFAULT_VIDEO_UPLOAD_REQUEST_TIMEOUT = 7200;

    /**
     * @var bool Toggle to use Graph beta url.
     */
    protected $enableBetaMode = false;

    /**
     * @var FacebookHttpClientInterface HTTP client handler.
     */
    protected $httpClientHandler;

    /**
     * @var int The number of calls that have been made to Graph.
     */
    public static $requestCount = 0;

    /**
     * Instantiates a new FacebookClient object.
     *
     * @param FacebookHttpClientInterface|null $httpClientHandler
     * @param boolean                          $enableBeta
     */
    public function __construct(FacebookHttpClientInterface $httpClientHandler = null, $enableBeta = false)
    {
        $this->httpClientHandler = $httpClientHandler ?: $this->detectHttpClientHandler();
        $this->enableBetaMode = $enableBeta;
    }

    /**
     * Sets the HTTP client handler.
     *
     * @param FacebookHttpClientInterface $httpClientHandler
     */
    public function setHttpClientHandler(FacebookHttpClientInterface $httpClientHandler)
    {
        $this->httpClientHandler = $httpClientHandler;
    }

    /**
     * Returns the HTTP client handler.
     *
     * @return FacebookHttpClientInterface
     */
    public function getHttpClientHandler()
    {
        return $this->httpClientHandler;
    }

    /**
     * Detects which HTTP client handler to use.
     *
     * @return FacebookHttpClientInterface
     */
    public function detectHttpClientHandler()
    {
        return function_exists('curl_init') ? new FacebookCurlHttpClient() : new FacebookStreamHttpClient();
    }

    /**
     * Toggle beta mode.
     *
     * @param boolean $betaMode
     */
    public function enableBetaMode($betaMode = true)
    {
        $this->enableBetaMode = $betaMode;
    }

    /**
     * Returns the base Graph URL.
     *
     * @param boolean $postToVideoUrl Post to the video API if videos are being uploaded.
     *
     * @return string
     */
    public function getBaseGraphUrl($postToVideoUrl = false)
    {
        if ($postToVideoUrl) {
            return $this->enableBetaMode ? static::BASE_GRAPH_VIDEO_URL_BETA : static::BASE_GRAPH_VIDEO_URL;
        }

        return $this->enableBetaMode ? static::BASE_GRAPH_URL_BETA : static::BASE_GRAPH_URL;
    }

    /**
     * Prepares the request for sending to the client handler.
     *
     * @param FacebookRequest $request
     *
     * @return array
     */
    public function prepareRequestMessage(FacebookRequest $request)
    {
        $postToVideoUrl = $request->containsVideoUploads();
        $url = $this->getBaseGraphUrl($postToVideoUrl) . $request->getUrl();

        // If we're sending files they should be sent as multipart/form-data
        if ($request->containsFileUploads()) {
            $requestBody = $request->getMultipartBody();
            $request->setHeaders([
                'Content-Type' => 'multipart/form-data; boundary=' . $requestBody->getBoundary(),
            ]);
        } else {
            $requestBody = $request->getUrlEncodedBody();
            $request->setHeaders([
                'Content-Type' => 'application/x-www-form-urlencoded',
            ]);
        }

        return [
            $url,
            $request->getMethod(),
            $request->getHeaders(),
            $requestBody->getBody(),
        ];
    }

    /**
     * Makes the request to Graph and returns the result.
     *
     * @param FacebookRequest $request
     *
     * @return FacebookResponse
     *
     * @throws FacebookSDKException
     */
    public function sendRequest(FacebookRequest $request)
    {
        if (get_class($request) === 'FacebookRequest') {
            $request->validateAccessToken();
        }

        list($url, $method, $headers, $body) = $this->prepareRequestMessage($request);

        // Since file uploads can take a while, we need to give more time for uploads
        $timeOut = static::DEFAULT_REQUEST_TIMEOUT;
        if ($request->containsFileUploads()) {
            $timeOut = static::DEFAULT_FILE_UPLOAD_REQUEST_TIMEOUT;
        } elseif ($request->containsVideoUploads()) {
            $timeOut = static::DEFAULT_VIDEO_UPLOAD_REQUEST_TIMEOUT;
        }

        // Should throw `FacebookSDKException` exception on HTTP client error.
        // Don't catch to allow it to bubble up.
        $rawResponse = $this->httpClientHandler->send($url, $method, $body, $headers, $timeOut);

        static::$requestCount++;

        $returnResponse = new FacebookResponse(
            $request,
            $rawResponse->getBody(),
            $rawResponse->getHttpResponseCode(),
            $rawResponse->getHeaders()
        );

        if ($returnResponse->isError()) {
            throw $returnResponse->getThrownException();
        }

        return $returnResponse;
    }

    /**
     * Makes a batched request to Graph and returns the result.
     *
     * @param FacebookBatchRequest $request
     *
     * @return FacebookBatchResponse
     *
     * @throws FacebookSDKException
     */
    public function sendBatchRequest(FacebookBatchRequest $request)
    {
        $request->prepareRequestsForBatch();
        $facebookResponse = $this->sendRequest($request);

        return new FacebookBatchResponse($request, $facebookResponse);
    }
}
