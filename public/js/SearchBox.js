class SearchBox extends Emitter {
  constructor(element) {
    super(element);
    this.props = {requestOptions: {}, lastQuery: '', operators: {}};
    this.children.searchButton = document.getElementById('searchButton');
    this.children.searchBox = document.getElementById('searchBox');

    $('#searchBox').tooltip();
    $('#searchResults').on('click', '.list-group-item', event => {
      $(event.target).toggleClass('active');
      $(document).trigger('SearchBox:select');
      return false;
    });

    $('.input-daterange').datepicker({
      endDate: 'today',
      todayBtn: 'linked',
      autoclose: true,
      format: 'yyyy-mm-dd',
    });

    $('.input-daterange input').on('input', (e) => {
      const date = new Date(e.target.value);

      if (!isNaN(date.getTime()) || e.target.value === '') {
        delete this.props.requestOptions[e.target.name];
      } else {
        this.props.requestOptions[e.target.name] = date.toISOString().split('T')[0] + '0000';
      }
    });

    $('.input-daterange input').on('changeDate', ((e) => {
      const target = $(e.target);

      if (target.attr('name') === 'fromDate') {
        $('.input-daterange input[name="toDate"]').datepicker('show');
      }

      this.props.requestOptions[target.attr('name')] = target.val().replace(/\-/g, '') + '0000';
    }).bind(this));

    this.initTypeahead();

    setTimeout(() => $('#searchQuery').focus(), 100);

    $(document).on('TokenStore:change', key => {
      switch (key) {
        case TokenStore.User:
          $('#userQueryLabel').text(TokenStore.getUser().screen_name);
          return;
        case TokenStore.AccessToken:
          this.setState({isAuthenticated: TokenStore.isAuthenticated()});  
          return;
      }
    }).on('Settings:change', key => {
      this.setState({'mode': Settings.get('mode')});
    });

    this.setState({isAuthenticated: TokenStore.isAuthenticated(), mode: Settings.get('mode')});
  }

  dispatchPerformSearch(event) {
    if (event.target === this.children.searchBox || event.target === this.children.searchButton) {
      if (this.isTweetIdSearch()) {
        this.performTweetIdSearch();
      } else {
        this.performSearch();
      }
      return false;
    }
  }

  async initTypeahead() {
    const request = await fetch('/premium.json');
    this.props.operators = await request.json();

    $('#searchQuery').typeahead({
      source: this.props.operators,
      changeInputOnSelect: false,
      changeInputOnMove: false,
      selectOnBlur: false,

      matcher: item => {
        const index = document.getElementById('searchQuery').selectionStart;
        const match = $('#searchQuery').val().slice(0, index).split(' ') || [];
        for (const token of match) {
          if (~item.name.indexOf(token.toLowerCase())) {
            return true
          }
        }
      },

      highlighter: item => {
        const index = document.getElementById('searchQuery').selectionStart;
        let text = $('#searchQuery').val().slice(0, index).split(' ').pop() || '';

        if (text === '') {
          return item;
        }
        var matches = item.match(/(>)([^<]*)(<)/g);
        var first = [];
        var second = [];
        var i;
        if (matches && matches.length) {
          // html
          for (i = 0; i < matches.length; ++i) {
            if (matches[i].length > 2) {// escape '><'
              first.push(matches[i]);
            }
          }
        } else {
          // text
          first = [];
          first.push(item);
        }
        text = text.replace((/[\(\)\/\.\*\+\?\[\]]/g), function (mat) {
          return '\\' + mat;
        });
        var reg = new RegExp(text, 'g');
        var m;
        for (i = 0; i < first.length; ++i) {
          m = first[i].match(reg);
          if (m && m.length > 0) {// find all text nodes matches
            second.push(first[i]);
          }
        }
        for (i = 0; i < second.length; ++i) {
          item = item.replace(second[i], second[i].replace(reg, '<strong>$&</strong>'));
        }
        return item;
      },

      afterSelect: item => {
        this.props.lastQuery = $('#searchQuery').val() || '';
        var searchQuery = document.getElementById('searchQuery');
        const index = searchQuery.selectionStart;
        let value = $('#searchQuery').val() || '';

        const match = $('#searchQuery').val().match(/(?<=[\s:]*)(\w+)/);
        value = [value.slice(0, match.index || 0), item.name, value.slice(index)].join('')

        $('#searchQuery').val(value);
        searchQuery.focus();
        searchQuery.setSelectionRange(index + item.name.length - match[0].length, index + item.name.length - match[0].length);
        return;
      }
    });
  }

  checkQuery() {
    const value = $('#searchQuery').val();
    if (!value) {
      return;
    }

    const [match] = value.match(/\bfrom:[\w\d\_]+\b/) || [];
    if (Settings.get('mode') === 'owned' && match && match !== 'from:' + TokenStore.getUser().screen_name) {
      $('#searchQuery').attr('title', `Operator 'from:' will be ignored in private mode.`).tooltip('show');
    } else {
      $('#searchQuery').removeAttr('title').tooltip('hide');
    }
  }

  isTweetIdSearch() {
    const query = $('#searchQuery').val();
    return !!query.match(/tweet:(\d+)/);
  }

  async performSearch() {
    this.setState({requestStatus: 'pending'});

    let query = $('#searchQuery').val() || '';
    const [match] = query || [''];

    if (Settings.get('mode') === 'owned' && !query.match(`from:${TokenStore.getUser().screen_name}`)) {
      query = query.replace(/(from:[\w\d\_]+)/g, '');
      query = `from:${TokenStore.getUser().screen_name} ${query}`;
    }

    let requestBody = Object.assign({
      query: query,
      maxResults: 10,
    }, this.props.requestOptions);

    const endpoint = new URL(Settings.get('endpointURL'));
    endpoint.searchParams.set('query', query);
    endpoint.searchParams.set('maxResults', 10);

    const response = await http(endpoint, {
      headers: {
        ...TokenStore.getAccessToken(),
        ...{'Content-type': 'application/json'},
      }
    });

    const body = await response.json();
    this.props.request = body;
    this.setState({requestStatus: 'complete'});
  }

  renderListGroupItem(tweet) {
    return $('<a href="#">')
      .addClass('list-group-item list-group-item-action flex-column align-items-start')
      .append($('<div>').attr('tweet-id', tweet.id_str))
      .data('tweet', tweet);
  }

  async stateDidChange() {
    if (this.state.requestStatus === 'complete' && !this.props.request.error) {
      this.props.tweets = [];

      this.props.request.results.forEach(data => this.props.tweets.push({tweet: data}));
    }
  }

  updateTweets() {
    $('div[tweet-id]').each((_, tweet) => {
      const id = tweet.getAttribute('tweet-id');
      twttr.widgets.createTweet(
        id, tweet,
        {
          conversation : 'none',    // or all
          theme        : 'light'    // or dark
        }).then(el => {
          const clone = $(el).parent().clone();
          $(el).parents('a').prepend(clone);
          clone.height($(el).parent().height());
          clone.width($(el).parent().width());
          clone.css({position: 'absolute', 'z-index': 999});
          clone.on('click', (e) => {
            e.preventDefault();
            $(e.target).parent().click()
            return false;
          });
        });
    });
  }

  render() {
    if (TokenStore.isAuthenticated()) {
      $('#searchButton').removeAttr('disabled');
      $('[data-mode]').hide();
      $(`[data-mode=${this.state.mode}]`).show();
    }

    $('#searchError').hide();
    $('#searchResults').hide();

    if (!this.state.requestStatus) {
      return;
    }

    switch (this.state.requestStatus) {
      case 'pending':
        $('#searchButton').attr('disabled', 1).text('Searching…');
        break;

      case 'complete':
        $('#searchButton').removeAttr('disabled').text('Search');

        if (this.props.request.error) {
          $('#searchError').text(this.props.request.error.message).show();
          return;
        }

        $('#searchResults').html('');
        this.props.request.results.forEach(tweet => $('#searchResults').append(this.renderListGroupItem(tweet)));
        this.updateTweets();
        $('#searchResults').show();
        break;
    }

  }
}
