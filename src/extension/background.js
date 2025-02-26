// Import snapshots from "../app/components/snapshots".
// import 'core-js';

// Store ports in an array.
const portsArr = [];
const reloaded = {};
const firstSnapshotReceived = {};

// There will be the same number of objects in here as there are
// Reactime tabs open for each user application being worked on.
let activeTab;
const tabsObj = {};
// Will store Chrome web vital metrics and their corresponding values.
const metrics = {};
// This function will create the first instance of the test app's tabs object
// which will hold test app's snapshots, link fiber tree info, chrome tab info, etc.
function createTabObj(title) {
  // TO-DO for save button
  // Save State
  // Knowledge of the comparison snapshot
  // Check for it in the reducer
  // update tabsObj
  return {
    title,
    // snapshots is an array of ALL state snapshots for stateful and stateless
    // components the Reactime tab working on a specific user application
    snapshots: [],
    // index here is the tab index that shows total amount of state changes
    index: 0,
    //* currLocation points to the current state the user is checking
    // (this accounts for time travel aka when user clicks jump on the UI)
    currLocation: null,
    // points to the node that will generate the next child set by newest node or jump
    currParent: 0,
    // points to the current branch
    currBranch: 0,
    // inserting a new property to build out our hierarchy dataset for d3
    hierarchy: null,
    // status checks: Content Script launched, React Dev Tools installed, target is react app
    status: {
      contentScriptLaunched: true,
      reactDevToolsInstalled: false,
      targetPageisaReactApp: false,
    },
    // Note: Paused = Locked
    mode: {
      paused: true,
    },
    // stores web metrics calculated by the content script file
    webMetrics: {},
  };
}

// Each node stores a history of the link fiber tree.
// In practice, new Nodes are passed the following arguments:
// 1. param 'obj' : arg request.payload, which is an object containing a tree from snapShot.ts and a route property
// 2. param tabObj: arg tabsObj[tabId], which is an object that holds info about a specific tab. Should change the name of tabObj to tabCollection or something
class Node {
  constructor(obj, tabObj) {
    // continues the order of number of total state changes
    this.index = tabObj.index;
    tabObj.index += 1;
    // continues the order of number of states changed from that parent
    tabObj.currParent += 1;
    this.name = tabObj.currParent;
    // marks from what branch this node is originated
    this.branch = tabObj.currBranch;
    this.stateSnapshot = obj;
    this.children = [];
  }
}

function countCurrName(rootNode, name) {
  if (rootNode.name > name) {
    return 0;
  }
  if (rootNode.name === name) {
    return 1;
  }
  let branch = 0;
  rootNode.children.forEach((child) => {
    branch += countCurrName(child, name);
  });
  return branch;
}

// Adds a new node to the current location.
// Invoked in the case 'recordSnap'.
// In practice, sendToHierarchy is passed the following arguments:
// 1. param tabObj : arg tabObj[tabId]
// 2. param newNode : arg an instance of the Node class
function sendToHierarchy(tabObj, newNode) {
  if (!tabObj.currLocation) {
    tabObj.currLocation = newNode;
    tabObj.hierarchy = newNode;
  } else {
    const currNameCount = countCurrName(tabObj.hierarchy, newNode.name);
    newNode.branch = currNameCount;
    tabObj.currBranch = newNode.branch;
    tabObj.currLocation.children.push(newNode);
    tabObj.currLocation = newNode;
  }
}

// This function is used when time jumping to a previous state,
// so that it runs recursively until it finds the correct index,
// and updates the tabsObject to the node at that index.
/* eslint no-param-reassign: ["error", { "props": false }] */

function changeCurrLocation(tabObj, rootNode, index, name) {
  // index comes from the app's main reducer to locate the correct current location on tabObj
  // check if current node has the index wanted
  if (rootNode.index === index) {
    tabObj.currLocation = rootNode;
    // Count number of nodes in the tree with name = next name.
    const currNameCount = countCurrName(tabObj.hierarchy, name + 1);
    tabObj.currBranch = currNameCount === 0 ? 0 : currNameCount - 1;
    // index of current location from where the next node will be a child
    tabObj.currParent = name;
    return;
  }
  // base case if no children
  if (!rootNode || !rootNode.children.length) {
    return;
    // if not, recurse on each one of the children
  }

  if (rootNode.children) {
    rootNode.children.forEach((child) => {
      changeCurrLocation(tabObj, child, index, name);
    });
  }
}

/*
  The 'chrome.runtime' API allows a connection to the background service worker (background.js).
  This allows us to set up listener's for when we connect, message, and disconnect the script.
*/

// Establishing incoming connection with Reactime.
chrome.runtime.onConnect.addListener((port) => {
  /*
    On initial connection, there is an onConnect event emitted. The 'addlistener' method provides a communication channel object ('port') when we connect to the service worker ('background.js') and applies it as the argument to it's 1st callback parameter.

    the 'port' (type: communication channel object) is the communication channel between different components within our Chrome extension, not to a port on the Chrome browser tab or the extension's port on the Chrome browser.
  
    The port object facilitates communication between the Reactime front-end and this 'background.js' script. This allows you to: 
    1. send messages and data
      (look for 'onMessage'/'postMessage' methods within this page)
    2. receive messages and data
      (look for 'addListener' methods within this page)
    between the front-end and the background.
  
    To establish communication between different parts of your extension:
      for the connecting end: use chrome.runtime.connect() 
      for the listening end: use chrome.runtime.onConnect. 
    Once the connection is established, a port object is passed to the addListener callback function, allowing you to start exchanging data.
  
    Again, this port object is used for communication within your extension, not for communication with external ports or tabs in the Chrome browser. If you need to interact with specific tabs or external ports, you would use other APIs or methods, such as chrome.tabs or other Chrome Extension APIs.
  */
 
  portsArr.push(port); // push each Reactime communication channel object to the portsArr

  // On Reactime launch: make sure RT's active tab is correct
  if (portsArr.length > 0) {
    portsArr.forEach((bg) => {// go through each port object (each Reactime instance)
      bg.postMessage({  // send passed in action object as a message to the current port
        action: 'changeTab',
        payload: { tabId: activeTab.id, title: activeTab.title },
      })
    const keepAliveServiceWorker = setInterval(() => { // interval used to keep connection to MainContainer alive
        bg.postMessage({
          action: 'keepAlive' // messages sent to port to keep connection alive
        })
      }, 295000) // messages must happen within five minutes
    });
  }

  // send tabs obj to the connected devtools as soon as connection to devtools is made
  if (Object.keys(tabsObj).length > 0) {
    port.postMessage({
      action: 'initialConnectSnapshots',
      payload: tabsObj,
    });
  }

  // every time devtool is closed, remove the port from portsArr
  port.onDisconnect.addListener((e) => {
    for (let i = 0; i < portsArr.length; i += 1) {
      if (portsArr[i] === e) {
        portsArr.splice(i, 1);
        break;
      }
    }
  });

  // listen for message containing a snapshot from devtools and send it to contentScript -
  // (i.e. they're all related to the button actions on Reactime)
  port.onMessage.addListener((msg) => {
    // msg is action denoting a time jump in devtools
    // ---------------------------------------------------------------
    // message incoming from devTools should look like this:
    // {
    //   action: 'emptySnap',
    //   payload: tabsObj,
    //   tabId: 101
    // }
    // ---------------------------------------------------------------
    const { action, payload, tabId } = msg;

    switch (action) {
      case 'import': // create a snapshot property on tabId and set equal to tabs object
        // may need do something like filter payload from stateless
        tabsObj[tabId].snapshots = payload.snapshots; // reset snapshots to page last state recorded
        // tabsObj[tabId].hierarchy = savedSnapshot.hierarchy; // why don't we just use hierarchy? Because it breaks everything...
        tabsObj[tabId].hierarchy.children = payload.hierarchy.children; // resets hierarchy to last state recorded
        tabsObj[tabId].hierarchy.stateSnapshot = payload.hierarchy.stateSnapshot; // resets hierarchy to last state recorded
        tabsObj[tabId].currLocation = payload.currLocation; // resets currLocation to last state recorded
        tabsObj[tabId].index = payload.index; //reset index to last state recorded
        tabsObj[tabId].currParent = payload.currParent; // reset currParent to last state recorded
        tabsObj[tabId].currBranch = payload.currBranch; // reset currBranch to last state recorded

        return true; // return true so that port remains open

      case 'emptySnap':
        tabsObj[tabId].snapshots = [tabsObj[tabId].snapshots[tabsObj[tabId].snapshots.length - 1]]; // reset snapshots to page last state recorded
        tabsObj[tabId].hierarchy.children = []; // resets hierarchy
        tabsObj[tabId].hierarchy.stateSnapshot = { // resets hierarchy to page last state recorded
          ...tabsObj[tabId].snapshots[0],
        };
        tabsObj[tabId].currLocation = tabsObj[tabId].hierarchy; // resets currLocation to page last state recorded
        tabsObj[tabId].index = 1; //reset index
        tabsObj[tabId].currParent = 0; // reset currParent
        tabsObj[tabId].currBranch = 1; // reset currBranch
        return true; // return true so that port remains open
      
      case 'setPause': // Pause = lock on tab
        tabsObj[tabId].mode.paused = payload;
        return true; // return true so that port remains open

      case 'launchContentScript':
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['bundles/content.bundle.js'],
        });
        return true;

      case 'jumpToSnap':
        chrome.tabs.sendMessage(tabId, msg);
        return true; // attempt to fix message port closing error, consider return Promise

      case 'toggleRecord':
        chrome.tabs.sendMessage(tabId, msg);
        return true;

      default:
        return true;
    }
  });
});

// background.js listening for a message from contentScript.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // AUTOMATIC MESSAGE SENT BY CHROME WHEN CONTENT SCRIPT IS FIRST LOADED: set Content
  if (request.type === 'SIGN_CONNECT') {
    return true;
  }
  const tabTitle = sender.tab.title;
  const tabId = sender.tab.id;
  const { action, index, name, value } = request;
  let isReactTimeTravel = false;

  if (name) {
    metrics[name] = value;
  }

  // Filter out tabs that don't have reactime, tabs that dont use react?
  if (
    action === 'tabReload' ||
    action === 'recordSnap' ||
    action === 'jumpToSnap' ||
    action === 'injectScript' ||
    action === 'devToolsInstalled' ||
    action === 'aReactApp'
  ) {
    isReactTimeTravel = true;
  } else {
    return true;
  }
  // everytime we get a new tabId, add it to the object
  if (isReactTimeTravel && !(tabId in tabsObj)) { 
    tabsObj[tabId] = createTabObj(tabTitle);
  }

  switch (action) {
    case 'jumpToSnap': {
      changeCurrLocation(tabsObj[tabId], tabsObj[tabId].hierarchy, index, name);
      if (portsArr.length > 0) {
        portsArr.forEach((bg) =>
          bg.postMessage({
            action: 'setCurrentLocation',
            payload: tabsObj,
          }),
        );
      }
      break;
    }
    // Confirmed React Dev Tools installed, send this info to frontend
    case 'devToolsInstalled': {
      tabsObj[tabId].status.reactDevToolsInstalled = true;
      portsArr.forEach((bg) =>
        bg.postMessage({
          action: 'devTools',
          payload: tabsObj,
        }),
      );
      break;
    }
    // Confirmed target is a react app. No need to send to frontend
    case 'aReactApp': {
      tabsObj[tabId].status.targetPageisaReactApp = true;
      break;
    }
    // This injects a script into the app that you're testing Reactime on,
    // so that Reactime's backend files can communicate with the app's DOM.
    case 'injectScript': {
      const injectScript = (file, tab) => {
        const htmlBody = document.getElementsByTagName('body')[0];
        const script = document.createElement('script');
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('src', file);
        // eslint-disable-next-line prefer-template
        htmlBody.appendChild(script);
      };

      chrome.scripting.executeScript({
        target: { tabId },
        function: injectScript,
        args: [chrome.runtime.getURL('bundles/backend.bundle.js'), tabId],
      });
      break;
    }
    case 'recordSnap': {
      const sourceTab = tabId;
      tabsObj[tabId].webMetrics = metrics;
      if (!firstSnapshotReceived[tabId]) {
        firstSnapshotReceived[tabId] = true;
        reloaded[tabId] = false;
        tabsObj[tabId].webMetrics = metrics;
        tabsObj[tabId].snapshots.push(request.payload);
        sendToHierarchy(tabsObj[tabId], new Node(request.payload, tabsObj[tabId]));
        if (portsArr.length > 0) {
          portsArr.forEach((bg) =>
            bg.postMessage({
              action: 'initialConnectSnapshots',
              payload: tabsObj,
            }),
          );
        }
        break;
      }

      // DUPLICATE SNAPSHOT CHECK
      // This may be where the bug is coming from that when Reactime fails to collect
      // state. If they happen to take the same actual duration, it won't record the snapshot.
      const previousSnap =
        tabsObj[tabId]?.currLocation?.stateSnapshot?.children[0]?.componentData?.actualDuration;
      const incomingSnap = request.payload.children[0].componentData.actualDuration;
      if (previousSnap === incomingSnap) break;

      // Or if it is a snapShot after a jump, we don't record it.
      if (reloaded[tabId]) {
        // don't add anything to snapshot storage if tab is reloaded for the initial snapshot
        reloaded[tabId] = false;
      } else {
        tabsObj[tabId].snapshots.push(request.payload);
        // INVOKING buildHierarchy FIGURE OUT WHAT TO PASS IN
        if (!tabsObj[tabId][index]) {
          sendToHierarchy(tabsObj[tabId], new Node(request.payload, tabsObj[tabId]));
        }
      }
      // sends new tabs obj to devtools
      if (portsArr.length > 0) {
        portsArr.forEach((bg) =>
          bg.postMessage({
            action: 'sendSnapshots',
            payload: tabsObj,
            sourceTab,
          }),
        );
      }
      break;
    }
    default:
      break;
  }
  return true; // attempt to fix close port error
});

// when tab is closed, remove the tabId from the tabsObj
chrome.tabs.onRemoved.addListener((tabId) => {
  // tell devtools which tab to delete
  if (portsArr.length > 0) {
    portsArr.forEach((bg) =>
      bg.postMessage({
        action: 'deleteTab',
        payload: tabId,
      }),
    );
  }

  // delete the tab from the tabsObj
  delete tabsObj[tabId];
  delete reloaded[tabId];
  delete firstSnapshotReceived[tabId];
});

// when a new url is loaded on the same tab,
// this remove the tabid from the tabsObj, recreate the tab and inject the script
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // check if the tab title changed to see if tab need to restart
  if (changeInfo && tabsObj[tabId]) {
    if (changeInfo.title && changeInfo.title !== tabsObj[tabId].title) {
      // tell devtools which tab to delete
      if (portsArr.length > 0) {
        portsArr.forEach((bg) =>
          bg.postMessage({
            action: 'deleteTab',
            payload: tabId,
          }),
        );
      }

      // delete the tab from the tabsObj
      delete tabsObj[tabId];
      delete reloaded[tabId];
      delete firstSnapshotReceived[tabId];

      // recreate the tab on the tabsObj
      tabsObj[tabId] = createTabObj(changeInfo.title);
    }
  }
});

// when tab view is changed, put the tabid as the current tab
chrome.tabs.onActivated.addListener((info) => {
  // get info about tab information from tabId
  chrome.tabs.get(info.tabId, (tab) => {
    // never set a reactime instance to the active tab
    if (!tab.pendingUrl?.match('^chrome-extension')) {
      activeTab = tab;
      if (portsArr.length > 0) {
        portsArr.forEach((bg) =>
          bg.postMessage({
            action: 'changeTab',
            payload: { tabId: tab.id, title: tab.title },
          }),
        );
      }
    }
  });
});

// when reactime is installed
// create a context menu that will open our devtools in a new window
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'reactime',
    title: 'Reactime',
    contexts: ['page', 'selection', 'image', 'link'],
  });
});

// when context menu is clicked, listen for the menuItemId,
// if user clicked on reactime, open the devtools window
chrome.contextMenus.onClicked.addListener(({ menuItemId }) => {
  const options = {
    type: 'panel',
    left: 0,
    top: 0,
    width: 1000,
    height: 1000,
    url: chrome.runtime.getURL('panel.html'),
  };
  if (menuItemId === 'reactime') chrome.windows.create(options);
});
