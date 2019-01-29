# Engagement API Explorer

Engagement API explorer is a fun way to explore metrics for your Tweets or for the public conversation.

This project contains the code to illustrate how to display engagement metrics using the following APIs:

- [Premium Search](https://developer.twitter.com/en/docs/tweets/search/overview/premium)
- [Embedded Tweets](https://developer.twitter.com/en/docs/twitter-for-websites/embedded-tweets/overview)
- [Engagement API](https://developer.twitter.com/en/docs/metrics/get-tweet-engagement/overview)

**This code is not considered production-ready. Never use this code in production.**

## Install and run

This project can be automatically deployed to Heroku. You can also run it on your local machine or any other instance.

### Configure

This project assumes you have a valid app environment in your [Developer Portal](https://developer.twitter.com/en/account/environments).

You will need to configure environment variables for your access tokens and your Search API URL.

### Deploy to Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

If the deploy is successful, you will then need to configure the following environment variables. See [Configuration](#Configuration) for more details.

### Run on your local machine

This project requires:

- Apache 2.4.37 or never
- PHP 7.3.1 or newer
- HTTPS configured

All the required dependencies are already built-in.

Clone this project somewhere in your machine. We will use `/usr/local/www/engagement-api-explorer` but you can specify a different path (if that's the case, just make sure you replace this path with yours in the examples.)

Make sure your virtualhost if configured similarly to this:

```
<VirtualHost *:443>
    DocumentRoot "/usr/local/www/engagement-api-explorer/public"
    ServerName engagement-api-demo.local
    SSLEngine on
    SSLCertificateFile "/usr/local/etc/httpd/server.crt"
    SSLCertificateKeyFile "/usr/local/etc/httpd/server.key"

    ErrorLog "/usr/local/var/log/httpd/engagement-api-explorer-error_log"
    CustomLog "/usr/local/var/log/httpd/engagement-api-explorer-access_log" common

    <Directory "/usr/local/www/engagement-api-explorer/public">
        AllowOverride All
        Order allow,deny
        Allow from all
        Require all granted
    </Directory>
</VirtualHost>
```


Next, configure your host file so engagement-api-demo.local points to your local machine:

`sudo echo 127.0.0.1 engagement-api-demo.local > /etc/hosts`

Restart your Apache server. If your configuration is correct, you will be able to access Engagement API Explorer at `https://engagement-api-demo.local`.

### Configuration

You will need to configure the following environment variables:

- `CONSUMER_KEY`: your app's Consumer API key
- `CONSUMER_SECRET`: your app's Consumer API secret key
- `ACCESS_TOKEN`: your access token
- `ACCESS_TOKEN_SECRET`: your access token secret
- `PREMIUM_SEARCH_API_URL`: your Search API URL complete with product name and environment. For example, if you use 30 day Search and your environment is labeled `dev`, the value will be `https://api.twitter.com/1.1/tweets/search/30day/dev.json`.

For Heroku, you can configure these variables via `heroku config:set` or by using your app's dashboard. For more details, refer to the [Heroku documentation on how to set vars](https://devcenter.heroku.com/articles/config-vars).

On your local deployment, you can create a dotenv file named `.env` to hold these configuration details. A template `env.template` is included with this repo. Simply run:

```
$ cp env.template .env
```

In the `.env` file, replace the placeholder values with your consumer keys and access tokens, and make sure the Search URL matches the environment and product you enabled in your Developer Portal.
