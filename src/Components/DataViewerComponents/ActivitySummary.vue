<template>
  <div
    class="activity-summary"
  >
    <svg
      :id="plotId"
      :height="height"
      width="100%"
    >
      <g class="labels">
        <text
          :y="padding.top + radius + 15/2"
          :x="labelWidth/2 + 20"
          :font-size="itemPadding"
          text-anchor="middle"
          font-weight="bold"
        >
          {{ compressedLabel }}
        </text>

        <template
          v-if="subScales.length"
        >
          <text
            :y="padding.top + radius + 16/2 + 16"
            :x="labelWidth/2"
            :font-size="10"
            text-anchor="middle"
            font-weight="bold"
          >
            ( {{$t('latestScore')}}: {{ latestScore }}, {{$t('frequency')}}: {{ frequency }} )
          </text>
        </template>
      </g>

      <g
        class="content"
        :transform="`translate(${labelWidth + itemPadding + 5}, 0)`"
      >
        <g class="x-axis" />
        <g class="versions" />
        <g class="responses" />
      </g>
    </svg>
  </div>
</template>

<style lang="scss" scoped>

.activity-summary {
  display: inline-block;
  position: relative;
  width: 100%;
  user-select: none;
}

</style>

<script>
import * as d3 from 'd3';
import * as moment from 'moment';
import { DrawingMixin } from '../Utils/mixins/DrawingMixin';

export default {
  name: 'ActivitySummary',
  mixins: [DrawingMixin],
  props: {
    plotId: {
      type: String,
      required: true,
    },
    data: {
      type: Array,
      required: true
    },
    label: {
      type: String,
      required: false,
      default: '',
    },
    itemPadding: {
      type: Number,
      required: true,
    },
    timeRange: {
      type: String,
      required: true,
    },
    latestScore: {
      type: Number,
      required: true,
    },
    frequency: {
      type: Number,
      required: true,
    },
    subScales: {
      type: Array,
      required: true,
    }
  },
  data: function() {
    let margin = { left: 20, right: 60 };
    let width = this.parentWidth - margin.left - margin.right;

    return {
      height: 50,
      margin,
      width,
      labelWidth: width / 4,
    }
  },
  computed: {
    compressedLabel() {
      return this.label.length > 28
        ? this.label.slice(0, 25) + ' …'
        : this.label
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
    this.$nextTick(() => {
      this.render();
    });
  },
  methods: {
    render() {
      this.svg = d3.select('#' + this.plotId);

      this.drawAxes();
      this.drawVersions();
      this.drawResponses();
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

    drawAxes() {
      this.x = d3
        .scaleUtc()
        .nice()
        .domain(this.focusExtent)
        .range([0, this.width - this.labelWidth]);

      const tickType = this.getTickType();

      const xAxis = d3
        .axisBottom()
        .scale(this.x)
        .tickSize(this.tickHeight)  // Height of the tick line.
        .ticks(tickType)
        .tickFormat(d => moment(d).format('MMM-D'));

      this.svg
        .select('.x-axis')
        .style('stroke-width', 1.2)
        .style('color', '#373737')
        .attr('transform', `translate(0, ${this.radius + this.padding.top})`)
        .call(xAxis);
    },

    drawResponses() {
      this.svg
        .select('.responses')
        .selectAll('circle')
        .remove();

      this.svg
        .select('.responses')
        .selectAll('circle')
        .data(this.data.filter(d => this.selectedVersions.indexOf(d.version) >= 0 && d.date >= this.focusExtent[0] && d.date <= this.focusExtent[1]))
        .join('circle')
        .attr('fill', this.color)
        .attr('cx', d => {
          const dataVersion = this.formattedVersions.find(v => v.version === d.version );
          let responseDate = new Date(d.date);

          if (dataVersion.updated) {
            const offset = this.versionsLength[new Date(dataVersion.updated).getDay()] / 2;
            responseDate = new Date(d.date).setHours(new Date (dataVersion.updated).getHours() + offset);
          }

          return this.x(responseDate);
        })
        .attr('cy', this.radius + this.padding.top)
        .attr('r', d => this.x(d.date) >= 0 ? this.radius : 0);
    },
  }
}
</script>
