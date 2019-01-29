'use strict';
async function http(input, init = {}) {
  init.headers = init.headers || {};
  init.headers['X-Request-URL'] = input.toString();
  return fetch('/proxy?q=' + new Date().getTime(), init);
}

class Settings {
  static get KSettings() { return 'Settings' }
  static get KModeOwned() { return 'owned' }
  static get KModePublic() { return 'public' }
  static get Defaults() { 
    return {
      mode: Settings.KModeOwned,
      endpointURL: 'https://api.twitter.com/1.1/tweets/search/fullarchive/premiumsearch.json',
    };
  }

  static get AllowedValues() {
    return {
      mode: new RegExp(`${Settings.KModeOwned}|${Settings.KModePublic}`),
      endpointURL: new RegExp('https://api\.twitter\.com/1\.1/tweets/search/30day|fullarchive/[\\d\\w\\-_]+\.json'),
    };
  }

  static set(key, value) {
    if (!Settings.Defaults.hasOwnProperty(key)) {
      return;
    }

    if (!Settings.AllowedValues[key].test(value)) {
      throw new TypeError(`Invalid value for ${key}: value must match ${Settings.AllowedValues[key]}`);
      return;
    }

    let settings = JSON.parse(localStorage.getItem(Settings.KSettings) || null);

    if (!settings) {      
      settings = Settings.Defaults;
    }
    
    settings[key] = value;
    localStorage.setItem(Settings.KSettings, JSON.stringify(settings));
    $(document).triggerHandler('Settings:change', [key]);
  }

  static get(key) {
    if (!Settings.Defaults.hasOwnProperty(key)) {
      return;
    }

    const settings = JSON.parse(localStorage.getItem(Settings.KSettings) || null);
    return settings && settings[key] ? settings[key] : Settings.Defaults[key];
  }

  static init() {
    if (!localStorage.getItem(Settings.KSettings)) {
      localStorage.setItem(Settings.KSettings, JSON.stringify(Settings.Defaults));  
    }
  }

  static reset() {
    localStorage.removeItem(Settings.KSettings);
  }
}

class TokenStore {
  static get AccessToken() { return 'X-Access-Token' }
  static get AccessTokenSecret() { return 'X-Access-Token-Secret' }
  static get Env() { return 'Env' }
  static get User() { return 'User' }

  static reset() {
    localStorage.removeItem(TokenStore.AccessToken);
    localStorage.removeItem(TokenStore.AccessTokenSecret);
    localStorage.removeItem(TokenStore.Env);
    localStorage.removeItem(TokenStore.User);
  }

  static isAuthenticated() {
    return !!(localStorage.getItem(TokenStore.AccessToken)
      && localStorage.getItem(TokenStore.AccessTokenSecret));
  }

  static getEnv() {
    return localStorage.getItem(TokenStore.EnvName);
  }

  static setEnv(env) {
    localStorage.setItem(TokenStore.EnvName, env);
    $(document).triggerHandler('TokenStore:change', [TokenStore.EnvName]);
  }

  static setAccessToken(accessToken, accessTokenSecret) {
    localStorage.setItem(TokenStore.AccessToken, accessToken);
    localStorage.setItem(TokenStore.AccessTokenSecret, accessTokenSecret);
    $(document).triggerHandler('TokenStore:change', [TokenStore.AccessToken, TokenStore.AccessTokenSecret]);
  }

  static getAccessToken() {
    let out = {};
    out[TokenStore.AccessToken] = localStorage.getItem(TokenStore.AccessToken);
    out[TokenStore.AccessTokenSecret] = localStorage.getItem(TokenStore.AccessTokenSecret);
    return out;
  }

  static setUser(value) {
    localStorage.setItem(TokenStore.User, JSON.stringify(value));
    $(document).triggerHandler('TokenStore:change', [TokenStore.User]);
  }

  static getUser() {
    return JSON.parse(localStorage.getItem(TokenStore.User) || null);
  }
}

class EngagementClient {
  static get TimeInterval28Days() { return 60 * 60 * 24 * 28 * 1000; }
  static get TimeInterval1Hour() { return 60 * 60 * 1000; }

  static hash(tweets, fromDate) {
    const fromDateObject = fromDate === null ? new Date(fromDate) : new Date();
    const date = fromDateObject.toISOString().replace(/T(\d{2}).*$/, 'T$1:00:00Z');

    return date + '-' + tweets.sort().join('-');
  }

  static getEngagementMetricByMode() {
    const engagementTypesPublic = ['favorites', 'retweets', 'replies'];
    const engagementTypesOwned = [
      'favorites',
      'retweets',
      'replies',
      'impressions',
      'engagements',      
      'hashtag_clicks',
      'media_clicks',
      'url_clicks',
      'email_tweet',
      'user_follows',
      'user_profile_clicks',
      'permalink_clicks',
      'video_views',
      'app_opens',
      'app_install_attempts',
      'detail_expands',
      'permalink_clicks',
      'video_views'];

    const mode = Settings.get('mode');
    return mode === 'owned' ? engagementTypesOwned : engagementTypesPublic;
  }

  static async getEngagement(tweets, fromDate = null) {
    this.constructor.cache = this.constructor.cache || {};

    const hash = this.hash(tweets, fromDate);
    if (this.constructor.cache[hash]) {
      return Promise.resolve(this.constructor.cache[hash]);
    }

    const engagementTypes = this.getEngagementMetricByMode();

    let requestOptions = {
      method: 'POST',
      body: {
        tweet_ids: tweets,
        engagement_types: engagementTypes,
        groupings: {
          aggregations: {
            group_by: ['engagement.type', 'engagement.day', 'engagement.hour'],
          },
          totals: {
            group_by: ['tweet.id', 'engagement.type'],
          },
          hourly_totals: {
            group_by: ['engagement.type', 'tweet.id', 'engagement.day', 'engagement.hour'],
          }
        }
      },
    };

    if (fromDate !== null) {
      const fromDateObject = new Date(fromDate);
      fromDateObject.setTime(fromDateObject.getTime() - this.TimeInterval1Hour);
      requestOptions.body.start = fromDateObject.toISOString().replace(/T(\d{2}).*$/, 'T$1:00:00Z');
      let toDate = new Date(fromDateObject.getTime() + this.TimeInterval28Days);
      toDate = toDate.getTime() > new Date().getTime() ? new Date() : toDate;
      requestOptions.body.end = toDate.toISOString().replace(/T(\d{2}).*$/, 'T$1:00:00Z');
    }

    requestOptions.body = JSON.stringify(requestOptions.body);

    requestOptions.headers = Object.assign({}, TokenStore.getAccessToken(), {'X-Raw-Body': true});
    if (Settings.get('mode') === 'public') {
      requestOptions.headers['X-Bearer-Token'] = 'yes, please';
    }

    const response = await http(
      'https://data-api.twitter.com/insights/engagement/historical',
      requestOptions);

    this.constructor.cache[hash] = await response.json();
    return this.constructor.cache[hash];
  }
}
