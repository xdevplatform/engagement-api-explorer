class EngagementComparison extends Emitter {
  init() {
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

    $('#engagementMetricOptions').on('click', 'button', (el) => {
      const metric = $(el.target).attr('data-metric');
      this.setState({metric: metric});
    });
  }

  prepareMetricsDropdown(data) {

    const dropdown = $('#engagementMetricOptions').html('');
    Object.keys(data).map((metric) => {
      let metricLabel = metric.replace(/_/g, ' ');
      metricLabel = metricLabel.charAt(0).toUpperCase() + metricLabel.substr(1);
      const option = $('<button>')
        .addClass('dropdown-item')
        .attr('type', 'button')
        .attr('data-metric', metric)
        .text(metricLabel);

      dropdown.append(option);
    });
  }
  
  prepareLabels(data) {
    const [firstKey] = Object.keys(data);
    const dataset = data[firstKey];
    return [].concat(...Object.keys(dataset).map(key => Object.keys(dataset[key]).map(k => `${key}T${k}:00:00`)))
  }

  prepareDatasets(data) {
    let datasets = [];

    for (let aggregation in data) {
      let dataset = {
        label: aggregation,
        data: [].concat(...Object.values(data[aggregation]).map(value => Object.values(value))),
      };

      // If the sum of values is 0, the dataset is empty
      // add Math.abs so negative values (e.g. negative engagement) is counted
      const datasetSum = dataset.data.reduce((accumulator, value) => +accumulator + Math.abs(value));
      if (datasetSum === 0) {
        continue;
      }

      const idx = datasets.push(dataset) - 1;
      datasets[idx].borderColor = this.props.palette[idx];
      datasets[idx].pointBorderColor = this.props.palette[idx];
    }

    return datasets;
  }

  async performRequest(tweets, fromDate = null) {
    this.setState({requestStatus: 'pending'});
    const body = await EngagementClient.getEngagement(tweets, fromDate);

    this.props.dataProvider = {};
    this.props.chartConfig = {};

    this.props.request = body;
    if (body === null) {
      this.props.palette = [];
      this.props.labels = [];
      this.setState({requestStatus: 'complete'});
      return;
    }

    this.props.palette = palette('mpn65', Object.keys(body.hourly_totals).length).map(color => `#${color}`);
    this.props.metrics = this.prepareMetricsDropdown(body.hourly_totals);

    this.props.labels = {};
    this.props.datasets = {};
    this.props.aggregationTypes = {};

    for (const metric in body.hourly_totals) {
      this.props.labels[metric] = this.prepareLabels(body.hourly_totals[metric]);
      this.props.datasets[metric] = this.prepareDatasets(body.hourly_totals[metric]);

      this.props.aggregationTypes[metric] = Object.values(this.props.datasets[metric])
        .map(dataset => dataset.label);

      this.props.chartConfig[metric] = [];
      this.props.dataProvider[metric] = [];

      this.props.aggregationTypes[metric].forEach(aggregation => this.props.chartConfig[metric].push({
        balloonText: `[[category]]: [[value]] ${aggregation.replace(/_/g, ' ')}`,
        bullet: 'round',
        title: aggregation.replace(/_/g, ' '),
        valueField: aggregation,
      }));

      this.props.labels[metric].forEach(((label, idx) => {
        let datapoint = {time: AmCharts.formatDate(new Date(label), 'MMM DD JJ:MM')};
        this.props.aggregationTypes[metric].forEach((aggregation, aggregationIdx) => {
          datapoint[aggregation] = this.props.datasets[metric][aggregationIdx].data[idx];
        });
        this.props.dataProvider[metric].push(datapoint);
      }).bind(this));

    }
    this.setState({requestStatus: 'complete'});
  }

  stateDidChange() {

  }

  render () {
    if (this.state.metric) {
      AmCharts.makeChart('comparisonChart', {
        type: 'serial',
        theme: 'light',
        dataProvider: this.props.dataProvider[this.state.metric],
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"',
        categoryField: 'time',
        legend: { useGraphSettings: true },
        chartScrollbar: {
          graph: 'g1',
          gridAlpha: 0,
          color: '#888888',
          scrollbarHeight: 55,
          backgroundAlpha: 0,
          selectedBackgroundAlpha: 0.1,
          selectedBackgroundColor: '#888888',
          graphFillAlpha: 0,
          autoGridCount: true,
          selectedGraphFillAlpha: 0,
          graphLineAlpha: 0.2,
          graphLineColor: '#c2c2c2',
          selectedGraphLineColor: '#888888',
          selectedGraphLineAlpha: 1,
        },
        categoryAxis: {
          gridPosition: 'start',
          axisAlpha: 0,
          fillAlpha: 0.05,
          fillColor: '#000000',
          gridAlpha: 0,
          position: 'bottom',
        },
        graphs: this.props.chartConfig[this.state.metric],
        export: {
          enabled: true,
          position: 'bottom-right'
        },
      });
    }
  }
}