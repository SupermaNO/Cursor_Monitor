// Cursor Balance Monitor - Background Service Worker

const API_AUTH_ME = 'https://cursor.com/api/auth/me';
const API_USAGE_SUMMARY = 'https://cursor.com/api/usage-summary';
const API_AUTH_STRIPE = 'https://cursor.com/api/auth/stripe';
const ALARM_NAME = 'fetchBalance';
const FETCH_INTERVAL_MINUTES = 5;

// Initialize on extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Cursor Balance Monitor installed');
  
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: FETCH_INTERVAL_MINUTES,
    delayInMinutes: 0.5
  });
  
  setTimeout(() => {
    fetchUsageData();
  }, 2000);
});

// Handle alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('Alarm triggered - fetching usage data...');
    fetchUsageData();
  }
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BALANCE_DATA') {
    // Data from content script (detailed usage from dashboard page)
    saveDetailedData(message.data);
    sendResponse({ success: true });
  } else if (message.type === 'GET_BALANCE') {
    getData().then(result => {
      sendResponse(result);
    });
    return true;
  } else if (message.type === 'LOGOUT') {
    performLogout().then(() => {
      sendResponse({ success: true });
    });
    return true;
  } else if (message.type === 'REFRESH') {
    fetchUsageData().then((success) => {
      sendResponse({ success });
    });
    return true;
  }
});

// Build cookie header from chrome.cookies
async function buildCookieHeader() {
  const cookies1 = await chrome.cookies.getAll({ domain: '.cursor.com' });
  const cookies2 = await chrome.cookies.getAll({ domain: 'cursor.com' });
  const allCookies = [...cookies1, ...cookies2];
  
  const uniqueCookies = {};
  allCookies.forEach(c => {
    uniqueCookies[c.name] = c.value;
  });
  
  return Object.entries(uniqueCookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

// Fetch usage data from Cursor API
async function fetchUsageData() {
  try {
    console.log('Fetching usage data...');
    
    const cookieHeader = await buildCookieHeader();
    
    if (!cookieHeader || cookieHeader.length < 10) {
      console.log('No cookies found, user not logged in');
      setLoggedOutState();
      return false;
    }
    
    // Fetch user info
    const userResponse = await fetch(API_AUTH_ME, {
      headers: {
        'Accept': 'application/json',
        'Cookie': cookieHeader
      }
    });
    
    if (!userResponse.ok) {
      console.log('Failed to fetch user info:', userResponse.status);
      setLoggedOutState();
      return false;
    }
    
    const userData = await userResponse.json();
    console.log('User data:', userData);
    
    if (!userData.email) {
      console.log('No email in response, not logged in');
      setLoggedOutState();
      return false;
    }
    
    // Fetch usage summary
    const usageResponse = await fetch(API_USAGE_SUMMARY, {
      headers: {
        'Accept': 'application/json',
        'Cookie': cookieHeader
      }
    });
    
    if (!usageResponse.ok) {
      console.log('Failed to fetch usage summary:', usageResponse.status);
      return false;
    }
    
    const usageData = await usageResponse.json();
    console.log('Usage data:', usageData);
    
    // Fetch stripe/subscription data
    let stripeData = {};
    try {
      const stripeResponse = await fetch(API_AUTH_STRIPE, {
        headers: {
          'Accept': 'application/json',
          'Cookie': cookieHeader
        }
      });
      
      if (stripeResponse.ok) {
        stripeData = await stripeResponse.json();
        console.log('Stripe data:', stripeData);
      }
    } catch (stripeError) {
      console.log('Failed to fetch stripe data:', stripeError);
    }
    
    // Save data
    const storageData = {
      isLoggedIn: true,
      lastUpdate: Date.now(),
      user: {
        email: userData.email,
        name: userData.name
      },
      usage: {
        apiPercentUsed: usageData.individualUsage?.plan?.apiPercentUsed || 0,
        autoPercentUsed: usageData.individualUsage?.plan?.autoPercentUsed || 0,
        totalPercentUsed: usageData.individualUsage?.plan?.totalPercentUsed || 0,
        used: usageData.individualUsage?.plan?.used || 0,
        limit: usageData.individualUsage?.plan?.limit || 0,
        remaining: usageData.individualUsage?.plan?.remaining || 0,
        membershipType: usageData.membershipType,
        billingCycleEnd: usageData.billingCycleEnd
      },
      trial: {
        daysRemaining: stripeData.daysRemainingOnTrial,
        totalDays: stripeData.trialLengthDays,
        isOnTrial: stripeData.membershipType === 'free_trial'
      }
    };
    
    await chrome.storage.local.set(storageData);
    updateBadge(storageData.usage);
    
    console.log('Data saved:', storageData);
    return true;
  } catch (error) {
    console.error('Error fetching usage data:', error);
    return false;
  }
}

// Save detailed data from content script (Total, Auto, Paid Models)
function saveDetailedData(data) {
  chrome.storage.local.get(['user', 'usage', 'lastUpdate'], (stored) => {
    const updatedData = {
      ...stored,
      detailedUsage: data,
      lastDetailedUpdate: Date.now()
    };
    
    chrome.storage.local.set(updatedData, () => {
      console.log('Detailed data saved:', data);
    });
  });
}

// Get all stored data
async function getData() {
  return chrome.storage.local.get([
    'isLoggedIn', 
    'lastUpdate', 
    'user', 
    'usage', 
    'trial',
    'detailedUsage',
    'lastDetailedUpdate'
  ]);
}

// Update the extension badge
function updateBadge(usage) {
  if (!usage) {
    chrome.action.setBadgeText({ text: '?' });
    chrome.action.setBadgeBackgroundColor({ color: '#666666' });
    return;
  }
  
  const percent = Math.round(usage.apiPercentUsed || 0);
  const badgeText = `${percent}%`;
  
  // Color based on API usage percentage
  let badgeColor;
  if (percent < 50) {
    badgeColor = '#22c55e'; // Green
  } else if (percent < 80) {
    badgeColor = '#f59e0b'; // Yellow/Orange
  } else {
    badgeColor = '#ef4444'; // Red
  }
  
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}

// Set logged out state
function setLoggedOutState() {
  chrome.storage.local.set({
    isLoggedIn: false,
    user: null,
    usage: null,
    trial: null,
    detailedUsage: null
  }, () => {
    chrome.action.setBadgeText({ text: '?' });
    chrome.action.setBadgeBackgroundColor({ color: '#666666' });
  });
}

// Perform logout - clear all cursor.com data
async function performLogout() {
  try {
    await chrome.browsingData.remove({
      origins: ['https://cursor.com', 'https://www.cursor.com']
    }, {
      cookies: true,
      localStorage: true,
      indexedDB: true,
      cacheStorage: true,
      serviceWorkers: true
    });
    
    const cookies = await chrome.cookies.getAll({ domain: '.cursor.com' });
    for (const cookie of cookies) {
      const url = `https://${cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain}${cookie.path}`;
      await chrome.cookies.remove({ url, name: cookie.name });
    }
    
    const cookiesNoDot = await chrome.cookies.getAll({ domain: 'cursor.com' });
    for (const cookie of cookiesNoDot) {
      const url = `https://cursor.com${cookie.path}`;
      await chrome.cookies.remove({ url, name: cookie.name });
    }
    
    setLoggedOutState();
    console.log('Logout complete');
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    return false;
  }
}

// On startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started - initializing');
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: FETCH_INTERVAL_MINUTES,
    delayInMinutes: 0.5
  });
  
  setTimeout(() => {
    fetchUsageData();
  }, 3000);
});

// Listen for cookie changes
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.domain.includes('cursor.com')) {
    setTimeout(() => fetchUsageData(), 1000);
  }
});
