// Cursor Balance Monitor - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const loggedInView = document.getElementById('logged-in-view');
  const loggedOutView = document.getElementById('logged-out-view');
  const loadingView = document.getElementById('loading-view');
  
  const userEmail = document.getElementById('user-email');
  const membershipType = document.getElementById('membership-type');
  const apiPercent = document.getElementById('api-percent');
  const apiProgress = document.getElementById('api-progress');
  const usageUsed = document.getElementById('usage-used');
  const usageLimit = document.getElementById('usage-limit');
  const lastUpdateTime = document.getElementById('last-update-time');
  
  const detailedSection = document.getElementById('detailed-section');
  const detailTotal = document.getElementById('detail-total');
  const detailPaid = document.getElementById('detail-paid');
  const detailAuto = document.getElementById('detail-auto');
  
  const trialSection = document.getElementById('trial-section');
  const trialDays = document.getElementById('trial-days');
  const trialProgress = document.getElementById('trial-progress');
  
  const refreshBtn = document.getElementById('refresh-btn');
  const dashboardBtn = document.getElementById('dashboard-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const loginBtn = document.getElementById('login-btn');

  // Show/hide views
  function showView(view) {
    loggedInView.classList.add('hidden');
    loggedOutView.classList.add('hidden');
    loadingView.classList.add('hidden');
    view.classList.remove('hidden');
  }

  // Format currency
  function formatCurrency(value) {
    return '$' + (value || 0).toFixed(2);
  }

  // Format time ago
  function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  // Format membership type
  function formatMembership(type) {
    const types = {
      'free_trial': 'Free Trial',
      'free': 'Free',
      'pro': 'Pro',
      'business': 'Business'
    };
    return types[type] || type;
  }

  // Update UI with data
  function updateUI(data) {
    if (!data || !data.isLoggedIn) {
      showView(loggedOutView);
      return;
    }
    
    // User info
    if (data.user) {
      userEmail.textContent = data.user.email || 'Unknown';
    }
    
    // Usage info
    if (data.usage) {
      const percent = Math.round(data.usage.apiPercentUsed || 0);
      apiPercent.textContent = `${percent}%`;
      apiProgress.style.width = `${Math.min(percent, 100)}%`;
      
      // Progress bar color
      if (percent < 50) {
        apiProgress.className = 'progress green';
      } else if (percent < 80) {
        apiProgress.className = 'progress yellow';
      } else {
        apiProgress.className = 'progress red';
      }
      
      usageUsed.textContent = data.usage.used || 0;
      usageLimit.textContent = data.usage.limit || 0;
      membershipType.textContent = formatMembership(data.usage.membershipType);
    }
    
    // Trial info
    if (data.trial && data.trial.isOnTrial) {
      trialSection.classList.remove('hidden');
      const remaining = data.trial.daysRemaining || 0;
      const total = data.trial.totalDays || 7;
      const used = total - remaining;
      trialDays.textContent = `${used} / ${total} days (${remaining} left)`;
      
      // Progress bar (shows used percentage)
      const percent = (used / total) * 100;
      trialProgress.style.width = `${percent}%`;
    } else {
      trialSection.classList.add('hidden');
    }
    
    // Detailed usage (from content script)
    if (data.detailedUsage) {
      detailedSection.classList.remove('hidden');
      detailTotal.textContent = formatCurrency(data.detailedUsage.total);
      detailPaid.textContent = formatCurrency(data.detailedUsage.others);
      detailAuto.textContent = formatCurrency(data.detailedUsage.auto);
    } else {
      detailedSection.classList.add('hidden');
    }
    
    // Last update time
    lastUpdateTime.textContent = formatTimeAgo(data.lastUpdate);
    
    showView(loggedInView);
  }

  // Load data
  function loadData() {
    showView(loadingView);
    
    chrome.runtime.sendMessage({ type: 'GET_BALANCE' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting data:', chrome.runtime.lastError);
        showView(loggedOutView);
        return;
      }
      
      console.log('Got data:', response);
      updateUI(response);
    });
  }

  // Refresh
  function refresh() {
    refreshBtn.disabled = true;
    refreshBtn.classList.add('spinning');
    
    chrome.runtime.sendMessage({ type: 'REFRESH' }, (response) => {
      refreshBtn.disabled = false;
      refreshBtn.classList.remove('spinning');
      loadData();
    });
  }

  // Open dashboard
  function openDashboard() {
    chrome.tabs.create({ url: 'https://cursor.com/dashboard?tab=usage' });
    window.close();
  }

  // Logout
  function logout() {
    if (!confirm('Are you sure you want to log out?')) {
      return;
    }
    
    showView(loadingView);
    
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, (response) => {
      showView(loggedOutView);
    });
  }

  // Login
  function login() {
    chrome.tabs.create({ url: 'https://cursor.com/login' });
    window.close();
  }

  // Event listeners
  refreshBtn.addEventListener('click', refresh);
  dashboardBtn.addEventListener('click', openDashboard);
  logoutBtn.addEventListener('click', logout);
  loginBtn.addEventListener('click', login);

  // Initial load
  loadData();
});
