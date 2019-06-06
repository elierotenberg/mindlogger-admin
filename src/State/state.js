import Vue from 'vue';
import Vuex from 'vuex';
Vue.use(Vuex);
import { Store } from "vuex";
import createPersistedState from 'vuex-persistedstate';
import _ from 'lodash';

const state = {
  backend: 'https://mindlogger-dev.vasegurt.com/api/v1',
  allApplets: [],
  currentApplet: {},
  auth: {},
  continue: {},
};

const mutations = {
  setBackend(state, backend) {
    if (backend !== state.backend) {
      state.auth = {};
    }
    state.backend = backend;
  },
  setCurrentApplet(state, activitySet) {
    state.currentApplet = activitySet;
  },
  setAllApplets(state, activitySets) {
    state.allApplets = activitySets;
  },
  setAuth(state, auth) {
    state.auth = auth;
  },
  setSchedule(state, schedule) {
    // TODO: this sucks.
    const idx = _.findIndex(state.allApplets,
      a => a.applet['skos:prefLabel'] == state.currentApplet.applet['skos:prefLabel']);
    if (idx > -1) {
      state.allApplets[idx].schedule = schedule;
    }
    // update this in the copy too.
    state.currentApplet.schedule = schedule;
  },
  setGroups(state, groups) {
    // TODO: this sucks.
    const idx = _.findIndex(state.allApplets,
      a => a.applet['skos:prefLabel'] == state.currentApplet.applet['skos:prefLabel']);
    if (idx > -1) {
      state.allApplets[idx].groups = groups;
    }
    // update this in the copy too.
    state.currentApplet.groups = groups;
  },
  setUsers(state, users) {
    state.users = users;
  },
  setReviewers(state, reviewers) {
    state.reviewers = reviewers;
  },
  continue(state, params) {
    state.continue[params.component] = params.continue;
  }
};

const store = new Store({
  state,
  mutations,
  plugins: [createPersistedState()],
})

export default store;