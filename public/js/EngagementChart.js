class EngagementChart extends Emitter {
  constructor(element) {
    super(element);
    this.props = {};
    $(document).on('SearchBox:select', (() => {
      let tweetIDs = [];
      let fromDate;
      $('#searchResults .list-group-item.active').each((idx, el) => {
        const tweet = $(el).data('tweet');
        tweetIDs.push(tweet.id_str);
        fromDate = tweet.created_at;
      });

      if (tweetIDs.length > 0) {
        this.performRequest(tweetIDs, fromDate);  
      }
    }).bind(this));
  }

  prepareDataset(data) {
    this.props.oldestTimestamp = new Date().getTime() + 1000;
    this.props.newestTimestamp = 0;
    let out = [];
    for (let aggregation in data) {
      for (let date in data[aggregation]) {
        for (let time in data[aggregation][date]) {
          let timestamp = `${date}T${time}:00:00`;
          let timestampMs = new Date(timestamp).getTime();
          this.props.oldestTimestamp = timestampMs < this.props.oldestTimestamp ? timestampMs : this.props.oldestTimestamp;
          this.props.newestTimestamp = timestampMs > this.props.newestTimestamp ? timestampMs : this.props.newestTimestamp;
          out.push({metric: aggregation, timestamp: `${date}T${time}:00:00`, value: data[aggregation][date][time]});
        }
      }
    }

    this.props.dataset = crossfilter(out);
  }

  getEngagementMetricByMode() {
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

  async performRequest(tweets, fromDate = null) {
    this.setState({requestStatus: 'pending'});
    const body = await EngagementClient.getEngagement(tweets, fromDate);
    
    this.prepareDataset(body.aggregations);

    if (body === null || this.props.dataset.groupAll().reduceCount().value() === 0) {
      this.props.errorMessage = 'No engagement data available for the Tweets you selected. Select other Tweets or try a different query.';
      this.setState({requestStatus: 'error'});
      return;
    }

    this.props.dimension = this.props.dataset.dimension(d => [this.getEngagementMetricByMode().indexOf(d.metric), new Date(d.timestamp).getTime()]);
    this.props.dimensionGroup = this.props.dimension.group().reduceSum(d => +d.value);

    this.setState({requestStatus: 'complete'});
  }


  render() {
    $('#chartErrorMessage').hide();
    if (this.state.requestStatus === 'error') {
      $('#chartErrorMessage').text(this.props.errorMessage).show();
      $('#chart').html('');
    } else if (this.state.requestStatus === 'complete') {
      const mainChart = dc.seriesChart("#chart");
      const overviewChart = dc.seriesChart("#chart-overview");
      const width = $('#chart-container').width()
      mainChart
        .width(width)
        .height(400)
        .chart(c => dc.lineChart(c).curve(d3.curveCardinal).evadeDomainFilter(true))
        .x(d3.scaleTime().domain([new Date(this.props.oldestTimestamp), new Date(this.props.newestTimestamp)]))
        .brushOn(false)
        .elasticY(true)
        .dimension(this.props.dimension)
        .group(this.props.dimensionGroup)
        .rangeChart(overviewChart)
        .seriesAccessor(d => this.getEngagementMetricByMode()[d.key[0]])
        .keyAccessor(d => d.key[1])
        .valueAccessor(d => +d.value)
        .legend(dc.legend().x(350).y(5).itemHeight(13).gap(5).horizontal(true));

      mainChart.yAxis().tickFormat(d3.format('.2s'));

      overviewChart
        .width(width)
        .height(100)
        .chart(c => dc.lineChart(c).curve(d3.curveCardinal))
        .x(d3.scaleTime().domain([new Date(this.props.oldestTimestamp), new Date(this.props.newestTimestamp)]))
        .brushOn(true)
        .dimension(this.props.dimension)
        .group(this.props.dimensionGroup)
        .seriesAccessor(d => this.getEngagementMetricByMode()[d.key[0]])
        .keyAccessor(d => +d.key[1])
        .valueAccessor(d => +d.value);

      overviewChart.yAxis().tickFormat(d3.format('.2s'));
       
      dc.renderAll();
    }
  }
}