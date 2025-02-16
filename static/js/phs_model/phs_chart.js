let phs_chart = new (function () {
  // generate range of integers
  let ctx;
  let chartInstance;

  this.range = function (start, end) {
    let ans = [];
    for (let increment = start; increment <= end; increment++) {
      ans.push(increment);
    }
    return ans;
  };

  this.array_values = function (value, length) {
    let ans = [];
    for (let increment = 0; increment <= length; increment++) {
      ans.push(value);
    }
    return ans;
  };

  let max_rectal_temperature = this.array_values(38, 480);

  let results,
    leftYStep = 1;

  // function that calculate the heat losses
  this.getData = function () {
    results = comf.phs(d.ta, d.tr, d.rh, d.vel, d.met * 58.15, d.clo, 2, true);
  };

  // function that updates the chart whenever user selects a different input
  this.update = function () {
    this.getData();

    if (isCelsius) {
      chartInstance.options.scales.yAxes[0].scaleLabel.labelString =
        "温度 [°C]";
    } else {
      chartInstance.options.scales.yAxes[0].scaleLabel.labelString =
        "温度 [°F]";
    }

    chartInstance.data.datasets[0].data = results.t_re_array;
    chartInstance.data.datasets[1].data = results.t_cr_array;

    chartInstance.update();
  };

  // function that draws the chart
  this.draw = function () {
    Chart.defaults.global.defaultFontFamily = "sans-serif";

    this.getData();

    ctx = document.getElementById("phs_chart_div").getContext("2d");

    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: results.time_array,
        datasets: [
          {
            label: "直腸温",
            data: results.t_re_array,
            backgroundColor: "#3BBDED",
            borderColor: "#3BBDED",
            hidden: false,
            fill: false,
            yAxisID: "y",
          },
          {
            label: "深部体温",
            data: results.t_cr_array,
            backgroundColor: "#1B679B",
            borderColor: "#1B679B",
            hidden: true,
            fill: false,
            yAxisID: "y",
          },
          {
            label: "最大直腸温",
            data: max_rectal_temperature,
            backgroundColor: "#ed3b3b",
            borderColor: "#ed3b3b",
            hidden: false,
            fill: false,
            yAxisID: "y",
          },
        ],
      },
      options: {
        title: {
          display: true,
          fontStyle: "normal",
        },
        legend: {
          position: "bottom",
        },
        scales: {
          yAxes: [
            {
              id: "y",
              position: "left",
              scaleLabel: {
                display: true,
                labelString: "温度 [°C]",
              },
              // stacked: true,
              gridLines: {
                color: "rgba(0, 0, 0, 0)",
              },
              ticks: {
                beginAtZero: false,
                stepSize: leftYStep,
              },
            },
          ],
          xAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: "時間 [分]",
              },
              gridLines: {
                color: "rgba(0, 0, 0, 0)",
              },
              ticks: {
                autoSkip: true,
                maxRotation: 0,
                minRotation: 0,
                maxTicksLimit: 10,
              },
            },
          ],
        },
        layout: {
          padding: 5,
        },
        responsive: true,
        maintainAspectRatio: false,
        elements: {
          line: {
            tension: 0, // disables bezier curves
          },
          point: { radius: 0 },
        },
      },
    });
  };
})();
