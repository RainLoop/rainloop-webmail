<?php

namespace Crew\Unsplash;

use GuzzleHttp\Psr7\Response;

/**
 * Class Endpoint
 * @package Crew\Unsplash
 *
 * @method Response|null get(string $uri, array $arguments = null)
 * @method Response|null post(string $uri, array $arguments = null)
 * @method Response|null put(string $uri, array $arguments = null)
 * @method Response|null delete(string $uri, array $arguments = null)

 * @see \Crew\Unsplash\HttpClient::send()
 */
class Endpoint
{
    const RATE_LIMIT_ERROR_MESSAGE = "Rate Limit Exceeded";

    /**
     * @var array - All parameters that an endpoint can have
     */
    private $parameters;

    /**
     * @var array - List of accepted http actions
     */
    private static $acceptedHttpMethod = ['get', 'post', 'put', 'delete'];

    /**
     * Construct a new endpoint object and set the parameters from an array
     *
     * @param array $parameters
     */
    public function __construct($parameters = [])
    {
        // Cast array in case it's a stdClass
        $this->parameters = $this->addUtmSource((array) $parameters);
    }

    /**
     * Merge old parameters with the new one
     *
     * @param  array $parameters The parameters to update on the object
     * @return void
     */
    public function update(array $parameters)
    {
        $this->parameters = array_merge($this->parameters, (array)$parameters);
    }

    /**
     * Magic method to retrieve a specific parameter in the parameters array
     *
     * @param  string $key
     * @return mixed
     */
    public function __get($key)
    {
        return $this->parameters[$key];
    }

    /**
     * Magic method to inform if specific parameter is available
     *
     * @param  string $key
     * @return boolean
     */
    public function __isset($key)
    {
        return isset($this->parameters[$key]);
    }

    /**
     * Check if the HTTP method is accepted and send a HTTP request to it.
     * Retrieve error from the request and throw a new error
     *
     * @param  string $method HTTP action to trigger
     * @param  array $arguments Array containing all the parameters pass to the magic method
     * @throws \Crew\Unsplash\Exception if the HTTP request failed
     * @see \Crew\Unsplash\HttpClient::send()
     * @return Response|null
     */
    public static function __callStatic($method, $arguments)
    {
        // Validate if the $method is part of the accepted http method array
        if (!in_array($method, self::$acceptedHttpMethod)) {
            return null;
        }

        $httpClient = new HttpClient();
        $response = $httpClient->send($method, $arguments);

        // Validate if the request failed
        if (! self::isGoodRequest($response)) {
            throw new Exception(self::getErrorMessage($response), $response->getStatusCode());
        }

        return $response;
    }

    /**
     * @param string $responseBody
     * @param array  $headers
     * @param string $className
     *
     * @return PageResult
     */
    protected static function getPageResult($responseBody, array $headers, $className)
    {
        $data = json_decode($responseBody, true);
        $result = new PageResult($data['results'], $data['total'], $data['total_pages'], $headers, $className);

        return $result;
    }

    /**
     * @param string $responseBody
     * @param $object
     * @return array
     */
    protected static function getArray($responseBody, $object)
    {
        return array_map(function ($array) use ($object) {
            return new $object($array);
        }, json_decode($responseBody, true));
    }

    /**
     * Retrieve the response status code and determine if the request was successful.
     *
     * @param  \GuzzleHttp\Psr7\Response $response of the HTTP request
     * @return boolean
     */
    private static function isGoodRequest($response)
    {
        return $response->getstatusCode() >= 200 && $response->getstatusCode() < 300;
    }

    /**
     * Retrieve the error messages in the body
     *
     * @param  \GuzzleHttp\Psr7\Response $response of the HTTP request
     * @return array Array of error messages
     */
    private static function getErrorMessage($response)
    {
        $body = $response->getBody();

        $message = json_decode($body, true);
        $errors = [];

        if (is_array($message) && isset($message['errors'])) {
            $errors = $message['errors'];
        }

        if ($body == self::RATE_LIMIT_ERROR_MESSAGE) {
            $errors = [self::RATE_LIMIT_ERROR_MESSAGE];
        }

        return $errors;
    }

    /**
     * Append utm_* values
     * @param array $parameters
     * @return array
     */
    private function addUtmSource(array $parameters)
    {
        if (empty($parameters['links'])) {
            return $parameters;
        }

        $queryString = http_build_query([
            'utm_source' => HttpClient::$utmSource,
            'utm_medium' => 'referral',
            'utm_campaign' => 'api-credit'
        ]);

        array_walk_recursive($parameters, function (&$link) use ($queryString) {

            $parsedUrl = parse_url($link);

            if (!filter_var($link, FILTER_VALIDATE_URL) || $parsedUrl['host'] !== 'unsplash.com') {
                return;
            }

            $queryPrefix = '?';
            if (isset($parsedUrl['query'])) {
                $queryPrefix = '&';
            }

            $link = $link . $queryPrefix . $queryString;
            return $link;
        });

        return $parameters;
    }
}
