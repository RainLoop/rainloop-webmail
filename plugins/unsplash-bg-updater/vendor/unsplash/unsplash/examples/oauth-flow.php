<?php
require '../vendor/autoload.php';
session_start();

// Landing on the page for the first time, setup connection with private application details registered with unsplash and redirect user to authenticate
if (!isset($_GET['code']) && !isset($_SESSION['token'])) {

    \Crew\Unsplash\HttpClient::init([
        'applicationId'	=> '{clientId}',
        'secret'		=> '{clientSecret}',
        'callbackUrl'	=> 'http://example.com'
    ]);
    $httpClient = new \Crew\Unsplash\HttpClient();
    $scopes = ['write_user', 'public'];

    header("Location: ". $httpClient::$connection->getConnectionUrl($scopes));
    exit;
}


// Unsplash sends user back with ?code=XXX, use this code to generate AccessToken
if (isset($_GET['code']) && !isset($_SESSION['token'])) {
    \Crew\Unsplash\HttpClient::init([
        'applicationId'	=> '{clientId}',
        'secret'		=> '{clientSecret}',
        'callbackUrl'	=> 'http://unsplash-api.dev'
    ]);

    try {
        $token = \Crew\Unsplash\HttpClient::$connection->generateToken($_GET['code']);
    } catch (Exception $e) {
        print("Failed to generate access token: {$e->getMessage()}");
        exit;
    }

    // Store the access token, use this for future requests
    $_SESSION['token'] = $token;
}

// Send requests to Unsplash
\Crew\Unsplash\HttpClient::init([
    'applicationId'	=> '{clientId}',
    'secret'		=> '{clientSecret}',
    'callbackUrl'	=> 'http://unsplash-api.dev'
], [
    'access_token' => $_SESSION['token']->getToken(),
    'expires_in' => 30000,
    'refresh_token' => $_SESSION['token']->getRefreshToken()
]);

$httpClient = new \Crew\Unsplash\HttpClient();
$owner = $httpClient::$connection->getResourceOwner();

print("Hello {$owner->getName()}, you have authenticated successfully");