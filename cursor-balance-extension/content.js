// Cursor Balance Monitor - Content Script
// Runs on cursor.com/dashboard pages
// Collects detailed usage data (Total, Paid Models, Auto) and sends to background

(function() {
  'use strict';

  const MAX_BALANCE = 10;

  function formatNumber(num, decimals = 2) {
    return num.toFixed(decimals);
  }

  function parseCost(text) {
    if (!text) return 0;
    let cleaned = text.replace(/[$\s]/g, '').replace(/&nbsp;/g, '').trim();
    cleaned = cleaned.replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  // Calculate sums from the page
  function calculateSums() {
    const tables = document.querySelectorAll('table');
    const divRows = document.querySelectorAll('div[role="row"].dashboard-table-row');

    if (tables.length === 0 && divRows.length === 0) {
      return null;
    }

    let totalSum = 0;
    let autoModelSum = 0;
    let otherModelsSum = 0;

    // Parse table rows
    tables.forEach(table => {
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;

        let modelText = '';
        let costText = '';

        if (cells[1]) {
          modelText = cells[1].textContent.trim().toLowerCase();
        }

        const lastCell = cells[cells.length - 1];
        if (lastCell) {
          const titleElement = lastCell.querySelector('[title]');
          if (titleElement) {
            costText = titleElement.getAttribute('title');
          } else {
            costText = lastCell.textContent;
          }
        }

        const cost = parseCost(costText);

        if (cost > 0) {
          totalSum += cost;
          if (modelText.includes('auto')) {
            autoModelSum += cost;
          } else {
            otherModelsSum += cost;
          }
        }
      });
    });

    // Parse div rows (alternative layout)
    divRows.forEach(row => {
      const cells = row.querySelectorAll('div[role="cell"]');
      if (cells.length < 3) return;

      let modelText = '';
      let costText = '';

      if (cells[2]) {
        const modelSpan = cells[2].querySelector('span[title]');
        if (modelSpan) {
          modelText = modelSpan.getAttribute('title').trim().toLowerCase();
        }
      }

      const lastCell = cells[cells.length - 1];
      if (lastCell) {
        const dashElement = lastCell.querySelector('.text-brand-gray-400');
        if (dashElement && dashElement.textContent.trim() === '-') {
          return;
        }

        const titleElement = lastCell.querySelector('[title]');
        if (titleElement) {
          costText = titleElement.getAttribute('title');
        } else {
          costText = lastCell.textContent;
        }
      }

      const cost = parseCost(costText);

      if (cost > 0) {
        totalSum += cost;
        if (modelText.includes('auto')) {
          autoModelSum += cost;
        } else {
          otherModelsSum += cost;
        }
      }
    });

    return {
      total: totalSum,
      auto: autoModelSum,
      others: otherModelsSum
    };
  }

  // Display the sum block UI on the dashboard page
  function displaySums(sums) {
    const container = document.querySelector('.dashboard-table-scroll-container');
    if (!container) return;

    const old = document.querySelector('#cursor-balance-block');
    if (old) old.remove();

    const paidPercent = Math.min((sums.others / MAX_BALANCE) * 100, 100);
    const autoPercent = Math.min((sums.auto / MAX_BALANCE) * 100, 100);

    const div = document.createElement('div');
    div.id = 'cursor-balance-block';

    div.style.cssText = `
      padding: 14px 16px;
      margin-bottom: 14px;
      background: #1f1f1f;
      color: #e7e7e7;
      border: 1px solid #333;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      position: relative;
      overflow: hidden;
    `;

    // Progress bar for paid models (red)
    const progressBarPaid = document.createElement('div');
    progressBarPaid.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${paidPercent}%;
      height: 100%;
      background: rgba(255, 100, 100, ${(0.05 + (paidPercent / 100) * 0.12) * 0.5});
      pointer-events: none;
      z-index: 0;
      border-radius: 10px;
    `;

    // Progress bar for auto (green)
    const progressBarAuto = document.createElement('div');
    progressBarAuto.style.cssText = `
      position: absolute;
      top: 0;
      left: ${paidPercent}%;
      width: ${autoPercent}%;
      height: 100%;
      background: rgba(100, 255, 100, ${(0.05 + (autoPercent / 100) * 0.12) * 0.5});
      pointer-events: none;
      z-index: 0;
      border-radius: 10px;
    `;

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px; position: relative; z-index: 1;">
        <div style="flex: 1; text-align: center;">
          <div style="font-size: 11px; color: #999; margin-bottom: 4px;">Total</div>
          <div style="font-size: 24px; font-weight: bold;">
            ${formatNumber(sums.total, 2)}$
          </div>
        </div>
        <div style="flex: 1; text-align: center;">
          <div style="font-size: 11px; color: #999; margin-bottom: 4px;">Paid Models</div>
          <div style="font-size: 24px; font-weight: bold;">
            ${formatNumber(sums.others, 2)}$
          </div>
        </div>
        <div style="flex: 1; text-align: center;">
          <div style="font-size: 11px; color: #999; margin-bottom: 4px;">Auto</div>
          <div style="font-size: 24px; font-weight: bold;">${formatNumber(sums.auto, 2)}$</div>
        </div>
      </div>
    `;

    div.insertBefore(progressBarPaid, div.firstChild);
    div.insertBefore(progressBarAuto, div.firstChild);
    container.parentNode.insertBefore(div, container);
  }

  // Check if on usage page
  function isUsagePage() {
    return window.location.pathname === '/dashboard' &&
           (window.location.search.includes('tab=usage') || window.location.hash.includes('tab=usage'));
  }

  // Wait for data to load
  function waitForData() {
    return new Promise((resolve) => {
      const checkData = () => {
        const container = document.querySelector('.dashboard-table-scroll-container');
        const hasRows = document.querySelectorAll('div[role="row"].dashboard-table-row').length > 0 ||
                       document.querySelectorAll('table tbody tr').length > 0;

        if (container && hasRows) {
          resolve();
        } else {
          setTimeout(checkData, 100);
        }
      };
      checkData();
    });
  }

  // Send data to background script
  function sendDataToBackground(sums) {
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'BALANCE_DATA',
        data: sums
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Error sending data to background:', chrome.runtime.lastError);
        } else {
          console.log('Detailed usage data sent to extension');
        }
      });
    }
  }

  // Initialize
  async function init() {
    if (!isUsagePage()) {
      return;
    }

    await waitForData();
    await new Promise(resolve => setTimeout(resolve, 300));

    const sums = calculateSums();

    if (sums && sums.total >= 0) {
      displaySums(sums);
      sendDataToBackground(sums);
    }
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Watch for URL changes (SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (isUsagePage()) {
        init();
      }
    }
  }).observe(document, { subtree: true, childList: true });

  // Watch for table updates
  waitForData().then(() => {
    const container = document.querySelector('.dashboard-table-scroll-container');
    if (container) {
      const observer = new MutationObserver(() => {
        if (isUsagePage()) {
          const sums = calculateSums();
          if (sums && sums.total >= 0) {
            displaySums(sums);
            sendDataToBackground(sums);
          }
        }
      });
      observer.observe(container, { childList: true, subtree: true });
    }
  });

})();
