// @ts-nocheck
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable max-len */
/* eslint-disable object-curly-newline */
import React from 'react';
import { MemoryRouter as Router, Route, NavLink, Switch } from 'react-router-dom';
import { ParentSize } from '@visx/responsive';
import Tree from './Tree';
import ComponentMap from './ComponentMap/ComponentMap';
import { changeView, changeSlider } from '../../actions/actions';
import { useStoreContext } from '../../store';
import PerformanceVisx from './PerformanceVisx/PerformanceVisx';
import WebMetrics from '../WebMetrics';
import { StateRouteProps } from '../../FrontendTypes'

/*
  Loads the appropriate StateRoute view and renders the Map, Performance, History, Webmetrics, and Tree navbar buttons after clicking on the 'State' button located near the top rightmost corner.
*/

const History = require('./History').default;
const NO_STATE_MSG = 'No state change detected. Trigger an event to change state'; // message to be returned if there has been no state change detected in our hooked/target app

const StateRoute = (props: StateRouteProps) => {
  const { 
    snapshot, // from 'tabs[currentTab]' object in 'MainContainer'
    hierarchy, // from 'tabs[currentTab]' object in 'MainContainer'
    snapshots, // from 'tabs[currentTab].snapshotDisplay' object in 'MainContainer'
    viewIndex, // from 'tabs[currentTab]' object in 'MainContainer'
    webMetrics, // from 'tabs[currentTab]' object in 'MainContainer'
    currLocation // from 'tabs[currentTab]' object in 'MainContainer'
  } = props;
  const [{ tabs, currentTab }, dispatch] = useStoreContext();
  const { hierarchy, sliderIndex, viewIndex } = tabs[currentTab];

  const renderComponentMap = () => {
    if (hierarchy) { // if hierarchy was initialized/created render the Map
      return (
        <ParentSize className='componentMapContainer'>
          {({ width, height }) => (
            // eslint-disable-next-line react/prop-types
            <ComponentMap
              currentSnapshot={currLocation.stateSnapshot}
              width={width}
              height={height}
            />
          )}
        </ParentSize>
      );
    }
    return <div className='noState'>{NO_STATE_MSG}</div>; // otherwise, inform the user that there has been no state change in the target/hooked application.
  };

  const renderHistory:JSX.Element = () => {
    if (hierarchy) { // if hierarchy was initialized/created render the history
      return (
        <ParentSize>
          {({ width, height }) => (
            <History
              width={width} 
              height={height}
              hierarchy={hierarchy}
              dispatch={dispatch}
              sliderIndex={sliderIndex}
              viewIndex={viewIndex}
              currLocation={currLocation}
              snapshots={snapshots}
            />
          )}
        </ParentSize>
      );
    }
    return <div className='noState'>{NO_STATE_MSG}</div>; // otherwise, inform the user that there has been no state change in the target/hooked application.
  };

  const renderTree = () => {
    if (hierarchy) { // if a hierarchy has been created/initialized, render the appropriate tree based on the active snapshot
      return <Tree snapshot={snapshot} snapshots={snapshots} currLocation={currLocation} />;
    }
    return <div className='noState'>{NO_STATE_MSG}</div>; // otherwise, inform the user that there has been no state change in the target/hooked application.
  };
  const renderWebMetrics = () => {
    let LCPColor: String;
    let FIDColor: String;
    let FCPColor: String;
    let TTFBColor: String;

    // adjust the strings that represent colors of the webmetrics performance bar for 'Largest Contentful Paint (LCP)', 'First Input Delay (FID)', 'First Contentfuly Paint (FCP)', and 'Time to First Byte (TTFB)' based on webMetrics outputs. 
    if (webMetrics.LCP <= 2000) LCPColor = '#0bce6b';
    if (webMetrics.LCP > 2000 && webMetrics.LCP < 4000) LCPColor = '#E56543';
    if (webMetrics.LCP > 4000) LCPColor = '#fc2000';
    if (webMetrics.FID <= 100) FIDColor = '#0bce6b';
    if (webMetrics.FID > 100 && webMetrics.FID <= 300) FIDColor = '#fc5a03';
    if (webMetrics.FID > 300) FIDColor = '#fc2000';
    if (webMetrics.FCP <= 900) FCPColor = '#0bce6b';
    if (webMetrics.FCP > 900 && webMetrics.FCP <= 1100) FCPColor = '#fc5a03';
    if (webMetrics.FCP > 1100) FCPColor = '#fc2000';
    if (webMetrics.TTFB <= 600) TTFBColor = '#0bce6b';
    if (webMetrics.TTFB > 600) TTFBColor = '#fc2000';

    return (
      <div className='web-metrics-container'>
        <WebMetrics
          color={LCPColor}
          series={(webMetrics.LCP / 2500) * 100}
          formatted={(val) =>
            Number.isNaN(val) ? '- ms' : `${((val / 100) * 2500).toFixed(2)} ms`
          }
          label='Largest Contentful Paint'
          name='Largest Contentful Paint'
          description='Measures loading performance. The benchmark is less than 2500 ms.'
        />
        <WebMetrics
          color={FIDColor}
          series={webMetrics.FID * 25}
          formatted={(val) => (Number.isNaN(val) ? '- ms' : `${(val / 25).toFixed(2)} ms`)}
          label='First Input Delay'
          name='First Input Delay'
          description='Measures interactivity. The benchmark is less than 100 ms.'
        />
        <WebMetrics
          color={FCPColor}
          series={(webMetrics.FCP / 1000) * 100}
          formatted={(val) => `${((val / 100) * 1000).toFixed(2)} ms`}
          label='First Contentful Paint'
          name='First Contentful Paint'
          description='Measures the time it takes the browser to render the first piece of DOM content. No benchmark.'
        />
        <WebMetrics
          color={TTFBColor}
          series={(webMetrics.TTFB / 10) * 100}
          formatted={(val) => `${((val / 100) * 10).toFixed(2)} ms`}
          label='Time To First Byte'
          name='Time to First Byte'
          description='Measures the time it takes for a browser to receive the first byte of page content. The benchmark is 600 ms.'
        />
      </div>
    );
  };

  const renderPerfView = () => {
    if (hierarchy) { // if hierarchy was initialized/created render the PerformanceVisx
      return (
        <ParentSize>
          {({ width, height }) => (
            <PerformanceVisx
              width={width}
              height={height}
              snapshots={snapshots}
              changeSlider={changeSlider}
              changeView={changeView}
              hierarchy={hierarchy}
            />
          )}
        </ParentSize>
      );
    }
    return <div className='noState'>{NO_STATE_MSG}</div>; // otherwise, inform the user that there has been no state change in the target/hooked application.
  };

  return (
    <Router>
      <div className='navbar'>
        <NavLink className='router-link map-tab' activeClassName='is-active' exact to='/'>
          Map
        </NavLink>
        <NavLink
          className='router-link performance-tab'
          activeClassName='is-active'
          to='/performance'
        >
          Performance
        </NavLink>
        <NavLink className='router-link history-tab' activeClassName='is-active' to='/history'>
          History
        </NavLink>
        <NavLink
          className='router-link web-metrics-tab'
          activeClassName='is-active'
          to='/webMetrics'
        >
          Web Metrics
        </NavLink>
        <NavLink className='router-link tree-tab' activeClassName='is-active' to='/tree'>
          Tree
        </NavLink>
      </div>
      <Switch>
        <Route path='/performance' render={renderPerfView} />
        <Route path='/history' render={renderHistory} />
        <Route path='/webMetrics' render={renderWebMetrics} />
        <Route path='/tree' render={renderTree} />
        <Route path='/' render={renderComponentMap} />
      </Switch>
    </Router>
  );
};

export default StateRoute;
