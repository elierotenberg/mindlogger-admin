<template>
  <div
    v-if="visible"
    class="radio-slider"
    :class="`radio-slider-${plotId}`"
  >
    <div
      class="tooltip"
      style="display: none"
    />

    <svg
      class="frequency"
      :id="plotId"
      :width="width + 20"
      :height="(height + space) * features.length + padding.bottom + padding.top"
    >
      <g 
        v-for="(feature, index) in features"
        class="features"
        :key="feature.slug"
      >
        <text
          :y="(height + space) * index + 50"
          x="40%"
          :font-size="19"
          text-anchor="middle"
        >
          {{feature.name.en}}
        </text>
        <g :class="'x-axis' + feature.slug" />
        <g :class="'y-axis-' + feature.slug" />
        <g :class="'versions-' + feature.slug" />
        <g :class="'responses' + feature.slug" />
      </g>
    </svg>
  </div>
  <div
    v-else
    :style="`height: ${height + padding.top + padding.bottom}px;`"
  >
      <v-progress-circular
        class="d-block ma-auto mt-2"
        color="black"
        indeterminate
        :size="50"
      >
      </v-progress-circular>
  </div>
</template>

<style lang="scss" scoped>

.frequency {
  margin: auto 40px;
}

.radio-slider {
  display: inline-block;
  position: relative;
  width: calc(100% - 40px);
  user-select: none;
  margin: 0px 20px;
}

.tooltip {
  z-index: 9999;
  position: absolute;
  max-width: 300px;
  font-size: 14px;
}

</style>

<script>
import * as d3 from 'd3';
import * as moment from 'moment';
import { DrawingMixin } from '../Utils/mixins/DrawingMixin';

export default {
  name: 'Frequnecy',
  mixins: [DrawingMixin],
  props: {
    plotId: {
      type: String,
      required: true,
    },
    item: {
      type: Object,
      required: true
    },
    timeRange: {
      type: String,
      required: true,
    },
  },
  data: function() {
    const margin = { left: 20, right: 60 };
    const width = this.parentWidth - margin.left - margin.right;
    const { data, features } = this.item.getFormattedResponseData();
    const responseDates = {};
    let max = 6;

    for (let response of data) {
      for (let feature of features) {
        if (response[feature.slug] !== undefined) {
          let dateStr = moment(response.date).format('MMM-DD, YYYY');
          responseDates[feature.slug] = responseDates[feature.slug] || []
          const index = responseDates[feature.slug].findIndex(({ date }) => date === dateStr );

          if (index === -1) {
            responseDates[feature.slug].push({
              date: dateStr,
              value: 1,
            })
          } else {
            responseDates[feature.slug][index].value += 1;
          }
        }
      }
    }

    features.forEach((feature) => {
      if (responseDates[feature.slug]) {
        max = Math.max(Math.max.apply(Math, responseDates[feature.slug].map(({ value }) => value)), max);
      }
    });

    return {
      height: max * 30,
      margin,
      width,
      labelWidth: width / 4,
      data,
      space: 60,
      responseDates,
      features: features.map((feature, index) => ({
        ...feature,
        index
      })).reverse(),
      visible: false,
    }
  },
  /**
   * Handlers to be executed each time a property changes its value.
   */
  watch: {
    focusExtent: {
      deep: true,
      handler() {
        this.render();
      }
    },
    selectedVersions: {
      deep: true,
      handler() {
        this.render();
      }
    },
    hasVersionBars: {
      deep: false,
      handler() {
        this.render();
      }
    },
    parentWidth: {
      deep: false,
      handler(newValue) {
        this.width = newValue - this.margin.left - this.margin.right;
        this.labelWidth = this.width / 4;

        this.render();
      }
    }
  },
  mounted() {
    if (('IntersectionObserver' in window)) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].intersectionRatio <= 0) {
          return;
        }

        if (!this.visible) {
          this.visible = true;
          this.$nextTick(() => {
            this.render();
          });
        }
      });

      observer.observe(this.$el);
    } else {
      this.visible = true;
    }

    this.$nextTick(() => {
      this.render();
    });
  },
  methods: {
    render() {
      if (this.visible) {
        this.svg = d3.select('#' + this.plotId);
        this.features.forEach((feature, index) => {
          this.drawAxis(feature, index + 1);
          if (this.responseDates[feature.slug]) {
            this.drawVersions();
            this.drawResponses(feature, index + 1);
          }
        });
      }
    },

    getTickType() {
      if (this.timeRange === "Daily") {
        return d3.timeDay.every(2);
      } else if (this.timeRange === "Weekly") {
        return d3.timeWeek;
      } else if (this.timeRange === "Monthly") {
        return d3.timeMonth;
      }
      return d3.timeDay;
    },

    compressedName(name) {
      return name.length > 30
        ? name.slice(0, 26) + ' …'
        : name
    },

    drawAxis(feature, index) {
      let max = 6; 
      let min = 0;
      
      if (this.responseDates[feature.slug]) {
        max = Math.max(Math.max.apply(Math, this.responseDates[feature.slug].map(({ value }) => value)), 6);
        min = Math.min(Math.min.apply(Math, this.responseDates[feature.slug].map(({ value }) => value)), 0);
      }

      this.x = d3
        .scaleUtc()
        .nice()
        .domain(this.focusExtent)
        .range([0, this.width - this.labelWidth]);

      this.y = d3
        .scaleLinear()
        .domain([min, max])
        .nice()
        .range([(this.height + this.space) * index, this.height * (index - 1) + this.space * index])

      // const tickType = this.getTickType();

      const xAxis = d3
        .axisBottom()
        .scale(this.x)
        .tickSize(this.tickHeight)  // Height of the tick line.
        .ticks(this.getTickType());

      const yAxis = d3
        .axisLeft()
        .scale(this.y)
        // .tickSize(this.tickHeight)
        .ticks(3);

      this.svg
        .select('.x-axis' + feature.slug)
        .selectAll('.feature-axis')
        .remove();

      this.svg
        .select('.y-axis-' + feature.slug)
        .append('g')
        .attr('class', 'feature-axis')
        .style('stroke-width', 1.2)
        .style('color', '#373737')
        .attr('transform', d => `translate(40, 0)`)
        .call(yAxis);

      for (let i = 0; i <= max - min; i += 1) {
        this.svg
          .select('.x-axis' + feature.slug)
          .append('g')
          .attr('class', 'feature-axis')
          .style('stroke-width', i === 0 ? 1.5 : 1)
          .style('color', i === 0 ? '#373737' : '#979797')
          .attr('transform', d => `translate(40, ${(this.height + this.space) * index - ((this.height) / (max - min)) * i})`)
          .call(xAxis.tickFormat(d => i === 0 ? moment(d).format('MMM-D') : ''));
      }
    },

    drawResponses(feature, index) {
      const tooltip = document.querySelector(`.radio-slider.radio-slider-${this.plotId} .tooltip`);

      this.radius = 7;
      this.svg
        .select('.responses' + feature.slug)
        .selectAll('*')
        .remove();

      let prevX = -1, prevY = -1;

      for (let i = 0; i < this.responseDates[feature.slug].length; i++) {
        let response = this.responseDates[feature.slug][i];

        if (new Date(response.date) < this.focusExtent[0]) {
          continue;
        }

        if (new Date(response.date) > this.focusExtent[1]) {
          continue;
        }

        const x = this.x(new Date(response.date)) + 40;
        const y = this.y(response.value);

        if (x < 0) {
          continue;
        }

        this.svg
          .select('.responses' + feature.slug)
          .append('circle')
          .attr('fill', feature.color)
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', this.radius)

        if (x >= 0 && prevX >= 0) {
          let delta = this.radius;
          let dx = x - prevX, 
              dy = y - prevY;

          let r = Math.sqrt(dx * dx + dy * dy);

          dx /= r, dy /= r;

          if (r >= this.radius * 2) {
            this.svg
              .select('.responses' + feature.slug)
              .append('line')
              .style('stroke-width', 1.5)
              .attr('x1', prevX + dx * delta)
              .attr('y1', prevY + dy * delta)
              .attr('x2', x - dx * delta)
              .attr('y2', y - dy * delta)
              .attr('stroke', feature.color)
          }
        }

        prevX = x;
        prevY = y;
      }
    },
  }
}
</script>
