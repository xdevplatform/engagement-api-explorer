class AuthDropdown extends Emitter {
  async authenticate({accessToken, accessTokenSecret}) {
    try {
      const body = {};

      const response = await http(
        'https://api.twitter.com/1.1/account/verify_credentials.json', {
          method: 'GET',
          headers: TokenStore.getAccessToken()
        });

      const json = await response.json();

      if (json.id) {
        this.props.user = json;
        TokenStore.setUser(json);
        this.setState({
          isAuthenticated: true,
          authenticationError: null,
        });
      } else {
        this.setState({isAuthenticated: false});
      }
    } catch (e) {
      console.error(e);
    }
  }

  async logout() {
    const authHeaders = TokenStore.getAccessToken();

    const endpoint = new URL('/1.1/oauth/invalidate_token.json', 'https://api.twitter.com');
    endpoint.searchParams.set('access_token', authHeaders[TokenStore.AccessToken]);
    endpoint.searchParams.set('access_token_secret', authHeaders[TokenStore.AccessTokenSecret]);

    await http(endpoint, {
      method: 'POST',
      headers: authHeaders,
    });

    TokenStore.reset();
    location.href = '/';
  }

  dispatchAction(el) {
    if (el.target.nodeName.toLowerCase() !== 'a') {
      return false;
    }

    const href = $(el.target).attr('href');

    switch (href) {
      case '#logout':
        this.logout();
        return false;

      default:
        return false;
    }
  }

  render() {
    if (this.state.isAuthenticated === false) {
      $('#authModal').modal('show');
      return;
    }

    if (this.state.authenticationError) {
      const errorMessage = `Error: ${this.state.authenticationError.message} (Error code: ${this.state.authenticationError.code})`
      $('#authError').text(errorMessage).show();
      return;
    }

    if (this.state.isAuthenticated && this.props.user) {
      $('#twitterLogo').hide();
      $('#userDropdown button').addClass('dropdown-toggle');
      $('#userDropdown button>span').text(this.props.user.screen_name);
      $('#userDropdown button').prepend($('<img>').attr('src', this.props.user.profile_image_url_https));

      $('#userName').text(this.props.user.name);
      $('#userQueryLabel>div').text(`from:${this.props.user.screen_name}`);
    }

  }

  constructor(element) {
    super(element);
    Settings.init();
    
    const params = new URLSearchParams(location.search);
    if (params.has('token') && params.has('secret')) {
      TokenStore.setAccessToken(
        params.get('token'),
        params.get('secret'));

      location.search = '';
      location.hash = '';
    }

    this.authenticate(TokenStore.getAccessToken());
    this.setState({isAuthenticated: TokenStore.isAuthenticated()});
  }
}
