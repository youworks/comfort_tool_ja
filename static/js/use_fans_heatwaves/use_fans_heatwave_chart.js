let use_fans_heatwave_chart = new (function () {
  // generate range of integers
  this.range = function (start, end) {
    let ans = [];
    for (let increment = start; increment <= end; increment++) {
      ans.push(increment);
    }
    return ans;
  };
  this.rangeTemperature = function (start, end) {
    let ans = [];
    for (let increment = start; increment <= end; increment = increment + 0.2) {
      ans.push(increment);
    }
    return ans;
  };

  let ctx;
  let chartInstance;

  let i,
    ix,
    results,
    t_a_heat_strain,
    rh_heat_strain,
    t_a_no_fans,
    fans_not_beneficial,
    upper_chart_limit = 50,
    lower_chart_limit = 30,
    leftYStep = 2;

  const ta = this.rangeTemperature(lower_chart_limit, 60);
  let rh = this.range(5, 85);

  // function that calculate the heat losses
  this.getData = function () {
    t_a_heat_strain = [];
    rh_heat_strain = [];
    t_a_no_fans = [];
    fans_not_beneficial = [];

    let t_a_heat_strain_02 = [];
    let rhIntersectionHeatStrain = 0;
    let indexIntersectionHeatStrain = 0;
    let tIntersectionHeatStrain = 0;

    // calculate heat strain for air speed of 0.2 m/s
    for (ix = 0; ix < rh.length; ix++) {
      for (i = 0; i < ta.length; i++) {
        results = comf.pierceSET(
          ta[i],
          ta[i],
          0.2,
          rh[ix],
          d.met,
          d.clo,
          0,
          false,
          false,
          80
        );

        if (results.thermal_strain) {
          t_a_heat_strain_02.push(ta[i]);
          break;
        }
      }
    }

    // calculate heat strain the airspeed the user has selected
    for (ix = 0; ix < rh.length; ix++) {
      for (i = 0; i < ta.length; i++) {
        results = comf.pierceSET(
          ta[i],
          ta[i],
          d.vel,
          rh[ix],
          d.met,
          d.clo,
          0,
          false,
          false,
          80
        );

        if (results.thermal_strain) {
          if (ta[i] < t_a_heat_strain_02[ix]) {
            rhIntersectionHeatStrain = rh[ix];
            indexIntersectionHeatStrain = ix;
            tIntersectionHeatStrain = ta[i];
          }
          t_a_heat_strain.push(ta[i]);
          rh_heat_strain.push(rh[ix]);
          break;
        }
      }
    }

    if (tIntersectionHeatStrain === 0) {
      tIntersectionHeatStrain = t_a_heat_strain_02[0];
    }

    for (ix = 0; ix < rh.length; ix++) {
      if (t_a_heat_strain[ix] > tIntersectionHeatStrain) {
        t_a_heat_strain[ix] = tIntersectionHeatStrain;
      }
      // add data to fans not beneficial zone
      fans_not_beneficial.push(upper_chart_limit + 1);
    }

    // calculate the zone in which fans should not be used
    for (ix = 0; ix < rh.length; ix++) {
      for (i = ta.length - 1; i > 0; i--) {
        // calculate delta t core with two air speeds
        results =
          comf.pierceSET(
            ta[i],
            ta[i],
            d.vel,
            rh[ix],
            d.met,
            d.clo,
            0,
            false,
            false,
            80
          )["t_core"] -
          comf.pierceSET(
            ta[i],
            ta[i],
            0.2,
            rh[ix],
            d.met,
            d.clo,
            0,
            false,
            false,
            80
          )["t_core"];

        // if the core temperature is lower with fans on
        if (results < 0) {
          // for low rh id the delta is very small ignore it
          if (
            rh[ix] < rhIntersectionHeatStrain ||
            ta[i] > tIntersectionHeatStrain
          ) {
            t_a_no_fans.push(tIntersectionHeatStrain);
          } else {
            // push the temperature at which fans should not be used
            t_a_no_fans.push(ta[i]);
          }
          break;
        }
      }
    }

    t_a_heat_strain = Taira.smoothen(
      t_a_heat_strain,
      Taira.ALGORITHMS.GAUSSIAN,
      3,
      3,
      false
    );

    t_a_heat_strain.forEach(function (value, index) {
      t_a_heat_strain[index] = t_a_heat_strain[index].toFixed(1); // value
    });

    t_a_no_fans = Taira.smoothen(
      t_a_no_fans,
      Taira.ALGORITHMS.GAUSSIAN,
      3,
      3,
      false
    );

    t_a_no_fans.forEach(function (value, index) {
      t_a_no_fans[index] = t_a_no_fans[index].toFixed(1); // value
    });
  };

  // function that updates the chart whenever user selects a different input
  this.update = function () {
    this.getData();

    if (isCelsius) {
      chartInstance.options.scales.yAxes[0].scaleLabel.labelString =
        "Dry-bulb Temperature [°C]";

      upper_chart_limit = 50;
      lower_chart_limit = 30;
      leftYStep = 2;
    } else {
      chartInstance.options.scales.yAxes[0].scaleLabel.labelString =
        "Dry-bulb Temperature [°F]";

      upper_chart_limit = 120;
      lower_chart_limit = 84;
      leftYStep = 4;

      for (i = 0; i < rh_heat_strain.length; i++) {
        t_a_heat_strain[i] = util.CtoF(t_a_heat_strain[i]);
        t_a_no_fans[i] = util.CtoF(t_a_no_fans[i]);
        fans_not_beneficial[i] = util.CtoF(fans_not_beneficial[i]);
      }
    }

    chartInstance.options.scales.yAxes[0].ticks.max = upper_chart_limit;
    chartInstance.options.scales.yAxes[0].ticks.min = lower_chart_limit;
    chartInstance.options.scales.yAxes[0].ticks.stepSize = leftYStep;

    chartInstance.data.datasets[0].data = t_a_heat_strain;
    chartInstance.data.datasets[1].data = t_a_no_fans;
    chartInstance.data.datasets[2].data = fans_not_beneficial;
    chartInstance.data.labels = rh_heat_strain;

    chartInstance.update();
  };

  // function that draws the chart
  this.draw = function () {
    Chart.defaults.global.defaultFontFamily = "sans-serif";

    this.getData();

    ctx = document.getElementById("use_fans_heatwave_div").getContext("2d");

    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: rh_heat_strain,
        datasets: [
          {
            label: "No heat strain",
            data: t_a_heat_strain,
            backgroundColor: "#def7e4ff",
            borderColor: "rgba(59,189,237,0)",
            hidden: false,
            yAxisID: "y",
            fill: "origin",
          },
          {
            label: "Heat strain - fan still beneficial",
            data: t_a_no_fans,
            backgroundColor: "#a0e5b1ff",
            borderColor: "rgba(53,119,158,0)",
            hidden: false,
            yAxisID: "y",
            fill: 0,
          },
          {
            label: "Heat strain - fan not beneficial",
            data: fans_not_beneficial,
            backgroundColor: "#ffc5b0ff",
            borderColor: "rgba(94,94,94,0)",
            hidden: false,
            yAxisID: "y",
            fill: 1,
          },
        ],
      },
      options: {
        tooltips: {
          enabled: true,
          mode: "index",
          intersect: false,
          callbacks: {
            label: function (tooltipItems, data) {
              let unit;
              if (isCelsius) {
                unit = " °C";
              } else {
                unit = " °F";
              }
              chartInstance.tooltip._model.opacity = 0;
              chartInstance.options.title.text =
                "Relative Humidity = " +
                (
                  ((this._eventPosition.x - chartInstance.chartArea.left) /
                    (chartInstance.chartArea.right -
                      chartInstance.chartArea.left)) *
                  100
                ).toFixed(1) +
                " %; Dry-bulb Temperature = " +
                (
                  ((this._eventPosition.y - chartInstance.chartArea.top) /
                    (chartInstance.chartArea.bottom -
                      chartInstance.chartArea.top)) *
                    (chartInstance.options.scales.yAxes[0].ticks.min -
                      chartInstance.options.scales.yAxes[0].ticks.max) +
                  chartInstance.options.scales.yAxes[0].ticks.max
                ).toFixed(1) +
                unit;
            },
          },
        },
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
                labelString: "Air temperature [°C]",
              },
              // stacked: true,
              gridLines: {
                color: "rgba(0, 0, 0, 0)",
              },
              ticks: {
                beginAtZero: false,
                max: upper_chart_limit,
                min: lower_chart_limit,
                stepSize: leftYStep,
              },
            },
          ],
          xAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: "Relative Humidity [%]",
              },
              gridLines: {
                color: "rgba(0, 0, 0, 0)",
              },
              ticks: {
                autoSkip: true,
                maxRotation: 0,
                minRotation: 0,
                min: 5,
                max: 85,
                maxTicksLimit: 9,
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

// function to smooth one dimensional array
class Taira extends Array {
  /**
   * Smoothen 1D-Array using selected algorithm
   * @param {*} options Takes one of the supported algorithms (defaults to AVERAGE) and its parameters
   */
  smoothen(...options) {
    return Taira.smoothen(this, ...options);
  }

  /**
   * Smoothen 1D-Array using selected algorithm
   * @param {*} array The input data array
   * @param {Taira.ALGORITHMS} algorithm Takes one of the supported algorithms (defaults to AVERAGE)
   * @param {*} options Parameters for the algorithm
   * @returns {Taira} New smooth array
   * @throws Will throw an error if 2*size+1>=array.length for AVERAGE,MEDIAN and GAUSSIAN algorithm
   */
  static smoothen(array, algorithm, ...options) {
    const [option1, option2, option3, ...other] = options;
    array = array || [];
    switch (algorithm || 0) {
      case Taira.ALGORITHMS.MEDIAN:
        return Taira._median(
          array,
          option1 || 2,
          option2 || 1,
          option3,
          ...other
        );
      case Taira.ALGORITHMS.GAUSSIAN:
        return Taira._gaussian(
          array,
          option1 || 2,
          option2 || 2,
          option3,
          ...other
        );
      default:
        return Taira._average(
          array,
          option1 || 2,
          option2 || 1,
          option3,
          ...other
        );
    }
  }

  /**
   * Taira.ALGORITHMS.AVERAGE (do not use directly)
   * @param {*} array The input data array
   * @param {integer} size The number of neighbor elements to take, results in 2*size+1
   * @param {integer} pass How many times to go over the array
   * @param {boolean} circular Joins beginning and end of array, to make the array circular
   * @returns {*} Array calculated with Taira.ALGORITHMS.AVERAGE
   */
  static _average(array, size, pass, circular) {
    if (array.length <= 2 * size + 1)
      throw new Error("Array needs to be longer than the box size (2*size+1).");
    const out = new Taira();
    array.forEach((_, index) => {
      if ((index - size < 0 || index + size >= array.length) && !circular) {
        out.push(array[index]);
      } else {
        const segmentstart =
          index - size < 0 ? index - size + array.length : index - size;
        let sum = 0;
        for (
          let a = segmentstart;
          (index + size + 1) % array.length !== a;
          a = a % array.length
        ) {
          sum += array[a];
          a++;
        }
        out.push(sum / (size * 2 + 1));
      }
    });
    if (pass > 1) {
      return Taira._average(array, size, --pass);
    } else {
      return out;
    }
  }

  /**
   * Taira.ALGORITHMS.MEDIAN (do not use directly)
   * @param {*} array The input data array
   * @param {integer} size The number of neighbor elements to take, results in 2*size+1
   * @param {integer} pass How many times to go over the array
   * @param {boolean} circular Joins beginning and end of array, to make the array circular
   * @returns {*} Array calculated with Taira.ALGORITHMS.MEDIAN
   */
  static _median(array, size, pass, circular) {
    if (array.length <= 2 * size + 1)
      throw new Error("Array needs to be longer than the box size (2*size+1).");
    const out = new Taira();
    array.forEach((_, index) => {
      if ((index - size < 0 || index + size >= array.length) && !circular) {
        out.push(array[index]);
      } else {
        const segmentstart =
          index - size < 0 ? index - size + array.length : index - size;
        let median = [];
        for (
          let a = segmentstart;
          (index + size + 1) % array.length !== a;
          a = a % array.length
        ) {
          median.push(array[a]);
          a++;
        }
        median = median.sort((a, b) => {
          if (a < b) {
            return -1;
          }
          if (a > b) {
            return 1;
          }
          return 0;
        });
        out.push(median[Math.trunc((size * 2 + 1) / 2)]);
      }
    });
    if (pass > 1) {
      return Taira._median(array, size, --pass);
    } else {
      return out;
    }
  }

  /**
   * Taira.ALGORITHMS.GAUSSIAN (do not use directly)
   * @param {*} array The input data array
   * @param {integer} kernel Size of the kernel array is e.g. 2*kernel+1
   * @param {*} radius The blur radius (sigma from the gaussian function)
   * @param {boolean} circular Joins beginning and end of array, to make the array circular
   * @returns {*} Array calculated with Taira.ALGORITHMS.GAUSSIAN
   */
  static _gaussian(array, kernel, radius, circular) {
    if (array.length <= 2 * kernel + 1)
      throw new Error(
        "Array needs to be longer than the kernel size (2*size+1)."
      );
    const out = new Taira();
    let filter = new Float64Array(2 * kernel + 1);
    const denominator1 = radius * Math.sqrt(2 * Math.PI);
    const denominator2 = Math.pow(radius, 2) * 2;
    filter = filter.map(
      (_, index) =>
        Math.exp(-Math.pow(index - kernel, 2) / denominator2) / denominator1
    );
    const normalizer = filter.reduce((acc, val) => acc + val);
    const normfilter = filter.map((value) => value / normalizer);
    array.forEach((_, index) => {
      if ((index - kernel < 0 || index + kernel >= array.length) && !circular) {
        out.push(array[index]);
      } else {
        const segmentstart =
          index - kernel < 0 ? index - kernel + array.length : index - kernel;
        let sum = 0;
        let c = 0;
        for (
          let a = segmentstart;
          (index + kernel + 1) % array.length !== a;
          a = a % array.length
        ) {
          sum += array[a++] * normfilter[c++];
        }
        out.push(sum);
      }
    });
    return out;
  }
}

Taira.ALGORITHMS = {
  AVERAGE: 0,
  MEDIAN: 1,
  GAUSSIAN: 2,
};
